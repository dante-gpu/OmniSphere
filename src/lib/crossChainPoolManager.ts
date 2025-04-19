import { 
    Wormhole, 
    Chain, 
    Network, 
    ChainContext, // Keep for module augmentation, even if unused warning appears
    TokenId, 
    // Removed MessageId import as it's not directly exported
    isChain, 
    NativeAddress, // Import NativeAddress for creating typed addresses
    ChainAddress // Import ChainAddress type for clarity
  } from '@wormhole-foundation/sdk';
  // Import chain constants/helpers from sdk-base or sdk-definitions
  import { chainIdToName } from '@wormhole-foundation/sdk-base'; 
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
  // Removed unused CONTRACTS import
  
  // Local definition for Wormhole Message ID structure
  export interface WormholeMessageId {
    chain: Chain;
    emitter: string; 
    sequence: bigint;
  }
  
  interface CrossChainLiquidityParams {
    sourceChain: SupportedChain; 
    targetChain: SupportedChain; 
    poolId: string; 
    tokenSymbol: string; 
    sourceTokenAddress: string; // Keep as string input
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
      poolId,
      tokenSymbol,
      sourceTokenAddress, // Plain string address from params
      amount,
      decimals,
      wormhole,
      signer
    } = params;
    
    try {
      const toastId = toast.loading(`Preparing cross-chain liquidity provision from ${sourceChain} to ${targetChain}...`);
      
      // 1. Parse amount to atomic units
      const amountBigInt = utils.parseUnits(amount, decimals).toBigInt();
      
      // 2. Create TokenId with NativeAddress
      const tokenId: TokenId = { 
        chain: sourceChain, 
        // Convert the string address to NativeAddress for the SDK
        address: new NativeAddress(sourceTokenAddress) 
      };
      
      // 3. Get the destination address (NativeAddress)
      // Assuming poolId is the native address string for the target chain
      // In a real implementation, ensure poolId is correctly formatted for the target chain
      const targetAddressString = poolId; 
      const targetNativeAddress = new NativeAddress(targetAddressString);
      
      // 4. Create source chain address (NativeAddress)
      const sourceAddressString = await signer.address(); 
      const sourceNativeAddress = new NativeAddress(sourceAddressString);
      
      // Create ChainAddress objects for the transfer function
      const sourceChainAddress: ChainAddress = { chain: sourceChain, address: sourceNativeAddress };
      const targetChainAddress: ChainAddress = { chain: targetChain, address: targetNativeAddress };
  
      toast.loading(`Creating transfer from ${sourceChain} to ${targetChain}...`, { id: toastId });
      
      // 5. Log the operation details
      console.log(`Cross-chain liquidity provision: ${amount} ${tokenSymbol}`);
      console.log(`From: ${sourceChain} (${sourceAddressString})`); // Log the string address
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
        tokenId,
        amountBigInt,
        sourceChainAddress, // Use the ChainAddress object
        targetChainAddress, // Use the ChainAddress object
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
      // fetchAttestation returns SDK's internal MessageId structure array
      let fetchedMessageIds: { chain: Chain, emitter: NativeAddress<Chain>, sequence: bigint }[] | undefined;
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
          // Convert the NativeAddress emitter to string for our local type
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
      const cleanHexPoolId = params.poolId.startsWith('0x') ? params.poolId.substring(2) : params.poolId;
      if (cleanHexPoolId.length !== 64) {
         throw new Error(`Invalid Pool ID format for hex encoding: ${params.poolId}. Expected 32 bytes (64 hex chars).`);
      }
      poolIdBytes = hexToBytes(cleanHexPoolId);
    } catch (e) {
       console.error("Failed to encode Pool ID:", e);
       throw new Error(`Cannot encode invalid Pool ID: ${params.poolId}`); 
    }
  
    const buffer = new Uint8Array(41); 
    const dataView = new DataView(buffer.buffer);
    dataView.setUint8(0, operationByte);
    buffer.set(poolIdBytes, 1); 
    dataView.setBigUint64(33, params.tokenAmount, false); 
    console.log("Encoded Payload:", buffer); 
    return buffer;
  }
  
  // Helper: Convert hex string to bytes
  function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
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
    
    // Assert that required signers are present
    const signerA = signers[config.chainA as SupportedChain]; // Assert type for indexing
    const signerB = signers[config.chainB as SupportedChain]; // Assert type for indexing
    if (!signerA || !signerB) {
      throw new Error(`Signers for both chains (${config.chainA}, ${config.chainB}) are required.`);
    }
  
    try {
      // 1. Create pool on each chain concurrently
      // Pass asserted signers and chain types
      const [chainAReceipt, chainBReceipt] = await Promise.all([
        createPoolOnChain(config.chainA as SupportedChain, config, signerA),
        createPoolOnChain(config.chainB as SupportedChain, config, signerB)
      ]);
  
      console.log(`Pool created on ${config.chainA}: ${chainAReceipt.poolId}`);
      console.log(`Pool created on ${config.chainB}: ${chainBReceipt.poolId}`);
  
      // 2. Link pools
      // Pass the correctly typed signers object and assert chain types for parameters
      const linkReceipt = await linkPools(
        chainAReceipt.poolId,
        chainBReceipt.poolId,
        config, // Pass config for chain info
        signers // Pass the whole signers object (linkPools will extract needed ones)
      );
      
      console.log(`Pools linked. Link Txs: ${linkReceipt.txIds.join(', ')}`);
  
      // 3. Combine results into a final receipt
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
    chain: SupportedChain, // Expect SupportedChain
    config: CrossChainPoolConfig,
    signer: any 
  ): Promise<PoolCreationReceipt> { 
    const wh = new Wormhole(CURRENT_NETWORK, [SolanaPlatform, SuiPlatform]);
    const platform = wh.getChain(chain); 
  
    try {
      // Check if createPool exists before calling (due to module augmentation)
      if (!platform.createPool) {
          throw new Error(`createPool method not implemented for chain ${chain}`);
      }
  
      // Assume TokenId.address is NativeAddress, convert back to string if needed by platform.createPool
      // Check the expected param type in Solana/SuiPoolCreationParams
      const txResult = await platform.createPool({
        tokenA: config.tokenA.address.toString(), // Convert NativeAddress back to string if needed
        tokenB: config.tokenB.address.toString(), // Convert NativeAddress back to string if needed
        feeBps: config.feeBps,
        poolType: config.poolType
      }, signer); 
  
      return {
        poolId: txResult.poolAddress,
        chain: chain,
        txIds: [txResult.txid],
        wormholeMessages: txResult.messages.map(msg => ({ 
          chain: msg.chain, 
          emitter: msg.emitter.toString(), 
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
    
    // Get chain contexts, asserting the type for indexing signers
    const chainA = config.chainA as SupportedChain;
    const chainB = config.chainB as SupportedChain;
    const chainAContext = wh.getChain(chainA);
    const chainBContext = wh.getChain(chainB);
  
    // Extract specific signers, asserting chain type for indexing
    const signerA = signers[chainA];
    const signerB = signers[chainB];
    if (!signerA || !signerB) {
      throw new Error("Missing signers for linking pools.");
    }
  
    try {
      // Check if linkPools methods exist before calling
      if (!chainAContext.linkPools) {
          throw new Error(`linkPools method not implemented for chain ${chainA}`);
      }
      if (!chainBContext.linkPools) {
          throw new Error(`linkPools method not implemented for chain ${chainB}`);
      }
  
      const [tx1Result, tx2Result] = await Promise.all([
        // Pass remote chain as SupportedChain
        chainAContext.linkPools(poolA, poolB, chainB, signerA), 
        // Pass remote chain as SupportedChain
        chainBContext.linkPools(poolB, poolA, chainA, signerB) 
      ]);
  
      const combinedTxIds = [tx1Result.txid, tx2Result.txid];
      // Use messages directly from SDK results
      const combinedMessages = [
        ...tx1Result.messages.map(msg => ({ chain: msg.chain, emitter: msg.emitter.toString(), sequence: msg.sequence })),
        ...tx2Result.messages.map(msg => ({ chain: msg.chain, emitter: msg.emitter.toString(), sequence: msg.sequence }))
      ];
      
      // -- Re-enabled parsing via Wormholescan --
      // Note: This adds delay and dependency on an external API.
      let parsedMessages: WormholeMessageId[] = [];
      try {
         console.log("Attempting to parse messages from Wormholescan for linking txs...");
         // Assuming txid is string, adjust if platform returns different type
         const parsed1 = await parseWormholeMessages(String(tx1Result.txid));
         const parsed2 = await parseWormholeMessages(String(tx2Result.txid));
         parsedMessages = [...parsed1, ...parsed2];
         console.log("Parsed messages from Wormholescan:", parsedMessages);
         // Decide if you want to use parsedMessages or combinedMessages (from SDK)
         // Using combinedMessages is often more reliable initially.
      } catch (parseError) {
         console.warn(`Failed to parse messages from Wormholescan for link txs: ${combinedTxIds.join(', ')}`, parseError);
         // Fallback to using messages returned directly from SDK if parsing fails
         // parsedMessages = combinedMessages; // Uncomment this line to use SDK messages as fallback
      }
      // -- End of Wormholescan parsing section --
  
      return {
        poolId: `link-${poolA}-${poolB}`, 
        chain: config.chainA, 
        txIds: combinedTxIds,
        // Return messages directly from SDK results by default for robustness
        wormholeMessages: combinedMessages 
      };
    } catch(error) {
        console.error(`Failed to link pools ${poolA} and ${poolB}:`, error);
        throw error; 
    }
  }
  
  // Interface for the expected structure of a message from Wormholescan API (adjust as needed)
  interface WormholescanMessage {
    emitterChain: number; // Assuming chain ID is number from API
    emitterAddress: string;
    sequence: string; // Assuming sequence is string from API
    // Add other fields if needed, like 'vaa' content
  }
  
  // Interface for the expected structure of the VAA section within Wormholescan API response
  interface WormholescanVaaInfo {
      emitterChain: number;
      emitterAddr?: string; // Allow for variations in field names
      emitterAddress?: string;
      sequence: string;
      // ... other VAA fields if necessary
  }
  
  // Interface for the overall Wormholescan Transaction API response structure (simplified)
  interface WormholescanTxResponse {
      vaa?: WormholescanVaaInfo; // VAA might be directly under root
      data?: { // Or under a 'data' object
          vaa?: WormholescanVaaInfo;
      };
      messages?: WormholescanMessage[]; // Or it might return a list of messages
      // ... other potential fields
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
      // Assume the response structure could be varied, use `any` initially for flexibility
      const data: WormholescanTxResponse = await response.json(); 
  
      // Find the VAA info, checking common locations
      const vaaInfo = data.vaa || data.data?.vaa;
  
      if (vaaInfo && typeof vaaInfo.sequence === 'string') { 
          // Use chainIdToName from SDK definitions/base
          const chainName = chainIdToName(vaaInfo.emitterChain); 
          if (!isChain(chainName)) {
              throw new Error(`Unknown emitter chain ID from API: ${vaaInfo.emitterChain}`);
          }
  
          return [{
            chain: chainName, 
            emitter: vaaInfo.emitterAddr || vaaInfo.emitterAddress || "unknown_emitter", // Handle different field names
            sequence: BigInt(vaaInfo.sequence)
          }];
      } else if (data && Array.isArray(data.messages)) { 
          return data.messages.map((msg: WormholescanMessage) => { // Explicitly type msg
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
  
  // Use SDK's internal MessageId structure for return types where possible
  // Re-importing SDK's MessageId here if needed specifically for these interfaces
  import type { WormholeMessageId as SDKMessageId } from '@wormhole-foundation/sdk-definitions';
  
  interface PoolCreationResult {
    poolAddress: string; 
    txid: string;        
    messages: SDKMessageId[]; // Use SDK's MessageId type if platform methods return it
  }
  
  interface LinkPoolsResult {
    txid: string;        
    messages: SDKMessageId[]; // Use SDK's MessageId type
  }
  
  interface SolanaPoolCreationParams {
    tokenA: string; // Expecting string address
    tokenB: string;
    feeBps: number;
    poolType: 'stable' | 'volatile'; 
  }
  
  interface SuiPoolCreationParams {
    tokenA: string; // Expecting string type identifier
    tokenB: string;
    feeBps: number;
    poolType: 'stable' | 'volatile';
  }
  
  
  // ----- Module Augmentation for Wormhole SDK -----
  declare module '@wormhole-foundation/sdk' {
    // Augment ChainContext with Network and Chain parameters
    interface ChainContext<N extends Network, C extends Chain> {
  
      // Use PoolCreationResult/LinkPoolsResult which expect SDKMessageId[]
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