import { 
    Wormhole, 
    Chain, 
    Network, 
    ChainContext, // Keep for module augmentation, even if unused warning appears
    TokenId, 
    isChain, 
    NativeAddress, // Keep type import if needed elsewhere, but value usage is removed
    ChainAddress, 
    UniversalAddress // Import UniversalAddress as it's part of ChainAddress type
  } from '@wormhole-foundation/sdk';
  // Import chain constants/helpers from sdk-definitions
  import { chainIdToName } from '@wormhole-foundation/sdk-definitions'; // Corrected import location
  import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';
  import { SuiPlatform } from '@wormhole-foundation/sdk-sui';
  import { utils } from 'ethers';
  import toast from 'react-hot-toast';
  import { 
    PoolCreationReceipt, 
    CURRENT_NETWORK, 
    SupportedChain, 
    CrossChainPoolConfig 
  } from '../types/wormhole'; 
  
  // Local definition for Wormhole Message ID structure
  export interface WormholeMessageId {
    chain: Chain;
    emitter: string; 
    sequence: bigint;
  }
  
  interface CrossChainLiquidityParams {
    sourceChain: SupportedChain; 
    targetChain: SupportedChain; 
    poolId: string; // Target pool ID (native address string)
    tokenSymbol: string; 
    sourceTokenAddress: string; // Token address string on source chain
    amount: string; 
    decimals: number; 
    wormhole: Wormhole<Network>; 
    signer: any; 
  }
  
  /**
   * Adds liquidity to a pool on a target chain using tokens from a source chain.
   * Uses Wormhole Liquidity Layer to bridge the tokens between chains.
   */
  export async function addCrossChainLiquidity(params: CrossChainLiquidityParams): Promise<{
    success: boolean;
    sourceChainTxId?: string;
    messageId?: WormholeMessageId; 
    error?: string;
  }> {
    const {
      sourceChain,
      targetChain,
      poolId, // Expecting native address string
      tokenSymbol,
      sourceTokenAddress, // Expecting native address string
      amount,
      decimals,
      wormhole,
      signer
    } = params;
    
    try {
      const toastId = toast.loading(`Preparing cross-chain liquidity provision from ${sourceChain} to ${targetChain}...`);
      
      // 1. Parse amount to atomic units
      const amountBigInt = utils.parseUnits(amount, decimals).toBigInt();
      
      // 2. Create TokenId using SDK utility
      // This handles creating the NativeAddress internally
      const tokenId: TokenId = Wormhole.tokenId(sourceChain, sourceTokenAddress); 
      
      // 3. Get the destination ChainAddress using SDK utility
      // This handles creating NativeAddress or UniversalAddress internally
      const targetChainAddress: ChainAddress = Wormhole.chainAddress(targetChain, poolId);
  
      // 4. Get source ChainAddress using SDK utility
      const sourceAddressString = await signer.address(); 
      const sourceChainAddress: ChainAddress = Wormhole.chainAddress(sourceChain, sourceAddressString);
      
      toast.loading(`Creating transfer from ${sourceChain} to ${targetChain}...`, { id: toastId });
      
      // 5. Log the operation details
      console.log(`Cross-chain liquidity provision: ${amount} ${tokenSymbol}`);
      console.log(`From: ${sourceChain} (${sourceAddressString})`); 
      console.log(`To pool: ${poolId} on ${targetChain}`);
      
      // 6. Create payload 
      const payload = encodePoolOperationPayload({
        operation: 'addLiquidity',
        poolId, 
        tokenAmount: amountBigInt,
        tokenSymbol,
      });
      
      // 7. Create a TokenTransfer using the Wormhole SDK
      const transfer = await wormhole.tokenTransfer(
        tokenId, // Use the TokenId created by the utility
        amountBigInt,
        sourceChainAddress, // Use the ChainAddress created by the utility
        targetChainAddress, // Use the ChainAddress created by the utility
        true, 
        payload 
      );
      
      toast.loading(`Please approve the transaction in your wallet...`, { id: toastId });
      
      // 8. Execute the transfer
      const txids = await transfer.initiateTransfer(signer); 
      console.log("Cross-chain liquidity transfer initiated:", txids);
      const sourceTxId = txids[0]?.toString(); 
      
      toast.success(`Transfer initiated! Tracking attestation...`, { id: toastId });
      
      // 9. Wait for attestation (VAA)
      // The emitter type in the SDK's MessageId might be UniversalAddress or NativeAddress
      let fetchedMessageIds: { chain: Chain, emitter: UniversalAddress | NativeAddress<Chain>, sequence: bigint }[] | undefined;
      try {
        fetchedMessageIds = await transfer.fetchAttestation(120_000); 
        console.log("Attestation received, SDK Message IDs:", fetchedMessageIds);
      } catch (err) {
        console.warn("Could not fetch attestation yet:", err);
      }
      
      // 10. Return success with transaction details
      toast.success(`Liquidity provision initiated! The tokens will be added to the pool once the transfer completes.`, { id: toastId });
      
      let messageId: WormholeMessageId | undefined = undefined;
      
      if (fetchedMessageIds && fetchedMessageIds.length > 0) {
        const sdkMessageId = fetchedMessageIds[0];
        messageId = {
          chain: sdkMessageId.chain,
          // Convert the emitter address object (Native or Universal) to string
          emitter: sdkMessageId.emitter.toString(), 
          sequence: sdkMessageId.sequence 
        };
      } else {
         messageId = {
           chain: sourceChain,
           emitter: "pending_attestation", 
           sequence: BigInt(-1) 
         };
      }
      
      return {
        success: true,
        sourceChainTxId: sourceTxId, 
        messageId: messageId 
      };
      
    } catch (error: any) {
      console.error("Cross-chain liquidity provision error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Encodes pool operation instructions as a payload for the receiving contract.
   * IMPORTANT: Placeholder - adjust rigorously based on contract ABI.
   */
  function encodePoolOperationPayload(params: {
    operation: 'addLiquidity' | 'removeLiquidity';
    poolId: string; 
    tokenAmount: bigint;
    tokenSymbol: string; 
  }): Uint8Array {
    const operationByte = params.operation === 'addLiquidity' ? 0 : 1;
    let poolIdBytes: Uint8Array;
    try {
      // Assuming poolId is hex address suitable for target chain payload
      const cleanHexPoolId = params.poolId.startsWith('0x') ? params.poolId.substring(2) : params.poolId;
      // Example check for EVM-style address (32 bytes / 64 hex) - ADJUST FOR OTHER CHAINS
      if (cleanHexPoolId.length !== 64) { 
         console.warn(`Pool ID format (${params.poolId}) might not be 32 bytes hex. Ensure it's correct for the target payload.`);
         // Attempt to pad or handle differently if necessary, or throw error
         // throw new Error(`Invalid Pool ID format for hex encoding: ${params.poolId}. Expected 32 bytes (64 hex chars).`);
      }
      // Use the potentially non-standard length hex string
      poolIdBytes = hexToBytes(cleanHexPoolId); 
      // If padding to 32 bytes is ALWAYS required:
      // poolIdBytes = hexToBytes(cleanHexPoolId.padStart(64, '0')); 
  
    } catch (e) {
       console.error("Failed to encode Pool ID:", e);
       throw new Error(`Cannot encode invalid Pool ID: ${params.poolId}`); 
    }
  
    // Adjust buffer size if poolIdBytes is not 32 bytes
    const buffer = new Uint8Array(1 + poolIdBytes.length + 8); // 1 (op) + poolId length + 8 (amount)
    const dataView = new DataView(buffer.buffer);
    dataView.setUint8(0, operationByte);
    buffer.set(poolIdBytes, 1); // Offset by 1 byte
    // Set amount (big-endian) at the correct offset
    dataView.setBigUint64(1 + poolIdBytes.length, params.tokenAmount, false); 
    console.log("Encoded Payload:", buffer); 
    return buffer;
  }
  
  // Helper: Convert hex string to bytes
  function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      // Pad with leading zero if odd length? Depends on contract expectation.
      // hex = '0' + hex; 
      throw new Error("Hex string must have an even length");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substr(i, 2), 16);
      if (isNaN(byte)) {
          throw new Error(`Invalid hex character in string: ${hex}`);
      }
      bytes[i / 2] = byte;
    }
    return bytes;
  }
  
  
  // ----- Pool Creation and Linking -----
  
  export async function createCrossChainPool(
    config: CrossChainPoolConfig,
    signers: { [K in SupportedChain]?: any } 
  ): Promise<PoolCreationReceipt> { 
    
    const signerA = signers[config.chainA as SupportedChain]; 
    const signerB = signers[config.chainB as SupportedChain]; 
    if (!signerA || !signerB) {
      throw new Error(`Signers for both chains (${config.chainA}, ${config.chainB}) are required.`);
    }
  
    try {
      const [chainAReceipt, chainBReceipt] = await Promise.all([
        createPoolOnChain(config.chainA as SupportedChain, config, signerA),
        createPoolOnChain(config.chainB as SupportedChain, config, signerB)
      ]);
  
      console.log(`Pool created on ${config.chainA}: ${chainAReceipt.poolId}`);
      console.log(`Pool created on ${config.chainB}: ${chainBReceipt.poolId}`);
  
      const linkReceipt = await linkPools(
        chainAReceipt.poolId,
        chainBReceipt.poolId,
        config, 
        signers 
      );
      
      console.log(`Pools linked. Link Txs: ${linkReceipt.txIds.join(', ')}`);
  
      const finalPoolId = `${config.chainA}-${chainAReceipt.poolId}/${config.chainB}-${chainBReceipt.poolId}`;
  
      return {
        poolId: finalPoolId, 
        chain: config.chainA, 
        txIds: [
          ...chainAReceipt.txIds, 
          ...chainBReceipt.txIds, 
          ...linkReceipt.txIds 
        ],
        wormholeMessages: [
          ...chainAReceipt.wormholeMessages, 
          ...chainBReceipt.wormholeMessages,
          ...linkReceipt.wormholeMessages 
        ]
      };
    } catch (error: any) {
      console.error('Cross-chain pool creation failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create cross-chain pool: ${message}`);
    }
  }
  
  async function createPoolOnChain(
    chain: SupportedChain, 
    config: CrossChainPoolConfig,
    signer: any 
  ): Promise<PoolCreationReceipt> { 
    const wh = new Wormhole(CURRENT_NETWORK, [SolanaPlatform, SuiPlatform]);
    const platform = wh.getChain(chain); 
  
    try {
      if (!platform.createPool) {
          throw new Error(`createPool method not implemented for chain ${chain}`);
      }
  
      // Use Wormhole.tokenId to get the TokenId object, then potentially get the string address if needed
      const tokenA_tokenId = Wormhole.tokenId(config.tokenA.chain, config.tokenA.address.toString());
      const tokenB_tokenId = Wormhole.tokenId(config.tokenB.chain, config.tokenB.address.toString());
  
      const txResult = await platform.createPool({
        // Pass the string representation of the token address
        tokenA: tokenA_tokenId.address.toString(), 
        tokenB: tokenB_tokenId.address.toString(), 
        feeBps: config.feeBps,
        poolType: config.poolType
      }, signer); 
  
      return {
        poolId: txResult.poolAddress,
        chain: chain,
        txIds: [txResult.txid],
        // Map SDK's internal MessageId structure (returned by createPool) to local structure
        wormholeMessages: txResult.messages.map(msg => ({ 
          chain: msg.chain, 
          emitter: msg.emitter.toString(), // Convert NativeAddress/UniversalAddress to string
          sequence: msg.sequence 
        }))
      };
    } catch(error) {
       console.error(`Failed to create pool on ${chain}:`, error);
       throw error; 
    }
  }
  
  async function linkPools(
    poolA: string, 
    poolB: string, 
    config: CrossChainPoolConfig, 
    signers: { [K in SupportedChain]?: any } 
  ): Promise<PoolCreationReceipt> { 
    const wh = new Wormhole(CURRENT_NETWORK, [SolanaPlatform, SuiPlatform]);
    
    const chainA = config.chainA as SupportedChain;
    const chainB = config.chainB as SupportedChain;
    const chainAContext = wh.getChain(chainA);
    const chainBContext = wh.getChain(chainB);
  
    const signerA = signers[chainA];
    const signerB = signers[chainB];
    if (!signerA || !signerB) {
      throw new Error("Missing signers for linking pools.");
    }
  
    try {
      if (!chainAContext.linkPools) {
          throw new Error(`linkPools method not implemented for chain ${chainA}`);
      }
      if (!chainBContext.linkPools) {
          throw new Error(`linkPools method not implemented for chain ${chainB}`);
      }
  
      const [tx1Result, tx2Result] = await Promise.all([
        chainAContext.linkPools(poolA, poolB, chainB, signerA), 
        chainBContext.linkPools(poolB, poolA, chainA, signerB) 
      ]);
  
      const combinedTxIds = [tx1Result.txid, tx2Result.txid];
      // Map SDK's internal MessageId structure (returned by linkPools) to local structure
      const combinedMessages = [
        ...tx1Result.messages.map(msg => ({ chain: msg.chain, emitter: msg.emitter.toString(), sequence: msg.sequence })),
        ...tx2Result.messages.map(msg => ({ chain: msg.chain, emitter: msg.emitter.toString(), sequence: msg.sequence }))
      ];
      
      // Optional Wormholescan Parsing (kept enabled)
      let parsedMessages: WormholeMessageId[] = [];
      try {
         console.log("Attempting to parse messages from Wormholescan for linking txs...");
         const parsed1 = await parseWormholeMessages(String(tx1Result.txid));
         const parsed2 = await parseWormholeMessages(String(tx2Result.txid));
         parsedMessages = [...parsed1, ...parsed2];
         console.log("Parsed messages from Wormholescan:", parsedMessages);
      } catch (parseError) {
         console.warn(`Failed to parse messages from Wormholescan for link txs: ${combinedTxIds.join(', ')}`, parseError);
      }
  
      return {
        poolId: `link-${poolA}-${poolB}`, 
        chain: config.chainA, 
        txIds: combinedTxIds,
        wormholeMessages: combinedMessages // Defaulting to SDK messages
      };
    } catch(error) {
        console.error(`Failed to link pools ${poolA} and ${poolB}:`, error);
        throw error; 
    }
  }
  
  // Interface for the expected structure of a message from Wormholescan API (adjust as needed)
  interface WormholescanMessage {
    emitterChain: number; 
    emitterAddress: string;
    sequence: string; 
  }
  
  // Interface for the expected structure of the VAA section within Wormholescan API response
  interface WormholescanVaaInfo {
      emitterChain: number;
      emitterAddr?: string; 
      emitterAddress?: string;
      sequence: string;
  }
  
  // Interface for the overall Wormholescan Transaction API response structure (simplified)
  interface WormholescanTxResponse {
      vaa?: WormholescanVaaInfo; 
      data?: { 
          vaa?: WormholescanVaaInfo;
      };
      messages?: WormholescanMessage[]; 
  }
  
  
  // Optional: Parsing messages via WormholeScan API
  async function parseWormholeMessages(txId: string): Promise<WormholeMessageId[]> {
    const apiUrl = `https://api.wormholescan.io/api/v1/transactions/${txId}`; 
    console.log(`Workspaceing messages from Wormholescan: ${apiUrl}`);
  
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
         throw new Error(`Wormholescan API request failed for tx ${txId}: ${response.status} ${response.statusText}`);
      }
      const data: WormholescanTxResponse = await response.json(); 
  
      const vaaInfo = data.vaa || data.data?.vaa;
  
      if (vaaInfo && typeof vaaInfo.sequence === 'string') { 
          // Use chainIdToName from sdk-definitions
          const chainName = chainIdToName(vaaInfo.emitterChain); 
          if (!isChain(chainName)) {
              // Handle cases where chainId might not be known to the SDK version
               console.warn(`Unknown emitter chain ID from API: ${vaaInfo.emitterChain}. Cannot map to chain name.`);
               // Return empty or a placeholder depending on requirements
               return []; 
               // OR: throw new Error(`Unknown emitter chain ID from API: ${vaaInfo.emitterChain}`);
          }
  
          return [{
            chain: chainName, 
            emitter: vaaInfo.emitterAddr || vaaInfo.emitterAddress || "unknown_emitter", 
            sequence: BigInt(vaaInfo.sequence)
          }];
      } else if (data && Array.isArray(data.messages)) { 
          return data.messages.map((msg: WormholescanMessage) => { 
               const chainName = chainIdToName(msg.emitterChain); // Use imported function
               if (!isChain(chainName)) {
                   console.warn(`Unknown emitter chain ID in message: ${msg.emitterChain}`);
                   return null; 
               }
               return {
                   chain: chainName,
                   emitter: msg.emitterAddress,
                   sequence: BigInt(msg.sequence)
               };
          }).filter((msg): msg is WormholeMessageId => msg !== null); 
      } else {
        console.warn("No VAA or messages found in Wormholescan response for tx:", txId, data);
        return []; 
      }
      
    } catch (error: unknown) { 
      console.error(`Error parsing Wormhole messages for tx ${txId}:`, error);
      if (error instanceof Error) {
         console.error("Error details:", error.message);
         throw new Error(`Failed to parse messages for ${txId}: ${error.message}`);
      } else {
         throw new Error(`An unknown error occurred while parsing messages for ${txId}`);
      }
    }
  }
  
  // ----- Platform Specific Method Definitions (Interfaces) -----
  import type { WormholeMessageId as SDKMessageId } from '@wormhole-foundation/sdk-definitions';
  
  interface PoolCreationResult {
    poolAddress: string; 
    txid: string;        
    messages: SDKMessageId[]; 
  }
  
  interface LinkPoolsResult {
    txid: string;        
    messages: SDKMessageId[]; 
  }
  
  interface SolanaPoolCreationParams {
    tokenA: string; 
    tokenB: string;
    feeBps: number;
    poolType: 'stable' | 'volatile'; 
  }
  
  interface SuiPoolCreationParams {
    tokenA: string; 
    tokenB: string;
    feeBps: number;
    poolType: 'stable' | 'volatile';
  }
  
  
  // ----- Module Augmentation for Wormhole SDK -----
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  import type { PlatformContext } from '@wormhole-foundation/sdk-definitions'; // Import PlatformContext if needed for augmentation signature
  
  declare module '@wormhole-foundation/sdk' {
    // Ensure augmentation signature matches SDK's ChainContext definition
    // It might be ChainContext<N extends Network, C extends Chain, P extends PlatformContext<N, C>>
    interface ChainContext<N extends Network, C extends Chain> { // Adjust if PlatformContext needed
  
      createPool: C extends "Solana" 
        ? (params: SolanaPoolCreationParams, signer: any) => Promise<PoolCreationResult> 
        : C extends "Sui" 
        ? (params: SuiPoolCreationParams, signer: any) => Promise<PoolCreationResult> 
        : undefined; 
  
      linkPools: C extends "Solana" 
        ? (localPoolId: string, remotePoolId: string, remoteChain: SupportedChain, signer: any) => Promise<LinkPoolsResult>
        : C extends "Sui"
        ? (localPoolId: string, remotePoolId: string, remoteChain: SupportedChain, signer: any) => Promise<LinkPoolsResult>
        : undefined; 
    }
  }