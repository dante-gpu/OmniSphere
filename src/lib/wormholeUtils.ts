import {
  ChainId,
  chainToChainId,
  CHAIN_ID_SUI,
  CHAIN_ID_SOLANA,
  getSignedVAAWithRetry,
  uint8ArrayToHex,
  // parseVaa will be dynamically imported
} from '@certusone/wormhole-sdk';
import { Buffer } from 'buffer'; // Ensure Buffer is available

/**
 * Converts a chain identifier (name or numeric ID) to the SDK's ChainId type.
 * Handles known chain names and numeric IDs.
 */
export function getChainIdFromIdentifier(chainIdentifier: string | number): ChainId {
  if (typeof chainIdentifier === 'number') {
    // Check if the number is a valid ChainId value (e.g., 1 for Solana, 21 for Sui)
    const isValidChainIdNumber = Object.values(chainToChainId as Record<string, number>).includes(chainIdentifier);
    if (isValidChainIdNumber) {
      return chainIdentifier as ChainId;
    }
  } else if (typeof chainIdentifier === 'string') {
    // Try parsing as a number first
    const numericChainId = parseInt(chainIdentifier);
    if (!isNaN(numericChainId)) {
      const isValidNumericString = Object.values(chainToChainId as Record<string, number>).includes(numericChainId);
      if (isValidNumericString) {
        return numericChainId as ChainId;
      }
    }
    // Try matching by name (case-insensitive for common names like "Solana", "Sui")
    // The keys in chainToChainId are like "Solana", "Sui", "Ethereum"
    const foundChainName = Object.keys(chainToChainId).find(
      (key) => key.toLowerCase() === chainIdentifier.toLowerCase()
    );
    if (foundChainName) {
      return chainToChainId[foundChainName as keyof typeof chainToChainId];
    }
  }
  // Fallback for specific known ChainId constants if not in chainToChainId mapping by name
  // This handles cases like "sui" vs Sui's actual ChainId constant if map is incomplete.
  if (String(chainIdentifier).toLowerCase() === "sui" || chainIdentifier === CHAIN_ID_SUI) return CHAIN_ID_SUI;
  if (String(chainIdentifier).toLowerCase() === "solana" || chainIdentifier === CHAIN_ID_SOLANA) return CHAIN_ID_SOLANA;

  throw new Error(`Unsupported or unknown chain identifier: ${chainIdentifier}. Could not map to a valid ChainId.`);
}

/**
 * Fetches the signed VAA bytes using information typically found in a Wormholescan link.
 */
export async function fetchVaaBytesFromInfo(
  rpcHosts: string[],
  rawChainIdentifier: string | number,
  rawEmitterAddress: string,
  sequence: string
): Promise<Uint8Array | null> {
  try {
    const chainId = getChainIdFromIdentifier(rawChainIdentifier);

    let emitterAddress = rawEmitterAddress;
    if (emitterAddress.startsWith('0x')) {
      emitterAddress = emitterAddress.substring(2);
    }
    // Emitter address padding (e.g., for EVM chains to be 32 bytes / 64 hex chars)
    // For Sui, package IDs are usually the correct length.
    // if (chainId === CHAIN_ID_ETHEREUM || chainId === CHAIN_ID_BSC) { // Example
    //   emitterAddress = emitterAddress.padStart(64, '0');
    // }


    console.log(`Requesting VAA: ChainID=${chainId}, Emitter=${emitterAddress}, Sequence=${sequence}`);

    const { vaaBytes } = await getSignedVAAWithRetry(
      rpcHosts,
      chainId,
      emitterAddress,
      sequence,
      { retryAttempts: 5, retryDelay: 2000 } // Configuration for retries
    );

    console.log('Fetched VAA Bytes (hex):', uint8ArrayToHex(vaaBytes));
    return vaaBytes;
  } catch (error) {
    console.error('Error fetching VAA bytes:', error);
    throw error; // Re-throw to be caught by the caller
  }
}

/**
 * Parses the VAA bytes and returns the VAA's hash as a hex string.
 * This hash represents the digest of the VAA body signed by guardians.
 */
export async function getVaaHashFromBytes(vaaBytes: Uint8Array): Promise<string | null> {
  try {
    const { parseVaa } = await import('@certusone/wormhole-sdk'); // Dynamic import
    const parsedVaa = parseVaa(vaaBytes);

    // parsedVaa.hash is a Buffer. Convert it to a hex string.
    const vaaHashHex = parsedVaa.hash.toString('hex');
    console.log('Parsed VAA Hash (hex):', vaaHashHex);
    return vaaHashHex;
  } catch (error) {
    console.error('Error parsing VAA or getting hash:', error);
    throw error; // Re-throw
  }
}

/**
 * High-level function to get the "verified VAA hash" from a Wormholescan link.
 * Parses the URL, fetches VAA bytes, and then computes the hash.
 */
export async function getVerifiedHashFromWormholescanLink(
  wormholescanUrl: string,
  rpcHosts: string[] // Pass RPC hosts
): Promise<string | null> {
  try {
    console.log(`Processing Wormholescan URL: ${wormholescanUrl}`);
    const linkPattern = /#\/vaa\/([^/]+)\/([^/]+)\/([^/?#]+)/;
    const match = wormholescanUrl.match(linkPattern);

    if (!match || match.length < 4) {
      throw new Error('Invalid Wormholescan URL format. Expected: .../vaa/<chain>/<emitter>/<sequence>');
    }

    const chainIdentifier = match[1];
    const emitterAddress = match[2];
    const sequence = match[3];

    console.log(`Parsed from URL - Chain: ${chainIdentifier}, Emitter: ${emitterAddress}, Sequence: ${sequence}`);

    const vaaBytes = await fetchVaaBytesFromInfo(rpcHosts, chainIdentifier, emitterAddress, sequence);

    if (vaaBytes) {
      const verifiedVaaHash = await getVaaHashFromBytes(vaaBytes);
      return verifiedVaaHash;
    }
    // This path should ideally not be reached if fetchVaaBytesFromInfo throws on error.
    return null;
  } catch (error) {
    console.error("Failed to get verified hash from Wormholescan link:", error);
    throw error; // Re-throw for the calling UI to handle
  }
} 