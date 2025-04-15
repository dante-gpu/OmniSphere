import { SuiClient } from '@mysten/sui.js/client'; // Re-add SuiClient
import { Connection } from '@solana/web3.js'; // Re-add Connection
import { WORMHOLE_RPC_HOSTS } from './constants'; // Re-add RPC Hosts import
import {
    getSignedVAAWithRetry,
    parseVaa,
    ChainId, // Keep ChainId
    CHAIN_ID_SUI, // Keep CHAIN_ID_SUI
    CHAIN_ID_SOLANA, // Keep CHAIN_ID_SOLANA
    nativeToHexString, // Keep nativeToHexString
} from '@certusone/wormhole-sdk'; // Ensure these are imported

// Define the structure for the parsed Wormhole message details
// Using types from @certusone/wormhole-sdk
export interface WormholeMessageInfo {
  sequence: bigint; // Keep bigint for sequence
  emitterAddress: string; // Use hex string for emitter address
  emitterChain: ChainId; // Use ChainId enum/type
}

// Define the structure for the bridge tracking result
// Adjust VAA type based on parseVaa return type
export interface BridgeTrackingResult {
  vaa?: ReturnType<typeof parseVaa>; // Use inferred type from parseVaa
  vaaBytes?: Uint8Array; // Keep raw bytes
  wormholeMessageInfo?: WormholeMessageInfo;
  error?: string;
}


// Define the expected structure of the parsed JSON from the Sui event
// Adjust field names based on your actual Move event struct
interface BridgeMessagePublishedEvent {
    sequence?: string | number; // Can be string or number depending on parsing
    sender_pool_id?: string; // Example field
    // Add other fields from your event struct if needed
}

/**
 * Tracks a Sui transaction digest to find the emitted Wormhole message
 * and attempts to fetch the corresponding VAA using @certusone/wormhole-sdk.
 * @param suiClient Initialized SuiClient
 * @param txDigest The transaction digest to track
 * @returns Promise<BridgeTrackingResult>
 */
export async function trackSuiToWormhole(
  suiClient: SuiClient,
  txDigest: string
): Promise<BridgeTrackingResult> {
  console.log(`Tracking Sui tx ${txDigest} for Wormhole message...`);
  try {
    // 1. Fetch transaction details
    const txDetails = await suiClient.getTransactionBlock({
      digest: txDigest,
      options: { showEvents: true }, // Ensure events are included
    });

    if (!txDetails || !txDetails.events || txDetails.events.length === 0) {
      throw new Error('Transaction details or events not found.');
    }

    // 2. Find the Wormhole publish_message event
    // Adjust the event type based on your actual contract event structure
    // Example: Assuming your bridge_interface emits an event like 'BridgeMessagePublished'
    // from the package ID defined earlier.
    const wormholePublishEvent = txDetails.events.find(
      (event: any) => event.type.includes('::bridge_interface::BridgeMessagePublished') // Add explicit 'any' type for now, or use a more specific type if available from Sui SDK
    );

    if (!wormholePublishEvent || !wormholePublishEvent.parsedJson) {
      throw new Error('Wormhole publish message event not found in transaction details.');
    }

    // 3. Extract sequence and emitter address
    // Adjust field names based on your actual event structure
    // Use type assertion for better safety
    const parsedEventData = wormholePublishEvent.parsedJson as BridgeMessagePublishedEvent | undefined;
    const sequence = parsedEventData?.sequence?.toString();

    // Emitter address should be derived from the contract logic.
    // Assuming the 'sender_pool_id' field in the event represents the object
    // that logically emitted the message via the bridge_interface.
    const sequenceBigInt = BigInt(parsedEventData?.sequence?.toString() ?? '-1');
    const emitterAddressStr = parsedEventData?.sender_pool_id; // Assuming this is the native Sui address

    if (sequenceBigInt === -1n) {
        console.error("Could not find sequence in event JSON:", parsedEventData);
        throw new Error('Could not extract sequence from Wormhole event.');
    }
    if (!emitterAddressStr) {
        console.error("Could not determine emitter address (sender_pool_id) from event JSON:", parsedEventData);
        throw new Error('Could not determine emitter address from Wormhole event.');
    }

    // Convert native Sui address to hex string expected by old SDK
    const emitterAddressHex = nativeToHexString(emitterAddressStr, CHAIN_ID_SUI);
    if (!emitterAddressHex) {
        throw new Error(`Could not convert Sui address ${emitterAddressStr} to hex string.`);
    }

    const messageInfo: WormholeMessageInfo = {
      sequence: sequenceBigInt,
      emitterAddress: emitterAddressHex, // Store hex string
      emitterChain: CHAIN_ID_SUI, // Use ChainId constant
    };
    console.log("Found Wormhole message:", messageInfo);

    // 4. Fetch the VAA using getSignedVAAWithRetry from @certusone/wormhole-sdk
    console.log(`Attempting to fetch VAA for sequence ${messageInfo.sequence} from emitter ${messageInfo.emitterAddress} on chain ${messageInfo.emitterChain}...`);

    // Assuming Testnet for now, adjust if needed based on context/config
    const rpcHosts = WORMHOLE_RPC_HOSTS.Testnet;
    if (!rpcHosts || rpcHosts.length === 0) {
        throw new Error("Testnet WORMHOLE_RPC_HOSTS not configured in constants.ts");
    }

    let vaaBytes: Uint8Array;
    let vaa: ReturnType<typeof parseVaa> | undefined = undefined;

    try {
        // Fetch VAA bytes using the retry mechanism
        const result = await getSignedVAAWithRetry(
            rpcHosts,
            messageInfo.emitterChain,
            messageInfo.emitterAddress,
            messageInfo.sequence.toString(), // Sequence needs to be string for this function
            {
                // Optional: Add retry options if needed
                // attempts: 5,
                // delay: 1000,
            }
        );
        vaaBytes = result.vaaBytes;
    } catch (fetchError: any) {
        console.error(`Failed to fetch VAA after retries:`, fetchError);
        throw new Error(`Failed to fetch VAA after retries: ${fetchError?.message || fetchError}`);
    }

    // Parse the VAA bytes
    try {
        vaa = parseVaa(vaaBytes); // Use parseVaa from @certusone/wormhole-sdk
        console.log("Successfully fetched and parsed VAA.");
    } catch (parseError: any) {
        console.error("Failed to parse fetched VAA bytes:", parseError);
        // Still return bytes even if parsing fails, but include error
        return { vaaBytes: vaaBytes, wormholeMessageInfo: messageInfo, error: `Failed to parse VAA: ${parseError.message || parseError}` };
    }

    // Return parsed VAA and raw bytes
    return { vaa, vaaBytes, wormholeMessageInfo: messageInfo };

  } catch (error: any) {
    console.error(`Error tracking Sui tx ${txDigest} to Wormhole:`, error);
    return { error: error.message || 'Failed to track bridge message or fetch VAA.' };
  }
}

/**
 * Tracks a Solana transaction signature to find the emitted Wormhole message
 * and attempts to fetch the corresponding VAA using @certusone/wormhole-sdk.
 * @param connection Initialized Solana Connection
 * @param txSignature The transaction signature to track
 * @param programId The Solana program ID that emitted the message (used to derive emitter address)
 * @returns Promise<BridgeTrackingResult>
 */
export async function trackSolanaToWormhole(
  connection: Connection,
  txSignature: string,
  programId: string // Pass the program ID string
): Promise<BridgeTrackingResult> {
  console.log(`Tracking Solana tx ${txSignature} for Wormhole message...`);
  try {
    // 1. Fetch transaction details using getTransaction
    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0, // Specify version if needed
      commitment: 'confirmed',
    });

    if (!tx || !tx.meta || !tx.meta.logMessages) {
      throw new Error('Transaction details or log messages not found.');
    }

    // 2. Manually parse sequence from logs (common pattern)
    let sequence: string | null = null;
    const sequenceLogPrefix = "Sequence: ";
    for (const log of tx.meta.logMessages) {
        const idx = log.indexOf(sequenceLogPrefix);
        if (idx > -1) {
            sequence = log.substring(idx + sequenceLogPrefix.length);
            break;
        }
    }
    if (!sequence) {
      console.error("Logs:", tx.meta.logMessages);
      throw new Error('Could not parse sequence number from Solana transaction logs.');
    }
    const sequenceBigInt = BigInt(sequence);


    // 3. Get the emitter address hex string using old SDK
    // This assumes the programId is the native Solana address string
    const emitterAddressHex = nativeToHexString(programId, CHAIN_ID_SOLANA);
     if (!emitterAddressHex) {
        throw new Error(`Could not convert Solana program ID ${programId} to hex string.`);
    }
    console.log(`Derived emitter address for program ${programId}: ${emitterAddressHex}`);

    const messageInfo: WormholeMessageInfo = {
      sequence: sequenceBigInt,
      emitterAddress: emitterAddressHex, // Store hex string
      emitterChain: CHAIN_ID_SOLANA, // Use ChainId constant
    };
     console.log("Found Wormhole message:", messageInfo);

    // 4. Fetch the VAA using getSignedVAAWithRetry (similar to Sui)
    console.log(`Attempting to fetch VAA for sequence ${messageInfo.sequence} from emitter ${messageInfo.emitterAddress} on chain ${messageInfo.emitterChain}...`);

    // Assuming Testnet for now
    const rpcHosts = WORMHOLE_RPC_HOSTS.Testnet;
     if (!rpcHosts || rpcHosts.length === 0) {
        throw new Error("Testnet WORMHOLE_RPC_HOSTS not configured in constants.ts");
    }

    let vaaBytes: Uint8Array;
    let vaa: ReturnType<typeof parseVaa> | undefined = undefined;

    try {
        // Fetch VAA bytes using the retry mechanism
        const result = await getSignedVAAWithRetry(
            rpcHosts,
            messageInfo.emitterChain,
            messageInfo.emitterAddress,
            messageInfo.sequence.toString(), // Sequence needs to be string
             {
                // Optional: Add retry options if needed
                // attempts: 5,
                // delay: 1000,
            }
        );
        vaaBytes = result.vaaBytes;
    } catch (fetchError: any) {
        console.error(`Failed to fetch VAA after retries:`, fetchError);
        throw new Error(`Failed to fetch VAA after retries: ${fetchError?.message || fetchError}`);
    }

    // Parse the VAA bytes
    try {
        vaa = parseVaa(vaaBytes); // Use parseVaa from @certusone/wormhole-sdk
        console.log("Successfully fetched and parsed VAA.");
    } catch (parseError: any) {
        console.error("Failed to parse fetched VAA bytes:", parseError);
         // Still return bytes even if parsing fails, but include error
        return { vaaBytes: vaaBytes, wormholeMessageInfo: messageInfo, error: `Failed to parse VAA: ${parseError.message || parseError}` };
    }

    // Return parsed VAA and raw bytes
    return { vaa, vaaBytes, wormholeMessageInfo: messageInfo };

  } catch (error: any) {
    console.error(`Error tracking Solana tx ${txSignature} to Wormhole:`, error);
    return { error: error.message || 'Failed to track bridge message or fetch VAA.' };
  }
}
