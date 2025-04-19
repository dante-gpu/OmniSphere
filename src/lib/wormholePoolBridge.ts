import { SuiClient } from '@mysten/sui.js/client'; 
import { Connection } from '@solana/web3.js';
// import { WORMHOLE_RPC_HOSTS } from './constants'; // RPC hosts likely handled by SDK context
import {
  Wormhole,
  Chain,
  Network, // Import Network type
  Signer,
  UniversalAddress,
  TransferReceipt,
  TokenTransfer,
  TransactionId,
  WormholeMessageId,
  AttestationReceipt,
  TokenId,
  amount,
  isTokenId, // Import type guard
  chainToChainId, // Utility to get chain ID if needed
  UnsignedTransaction, // Import for handling transaction generator
  SignAndSendSigner, // Import for type checking signer
  // ChainAddress, // Removed explicit import
} from '@wormhole-foundation/sdk';

// Import platform contexts
import { SuiPlatform } from '@wormhole-foundation/sdk-sui';
import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';

// Re-export Chain type if needed elsewhere
export type { Chain };

// Define a structure for the result
export interface WLLTransferResult {
  attestation?: any; // The attestation receipt
  error?: string;
  originTxIds: TransactionId[]; // Transaction IDs
}

// Define a simplified structure for initiating a transfer
export interface WLLTransferRequest {
  fromChain: Chain;
  toChain: Chain;
  fromAddress: string; // Use string for simplicity
  toAddress: string;   // Use string for simplicity
  token: string | TokenId; // Token to transfer
  amount: bigint; // Amount in atomic units
}

/**
 * Initiates a Wormhole Liquidity Layer (WLL) transfer using the new SDK.
 * This function replaces the manual VAA fetching and tracking.
 *
 * @param wormhole The initialized Wormhole<Network> instance.
 * @param request The details of the transfer request.
 * @param sourceSigner A Signer for the source chain transaction. Must implement SignAndSendSigner.
 * @returns Promise<WLLTransferResult>
 */
export async function initiateWLLTransfer(
  wormhole: Wormhole<Network>,
  request: WLLTransferRequest,
  sourceSigner: any // Use 'any' for flexibility with different signer types
): Promise<WLLTransferResult> {
  try {
    console.log(`Initiating WLL Transfer:`, request);
    
    // Convert addresses to Wormhole format
    const fromAddr = Wormhole.chainAddress(request.fromChain, request.fromAddress);
    const toAddr = Wormhole.chainAddress(request.toChain, request.toAddress);

    // Handle token address
    const tokenToSend = typeof request.token === "string" 
      ? (request.token === "native" ? Wormhole.tokenId(request.fromChain, "native") : Wormhole.tokenId(request.fromChain, request.token))
      : request.token;

    // Create the TokenTransfer object
    const tokenTransfer = await wormhole.tokenTransfer(
      tokenToSend,
      request.amount,
      fromAddr,
      toAddr,
      true, // Automatic delivery
      undefined // No payload
    );

    // Initiate the transfer
    const originTxIds = await tokenTransfer.initiateTransfer(sourceSigner);
    console.log("Initiated transfer with txids:", originTxIds);

    // Track the attestation (VAA)
    console.log("Waiting for attestation...");
    try {
      const attestReceipt = await tokenTransfer.fetchAttestation(60 * 1000); // 60 second timeout
      console.log("Attestation received:", attestReceipt);
      
      return { 
        originTxIds: originTxIds.map(tx => ({ 
          chain: request.fromChain, 
          txid: typeof tx === 'string' ? tx : tx.toString() 
        })),
        attestation: attestReceipt 
      };
    } catch (attestError) {
      // Still return the transaction IDs even if attestation tracking fails
      console.warn("Could not fetch attestation:", attestError);
      return { 
        originTxIds: originTxIds.map(tx => ({ 
          chain: request.fromChain, 
          txid: typeof tx === 'string' ? tx : tx.toString() 
        })),
        error: `Transfer initiated, but failed to fetch attestation: ${attestError}`
      };
    }

  } catch (error: any) {
    console.error("Error initiating WLL transfer:", error);
    return { error: error.message || 'Failed to initiate WLL transfer.' };
  }
}

/**
 * Helper to extract WormholeMessageId from an attestation.
 */
export function getWormholeMessageId(attestation: any): WormholeMessageId | undefined {
    if (!attestation) return undefined;

    // Try to extract ID from the attestation structure
    if (attestation.id && 
        typeof attestation.id === 'object' &&
        'chain' in attestation.id && 
        'emitter' in attestation.id && 
        'sequence' in attestation.id) {
       return attestation.id;
    }

    return undefined;
}


// Example Usage (Conceptual - needs integration into your UI/hooks)
// Updated exampleBridge signature and logic
/*
async function exampleBridge<N extends Network, C extends Chain>(
    sourceSigner: SignAndSendSigner<N, C>,
    suiClient: SuiClient, // Assuming SuiClient is correctly typed despite TS error
    solConnection: Connection
) {
    const network: N = sourceSigner.network(); // Get network from signer
    const currentChain: C = sourceSigner.chain(); // Get chain from signer

    // Initialize Wormhole SDK
    const wh = new Wormhole(network, [SuiPlatform, SolanaPlatform]);

    // Get platform contexts and assign RPC clients
    const suiContext = wh.getChain("Sui");
    suiContext.rpc = suiClient; // Assign SuiClient

    const solContext = wh.getChain("Solana");
    solContext.rpc = solConnection; // Assign Connection

    // Example: Define token ID for a specific Sui token
    const suiTokenAddress = "0xYOUR_SUI_TOKEN_PACKAGE_ID::coin::COIN"; // Replace with actual Sui token address
    const suiTokenId: TokenId = Wormhole.tokenId("Sui", suiTokenAddress);

    const transferRequest: WLLTransferRequest = {
        fromChain: currentChain, // Use signer's chain
        toChain: "Solana", // Example destination
        fromAddress: sourceSigner.address(), // Get address from signer
        toAddress: "YOUR_SOLANA_ADDRESS", // Replace with actual destination address
        token: suiTokenId, // Use the defined TokenId
        // Or use "native" for gas token: token: "native",
        amount: amount.units(amount.parse("10", 8)), // Example: 10 tokens with 8 decimals
        // nativeGas removed
    };

    // Ensure the Wormhole instance passed matches the signer's network
    if (wh.network !== network) {
        console.error("Wormhole instance network and signer network mismatch!");
        return;
    }

    // Cast the Wormhole instance to the correct network type for the function call
    const typedWh = wh as Wormhole<N>;

    const result = await initiateWLLTransfer(typedWh, transferRequest, sourceSigner);

    if (result.attestation || result.originTxIds) {
        console.log("Transfer initiated, attestation received:", result);
        // Pass the attestation receipt to the helper function
        const messageId = getWormholeMessageId(result.attestation);
        if (messageId) {
            console.log("Wormhole Message ID:", messageId);
            // You can use this ID to query status on Wormholescan or via SDK:
            // const url = await typedWh.getMessageUrl(messageId); // getMessageUrl might be async
            // console.log("Track on Wormholescan:", url);
        }
    } else {
        console.error("Transfer failed:", result.error);
    }
}
*/

// --- Keep old functions commented out or remove them ---
/*
export async function trackSuiToWormhole(...) { ... }
export async function trackSolanaToWormhole(...) { ... }
*/
