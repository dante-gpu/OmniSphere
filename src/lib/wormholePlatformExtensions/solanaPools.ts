import {
    Connection, PublicKey, Transaction, VersionedTransaction,
    // SystemProgram, // Kullanılmıyor
    // Keypair, // Kullanılmıyor
    // TransactionInstruction, // Kullanılmıyor (buildTransaction içinde handle ediliyor)
    Signer as SolanaSigner // buildTransaction signers için gerekli olabilir
  } from '@solana/web3.js';
  import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';
  import { WormholeMessageId as SDKMessageId } from '@wormhole-foundation/sdk'; // Network ve Chain kaldırıldı (bu dosyada kullanılmıyor)
  import {
    Liquidity,
    // Market, // Kullanılmıyor
    TxVersion, // Kullanılıyor
    buildTransaction, // Kullanılıyor
    InstructionType, // Kullanılıyor
    LOOKUP_TABLE_CACHE, // Kullanılıyor
    // TOKEN_PROGRAM_ID, // Kullanılmıyor
    // Percent, // Kullanılmıyor
    DEVNET_PROGRAM_ID // Kullanılıyor
  } from '@raydium-io/raydium-sdk';
  import { BN } from '@project-serum/anchor'; // BN'i sadece anchor'dan import ediyoruz
 // import { Wallet } from '@project-serum/anchor'; // Anchor Wallet gereksiz

// Raydium için Wallet arayüzü
interface RaydiumWallet {
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
    publicKey: PublicKey;
}

// Prototip yerine 'as any' kullan
(SolanaPlatform.prototype as any).createPool = async function(
    // this: SolanaPlatform<Network, Chain>, // Kaldırıldı
    params: { tokenA: string, tokenB: string, feeBps?: number }, // feeBps opsiyonel (kullanılmıyor)
    signer: any // Solana Wallet Adapter (connection ve publicKey içermeli)
): Promise<{poolAddress: string, txid: string, messages: SDKMessageId[]}> {
    console.log("Creating Raydium pool on Solana with params:", params);

     if (!signer.connection) {
          throw new Error("Signer does not have a required 'connection' property.");
     }
     if (!signer.publicKey) {
         throw new Error("Signer does not have a required 'publicKey' property.");
     }
     const connection: Connection = signer.connection;
    const ownerPubkey = new PublicKey(signer.publicKey);

    // RaydiumWallet arayüzü güncellendi, 'payer' yok
    const wallet: RaydiumWallet = {
        publicKey: ownerPubkey,
        signTransaction: signer.signTransaction.bind(signer),
        signAllTransactions: signer.signAllTransactions.bind(signer),
    };

    const { tokenA, tokenB } = params;
    const mintA = new PublicKey(tokenA);
    const mintB = new PublicKey(tokenB);

    console.log(`Attempting to create pool for ${mintA.toBase58()} and ${mintB.toBase58()}`);

    try {
      // 1. Market ID (DEVNET için doğru ID olduğundan emin olun!)
      console.warn("Using placeholder DEVNET market ID. Ensure market exists or implement market creation.");
      const marketId = new PublicKey('8BnEgHoWFysVcuFFX7QztDmzuH8rMaXGdkvPW82L8z4P'); // Placeholder USDC/USDT devnet market

      console.log("Using Market ID:", marketId.toString());

      // Raydium Program ID'lerini ağa göre seç (Devnet varsayılıyor)
      const programIds = DEVNET_PROGRAM_ID; // Doğrudan Devnet kullan
      const marketProgramId = programIds.OPENBOOK_MARKET; // Devnet OpenBook ID

      // 2. Raydium AMM Havuzu Oluşturma Talimatları
      console.log("Building Raydium AMM pool creation instructions...");

      const tokenADecimals = await connection.getTokenSupply(mintA).then(r => r.value.decimals);
      const tokenBDecimals = await connection.getTokenSupply(mintB).then(r => r.value.decimals);

      // makeCreatePoolV4InstructionV2Simple kullan (dönüş türü önemli!)
      const createPoolOutput = await Liquidity.makeCreatePoolV4InstructionV2Simple({
            connection,
            programId: new PublicKey('9rpQHSyFVM1dkkHFQ2TtTzPEYnaDLcAbvbtcs1BYJpLa'), // Directly use the Devnet Raydium Liquidity program ID
            marketInfo: {
                marketId: marketId, 
                programId: marketProgramId
            },
            baseMintInfo: { mint: mintA, decimals: tokenADecimals },
            quoteMintInfo: { mint: mintB, decimals: tokenBDecimals },
            associatedOnly: false,
            checkCreateATAOwner: false, // "checkCreateMarket" yerine "checkCreateATAOwner" kullanın
            makeTxVersion: TxVersion.V0,
            ownerInfo: {
                feePayer: wallet.publicKey,
                wallet: wallet.publicKey,
                tokenAccounts: [],
                useSOLBalance: true,
            },
            baseAmount: new BN(0), // BN sınıfını import etmeniz gerekiyor
            quoteAmount: new BN(0),
            startTime: new BN(0),
            feeDestinationId: wallet.publicKey, // Fee destination olarak kendi cüzdanınızı kullanabilirsiniz
            lookupTableCache: LOOKUP_TABLE_CACHE
      });

      // Düzeltme: Dönüş değerinden innerTransactions ve address al
      // Düzeltme: address alanı poolKeys DEĞİL, oluşturulan hesapların adreslerini içerir.
      const poolAddressInfo = createPoolOutput.address; // Oluşturulan hesap adresleri
      const innerSimpleTransactions = createPoolOutput.innerTransactions;


       // İşlemi buildTransaction ile hazırla
       // Düzeltme: innerTransactions'ı map'leyerek InstructionType ekle
      const transactions = await buildTransaction({
          connection,
          makeTxVersion: TxVersion.V0,
          payer: wallet.publicKey,
          innerTransactions: innerSimpleTransactions.map(tx => ({
              instructions: tx.instructions,
              signers: tx.signers as SolanaSigner[], // Gerekirse tür dönüşümü yap
              instructionTypes: [InstructionType.ammV4CreatePool], // Düzeltildi: createAmm -> ammV4CreatePool
          })),
          lookupTableCache: LOOKUP_TABLE_CACHE, // Lookup table kullanılıyorsa
      });

      console.log("Sending create pool transaction...");
      // İmzala ve gönder
      const signedTransactions = await wallet.signAllTransactions(transactions); // Doğrudan transactions dizisi

      const txids: string[] = [];
      for (const signedTx of signedTransactions) {
         const txid = await connection.sendRawTransaction(signedTx.serialize());
         txids.push(txid);
         console.log("Sent transaction part:", txid);
         await connection.confirmTransaction(txid, 'confirmed');
      }
      const primaryTxId = txids[txids.length - 1];

      // Pool ID'yi createPoolOutput.address içindeki ammId'den al
      // Düzeltme: id -> ammId
      const poolAddress = poolAddressInfo.ammId.toString();
      console.log("Pool created with address:", poolAddress);

      return {
        poolAddress: poolAddress,
        txid: primaryTxId,
        messages: []
      };

    } catch (error) {
      console.error("Error creating Raydium pool:", error);
      throw new Error(`Raydium pool creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Raydium Program ID'leri (Artık kullanılmıyor, programIds'den alınıyor)
  // const LIQUIDITY_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');