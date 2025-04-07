import {
  Chain,
  Network,
  Wormhole,
  signSendWait,
  Signer,
  TokenId,
  ChainAddress,
  UniversalAddress,
  encoding,
  NativeAddress,
  TokenTransfer, // Import the TokenTransfer helper
} from "@wormhole-foundation/sdk";
// No need for normalizeAmount import when using TokenTransfer helper
import { EvmPlatform } from "@wormhole-foundation/sdk-evm";
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";

// Define network and chains
const NETWORK: Network = "Testnet";
const SOLANA_CHAIN: Chain = "Solana";
const SUI_CHAIN: Chain = "Sui";

// Define types for better clarity
type SupportedChain = typeof SOLANA_CHAIN | typeof SUI_CHAIN;
type TokenSymbol = "USDC" | "USDT";
type TestnetTokenConfig = {
  [C in SupportedChain]: {
    [S in TokenSymbol]: string; // Assuming address is string
  };
};

// Example Testnet Token Addresses (Replace with actual Testnet USDC/USDT if available)
// These are placeholders and MUST be verified/updated
// TODO: FIND ACTUAL WORMHOLE-WRAPPED USDC/USDT ADDRESSES ON SUI TESTNET
const TESTNET_TOKENS: TestnetTokenConfig = {
  Solana: {
    USDC: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr", // Example Solana Devnet USDC
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // Example Solana Devnet USDT (Check if exists) - LIKELY DOES NOT EXIST ON DEVNET
  },
  Sui: {
    USDC: "0xPLACEHOLDER_SUI_USDC_ADDRESS", // Placeholder - MUST BE REPLACED
    USDT: "0xPLACEHOLDER_SUI_USDT_ADDRESS", // Placeholder - MUST BE REPLACED
  },
};

// Initialize Wormhole SDK Context
async function initializeWormholeContext() {
  // Register platforms with core
  const platforms = [SolanaPlatform, SuiPlatform]; // Add EvmPlatform if needed later
  const wormhole = new Wormhole(NETWORK, platforms);
  return wormhole;
}

// Use the base Signer type. Actual object passed MUST be adapted from the
// wallet adapter (e.g., @suiet/wallet-kit, @solana/wallet-adapter-react)
// to conform to the SDK's Signer interface (chain(), address(), sign() or signAndSend()).
type AdaptedSigner = Signer;

// Function to bridge tokens using the TokenTransfer helper
export async function bridgeTokenWithHelper(
  sourceChain: SupportedChain,
  targetChain: SupportedChain,
  tokenSymbol: TokenSymbol,
  amount: string, // Amount as a string (e.g., "10.5") - TokenTransfer handles normalization
  sourceSigner: AdaptedSigner, // The adapted signer object
  recipientAddress: string // Recipient address as string
) {
  console.log(`Bridging ${amount} ${tokenSymbol} from ${sourceChain} to ${targetChain} using TokenTransfer helper`);

  const wh = await initializeWormholeContext();

  const tokenAddress = TESTNET_TOKENS[sourceChain][tokenSymbol];
  if (!tokenAddress || tokenAddress.startsWith("0xPLACEHOLDER")) {
    throw new Error(`Token ${tokenSymbol} address not configured or invalid for ${sourceChain} on Testnet`);
  }

  // Create TokenId and ChainAddress objects using Wormhole static methods
  const sourceToken: TokenId = Wormhole.tokenId(sourceChain, tokenAddress);
  const senderChainAddr: ChainAddress = Wormhole.chainAddress(sourceChain, sourceSigner.address());
  const destinationChainAddr: ChainAddress = Wormhole.chainAddress(targetChain, recipientAddress);

  // Create a TokenTransfer object to track the state of the transfer
  // Amount is passed directly, normalization is handled internally
  const transfer = await wh.tokenTransfer(
    sourceToken,
    amount,
    senderChainAddr,
    destinationChainAddr,
    false, // Automatic delivery set to false (manual)
    undefined, // No payload
    undefined // No native gas dropoff requested
  );

  // You can optionally quote the transfer to check fees, etc.
  // const quote = await TokenTransfer.quoteTransfer(wh, sourceChain, targetChain, transfer.transfer);
  // console.log("Quote:", quote);
  // if (quote.destinationToken.amount < 0) throw new Error("Amount too low to cover fees");

  console.log("Initiating transfer...");
  const sourceTxids = await transfer.initiateTransfer(sourceSigner);
  console.log(`Initiated transfer with source txids: ${sourceTxids}`);

  // For manual transfers, wait for attestation
  console.log("Waiting for attestation...");
  const attestIds = await transfer.fetchAttestation(60_000); // 60 second timeout
  console.log(`Got VAA CIDs: ${attestIds}`);

  // Redeem on the destination chain
  console.log("Completing transfer...");
  const destinationTxids = await transfer.completeTransfer(sourceSigner); // Use same signer for redeem? Check docs if dest signer needed
  console.log(`Completed transfer with destination txids: ${destinationTxids}`);

  return {
    message: "Bridging process completed (initiated, attested, redeemed).",
    sourceTxids,
    vaaCids: attestIds,
    destinationTxids,
  };
}


// Example usage (for testing purposes, call from UI later)
/*
// NOTE: The Signer objects passed MUST conform to the SDK's Signer interface.
// This requires creating wrapper classes/functions around the wallet adapter objects.
async function testBridge(suiSigner: AdaptedSigner, solanaSigner: AdaptedSigner) {

  // Example: Solana to Sui
  if (solanaSigner && suiSigner) {
     try {
      const suiRecipient = suiSigner.address(); // Get address via method
      const result = await bridgeTokenWithHelper(
        SOLANA_CHAIN,
        SUI_CHAIN,
        "USDC", // Make sure this token exists and address is correct
        "0.1", // Small amount for testing
        solanaSigner, // Pass the adapted Solana signer
        suiRecipient
      );
      console.log("Solana -> Sui Bridge Result:", result);
    } catch (error) {
      console.error("Solana -> Sui Bridge test failed:", error);
    }
  } else {
     console.log("Need both adapted Solana and Sui signers for test.")
  }

   // Example: Sui to Solana
   if (suiSigner && solanaSigner) {
     try {
      const solanaRecipient = solanaSigner.address(); // Get address via method
      const result = await bridgeTokenWithHelper(
        SUI_CHAIN,
        SOLANA_CHAIN,
        "USDC", // Make sure this token exists and address is correct for Sui
        "0.1", // Small amount for testing
        suiSigner, // Pass the adapted Sui signer
        solanaRecipient
      );
      console.log("Sui -> Solana Bridge Result:", result);
    } catch (error) {
      console.error("Sui -> Solana Bridge test failed:", error);
    }
   }
}

// How to call from UI:
// 1. Get the connected wallet adapter objects (e.g., from useSuiWallet() and useSolanaWallet())
// 2. **Crucially:** Create wrapper objects/functions that take the wallet adapter object
//    and expose the `chain`, `address()`, and signing methods (`signTransaction`, etc.)
//    in the exact way the Wormhole SDK Signer interface expects for each chain.
//    Example structure:
//    class SolanaSDKSignerWrapper implements Signer {
//      constructor(private walletAdapter: SolanaWalletAdapter) {}
//      chain(): Chain { return "Solana"; }
//      address(): string { return this.walletAdapter.publicKey?.toBase58() ?? ""; }
//      async sign(txs: UnsignedTransaction[]): Promise<SignedTx[]> { /* ... implement signing logic ... */ }
//      // OR
//      async signAndSend(txs: UnsignedTransaction[]): Promise<TxHash[]> { /* ... implement signAndSend logic ... */ }
//    }
// 3. Instantiate these wrappers: const suiSigner = new SuiSDKSignerWrapper(suiWalletAdapter);
// 4. Call testBridge(suiSigner, solanaSigner) or bridgeTokenWithHelper directly with the wrapped signers.
*/
