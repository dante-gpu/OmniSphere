import { 
    Wormhole, 
    Chain, 
    Network, 
    ChainContext, 
    TokenId, // Import TokenId
    MessageId, // Import MessageId (commonly used for identifying Wormhole messages)
    isChain, // Helper to check if a string is a valid Chain
    CONTRACTS // Import CONTRACTS for potential network/chain validation if needed
  } from '@wormhole-foundation/sdk';
  import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';
  import { SuiPlatform } from '@wormhole-foundation/sdk-sui';
  import { utils } from 'ethers';
  import toast from 'react-hot-toast';
  // Assuming CrossChainPoolConfig is primarily defined here:
  import { 
    PoolCreationReceipt, 
    CURRENT_NETWORK, 
    SupportedChain, 
    CrossChainPoolConfig // Use this import, remove the local definition later
  } from '../types/wormhole'; 
  // Removed conflicting import of WormholeError as it's not directly exported
  
  // Define WormholeMessageId type if not directly available or suitable from SDK
  // SDK's MessageId might be sufficient, but defining explicitly for clarity based on usage pattern
  export interface WormholeMessageId {
    chain: Chain;
    emitter: string; // SDK often uses UniversalAddress, string is simpler if address format is known
    sequence: bigint;
  }
  
  interface CrossChainLiquidityParams {
    // Pool info
    sourceChain: SupportedChain; // Use SupportedChain for consistency
    targetChain: SupportedChain; // Use SupportedChain for consistency
    poolId: string; // Target pool ID where liquidity will be added
    
    // Token info
    tokenSymbol: string; // e.g., "USDC", "SOL", "SUI"
    sourceTokenAddress: string; // Token address on source chain
    amount: string; // Human-readable amount
    decimals: number; // Token decimals
    
    // Network components
    wormhole: Wormhole<Network>; // Keep Network type here
    signer: any; // Adapter from connected wallet (Platform specific signer expected by SDK methods)
  }
  
  /**
   * Adds liquidity to a pool on a target chain using tokens from a source chain.
   * Uses Wormhole Liquidity Layer to bridge the tokens between chains.
   */
  export async function addCrossChainLiquidity(params: CrossChainLiquidityParams): Promise<{
    success: boolean;
    sourceChainTxId?: string;
    messageId?: WormholeMessageId; // Use the defined type
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
      const tokenId: TokenId = { chain: sourceChain, address: sourceTokenAddress }; // Correctly create TokenId object
      
      // 3. Get the destination address (this would be your protocol's pool contract address)
      // Note: In a real implementation, this would be the contract address that receives 
      // the bridged tokens and adds them to the pool. Address formatting is crucial.
      // Example: Assuming poolId IS the correctly formatted address for the target chain.
      // You might need platform-specific address conversion here.
      const targetAddress = poolId; // Simplified; Needs proper address formatting/retrieval based on targetChain and poolId
      
      // 4. Create source and destination chain addresses
      // Assuming signer has an address() method returning a native address string
      const sourceAddress = await signer.address(); // Make sure signer provides address correctly
      
      toast.loading(`Creating transfer from ${sourceChain} to ${targetChain}...`, { id: toastId });
      
      // 5. Log the operation details
      console.log(`Cross-chain liquidity provision: ${amount} ${tokenSymbol}`);
      console.log(`From: ${sourceChain} (${sourceAddress})`);
      console.log(`To pool: ${poolId} on ${targetChain}`);
      
      // 6. Create payload containing pool operation instructions
      const payload = encodePoolOperationPayload({
        operation: 'addLiquidity',
        poolId, // Assuming poolId format is suitable for payload
        tokenAmount: amountBigInt,
        tokenSymbol,
      });
      
      // 7. Create a TokenTransfer using the Wormhole SDK
      const transfer = await wormhole.tokenTransfer(
        tokenId,
        amountBigInt,
        { chain: sourceChain, address: sourceAddress }, // Use ChainAddress format
        { chain: targetChain, address: targetAddress }, // Use ChainAddress format
        true, // Automatic delivery
        payload // Include the pool operation instructions
      );
      
      toast.loading(`Please approve the transaction in your wallet...`, { id: toastId });
      
      // 8. Execute the transfer
      // initiateTransfer expects a Signer specific to the source chain platform
      const txids = await transfer.initiateTransfer(signer); 
      console.log("Cross-chain liquidity transfer initiated:", txids);
      const sourceTxId = txids[0]?.toString(); // Get the first transaction ID as sourceChainTxId
      
      toast.success(`Transfer initiated! Tracking attestation...`, { id: toastId });
      
      // 9. Wait for attestation (VAA)
      // fetchAttestation returns MessageId[] upon success
      let fetchedMessageIds: MessageId[] | undefined;
      try {
        // Increased timeout for potentially slow attestations
        fetchedMessageIds = await transfer.fetchAttestation(120_000); // Wait up to 2 minutes
        console.log("Attestation received, Message IDs:", fetchedMessageIds);
      } catch (err) {
        console.warn("Could not fetch attestation yet:", err);
        // This is not fatal error - transfer is in progress, VAA is just delayed
      }
      
      // 10. Return success with transaction details
      toast.success(`Liquidity provision initiated! The tokens will be added to the pool once the transfer completes.`, { id: toastId });
      
      let messageId: WormholeMessageId | undefined = undefined;
      
      // Extract message ID from the first attestation result if available
      if (fetchedMessageIds && fetchedMessageIds.length > 0) {
        const sdkMessageId = fetchedMessageIds[0];
        messageId = {
          chain: sdkMessageId.chain,
          emitter: sdkMessageId.emitter.toString(), // Convert UniversalAddress to string
          sequence: sdkMessageId.sequence 
        };
      } else {
         // If no attestation yet, create a partial message ID placeholder
         // The emitter/sequence are unknown until the VAA is published
         messageId = {
           chain: sourceChain,
           emitter: "pending_attestation", 
           sequence: BigInt(-1) // Use a placeholder like -1 or keep undefined
         };
      }
      
      return {
        success: true,
        sourceChainTxId: sourceTxId, 
        messageId: messageId // Return the structured message ID
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
   * IMPORTANT: This is a placeholder. The actual implementation depends entirely 
   * on the target contract's expected payload format.
   */
  function encodePoolOperationPayload(params: {
    operation: 'addLiquidity' | 'removeLiquidity';
    poolId: string; // Ensure this poolId format matches what the contract expects
    tokenAmount: bigint;
    tokenSymbol: string; // Might not be needed if contract uses token address from VAA
  }): Uint8Array {
    // Example: Simple encoding (adjust rigorously based on contract ABI)
    // Operation type (1 byte): 0 = add, 1 = remove
    // Pool ID (32 bytes, assuming hex string without 0x)
    // Amount (8 bytes, big-endian)
    
    const operationByte = params.operation === 'addLiquidity' ? 0 : 1;
    
    // Validate and convert Pool ID (assuming it's a 32-byte hex string)
    let poolIdBytes: Uint8Array;
    try {
      // Remove potential '0x' prefix and ensure correct length
      const cleanHexPoolId = params.poolId.startsWith('0x') ? params.poolId.substring(2) : params.poolId;
      if (cleanHexPoolId.length !== 64) {
         throw new Error(`Invalid Pool ID format for hex encoding: ${params.poolId}. Expected 32 bytes (64 hex chars).`);
      }
      poolIdBytes = hexToBytes(cleanHexPoolId);
    } catch (e) {
       console.error("Failed to encode Pool ID:", e);
       // Return empty or throw, depending on desired error handling
       throw new Error(`Cannot encode invalid Pool ID: ${params.poolId}`); 
    }
  
    // Create buffer: 1 (op) + 32 (poolId) + 8 (amount) = 41 bytes
    const buffer = new Uint8Array(41); 
    const dataView = new DataView(buffer.buffer);
  
    // Set operation type
    dataView.setUint8(0, operationByte);
    
    // Set pool ID bytes
    buffer.set(poolIdBytes, 1); // Offset by 1 byte
    
    // Set amount (big-endian)
    dataView.setBigUint64(33, params.tokenAmount, false); // Offset 1 + 32 = 33, false for big-endian
    
    console.log("Encoded Payload:", buffer); // Log the payload for debugging
    return buffer;
  }
  
  // Helper: Convert hex string to bytes
  function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error("Hex string must have an even length");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      if (isNaN(bytes[i/2])) {
          throw new Error(`Invalid hex character in string: ${hex}`);
      }
    }
    return bytes;
  }
  
  // Helper: Convert bigint to bytes (8 bytes, big-endian) - DataView is safer
  // function bigintToBytes(value: bigint): Uint8Array {
  //   const buffer = new ArrayBuffer(8); // Use ArrayBuffer for DataView
  //   const view = new DataView(buffer);
  //   view.setBigUint64(0, value, false); // false for big-endian
  //   return new Uint8Array(buffer);
  // }
  
  
  // ----- Pool Creation and Linking -----
  
  export async function createCrossChainPool(
    config: CrossChainPoolConfig,
    // Ensure signers keys are correctly typed using SupportedChain
    signers: { [K in SupportedChain]?: any } // Use mapped type for better type safety, allow optional signers
  ): Promise<PoolCreationReceipt> { // Return type should match PoolCreationReceipt definition
    // Removed unused 'wh' variable: const wh = new Wormhole(CURRENT_NETWORK, [SolanaPlatform, SuiPlatform]);
    // Removed unused 'receipts' array: const receipts: PoolCreationReceipt[] = [];
  
    // Validate required signers are present
    if (!signers[config.chainA] || !signers[config.chainB]) {
      throw new Error(`Signers for both chains (${config.chainA}, ${config.chainB}) are required.`);
    }
  
    try {
      // 1. Create pool on each chain concurrently
      const [chainAReceipt, chainBReceipt] = await Promise.all([
        createPoolOnChain(config.chainA, config, signers[config.chainA]),
        createPoolOnChain(config.chainB, config, signers[config.chainB])
      ]);
  
      console.log(`Pool created on ${config.chainA}: ${chainAReceipt.poolId}`);
      console.log(`Pool created on ${config.chainB}: ${chainBReceipt.poolId}`);
  
      // 2. Link pools - requires signers for both chains again
      // Pass the specific signers needed
      const linkReceipt = await linkPools(
        chainAReceipt.poolId,
        chainBReceipt.poolId,
        config, // Pass config for chain info
        signers // Pass the whole signers object
      );
      
      console.log(`Pools linked. Link Txs: ${linkReceipt.txIds.join(', ')}`);
  
      // 3. Combine results into a final receipt
      // The final Pool ID could be a composite or one of the chain-specific IDs depending on your system design
      // Example: Using composite ID
      const finalPoolId = `${config.chainA}-${chainAReceipt.poolId}/${config.chainB}-${chainBReceipt.poolId}`;
  
      return {
        poolId: finalPoolId, 
        chain: config.chainA, // Or indicate this is a cross-chain pool identifier
        txIds: [
          ...chainAReceipt.txIds, 
          ...chainBReceipt.txIds, 
          ...linkReceipt.txIds // Include linking transaction IDs
        ],
        wormholeMessages: [
          ...chainAReceipt.wormholeMessages, 
          ...chainBReceipt.wormholeMessages,
          ...linkReceipt.wormholeMessages // Include linking messages
        ]
      };
    } catch (error: any) {
      console.error('Cross-chain pool creation failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      // Consider re-throwing a custom error or logging more context
      throw new Error(`Failed to create cross-chain pool: ${message}`);
    }
  }
  
  async function createPoolOnChain(
    chain: SupportedChain,
    config: CrossChainPoolConfig,
    signer: any // Platform-specific signer
  ): Promise<PoolCreationReceipt> { // Return type should match PoolCreationReceipt definition
    // Instantiate Wormhole locally if not passed down, ensuring correct platforms
    const wh = new Wormhole(CURRENT_NETWORK, [SolanaPlatform, SuiPlatform]);
    
    // Get ChainContext correctly typed for the specific chain
    // Use the generic parameter to specify the chain
    const platform = wh.getChain(chain); // Let SDK infer types first
  
    try {
      // Call the chain-specific method (relies on module augmentation below)
      // The ChainContext should now have the custom methods via declaration merging
      const txResult = await platform.createPool({
        // Pass parameters expected by the specific platform's implementation
        tokenA: config.tokenA.address.toString(), // Assuming TokenId has address property
        tokenB: config.tokenB.address.toString(), // Assuming TokenId has address property
        feeBps: config.feeBps,
        poolType: config.poolType
      }, signer); // Pass the signer
  
      return {
        poolId: txResult.poolAddress,
        chain: chain,
        txIds: [txResult.txid],
        // Map SDK MessageId to our WormholeMessageId structure
        wormholeMessages: txResult.messages.map(msg => ({ 
          chain: msg.chain, 
          emitter: msg.emitter.toString(), // Convert UniversalAddress
          sequence: msg.sequence 
        }))
      };
    } catch(error) {
       console.error(`Failed to create pool on ${chain}:`, error);
       throw error; // Re-throw after logging
    }
  }
  
  async function linkPools(
    poolA: string, // Pool ID on chain A
    poolB: string, // Pool ID on chain B
    config: CrossChainPoolConfig, // Needed for chain names
    // Use the correctly typed signers object
    signers: { [K in SupportedChain]?: any } 
  ): Promise<PoolCreationReceipt> { // Return type for consistency, even if poolId isn't primary here
    const wh = new Wormhole(CURRENT_NETWORK, [SolanaPlatform, SuiPlatform]);
    
    // Get chain contexts
    const chainAContext = wh.getChain(config.chainA);
    const chainBContext = wh.getChain(config.chainB);
  
    // Ensure signers exist (already checked in parent, but good practice)
    const signerA = signers[config.chainA];
    const signerB = signers[config.chainB];
    if (!signerA || !signerB) {
      throw new Error("Missing signers for linking pools.");
    }
  
    try {
      // Execute linking calls concurrently
      // Assumes linkPools returns { txid: string, messages: MessageId[] } similar to createPool
      const [tx1Result, tx2Result] = await Promise.all([
        // Call augmented method: link pool A to pool B (on chain A)
        chainAContext.linkPools(poolA, poolB, config.chainB, signerA), 
        // Call augmented method: link pool B to pool A (on chain B)
        chainBContext.linkPools(poolB, poolA, config.chainA, signerB) 
      ]);
  
      // Combine results
      const combinedTxIds = [tx1Result.txid, tx2Result.txid];
      const combinedMessages = [
        ...tx1Result.messages.map(msg => ({ chain: msg.chain, emitter: msg.emitter.toString(), sequence: msg.sequence })),
        ...tx2Result.messages.map(msg => ({ chain: msg.chain, emitter: msg.emitter.toString(), sequence: msg.sequence }))
      ];
  
      // Parse messages using WormholeScan (Optional but useful for tracking)
      // Note: Wormholescan might take time to index transactions.
      // Consider making this parsing optional or delayed.
      // let parsedMessages: WormholeMessageId[] = [];
      // try {
      //   const parsed1 = await parseWormholeMessages(tx1Result.txid);
      //   const parsed2 = await parseWormholeMessages(tx2Result.txid);
      //   parsedMessages = [...parsed1, ...parsed2];
      //   console.log("Parsed messages from Wormholescan:", parsedMessages);
      // } catch (parseError) {
      //   console.warn(`Failed to parse messages from Wormholescan for link txs: ${combinedTxIds.join(', ')}`, parseError);
      //   // Fallback to using messages returned directly from SDK if parsing fails
      //   parsedMessages = combinedMessages;
      // }
  
  
      return {
        // PoolId might not be relevant for a linking receipt, or use a composite marker
        poolId: `link-${poolA}-${poolB}`, 
        chain: config.chainA, // Indicate the primary chain or context
        txIds: combinedTxIds,
        wormholeMessages: combinedMessages // Use messages directly from SDK results initially
      };
    } catch(error) {
        console.error(`Failed to link pools ${poolA} and ${poolB}:`, error);
        throw error; // Re-throw
    }
  }
  
  // Optional: Parsing messages via WormholeScan API
  // Be mindful of rate limits and potential delays in indexing.
  async function parseWormholeMessages(txId: string): Promise<WormholeMessageId[]> {
    // Ensure txId is correctly formatted (e.g., hex string for relevant chains)
    const apiUrl = `https://api.wormholescan.io/api/v1/transactions/${txId}`; // Use v1 endpoint
    console.log(`Workspaceing messages from Wormholescan: ${apiUrl}`);
  
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
         // Handle HTTP errors (like 404 Not Found if tx isn't indexed yet)
         throw new Error(`Wormholescan API request failed for tx ${txId}: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
  
      // Check if data structure is as expected ( Wormholescan response structure might vary)
      // Assuming response has a structure like { data: { vaa: { emitterChain, emitterAddr, sequence } } } or similar
      // Adjust the parsing logic based on the actual API response structure
      if (data && data.vaa && typeof data.vaa.sequence === 'string') { 
          const vaa = data.vaa;
          // SDK Chain type uses capitalized names, API might use numbers or names
          const chainName = Wormhole.chainidToName(vaa.emitterChain); // Convert chain ID to name if needed
          if (!isChain(chainName)) {
              throw new Error(`Unknown emitter chain ID from API: ${vaa.emitterChain}`);
          }
  
          return [{
             // Use SDK Chain type
            chain: chainName, 
            // API might use 'emitterAddr' or 'emitterAddress'
            emitter: vaa.emitterAddr || vaa.emitterAddress, 
            sequence: BigInt(vaa.sequence)
          }];
      } else if (data && Array.isArray(data.messages)) { // Handle if API returns an array of messages
          return data.messages.map((msg: any) => {
               const chainName = Wormhole.chainidToName(msg.emitterChain);
               if (!isChain(chainName)) {
                   console.warn(`Unknown emitter chain ID in message: ${msg.emitterChain}`);
                   // Skip or handle error for unknown chains
                   return null; // Filter out nulls later
               }
               return {
                   chain: chainName,
                   emitter: msg.emitterAddress,
                   sequence: BigInt(msg.sequence)
               };
          }).filter((msg): msg is WormholeMessageId => msg !== null); // Filter out any nulls from unknown chains
      } else {
        console.warn("No VAA or messages found in Wormholescan response for tx:", txId, data);
        return []; // Return empty array if no VAA found yet or unexpected structure
      }
      
    } catch (error: unknown) { // Catch unknown type
      // Handle potential errors during fetch or JSON parsing
      console.error(`Error parsing Wormhole messages for tx ${txId}:`, error);
      
      // Check if it's an Error instance to access message safely
      if (error instanceof Error) {
         // You could check for specific error types if needed, e.g., network errors
         console.error("Error details:", error.message);
         // Re-throw a more specific error or return empty based on desired behavior
         throw new Error(`Failed to parse messages for ${txId}: ${error.message}`);
      } else {
         // Handle non-Error exceptions
         throw new Error(`An unknown error occurred while parsing messages for ${txId}`);
      }
    }
  }
  
  // ----- Platform Specific Method Definitions (Interfaces) -----
  // These define the *expected* methods on the ChainContext for specific platforms.
  // The actual implementation must be provided elsewhere (likely within platform-specific SDK extensions or your own code).
  
  interface PoolCreationResult {
    poolAddress: string; // Native address string of the created pool
    txid: string;        // Transaction ID of the pool creation
    messages: MessageId[]; // Wormhole messages emitted (if any)
  }
  
  interface LinkPoolsResult {
    txid: string;        // Transaction ID of the linking operation
    messages: MessageId[]; // Wormhole messages emitted (important for cross-chain linking)
  }
  
  // Define parameters expected by your specific pool creation logic on Solana
  interface SolanaPoolCreationParams {
    tokenA: string; // Expecting string representation of token address or symbol
    tokenB: string;
    feeBps: number;
    poolType: 'stable' | 'volatile'; // Use the same types as in CrossChainPoolConfig
  }
  
  // Define parameters expected by your specific pool creation logic on Sui
  interface SuiPoolCreationParams {
    tokenA: string; // Expecting string representation (e.g., type identifier)
    tokenB: string;
    feeBps: number;
    poolType: 'stable' | 'volatile';
  }
  
  
  // ----- Module Augmentation for Wormhole SDK -----
  // This tells TypeScript that ChainContext instances for Solana and Sui 
  // will have additional methods (`createPool`, `linkPools`).
  
  declare module '@wormhole-foundation/sdk' {
    // Augment the existing ChainContext interface
    // Ensure Type parameters match the SDK's definition (Network, Chain, PlatformContext)
    // Check the SDK source or documentation for the exact parameters if unsure. 
    // Assuming N=Network, C=Chain structure for simplicity, adjust if needed.
    interface ChainContext<N extends Network, C extends Chain> {
  
      // Define `createPool` conditionally based on the Chain type `C`
      createPool: C extends "Solana" 
        ? (params: SolanaPoolCreationParams, signer: any) => Promise<PoolCreationResult> 
        : C extends "Sui" 
        ? (params: SuiPoolCreationParams, signer: any) => Promise<PoolCreationResult> 
        : undefined; // Or `never` if these are the only supported chains for this op
  
      // Define `linkPools` conditionally
      // It needs the remote pool ID and the remote chain identifier
      linkPools: C extends "Solana" 
        ? (localPoolId: string, remotePoolId: string, remoteChain: SupportedChain, signer: any) => Promise<LinkPoolsResult>
        : C extends "Sui"
        ? (localPoolId: string, remotePoolId: string, remoteChain: SupportedChain, signer: any) => Promise<LinkPoolsResult>
        : undefined; // Or `never`
    }
  }
  
  
  // Removed the local definition of CrossChainPoolConfig as it's imported from '../types/wormhole'
  // export interface CrossChainPoolConfig {
  //   chainA: SupportedChain;
  //   chainB: SupportedChain;
  //   tokenA: TokenId; // Use imported TokenId
  //   tokenB: TokenId; // Use imported TokenId
  //   feeBps: number;
  //   poolType: 'stable' | 'volatile';
  // }