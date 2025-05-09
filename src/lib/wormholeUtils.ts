import {
  ChainId,
  // chainToChainId, // Removed
  CHAIN_ID_SUI,
  CHAIN_ID_SOLANA,
  getSignedVAAWithRetry,
  uint8ArrayToHex,
  // parseVaa will be dynamically imported
} from '@certusone/wormhole-sdk';
import { Chain, toChainId as newToChainId, assertChainId } from '@wormhole-foundation/sdk-base'; // Renamed to avoid conflict if ChainId is also from here

/**
 * Converts a chain identifier (name or numeric ID) to the SDK's ChainId type.
 * Handles known chain names and numeric IDs.
 */
export function getChainIdFromIdentifier(chainIdentifier: string | number): ChainId {
  if (typeof chainIdentifier === 'number') {
    // Assume it's already a ChainId and assert its validity
    assertChainId(chainIdentifier as ChainId);
    return chainIdentifier as ChainId;
  }
  if (typeof chainIdentifier === 'string') {
    // Use toChainId from @wormhole-foundation/sdk-base
    try {
      // Cast to `Chain` type which is expected by newToChainId
      // Also cast the result to the @certusone/wormhole-sdk ChainId type
      return newToChainId(chainIdentifier as Chain) as ChainId;
    } catch (e) {
      // Fallback for common lowercase names if newToChainId is strict or input is not exact
      const lowerId = chainIdentifier.toLowerCase();
      if (lowerId === "sui") return CHAIN_ID_SUI;
      if (lowerId === "solana") return CHAIN_ID_SOLANA;
      throw new Error(`Unknown or unsupported chain string: ${chainIdentifier}. Original error: ${e}`);
    }
  }
  throw new Error(`Invalid chain identifier type: ${typeof chainIdentifier}`);
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