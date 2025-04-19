import { Wormhole, Chain, Network } from '@wormhole-foundation/sdk';
import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';
import { SuiPlatform } from '@wormhole-foundation/sdk-sui';
import { utils } from 'ethers';
import toast from 'react-hot-toast';
import { CrossChainPoolConfig, PoolCreationReceipt, CURRENT_NETWORK, SupportedChain } from '../types/wormhole';

interface CrossChainLiquidityParams {
  // Pool info
  sourceChain: Chain;
  targetChain: Chain;
  poolId: string; // Target pool ID where liquidity will be added
  
  // Token info
  tokenSymbol: string; // e.g., "USDC", "SOL", "SUI"
  sourceTokenAddress: string; // Token address on source chain
  amount: string; // Human-readable amount
  decimals: number; // Token decimals
  
  // Network components
  wormhole: Wormhole<Network>;
  signer: any; // Adapter from connected wallet
}

/**
 * Adds liquidity to a pool on a target chain using tokens from a source chain.
 * Uses Wormhole Liquidity Layer to bridge the tokens between chains.
 */
export async function addCrossChainLiquidity(params: CrossChainLiquidityParams): Promise<{
  success: boolean;
  sourceChainTxId?: string;
  messageId?: any;
  error?: string;
}> {
  const {
    sourceChain,
    targetChain,
    poolId,
    tokenSymbol,
    sourceTokenAddress,
    amount,
    decimals,
    wormhole,
    signer
  } = params;
  
  try {
    const toastId = toast.loading(`Preparing cross-chain liquidity provision from ${sourceChain} to ${targetChain}...`);
    
    // 1. Parse amount to atomic units
    const amountBigInt = utils.parseUnits(amount, decimals).toBigInt();
    
    // 2. Create TokenId for the source token
    const tokenId = Wormhole.tokenId(sourceChain, sourceTokenAddress);
    
    // 3. Get the destination address (this would be your protocol's pool contract address)
    // Note: In a real implementation, this would be the contract address that receives 
    // the bridged tokens and adds them to the pool
    const targetAddress = poolId; // Simplified; would need proper address formatting
    
    // 4. Create source and destination chain addresses
    const sourceAddress = signer.address();
    
    toast.loading(`Creating transfer from ${sourceChain} to ${targetChain}...`, { id: toastId });
    
    // 5. Log the operation details
    console.log(`Cross-chain liquidity provision: ${amount} ${tokenSymbol}`);
    console.log(`From: ${sourceChain} (${sourceAddress})`);
    console.log(`To pool: ${poolId} on ${targetChain}`);
    
    // 6. Create payload containing pool operation instructions
    // This is crucial - the payload needs to tell the receiving contract what to do with the tokens
    const payload = encodePoolOperationPayload({
      operation: 'addLiquidity',
      poolId,
      tokenAmount: amountBigInt,
      tokenSymbol,
      // Include other necessary parameters for the pool contract
    });
    
    // 7. Create a TokenTransfer using the Wormhole SDK
    const transfer = await wormhole.tokenTransfer(
      tokenId,
      amountBigInt,
      Wormhole.chainAddress(sourceChain, sourceAddress),
      Wormhole.chainAddress(targetChain, targetAddress),
      true, // Automatic delivery
      payload // Include the pool operation instructions
    );
    
    toast.loading(`Please approve the transaction in your wallet...`, { id: toastId });
    
    // 8. Execute the transfer
    const txids = await transfer.initiateTransfer(signer);
    console.log("Cross-chain liquidity transfer initiated:", txids);
    
    toast.success(`Transfer initiated! Tracking attestation...`, { id: toastId });
    
    // 9. Wait for attestation (VAA)
    let attestation;
    try {
      attestation = await transfer.fetchAttestation(60000); // Wait up to 1 minute
      console.log("Attestation received:", attestation);
    } catch (err) {
      console.warn("Could not fetch attestation yet:", err);
      // This is not a fatal error - the transfer is still in progress
    }
    
    // 10. Return success with transaction details
    toast.success(`Liquidity provision initiated! The tokens will be added to the pool once the transfer completes.`, { id: toastId });
    // Get the message ID from the transfer or attestation
    // Extract message ID from transfer result or attestation
    // The Wormhole message ID is a tuple of {chain, emitter, sequence}
    let messageId;
    
    if (attestation && attestation[0]) {
      // If we have an attestation, extract the message ID components from it
      messageId = {
        chain: attestation[0].emitterChain || sourceChain,
        emitter: attestation[0].emitterAddress || "unknown",
        sequence: attestation[0].sequence?.toString() || "unknown"
      };
    } else if (txids && txids[0]) {
      // If no attestation yet, create a partial message ID from the transaction
      // The full message ID will be available after attestation
      messageId = {
        chain: sourceChain,
        emitter: "pending", // Will be populated after attestation
        sequence: "pending"  // Will be populated after attestation
      };
    } else {
      // Fallback if neither is available
      messageId = { 
        chain: sourceChain, 
        sequence: "unknown", 
        emitter: "unknown" 
      };
    }
    
    return {
      success: true,
      sourceChainTxId: txids[0].toString(),
      messageId: messageId
    };
    
  } catch (error: any) {
    console.error("Cross-chain liquidity provision error:", error);
    toast.error(`Failed: ${error.message || String(error)}`);
    
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}

/**
 * Encodes pool operation instructions as a payload for the receiving contract.
 */
function encodePoolOperationPayload(params: {
  operation: 'addLiquidity' | 'removeLiquidity';
  poolId: string;
  tokenAmount: bigint;
  tokenSymbol: string;
}): Uint8Array {
  // This would depend on your contract's expected payload format
  // For example, you might encode:
  // - Operation type (1 byte): 0 = add liquidity, 1 = remove liquidity
  // - Pool ID (32 bytes)
  // - Amount (8 bytes)
  // - Additional parameters
  
  // Example implementation (pseudo-code):
  // Remove unused variable
  // const encoder = new TextEncoder();
  const operationByte = params.operation === 'addLiquidity' ? 0 : 1;
  
  // Create a buffer with appropriate size
  const buffer = new Uint8Array(41); // 1 + 32 + 8 bytes
  
  // Set operation type
  buffer[0] = operationByte;
  
  // Set pool ID (example assumes pool ID is a hex string)
  const poolIdBytes = hexToBytes(params.poolId.replace('0x', ''));
  buffer.set(poolIdBytes.slice(0, 32), 1);
  
  // Set amount (big-endian)
  const amountBytes = bigintToBytes(params.tokenAmount);
  buffer.set(amountBytes, 33);
  
  return buffer;
}

// Helper: Convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Helper: Convert bigint to bytes (8 bytes, big-endian)
function bigintToBytes(value: bigint): Uint8Array {
  const buffer = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    buffer[7 - i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
  }
  return buffer;
}

export async function createCrossChainPool(
  config: CrossChainPoolConfig,
  signers: {
    [key in Chain]: any; // Chain-specific signer type
  }
): Promise<PoolCreationReceipt> {
  const wh = new Wormhole(config.chainA, [SolanaPlatform, SuiPlatform]);
  const receipts: PoolCreationReceipt[] = [];

  try {
    // 1. Her iki zincirde havuz oluştur
    const [chainAReceipt, chainBReceipt] = await Promise.all([
      createPoolOnChain(config.chainA, config, signers[config.chainA]),
      createPoolOnChain(config.chainB, config, signers[config.chainB])
    ]);

    // 2. Havuzları birbirine bağla
    const linkReceipt = await linkPools(
      chainAReceipt.poolId,
      chainBReceipt.poolId,
      config,
      signers
    );

    return {
      poolId: `${chainAReceipt.poolId}-${chainBReceipt.poolId}`,
      chain: config.chainA,
      txIds: [...chainAReceipt.txIds, ...chainBReceipt.txIds],
      wormholeMessages: [...chainAReceipt.wormholeMessages, ...chainBReceipt.wormholeMessages]
    };
  } catch (error) {
    console.error('Cross-chain pool creation failed:', error);
    throw new Error(`Failed to create cross-chain pool: ${error.message}`);
  }
}

async function createPoolOnChain(
  chain: SupportedChain,
  config: CrossChainPoolConfig,
  signer: any
): Promise<PoolCreationReceipt> {
  const wh = new Wormhole(CURRENT_NETWORK, [SolanaPlatform, SuiPlatform]);
  const platform = wh.getChain(chain);
  
  // Platform metodlarını doğru şekilde çağır
  const tx = await platform.createPool({
    tokenA: config.tokenA.toString(),
    tokenB: config.tokenB.toString(),
    feeBps: config.feeBps,
    poolType: config.poolType
  }, signer);

  // Transaction ID'yi doğru şekilde al
  const txIds = [tx.txid instanceof Uint8Array ? 
    Buffer.from(tx.txid).toString('hex') : 
    tx.txid
  ];

  return {
    poolId: tx.poolAddress,
    chain,
    txIds,
    wormholeMessages: tx.messages.map(msg => ({
      chain: msg.chain,
      emitter: msg.emitter.toString(),
      sequence: msg.sequence.toString()
    }))
  };
}

async function linkPools(
  poolA: string,
  poolB: string,
  config: CrossChainPoolConfig,
  signers: any
): Promise<PoolCreationReceipt> {
  const wh = new Wormhole(config.chainA, [SolanaPlatform, SuiPlatform]);
  
  // Her iki zincirde bağlantıyı kur
  const [tx1, tx2] = await Promise.all([
    wh.getChain(config.chainA).linkPool(poolA, poolB, signers[config.chainA]),
    wh.getChain(config.chainB).linkPool(poolB, poolA, signers[config.chainB])
  ]);

  return {
    poolId: `${poolA}-${poolB}`,
    chain: config.chainA,
    txIds: [tx1.txid, tx2.txid],
    wormholeMessages: [
      ...(await parseWormholeMessages(tx1.txid)),
      ...(await parseWormholeMessages(tx2.txid))
    ]
  };
}

async function parseWormholeMessages(txId: string): Promise<WormholeMessageId[]> {
  const response = await fetch(`https://api.wormholescan.io/api/v1/transactions/${txId}`);
  const data = await response.json();
  return data.messages.map(msg => ({
    chain: msg.emitterChain,
    emitter: msg.emitterAddress,
    sequence: msg.sequence.toString()
  }));
} 