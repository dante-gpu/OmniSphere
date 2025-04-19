import {
  Wormhole,
  Chain,
  Network, // Import Network type
  WormholeMessageId as SDKWormholeMessageId, 
  TokenId, // Keep - Used directly
  // AttestationReceipt, // Removed - Unused type (using any)
  // TransactionId, // Removed - Unused (using string[])
  // UniversalAddress, // Removed - Unused
} from '@wormhole-foundation/sdk';

// Removed unused imports: CHAINS, chainIdToChain, isChain, platform contexts, SignAndSendSigner, amount

// Re-export Chain type if needed elsewhere
export type { Chain };

// Define a structure for the result
export interface WLLTransferResult {
  attestation?: any; // Using any to avoid generic constraint issues
  error?: string;
  originTxIds: string[]; // Expecting an array of transaction ID strings
}

// Define a simplified structure for initiating a transfer
export interface WLLTransferRequest {
  fromChain: Chain;
  toChain: Chain;
  fromAddress: string; // Use string for simplicity
  toAddress: string;   // Use string for simplicity
  token: string | TokenId; // Token to transfer ("native", address string, or TokenId)
  amount: bigint; // Amount in atomic units
}

// Define local WormholeMessageId structure matching expected usage
// Using string for emitter as it aligns with toString() calls
export interface WormholeMessageId {
  chain: Chain;
  emitter: string; // Use string to match processed data
  sequence: bigint;
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

    // Initiate the transfer - Expecting Promise<string[]> based on TS error TS2322
    const originTxIds: string[] = await tokenTransfer.initiateTransfer(sourceSigner);
    console.log("Initiated transfer with txids:", originTxIds);

    // Track the attestation (VAA)
    console.log("Waiting for attestation...");
    try {
      // Specify timeout in milliseconds
      const attestReceipt = await tokenTransfer.fetchAttestation(60 * 1000); // 60 second timeout
      console.log("Attestation received:", attestReceipt);

      // Return the string array directly
      return {
        originTxIds: originTxIds,
        attestation: attestReceipt
      };
    } catch (attestError: any) {
      // Still return the transaction IDs even if attestation tracking fails
      console.warn("Could not fetch attestation:", attestError);
      // Return the string array directly
      return {
        originTxIds: originTxIds,
        error: `Transfer initiated, but failed to fetch attestation: ${attestError.message || attestError}`
      };
    }

  } catch (error: any) {
    console.error("Error initiating WLL transfer:", error);
    // Add the required originTxIds property (empty array) to the error return object
    return {
      originTxIds: [], // Add missing property with correct type string[]
      error: error.message || 'Failed to initiate WLL transfer.'
    };
  }
}

/**
 * Helper to extract WormholeMessageId from an attestation receipt.
 * Note: The structure of AttestationReceipt might vary. Adjust accordingly.
 */
export function getWormholeMessageId(attestationReceipt: any): WormholeMessageId | undefined {
    if (!attestationReceipt) return undefined;

    // Check if receipt is an array (common SDK v3 pattern)
    if (Array.isArray(attestationReceipt) && attestationReceipt.length > 0) {
        const firstMessage = attestationReceipt[0];
        // Check if the first element looks like a Wormhole MessageId structure (SDK's internal one)
        if (firstMessage && firstMessage.chain && firstMessage.emitter && firstMessage.sequence !== undefined) {
            // Convert emitter object (NativeAddress/UniversalAddress) to string
            const emitterAddress = typeof firstMessage.emitter === 'object'
                ? firstMessage.emitter.toString()
                : String(firstMessage.emitter);

            // Use SDK's isChain guard if available, otherwise basic check
            // Assuming 'Chain' type includes all possible valid chain names
            const isValidChain = typeof firstMessage.chain === 'string'; // Basic check, replace with isChain if imported

            if (!isValidChain) {
                 console.warn("Extracted chain is not a valid Chain type:", firstMessage.chain);
                 return undefined;
            }

            // Return object matching our local WormholeMessageId interface (emitter: string)
            return {
                chain: firstMessage.chain, // Assuming firstMessage.chain is already correct Chain type
                emitter: emitterAddress,
                sequence: BigInt(firstMessage.sequence)
            };
        }
    }

    // Fallback check for other potential structures (like { id: { chain, emitter, sequence } })
    if (attestationReceipt.id &&
        typeof attestationReceipt.id === 'object' &&
        'chain' in attestationReceipt.id &&
        'emitter' in attestationReceipt.id &&
        'sequence' in attestationReceipt.id) {

       const emitterAddress = typeof attestationReceipt.id.emitter === 'object'
           ? attestationReceipt.id.emitter.toString()
           : String(attestationReceipt.id.emitter);

        const isValidChain = typeof attestationReceipt.id.chain === 'string'; // Basic check

       if (!isValidChain) {
            console.warn("Extracted chain is not a valid Chain type:", attestationReceipt.id.chain);
            return undefined;
       }

        // Return object matching our local WormholeMessageId interface (emitter: string)
       return {
           chain: attestationReceipt.id.chain,
           emitter: emitterAddress,
           sequence: BigInt(attestationReceipt.id.sequence)
       };
    }


    console.warn("Could not extract WormholeMessageId from attestation structure:", attestationReceipt);
    return undefined;
}

// Removed unused function parseWormholeMessages and its helper getChainNameFromId
// Removed associated interfaces: WormholescanMessage, WormholescanVaaInfo, WormholescanTxResponse


// Example Usage (Conceptual - needs integration into your UI/hooks)
/*
// Re-import necessary types if uncommenting
// import { SuiClient } from '@mysten/sui.js'; // Example
// import { Connection } from '@solana/web3.js'; // Example
// import { SignAndSendSigner, amount, TokenId, Network, Chain } from '@wormhole-foundation/sdk'; // Example
// import { SuiPlatform } from '@wormhole-foundation/sdk-sui'; // Example
// import { SolanaPlatform } from '@wormhole-foundation/sdk-solana'; // Example

async function exampleBridge<N extends Network, C extends Chain>(
    sourceSigner: SignAndSendSigner<N, C>,
    // suiClient: SuiClient, // Uncomment if needed
    // solConnection: Connection // Uncomment if needed
) {
    const network: N = sourceSigner.network;
    const currentChain: C = sourceSigner.chain;

    // Initialize Wormhole SDK with platforms relevant to the example
    // const wh = new Wormhole(network, [SuiPlatform, SolanaPlatform]); // Uncomment and ensure platforms imported

    // Assign RPC clients if needed
    // const suiContext = wh.getChain("Sui");
    // if (suiContext && suiClient) suiContext.rpc = suiClient;
    // const solContext = wh.getChain("Solana");
    // if (solContext && solConnection) solContext.rpc = solConnection;

    // Example: Define token ID
    // const someTokenAddress = "SOME_TOKEN_ADDRESS_ON_SOURCE_CHAIN";
    // const tokenId: TokenId = Wormhole.tokenId(currentChain, someTokenAddress);

    // Example: Get signer address
    let fromAddressString: string;
    if (typeof sourceSigner.address === 'function') {
        fromAddressString = sourceSigner.address();
    } else if (typeof sourceSigner.address === 'string') {
        fromAddressString = sourceSigner.address;
    } else {
        console.error("Could not get address from signer");
        return;
    }


    const transferRequest: WLLTransferRequest = {
        fromChain: currentChain,
        toChain: "Solana", // Example destination chain
        fromAddress: fromAddressString,
        toAddress: "YOUR_DESTINATION_ADDRESS_ON_SOLANA", // Replace
        // token: tokenId, // Use defined TokenId
        token: "native", // Or transfer native token
        amount: 100000000n, // Example: 1 unit with 8 decimals (use appropriate amount util if available)
        // Ensure 'amount' utils are imported if used like amount.units(...)
    };

    // Re-create Wormhole instance for the call if needed
    const wh = new Wormhole(network, []); // Pass appropriate platforms

    if (wh.network !== network) {
        console.error("Wormhole instance network and signer network mismatch!");
        return;
    }

    const typedWh = wh as Wormhole<N>;

    const result = await initiateWLLTransfer(typedWh, transferRequest, sourceSigner);

    if (result.originTxIds && result.originTxIds.length > 0) {
        console.log("Transfer initiated, TxIDs:", result.originTxIds);
        if (result.attestation) {
            console.log("Attestation received:", result.attestation);
            const messageId = getWormholeMessageId(result.attestation);
            if (messageId) {
                console.log("Wormhole Message ID:", messageId);
                // Tracking logic here
            }
        } else if (result.error) {
             console.warn("Attestation fetching failed:", result.error)
        }
    } else {
        console.error("Transfer failed:", result.error);
    }
}
*/