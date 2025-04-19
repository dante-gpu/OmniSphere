import { SuiPlatform } from '@wormhole-foundation/sdk-sui';
// Network ve Chain'i ana SDK'dan import et
import { WormholeMessageId as SDKMessageId, Chain, UniversalAddress, Network, Wormhole } from '@wormhole-foundation/sdk';
import { TransactionBlock } from '@mysten/sui.js/transactions';
// import { SuiClient } from '@mysten/sui.js/client'; // Kullanılmıyor
// import { encoding } from '@wormhole-foundation/sdk-base'; // Kullanılmıyor
import { getWormholeChainId } from './wormholeHelpers'; // Helper import edildi
import { Buffer } from 'buffer';
import bs58 from 'bs58';
// CONFIG import edilmeli
import { CONFIG } from '@wormhole-foundation/sdk';
// Sui işlem yanıt türünü import et
import { SuiTransactionBlockResponse } from '@mysten/sui.js/client';


// Prototip yerine 'as any' kullan
(SuiPlatform.prototype as any).linkPools = async function(
  // this: SuiPlatform<Network, Chain>, // 'this' türünü kaldırıyoruz, context sorunları yaratabiliyor
  localPoolId: string,
  remotePoolId: string,
  remoteChain: Chain,
  signer: any // Sui Wallet Adapter
): Promise<{txid: string, messages: SDKMessageId[]}> { // messages döndürülüyor
  console.log(`Linking Sui pool ${localPoolId} to ${remoteChain} pool ${remotePoolId}`);

  // Network'ü global veya config'den almamız lazım. wormholeHelpers'daki NETWORK sabitini kullanalım.
  // Veya bu fonksiyonu çağıran yerden Network bilgisini almalıyız.
  const network: Network = 'Testnet'; // VEYA 'Devnet' - helper ile aynı olmalı!


  if (!signer || !signer.account) {
      throw new Error("Sui signer or account is missing.");
  }

  try {
    // 1. Remote Pool ID -> Bytes
    let remotePoolIdBytes: Buffer;
    try {
        remotePoolIdBytes = Buffer.from(bs58.decode(remotePoolId));
        if (remotePoolIdBytes.length !== 32) {
             throw new Error('Invalid Solana address length after decode.');
        }
    } catch (e) {
        throw new Error(`Invalid remote pool ID format (expected Base58 Solana address): ${remotePoolId}`);
    }

    // 2. Remote Chain ID
    const remoteChainId = getWormholeChainId(remoteChain);

    // 3. Transaction bloğu
    console.log("Building transaction block...");
    const tx = new TransactionBlock();

    // 4. Payload (Local Pool ID - Hex decode)
    const payload = Buffer.from(localPoolId.startsWith('0x') ? localPoolId.substring(2) : localPoolId, 'hex');
    console.log("Prepared payload for Wormhole message (localPoolId):", payload.toString('hex'));

    // 5. Kendi Linker Modülünüze Çağrı
    const YOUR_LINKER_PACKAGE_ID = "0xYOUR_SUI_LINKER_PACKAGE_ID"; // DEĞİŞTİR
    const YOUR_LINKER_MODULE_NAME = "pool_linker"; // DEĞİŞTİR
    const YOUR_LINKER_FUNCTION_NAME = "link_and_publish"; // DEĞİŞTİR

    const coreBridgeStateObjectId = CONFIG[network].chains.Sui?.contracts.coreBridge;
    if (!coreBridgeStateObjectId) {
        throw new Error(`Wormhole Core Bridge Object ID not found for Sui on ${network}`);
    }
    const MESSAGE_FEE = 100000000; // 0.1 SUI MIST - ÖRNEK, DOĞRU DEĞERİ BULUN!
    const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure(MESSAGE_FEE)]);

    tx.moveCall({
        target: `${YOUR_LINKER_PACKAGE_ID}::${YOUR_LINKER_MODULE_NAME}::${YOUR_LINKER_FUNCTION_NAME}`,
        arguments: [
            tx.object(localPoolId),
            tx.pure(remoteChainId, 'u16'),
            tx.pure(Array.from(remotePoolIdBytes), 'vector<u8>'),
            tx.pure(Array.from(payload), 'vector<u8>'),
            tx.object(coreBridgeStateObjectId),
            feeCoin,
        ],
    });
    console.log(`Added moveCall to ${YOUR_LINKER_FUNCTION_NAME}`);

    // 6. İşlemi imzalayıp gönder
    console.log("Signing and sending transaction...");
    // Yanıt türünü belirtelim
    const response: SuiTransactionBlockResponse = await signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
          showEffects: true, // Sequence için gerekli
          // showEvents: true, // Alternatif
      }
    });
    console.log("Transaction executed:", response);

    // Create an instance first to get the chain context
    const wormhole = new Wormhole(network, [SuiPlatform]);
    const suiContext = wormhole.getChain("Sui");
    
    // Then use parseMessageFromTx with the proper context
    const messages: SDKMessageId[] = await Wormhole.parseMessageFromTx(
        suiContext,
        response.digest,
        60000
    );
    
    if (!messages || messages.length === 0) {
        throw new Error("Could not parse Wormhole messages from transaction effects");
    }

    // Genellikle tek mesaj beklenir bu senaryoda
    const firstMessage = messages[0];
    const sequence = firstMessage.sequence;
    const emitterAddress = firstMessage.emitter; // Bu zaten UniversalAddress olmalı

    console.log("Wormhole Sequence:", sequence);
    console.log("Emitter Address:", emitterAddress.toString()); // UniversalAddress'i string yap


    // 8. Mesaj bilgisini döndür
    // Dönen mesaj zaten SDKMessageId formatında olmalı
    // const messageInfo: SDKMessageId = {
    //     chain: "Sui",
    //     emitter: emitterAddress, // Zaten UniversalAddress
    //     sequence: sequence
    //   };

    return {
      txid: response.digest,
      messages: messages // SDK'dan gelen mesajları doğrudan döndür
    };

  } catch (error) {
    console.error("Error linking Sui pool:", error);
    throw new Error(`Failed to link Sui pool: ${error instanceof Error ? error.message : String(error)}`);
  }
};