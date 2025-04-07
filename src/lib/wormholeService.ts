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
  chainToChainId, // Import chainToChainId if needed, or use Chain type directly
} from "@wormhole-foundation/sdk";
import { EvmPlatform } from "@wormhole-foundation/sdk-evm";
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
import { parseUnits } from "ethers"; // Import parseUnits from ethers

// Define network and chains
const NETWORK: Network = "Testnet";
const SOLANA_CHAIN: Chain = "Solana";
const SUI_CHAIN: Chain = "Sui";
const SEPOLIA_CHAIN: Chain = "Sepolia"; // Define Sepolia for origin tokens

// Define types for better clarity
type SupportedChain = typeof SOLANA_CHAIN | typeof SUI_CHAIN; // Chains users can select as source/dest
type TokenSymbol = "USDC" | "USDT";

// Define Origin Token Addresses on their native Testnets
// These are the tokens that will be wrapped by Wormhole on other chains
interface OriginTokenInfo {
  originChain: Chain;
  originAddress: string;
  decimals: number; // Store decimals for normalization
}

const ORIGIN_TOKENS: { [S in TokenSymbol]: OriginTokenInfo } = {
  USDC: {
    originChain: SEPOLIA_CHAIN, // Assuming USDC originates from Sepolia Testnet
    originAddress: "0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8", // Sepolia USDC address
    decimals: 6, // Standard USDC decimals
  },
  USDT: {
    originChain: SEPOLIA_CHAIN, // Assuming USDT originates from Sepolia Testnet
    originAddress: "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0", // Sepolia USDT address (verify this)
    decimals: 6, // Standard USDT decimals
  },
  // Example if bridging native SOL (though less common via token bridge)
  // SOL: {
  //   originChain: SOLANA_CHAIN,
  //   originAddress: "native",
  //   decimals: 9, // SOL decimals
  // }
};

// Initialize Wormhole SDK Context
async function initializeWormholeContext() {
  // Register platforms with core - Include EvmPlatform for Sepolia origin
  const platforms = [EvmPlatform, SolanaPlatform, SuiPlatform];
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
  amount: string, // Amount as a string (e.g., "10.5")
  sourceSigner: AdaptedSigner, // The adapted signer object
  recipientAddress: string // Recipient address as string
) {
  console.log(`Bridging ${amount} ${tokenSymbol} from ${sourceChain} to ${targetChain} using TokenTransfer helper`);

  const wh = await initializeWormholeContext();

  const originTokenInfo = ORIGIN_TOKENS[tokenSymbol];
  if (!originTokenInfo) {
    throw new Error(`Token symbol ${tokenSymbol} not configured`);
  }

  // Create TokenId using the *origin* chain and address
  const originTokenId: TokenId = Wormhole.tokenId(
    originTokenInfo.originChain,
    originTokenInfo.originAddress
  );

  // Normalize amount using the known decimals
  const normalizedAmountBigInt = parseUnits(amount, originTokenInfo.decimals);

  // Create ChainAddress objects using Wormhole static methods
  const senderChainAddr: ChainAddress = Wormhole.chainAddress(sourceChain, sourceSigner.address());
  const destinationChainAddr: ChainAddress = Wormhole.chainAddress(targetChain, recipientAddress);

  // Create a TokenTransfer object to track the state of the transfer
  // Pass the origin TokenId and normalized amount
  const transfer = await wh.tokenTransfer(
    originTokenId, // Use the origin TokenId
    normalizedAmountBigInt,
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
  // Pass the adapted signer for the destination chain if needed
  // For manual transfers, the destination signer might be required
  // For simplicity here, using sourceSigner, but this might need adjustment
  const destinationTxids = await transfer.completeTransfer(sourceSigner);
  console.log(`Completed transfer with destination txids: ${destinationTxids}`);

  return {
    message: "Bridging process completed (initiated, attested, redeemed).",
    sourceTxids,
    vaaCids: attestIds,
    destinationTxids,
  };
}
