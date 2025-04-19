import { SuiPlatform } from '@wormhole-foundation/sdk-sui';
// Network ve Chain'i ana SDK'dan import et
import { WormholeMessageId as SDKMessageId, Chain, UniversalAddress, Network, Wormhole } from '@wormhole-foundation/sdk';
import { TransactionBlock } from '@mysten/sui.js/transactions';
// import { SuiClient } from '@mysten/sui.js/client'; // Kullanılmıyor
// import { encoding } from '@wormhole-foundation/sdk-base'; // Kullanılmıyor gibi
import { getWormholeChainId /*, WORMHOLE_PROGRAM_ID */ } from './wormholeHelpers'; // WORMHOLE_PROGRAM_ID kullanılmıyor
import { Buffer } from 'buffer';
import bs58 from 'bs58';

// Prototip yerine 'as any' kullan
(SuiPlatform.prototype as any).linkPools = async function(
  this: SuiPlatform<Network, Chain>, // Network ve Chain import edildi
  localPoolId: string,
  remotePoolId: string,
  remoteChain: Chain,
  signer: any // Sui Wallet Adapter
): Promise<{txid: string, messages: SDKMessageId[]}> { // messages dizisi döndürecek
  console.log(`Linking Sui pool ${localPoolId} to ${remoteChain} pool ${remotePoolId}`);

  // RPC URL ve Network bilgisi 'this' üzerinden alınmalı (SDK varsayımı)
  const network = this.network;
  if (!network) {
       throw new Error("Could not determine network from SuiPlatform context.");
  }
  // const rpcUrl = this.rpc as string; // rpc yerine network kullanılabilir

  if (!signer || !signer.account) {
      throw new Error("Sui signer or account is missing.");
  }
  // const senderAddress = signer.account.address; // Kullanılmıyor

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

    // 4. Payload (Local Pool ID - Hex decode ederek bytes yapalım)
    const payload = Buffer.from(localPoolId.startsWith('0x') ? localPoolId.substring(2) : localPoolId, 'hex');
    console.log("Prepared payload for Wormhole message (localPoolId):", payload.toString('hex'));

    // 5. Kendi Linker Modülünüze Çağrı
    const YOUR_LINKER_PACKAGE_ID = "0xYOUR_SUI_LINKER_PACKAGE_ID"; // DEĞİŞTİR
    const YOUR_LINKER_MODULE_NAME = "pool_linker"; // DEĞİŞTİR
    const YOUR_LINKER_FUNCTION_NAME = "link_and_publish"; // DEĞİŞTİR

    // Wormhole Core Bridge State ve Message Fee GEREKLİDİR!
    // Bunları SDK config'den veya sabitlerden almalısınız.
    const coreBridgeStateObjectId = CONFIG[network].chains.Sui?.contracts.coreBridge;
    const tokenBridgeStateObjectId = CONFIG[network].chains.Sui?.contracts.tokenBridge; // Gerekirse
    if (!coreBridgeStateObjectId) {
        throw new Error(`Wormhole Core Bridge Object ID not found for Sui on ${network}`);
    }
    // Mesaj ücreti (dinamik veya sabit olabilir)
    const MESSAGE_FEE = 100000000; // 0.1 SUI MIST - ÖRNEK, DOĞRU DEĞERİ BULUN!
    const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure(MESSAGE_FEE)]);

    tx.moveCall({
        target: `${YOUR_LINKER_PACKAGE_ID}::${YOUR_LINKER_MODULE_NAME}::${YOUR_LINKER_FUNCTION_NAME}`,
        arguments: [
            tx.object(localPoolId),
            tx.pure(remoteChainId, 'u16'),
            tx.pure(Array.from(remotePoolIdBytes), 'vector<u8>'),
            tx.pure(Array.from(payload), 'vector<u8>'),
            tx.object(coreBridgeStateObjectId), // Wormhole state nesnesi
            feeCoin, // Mesaj ücreti coini
        ],
        // typeArguments: [...]
    });
    console.log(`Added moveCall to ${YOUR_LINKER_FUNCTION_NAME}`);

    // 6. İşlemi imzalayıp gönder
    console.log("Signing and sending transaction...");
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
          showEffects: true, // Sequence için gerekli
      }
    });
    console.log("Transaction executed:", response);

    // 7. Wormhole sequence'ı al (SDK ile)
    // Wormhole import edildi
    const sequence = Wormhole.parseSequenceFromTx({ chain: "Sui", txid: response.digest });

    if (sequence === null) {
        // Manuel parse etmeyi deneyebiliriz (güvenilir değil)
        console.warn("SDK could not parse sequence, attempting manual parse from effects...");
        // response.effects?.events veya effects?.messages içinde sequence arayın
        // Bu kısım çok değişkendir, SDK'nın çalışması beklenir.
        throw new Error("Could not parse Wormhole sequence from transaction effects");
    }
    console.log("Wormhole Sequence:", sequence);

    // Emitter adresini KENDİ linker modülünüzün adresinden (veya Object ID) alın.
    // VEYA Wormhole SDK'nın getEmitterAddress'i kullanılabilir (eğer linker modülü Core Bridge'i çağırıyorsa)
    // const emitterAddressHex = await Wormhole.getEmitterAddress(this.chain, YOUR_LINKER_PACKAGE_ID); // Veya object ID?
    const emitterAddressHex = YOUR_LINKER_PACKAGE_ID; // Şimdilik paket ID'yi varsayalım (0x olmadan)
    console.log("Emitter Address (Hex):", emitterAddressHex.startsWith('0x') ? emitterAddressHex.substring(2) : emitterAddressHex);


    // 8. Mesaj bilgisini döndür
    const messageInfo: SDKMessageId = {
        chain: "Sui",
        emitter: new UniversalAddress(emitterAddressHex, "hex"), // Hex olarak belirt
        sequence: sequence
      };

    return {
      txid: response.digest,
      messages: [messageInfo] // Mesajı dizi içinde döndür
    };

  } catch (error) {
    console.error("Error linking Sui pool:", error);
    throw new Error(`Failed to link Sui pool: ${error instanceof Error ? error.message : String(error)}`);
  }
};