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
  NativeAddress, // Import NativeAddress
} from "@wormhole-foundation/sdk";
import { normalizeAmount } from "@wormhole-foundation/sdk-base"; // Try importing normalizeAmount from sdk-base again
import { EvmPlatform } from "@wormhole-foundation/sdk-evm";
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
// Removed SolanaWallet/SuiWallet imports, will rely on base Signer type for now
// Signer adaptation might be needed later based on wallet adapter objects

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

// Use the base Signer type. Actual object passed will need `chain` and `address` properties,
// plus signing methods compatible with the SDK's expectations.
type SourceSigner = Signer;

// Function to bridge tokens (further revised structure)
export async function bridgeToken(
  sourceChain: SupportedChain, // Use specific Chain type
  targetChain: SupportedChain, // Use specific Chain type
  tokenSymbol: TokenSymbol,
  amount: string, // Amount as a string (e.g., "10.5")
  sourceSigner: SourceSigner, // Use more specific signer type
  recipientAddress: string // Keep as string for now, might need ChainAddress later
) {
  console.log(`Bridging ${amount} ${tokenSymbol} from ${sourceChain} to ${targetChain}`);

  const wh = await initializeWormholeContext();

  // Get chain contexts
  const sourceChainContext = wh.getChain(sourceChain);
  const targetChainContext = wh.getChain(targetChain);
  const sourcePlatform = wh.getPlatform(sourceChain); // Get platform instance
  const targetPlatform = wh.getPlatform(targetChain); // Get platform instance

  const tokenAddress = TESTNET_TOKENS[sourceChain][tokenSymbol];
  if (!tokenAddress || tokenAddress === "0x...") {
    throw new Error(`Token ${tokenSymbol} address not configured or invalid for ${sourceChain} on Testnet`);
  }

  // Get token details (decimals) - Accessing via platform instance
  const tokenDetails = await sourcePlatform.getToken(tokenAddress); // Try getToken on platform instance
  if (!tokenDetails) {
    throw new Error(`Could not fetch token details for ${tokenSymbol} on ${sourceChain}`);
  }
  const decimals = tokenDetails.decimals;

  // Normalize amount to base units using imported function
  const normalizedAmt = normalizeAmount(amount, BigInt(decimals)); // Use imported normalizeAmount


  // Get the sender address from the signer
  const senderAddressStr = sourceSigner.address(); // Assuming address() method exists on Signer and returns string
  const senderNativeAddr = sourcePlatform.parseAddress(senderAddressStr); // Use platform.parseAddress

  // Create ChainAddress objects using the SDK's encoding utilities
  const sourceTokenNativeAddr = sourcePlatform.parseAddress(tokenAddress); // Use platform.parseAddress
  const sourceTokenId: TokenId = { chain: sourceChain, address: sourceTokenNativeAddr.toUniversalAddress() }; // Convert to Universal for TokenId

  const targetRecipientNativeAddr = targetPlatform.parseAddress(recipientAddress); // Use platform.parseAddress
  const targetRecipientChainAddr: ChainAddress = { chain: targetChain, address: targetRecipientNativeAddr.toUniversalAddress() }; // Convert to Universal for ChainAddress


  // Get the Token Bridge protocol client for the source chain
  const tokenBridge = await sourceChainContext.getTokenBridge(); // Get Token Bridge context

  // Initiate transfer using the TokenBridge context
  const transfer = tokenBridge.transfer(
    senderNativeAddr.toUniversalAddress(), // Convert sender to UniversalAddress
    targetRecipientChainAddr,
    sourceTokenId.address, // Already UniversalAddress in TokenId
    normalizedAmt
    // Optional: payload, nativeGasAmount etc.
  );

  console.log("Created Transfer Request (Generator):", transfer);

  // Sign and send the transaction(s)
  // Pass the source ChainContext as the first argument to signSendWait
  try {
    const txids = await signSendWait(sourceChainContext, transfer, sourceSigner); // Pass sourceChainContext
    console.log("Transaction IDs:", txids);

    // TODO: Add logic to wait for VAA and redeem on the target chain
    // This involves fetching the VAA using the txid and then calling redeem on the target chain's token bridge

    return { message: "Bridging transaction sent (VAA fetching and redemption not implemented)", txids };
  } catch (error) {
     console.error("Signing or sending failed:", error);
     throw new Error("Failed to sign or send the bridging transaction.");
  }
}

// Example usage (for testing purposes, call from UI later)
/*
// NOTE: The Signer objects passed to testBridge MUST conform to the SDK's Signer interface.
// This likely requires creating wrapper classes/functions around the wallet adapter objects.
async function testBridge(suiSigner: Signer, solanaSigner: Signer) {

  // Example: Solana to Sui
  if (solanaSigner && suiSigner) {
     try {
      const suiRecipient = suiSigner.address(); // Get address via method
      const result = await bridgeToken(
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
      const result = await bridgeToken(
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
// 3. Instantiate these wrappers: const suiSigner = new SuiSDKSignerWrapper(suiWalletAdapter);
// 4. Call testBridge(suiSigner, solanaSigner) or bridgeToken directly with the wrapped signers.
*/
