import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { CHAIN_ID_SUI, getSignedVAAWithRetry } from '@certusone/wormhole-sdk'; // Import from main package
import { WORMHOLE_RPC_HOSTS } from './constants.ts'; // Add .ts extension

// Define the structure for the parsed Wormhole message details
export interface WormholeMessageInfo {
  sequence: string;
  emitterAddress: string; // Hex format
  emitterChain: number; // Wormhole Chain ID
}

// Define the structure for the bridge tracking result
export interface BridgeTrackingResult {
  vaaBytes?: Uint8Array;
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
 * and attempts to fetch the corresponding VAA.
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
      (event) => event.type.includes('::bridge_interface::BridgeMessagePublished') // Adjust if module name differs
    );

    if (!wormholePublishEvent || !wormholePublishEvent.parsedJson) {
      throw new Error('Wormhole publish message event not found in transaction details.');
    }

    // 3. Extract sequence and emitter address
    // Adjust field names based on your actual event structure
    // Use type assertion for better safety
    const parsedEventData = wormholePublishEvent.parsedJson as BridgeMessagePublishedEvent | undefined;
    const sequence = parsedEventData?.sequence?.toString();

    // Emitter address is usually the package ID or a specific object ID
    // For now, let's assume the sender_pool_id or similar field holds the emitter concept
    // This needs verification based on how your contract publishes messages.
    // Let's assume the emitter is the package ID for now, needs confirmation.
    const emitterAddressHex = wormholePublishEvent.packageId.replace('0x', ''); // Example: Using package ID as emitter

    if (!sequence) {
        console.error("Could not find sequence in event JSON:", parsedEventData);
        throw new Error('Could not extract sequence from Wormhole event.');
    }
    if (!emitterAddressHex) {
        console.error("Could not determine emitter address from packageId:", wormholePublishEvent.packageId);
        throw new Error('Could not determine emitter address from Wormhole event.');
    }

    const messageInfo: WormholeMessageInfo = {
      sequence,
      emitterAddress: emitterAddressHex,
      emitterChain: CHAIN_ID_SUI,
    };
    console.log("Found Wormhole message:", messageInfo);

    // 4. Fetch the VAA
    console.log(`Attempting to fetch VAA for sequence ${sequence} from emitter ${emitterAddressHex}...`);
    const { vaaBytes } = await getSignedVAAWithRetry(
      WORMHOLE_RPC_HOSTS.Testnet, // Explicitly use Testnet hosts
      CHAIN_ID_SUI,
      emitterAddressHex, // Emitter address in hex format
      sequence,
      { attempts: 5, delay: 1000 } // Retry settings
    );

    console.log("Successfully fetched VAA.");
    return { vaaBytes, wormholeMessageInfo: messageInfo };

  } catch (error: any) {
    console.error(`Error tracking Sui tx ${txDigest} to Wormhole:`, error);
    return { error: error.message || 'Failed to track bridge message or fetch VAA.' };
  }
}

import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';
import { CHAIN_ID_SOLANA, SignedVaa, parseSequenceFromLogSolana } from '@certusone/wormhole-sdk';
import { getEmitterAddressSolana } from '@certusone/wormhole-sdk/lib/esm/bridge'; // Need specific import for emitter

/**
 * Tracks a Solana transaction signature to find the emitted Wormhole message
 * and attempts to fetch the corresponding VAA.
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
    // Need 'confirmed' or 'finalized' commitment for logs to be available
    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0, // Specify version if needed
      commitment: 'confirmed',
    });

    if (!tx || !tx.meta || !tx.meta.logMessages) {
      throw new Error('Transaction details or log messages not found.');
    }

    // 2. Parse sequence number from logs
    const sequence = parseSequenceFromLogSolana(tx);
    if (!sequence) {
      console.error("Logs:", tx.meta.logMessages);
      throw new Error('Could not parse sequence number from Solana transaction logs.');
    }

    // 3. Get the emitter address
    const emitterAddress = await getEmitterAddressSolana(programId); // Derives emitter from program ID
    console.log(`Derived emitter address for program ${programId}: ${emitterAddress}`);

    const messageInfo: WormholeMessageInfo = {
      sequence,
      emitterAddress, // Already in hex format from SDK function
      emitterChain: CHAIN_ID_SOLANA,
    };
    console.log("Found Wormhole message:", messageInfo);

    // 4. Fetch the VAA
    console.log(`Attempting to fetch VAA for sequence ${sequence} from emitter ${emitterAddress}...`);
    const { vaaBytes } = await getSignedVAAWithRetry(
      WORMHOLE_RPC_HOSTS.Testnet, // Explicitly use Testnet hosts
      CHAIN_ID_SOLANA,
      emitterAddress,
      sequence,
      { attempts: 5, delay: 1000 } // Retry settings
    );

    console.log("Successfully fetched VAA.");
    return { vaaBytes, wormholeMessageInfo: messageInfo };

  } catch (error: any) {
    console.error(`Error tracking Solana tx ${txSignature} to Wormhole:`, error);
    return { error: error.message || 'Failed to track bridge message or fetch VAA.' };
  }
}
