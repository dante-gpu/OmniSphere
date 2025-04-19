import {
    Connection, PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction, VersionedTransaction
  } from '@solana/web3.js';
  import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';
  // Network ve Chain'i ana SDK'dan import et
  import { WormholeMessageId as SDKMessageId, Network, Chain } from '@wormhole-foundation/sdk';
  import {
    Liquidity,
    // Token, // Kullanılmıyor
    // TokenAmount, // Kullanılmıyor
    TOKEN_PROGRAM_ID, // Kullanılıyor
    // Market, // Kullanılmıyor (Market ID doğrudan kullanılıyor)
    LiquidityPoolKeysV4, // Kullanılıyor
    TxVersion, // Kullanılıyor
    buildTransaction, // Kullanılıyor
    // Percent, // Kullanılmıyor
    InnerTransaction, // Kullanılıyor
    InstructionType, // buildTransaction için gerekli
    // LOOKUP_TABLE_CACHE, // Kullanılmıyor
    // ENDPOINT as RAYDIUM_ENDPOINT, // Kullanılmıyor
    // Raydium, // Kullanılmıyor
  } from '@raydium-io/raydium-sdk';
 // import { Wallet } from '@project-serum/anchor'; // Kullanılmıyor

// Raydium için Wallet arayüzü (Anchor Wallet extend ETMİYOR)
interface RaydiumWallet {
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
    publicKey: PublicKey;
}

// Prototip yerine 'as any' kullan
(SolanaPlatform.prototype as any).createPool = async function(
    // this: SolanaPlatform<Network, Chain>, // 'this' türünü kaldırıyoruz
    params: { tokenA: string, tokenB: string, feeBps?: number }, // feeBps opsiyonel yapıldı
    signer: any // Solana Wallet Adapter
): Promise<{poolAddress: string, txid: string, messages: SDKMessageId[]}> {
    console.log("Creating Raydium pool on Solana with params:", params);

     if (!signer.connection) {
          throw new Error("Signer does not have a required 'connection' property.");
     }
     const connection: Connection = signer.connection;
    const ownerPubkey = new PublicKey(signer.publicKey);

    const wallet: RaydiumWallet = {
        publicKey: ownerPubkey,
        signTransaction: signer.signTransaction.bind(signer),
        signAllTransactions: signer.signAllTransactions.bind(signer),
    };

    const { tokenA, tokenB } = params; // feeBps kullanılmıyor
    const mintA = new PublicKey(tokenA);
    const mintB = new PublicKey(tokenB);

    console.log(`Attempting to create pool for ${mintA.toBase58()} and ${mintB.toBase58()}`);

    try {
      // 1. OpenBook Market ID'si (DEVNET için doğru ID olduğundan emin olun!)
      console.warn("Using placeholder DEVNET market ID. Ensure a market exists or implement market creation.");
      const marketId = new PublicKey('8BnEgHoWFysVcuFFX7QztDmzuH8rMaXGdkvPW82L8z4P'); // Placeholder USDC/USDT devnet market

      console.log("Using Market ID:", marketId.toString());

      // 2. Raydium AMM Havuzu Oluşturma
      console.log("Building Raydium AMM pool creation transaction...");

      const tokenADecimals = await connection.getTokenSupply(mintA).then(r => r.value.decimals);
      const tokenBDecimals = await connection.getTokenSupply(mintB).then(r => r.value.decimals);

      // Raydium SDK v1 create pool (makeCreatePoolV4InstructionV2)
      // Dokümantasyona göre dönüş değeri ve parametreleri kontrol edin!
      const createPoolInstructions = await Liquidity.makeCreatePoolV4InstructionV2Simple({
            connection,
            marketId,
            baseMint: mintA,
            quoteMint: mintB,
            baseDecimals: tokenADecimals,
            quoteDecimals: tokenBDecimals,
            associatedOnly: false, // Yeni hesaplar oluşturulsun mu?
            checkCreateMarket: false, // Market var varsay
            makeTxVersion: TxVersion.V0,
            ownerInfo: {
                 feePayer: wallet.publicKey,
                 wallet: wallet.publicKey,
                 tokenAccounts: [], // Başlangıç likiditesi yok
                 useSOLBalance: true,
                 // newPoolLpAccount: Keypair.generate(), // Gerekirse LP token hesabı için Keypair
                 // newPoolTokenAccountA: Keypair.generate(), // Gerekirse Vault A hesabı için Keypair
                 // newPoolTokenAccountB: Keypair.generate(), // Gerekirse Vault B hesabı için Keypair
            },
            // computeBudgetConfig: { units: 400000, microLamports: 25000 }, // Gerekirse
      });

      // Dönen değerden talimatları ve poolKeys'i al
      const setupInstructions = createPoolInstructions.setupInstructions; // Varsa
      const createInstruction = createPoolInstructions.createInstruction; // Varsa
      const poolKeys = createPoolInstructions.address; // Adresler poolKeys içerir

       // Talimatları birleştir (setup ve create ayrıysa)
       const allInstructions = (setupInstructions || []).concat(createInstruction);

      // İşlemi buildTransaction ile hazırla
      const { innerTransactions } = await buildTransaction({
          connection,
          makeTxVersion: TxVersion.V0,
          payer: wallet.publicKey,
          innerTransactions: [{
              instructions: allInstructions,
              signers: [], // createPoolInstructions'dan dönen signers varsa buraya ekle
              instructionTypes: [InstructionType.createAmm], // Talimat türünü belirt
          }]
      });

      console.log("Sending create pool transaction...");
      // İmzala ve gönder
      const signedTransactions = await wallet.signAllTransactions(
           innerTransactions.map((t) => t.transaction) // 't' parametresine tür ekle (implicit any hatası için)
       );

      const txids: string[] = [];
      for (const signedTx of signedTransactions) {
         const txid = await connection.sendRawTransaction(signedTx.serialize());
         txids.push(txid);
         console.log("Sent transaction part:", txid);
         await connection.confirmTransaction(txid);
      }
      const primaryTxId = txids[txids.length - 1];

      // Pool ID'yi poolKeys'den al (LiquidityPoolKeysV4 türünde olmalı)
      const poolAddress = poolKeys.id.toString();
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

  // Raydium Program ID'leri
  const LIQUIDITY_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
  // const OPENBOOK_PROGRAM_ID = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'); // Kullanılmıyor