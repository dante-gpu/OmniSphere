import {
    Wormhole,
    Chain,
    Network,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ChainContext, 
    TokenId,
    isChain,
    NativeAddress, 
    ChainAddress,
    UniversalAddress
  } from '@wormhole-foundation/sdk';
  // chainIdToChain genellikle sdk-base veya sdk-definitions içinde bulunur
  import { chainIdToChain } from '@wormhole-foundation/sdk-base'; // sdk-base'den import etmeyi deneyelim
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
  // SDKMessageId türünü import edelim ve map içinde kullanalım
  import type { WormholeMessageId as SDKMessageId } from '@wormhole-foundation/sdk-definitions';

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

  // Zincir havuz oluşturma sonucu tipi
  interface ChainPoolResult {
    poolId: string;
    poolAddress?: string; // Geriye dönük uyumluluk için
    txId?: string; // Tek bir işlem ID'si için
    txIds: string[]; // Birden fazla işlem ID'si için
    chain?: Chain;
    wormholeMessages: WormholeMessageId[];
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

      // 2. Create TokenId using SDK utility
      const tokenId: TokenId = Wormhole.tokenId(sourceChain, sourceTokenAddress);

      // 3. Get the destination ChainAddress using SDK utility
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
        tokenId,
        amountBigInt,
        sourceChainAddress,
        targetChainAddress,
        true,
        payload
      );

      toast.loading(`Please approve the transaction in your wallet...`, { id: toastId });

      // 8. Execute the transfer
      const txids = await transfer.initiateTransfer(signer);
      console.log("Cross-chain liquidity transfer initiated:", txids);
      // Assuming txids is string[] based on previous findings
      const sourceTxId = txids[0]?.toString();

      toast.success(`Transfer initiated! Tracking attestation...`, { id: toastId });

      // 9. Wait for attestation (VAA)
      let fetchedMessageIds: SDKMessageId[] | undefined; // Use SDKMessageId type
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
         console.warn(`Pool ID format (${params.poolId}) might not be 32 bytes hex. Ensure it's correct for the target payload.`);
      }
      poolIdBytes = hexToBytes(cleanHexPoolId);
    } catch (e) {
       console.error("Failed to encode Pool ID:", e);
       throw new Error(`Cannot encode invalid Pool ID: ${params.poolId}`);
    }

    const buffer = new Uint8Array(1 + poolIdBytes.length + 8);
    const dataView = new DataView(buffer.buffer);
    dataView.setUint8(0, operationByte);
    buffer.set(poolIdBytes, 1);
    dataView.setBigUint64(1 + poolIdBytes.length, params.tokenAmount, false);
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
    const network: Network = 'Testnet'; // veya config'den al
    const wormhole = new Wormhole(network, [SolanaPlatform, SuiPlatform]);

    try {
      // Adım 1 & 2: Her iki zincirde de havuzları oluştur
      console.log(`Creating pool on ${config.chainA}...`);
      const poolAResult = await createPoolOnChain(config.chainA, config, signers[config.chainA]);
      console.log(`${config.chainA} pool created:`, poolAResult);

      console.log(`Creating pool on ${config.chainB}...`);
      const poolBResult = await createPoolOnChain(config.chainB, config, signers[config.chainB]);
      console.log(`${config.chainB} pool created:`, poolBResult);

      // Adım 3: Havuzları birbirine bağla (GÜNCELLENMİŞ linkPools çağrısı)
      console.log(`Linking pools ${poolAResult.poolId} and ${poolBResult.poolId}...`);
      const linkReceipt = await linkPools(poolAResult, poolBResult, config, signers, wormhole);

      return linkReceipt; // linkPools zaten PoolCreationReceipt formatında dönüyor

    } catch (error) {
      console.error("Cross-chain pool creation failed:", error);
      // Hata mesajını daha spesifik hale getir
      throw new Error(`Failed to create cross-chain pool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function createPoolOnChain(chain: Chain, config: CrossChainPoolConfig, signer: any): Promise<any> {
    // Bu fonksiyonun içeriği aynı kalır
    if (chain === 'Solana') {
      return createSolanaPool(config, signer);
    } else if (chain === 'Sui') {
      return createSuiPool(config, signer);
    } else {
      throw new Error(`Pool creation not implemented for chain: ${chain}`);
    }
  }

  async function createSolanaPool(config: CrossChainPoolConfig, signer: any): Promise<any> {
    console.warn("createSolanaPool is a placeholder and needs implementation.");
    return { poolId: "solana_pool_address_placeholder", txIds: ["solana_tx_placeholder"] };
  }

  async function createSuiPool(config: CrossChainPoolConfig, signer: any): Promise<any> {
    console.warn("createSuiPool is a placeholder and needs implementation.");
    return { poolId: "sui_pool_address_placeholder", txIds: ["sui_tx_placeholder"] };
  }

  async function linkPools(
    poolAResult: any, // ChainPoolResult tipine benzer olmalı
    poolBResult: any, // ChainPoolResult tipine benzer olmalı
    config: CrossChainPoolConfig,
    signers: { [K in SupportedChain]?: any },
    wormhole: Wormhole<Network> // Wormhole instance'ını al
  ): Promise<PoolCreationReceipt> {
    const allTxIds: string[] = [...poolAResult.txIds, ...poolBResult.txIds];
    const allMessages: WormholeMessageId[] = [];

    console.log("Starting pool linking process...");

    // Platform ve Context'leri al (Bu hala gerekli olabilir)
    const platformA = wormhole.getPlatform(config.chainA as SupportedChain);
    const platformB = wormhole.getPlatform(config.chainB as SupportedChain);
    const chainContextA = platformA.getChain(config.chainA as SupportedChain); // Tipleri kaldır
    const chainContextB = platformB.getChain(config.chainB as SupportedChain);

    let linkResultA: LinkPoolResult | null = null;
    let linkResultB: LinkPoolResult | null = null;

    // Link A -> B (Doğrudan fonksiyon çağrısı)
    try {
        console.log(`Attempting to link ${config.chainA} -> ${config.chainB}`);
        const chainA = config.chainA as SupportedChain; // Türü belirginleştir
        const chainB = config.chainB as SupportedChain;
        const signerA = signers[chainA]; // Doğru anahtarı kullan
        const signerB = signers[chainB];

        if (!signerA) throw new Error(`Signer for ${chainA} is missing.`);
        if (!signerB) throw new Error(`Signer for ${chainB} is missing.`);

        if (chainA === 'Solana') {
            linkResultA = await solanaLinkPoolsPlaceholder(
                chainContextA as ChainContext<Network, "Solana">, // Cast to specific type
                poolAResult.poolId,
                poolBResult.poolId,
                chainB, // Chain türü zaten doğru
                signerA // Signer'ı doğrudan geç
            );
        } else if (chainA === 'Sui') {
            linkResultA = await suiLinkPoolsPlaceholder(
                chainContextA as ChainContext<Network, "Sui">, // Cast to specific type
                poolAResult.poolId,
                poolBResult.poolId,
                chainB,
                signerA
            );
        } else {
            console.warn(`Linking from ${chainA} is not implemented (using placeholder).`);
            // Desteklenmeyen zincir için de yer tutucu sonuç döndür
            linkResultA = { txIds: [`${chainA}_link_placeholder_${Date.now()}`], wormholeMessages: [] };
            // throw new Error(`linkPools function not found for chain ${config.chainA}`);
        }
        if (linkResultA) {
            allTxIds.push(...linkResultA.txIds);
            allMessages.push(...linkResultA.wormholeMessages);
            console.log(`Linking ${chainA} -> ${chainB} completed (Placeholder Tx: ${linkResultA.txIds.join(', ')})`);
        }
    } catch (error) {
        console.error(`Error linking ${config.chainA} -> ${config.chainB}:`, error);
        throw new Error(`Failed to link ${config.chainA} to ${config.chainB}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Link B -> A (Doğrudan fonksiyon çağrısı)
    try {
        console.log(`Attempting to link ${config.chainB} -> ${config.chainA}`);
        const chainA = config.chainA as SupportedChain;
        const chainB = config.chainB as SupportedChain;
        const signerA = signers[chainA];
        const signerB = signers[chainB];

        if (!signerB) throw new Error(`Signer for ${chainB} is missing.`); // Redundant check removed

        if (chainB === 'Solana') {
            linkResultB = await solanaLinkPoolsPlaceholder(
                chainContextB as ChainContext<Network, "Solana">,
                poolBResult.poolId,
                poolAResult.poolId,
                chainA,
                signerB
            );
        } else if (chainB === 'Sui') {
            linkResultB = await suiLinkPoolsPlaceholder(
                chainContextB as ChainContext<Network, "Sui">,
                poolBResult.poolId,
                poolAResult.poolId,
                chainA,
                signerB
            );
        } else {
            console.warn(`Linking from ${chainB} is not implemented (using placeholder).`);
             // Desteklenmeyen zincir için de yer tutucu sonuç döndür
            linkResultB = { txIds: [`${chainB}_link_placeholder_${Date.now()}`], wormholeMessages: [] };
            // throw new Error(`linkPools function not found for chain ${config.chainB}`);
        }
        if (linkResultB) {
            allTxIds.push(...linkResultB.txIds);
            allMessages.push(...linkResultB.wormholeMessages);
            console.log(`Linking ${chainB} -> ${chainA} completed (Placeholder Tx: ${linkResultB.txIds.join(', ')})`);
        }
    } catch (error) {
        console.error(`Error linking ${config.chainB} -> ${config.chainA}:`, error);
        throw new Error(`Failed to link ${config.chainB} to ${config.chainA}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Assume composite pool ID is combination or one of the native IDs for now
    const compositePoolId = `${config.chainA}:${poolAResult.poolId}|${config.chainB}:${poolBResult.poolId}`;

    console.log("Pool linking process finished.");

    return {
      poolId: compositePoolId,
      txIds: allTxIds,
      wormholeMessages: allMessages,
    };
  }

  // Helper function to get chain name from ID using chainIdToChain utility
  function getChainNameFromId(chainId: number): Chain | null {
    try {
      // Use the imported chainIdToChain Map
      if (chainIdToChain.has(chainId)) {
        const chainName = chainIdToChain.get(chainId);
        // Ensure the retrieved name is a valid Chain type using isChain guard
        if (chainName && isChain(chainName)) {
          return chainName;
        }
      }
      console.warn(`Chain ID ${chainId} not found in chainIdToChain map.`);
      return null;
    } catch (error) {
      console.error(`Error mapping chain ID ${chainId} to chain name:`, error);
      return null;
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
    console.log(`Workspaceing messages from Wormholescan: ${apiUrl}`); // Corrected typo

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
         throw new Error(`Wormholescan API request failed for tx ${txId}: ${response.status} ${response.statusText}`);
      }
      const data: WormholescanTxResponse = await response.json();

      const vaaInfo = data.vaa || data.data?.vaa;

      if (vaaInfo && typeof vaaInfo.sequence === 'string') {
          // Use helper function with chainIdToChain utility to get chain name
          const chainName = getChainNameFromId(vaaInfo.emitterChain);
          if (!chainName) {
               console.warn(`Unknown emitter chain ID from API: ${vaaInfo.emitterChain}. Cannot map to chain name.`);
               return [];
          }

          return [{
            chain: chainName,
            emitter: vaaInfo.emitterAddr || vaaInfo.emitterAddress || "unknown_emitter",
            sequence: BigInt(vaaInfo.sequence)
          }];
      } else if (data && Array.isArray(data.messages)) {
          return data.messages.map((msg: WormholescanMessage) => { // Add explicit type here
               // Use helper function with chainIdToChain utility to get chain name
               const chainName = getChainNameFromId(msg.emitterChain);
               if (!chainName) {
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

 // ----- Module Augmentation for Wormhole SDK -----
 // Removed unused interface definitions as they are not referenced by `any` types below

 declare module '@wormhole-foundation/sdk' {
    // Using simpler augmentation signature that works for current needs
    interface ChainContext<N extends Network, C extends Chain> {

      // Using `any` for simplicity due to previous type issues with specific interfaces
      // This bypasses strict type checking for these specific augmented methods
      createPool: C extends SupportedChain
        ? (params: any, signer: any) => Promise<any> // Return type might be PoolCreationResult conceptually
        : undefined;

      linkPools: C extends SupportedChain
        ? (poolA: string, poolB: string, remoteChain: SupportedChain, signer: any) => Promise<any> // Return type might be LinkPoolsResult conceptually
        : undefined;
    }
 }