import { SuiPlatform } from '@wormhole-foundation/sdk-sui';
// Network ve Chain'i ana SDK'dan import et
import { WormholeMessageId as SDKMessageId, Network, Chain } from '@wormhole-foundation/sdk';
// Doğru import yolları
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';
// import { bcs } from '@mysten/sui.js/bcs'; // Kullanılmıyor
// Cetus SDK import
import {
  CetusClmmSDK,
  ClmmPoolUtil,
  SdkOptions, // Düzeltildi: SDKOptions -> SdkOptions
  TickMath,
  // Pool, // Kullanılmıyor
  // Percentage // Kullanılmıyor
} from '@cetusprotocol/cetus-sui-clmm-sdk';
import BN from 'bn.js'; // Cetus SDK BN kullanabilir

// Extend SuiPlatform prototype
(SuiPlatform.prototype as any).createPool = async function<N extends Network>(
  this: SuiPlatform<N, Chain>, 
  params: { tokenA: string, tokenB: string, feeBps: number, initialTick?: number, decimalsA?: number, decimalsB?: number },
  signer: any // Sui Wallet Adapter
): Promise<{poolAddress: string, txid: string, messages: SDKMessageId[]}> {
  console.log("Creating Cetus pool on Sui with params:", params);

  const { tokenA, tokenB, feeBps } = params;
  // Decimals parametre olarak gelmeli veya fetch edilmeli
  const decimalsA = params.decimalsA ?? 6; // Varsayılan veya fetch
  const decimalsB = params.decimalsB ?? 6; // Varsayılan veya fetch

  const rpcUrl = this.rpc as string;
  if (!rpcUrl) {
      throw new Error("Sui connection (rpc) not found on ChainContext");
  }
  const client = new SuiClient({ url: rpcUrl }); // Client oluşturuldu ama aşağıda kullanılmıyor?

  if (!tokenA || !tokenB || !feeBps) {
    throw new Error("Missing required parameters: tokenA, tokenB, or feeBps");
  }
  console.log(`Creating Cetus pool for ${tokenA} and ${tokenB} with fee ${feeBps} bps`);

  try {
    // 2. Cetus SDK'yı başlat
    // TESTNET için Cetus Package ID'lerini buraya girin (Dokümantasyondan kontrol edin!)
    const CETUS_TESTNET_IDS = {
        package_id: "0x80b695cf64ff3636a3e66957c146a99a14cb38704278c29656ffa5761aad85c1", // ÖRNEK - DOĞRULAYIN
        pool_registry_id: "0x3f7b9e6caced1928facbb7fc9bf876a8c9ac8019c1463573d7df6b67e9c8753c", // ÖRNEK - DOĞRULAYIN
        global_config_id: "0xdaa73574614695454967535161011b87c19ae01dd832462a558d91c1926d2e63", // ÖRNEK - DOĞRULAYIN
        // calculation_swap package ID'si de gerekebilir
    };
    const sdkOptions: SdkOptions = { // Düzeltildi: SDKOptions -> SdkOptions
      clmm_pool: { package_id: CETUS_TESTNET_IDS.package_id, global_config_id: CETUS_TESTNET_IDS.global_config_id },
      network_config: {
          fullnode_url: rpcUrl,
          network: 'testnet',
      }
    };
    const sdk = new CetusClmmSDK(sdkOptions);
    await sdk.Builder.init(); // init çağırmak gerekebilir

    // 4. Fee tier ve tickSpacing
    const validFeeBps = [100, 500, 3000, 10000];
    if (!validFeeBps.includes(feeBps)) {
        throw new Error(`Unsupported feeBps: ${feeBps}. Supported values are: ${validFeeBps.join(', ')}`);
    }
    // Cetus SDK'da feeBps'ten tickSpacing'e dönüşüm nasıl yapılıyor? Dokümantasyona bakın.
    // const tickSpacing = sdk.Pool.feeToTickSpacing(feeBps); // Bu fonksiyon var mı?
    let tickSpacing: number; // Manuel veya SDK'dan alınmalı
    if (feeBps === 100) tickSpacing = 10; // Örnek değerler
    else if (feeBps === 500) tickSpacing = 60;
    else if (feeBps === 3000) tickSpacing = 100;
    else if (feeBps === 10000) tickSpacing = 200;
    else throw new Error("Cannot determine tickSpacing for feeBps");


    // 5. Başlangıç fiyatı veya tick
    let initSqrtPrice: BN;
    if (params.initialTick !== undefined) {
        initSqrtPrice = TickMath.tickIndexToSqrtPriceX64(params.initialTick);
    } else {
        // Varsayılan 1:1 fiyat (Decimal'ları dikkate alarak)
        initSqrtPrice = TickMath.priceToSqrtPriceX64(1, decimalsA, decimalsB); // Decimalleri ekle
    }


    // 6. Tokenları sırala
    // const [coinTypeA, coinTypeB] = ClmmPoolUtil.sortCoinType(tokenA, tokenB); // Bu fonksiyon SDK'da olmayabilir
    // Manuel sıralama:
    let coinTypeA = tokenA;
    let coinTypeB = tokenB;
    let adjustedSqrtPrice = initSqrtPrice;
    if (tokenA.localeCompare(tokenB) > 0) {
        [coinTypeA, coinTypeB] = [tokenB, tokenA];
        // Fiyatı ters çevir (1/fiyat)
        // invertSqrtPriceX64 yoksa manuel yap: (2^192) / sqrtPrice
        const Q64_BN = new BN(1).ushln(64); // 2^64
        const Q192_BN = Q64_BN.mul(Q64_BN).mul(Q64_BN); // 2^192
        adjustedSqrtPrice = Q192_BN.div(initSqrtPrice); // BN bölmesi
    }


    // 7. Transaction bloğu oluştur ve Cetus fonksiyonunu çağır
    const tx = new TransactionBlock();
    console.log("Building create pool transaction payload...");

    // Cetus SDK'nın güncel createPool fonksiyonunu kullanın.
    // sdk.Pool.createPool yerine builder veya module kullanılıyor olabilir.
    // Örnek:
    await sdk.Pool.createPool(tx, {
        tick_spacing: tickSpacing,
        initialize_sqrt_price: adjustedSqrtPrice.toString(),
        uri: '', // Opsiyonel
        coinTypeA: coinTypeA, // Sıralanmış
        coinTypeB: coinTypeB, // Sıralanmış
        fee_rate: feeBps * 100 // Cetus fee_rate'i bps * 100 olarak bekleyebilir, kontrol edin!
    });


    // 8. İşlemi imzalayıp gönder
    console.log("Executing transaction...");
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
        showEffects: true,
        showObjectChanges: true
      }
    });

    console.log("Transaction executed:", response);

    // 9. Havuz ID'yi transaction sonuçlarından çıkar
    const poolId = extractPoolIdFromResult(response);
    if (!poolId) {
      throw new Error("Could not extract pool ID from transaction result");
    }

    console.log("Pool created with ID:", poolId);

    return {
      poolAddress: poolId,
      txid: response.digest,
      messages: []
    };

  } catch (error) {
    console.error("Error creating Cetus pool:", error);
    throw new Error(`Cetus pool creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Havuz ID'yi transaction sonuçlarından çıkarma (önceki hali korunur, kontrol edilmeli)
function extractPoolIdFromResult(response: any): string | null {
  if (response.objectChanges?.length) {
    const poolObject = response.objectChanges.find((change: any) =>
      change.type === 'created' &&
      (change.objectType?.endsWith('::pool::Pool') ||
       change.objectType?.includes('Pool<') ||
       change.objectType?.includes(':pool::Pool'))
    );
    if (poolObject?.objectId) {
      return poolObject.objectId;
    }
  }
   if (response.effects?.created?.length) {
    const poolObject = response.effects.created.find((obj: any) =>
        obj.owner && typeof obj.owner === 'object' && 'Shared' in obj.owner &&
        (obj.reference?.objectId && obj.objectType?.includes('Pool'))
    );
    if (poolObject?.reference?.objectId) {
        return poolObject.reference.objectId;
    }
}
  console.warn("Could not extract pool ID from transaction result:", response);
  return null;
}