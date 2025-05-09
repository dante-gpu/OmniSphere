import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    // SYSVAR_RENT_PUBKEY, // Kullanılmıyor
    Keypair,
    // GetTransactionConfig // Kullanılmıyor
  } from '@solana/web3.js';
  import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';
  // Chain, UniversalAddress ana SDK'dan import ediliyor
  // Network ve Wormhole ana SDK'dan import ediliyor
  import { WormholeMessageId as SDKMessageId, Chain, UniversalAddress, Network, Wormhole } from '@wormhole-foundation/sdk';
  // import { encoding } from '@wormhole-foundation/sdk-base'; // Kullanılmıyor
  import {
      getWormholeChainId,
      createWormholePostMessageInstruction,
      getWormholeEmitterAddress,
      WORMHOLE_PROGRAM_ID,
      LIQUIDITY_POOL_PROGRAM_ID,
      SOLANA_NETWORK
  } from './wormholeHelpers';
  import { Buffer } from 'buffer';
  import bs58 from 'bs58';
  import { ChainContext } from '@wormhole-foundation/sdk';
  import { SolanaSignerAdapter } from '../wormholeSignerAdapters';
  // import { Chain, Network, toChainId, toNative } from '@wormhole-foundation/sdk-base'; // Removed duplicate/problematic imports
  // import { nativeToUint8Array } from '@wormhole-foundation/sdk-definitions'; // Removed problematic import

  // LinkPoolResult ve WormholeMessageId tiplerini tanımla (veya ortak bir yerden import et)
  interface WormholeMessageId {
    chain: Chain;
    emitter: string;
    sequence: bigint;
  }
  interface LinkPoolResult {
    txIds: string[];
    wormholeMessages: WormholeMessageId[];
  }

  // Yer tutucu Solana linkPools fonksiyonu (EXPORT EDİLECEK)
  export async function solanaLinkPoolsPlaceholder(
    chainContext: ChainContext<Network, "Solana">, // Pass context
    localPoolAddress: string,
    remotePoolAddress: string,
    remoteChain: Chain,
    signer: SolanaSignerAdapter // Type hint
  ): Promise<LinkPoolResult> {
    console.warn(
      `---> Solana: Placeholder solanaLinkPoolsPlaceholder called <---
      Local Pool: ${localPoolAddress}
      Remote Pool: ${remotePoolAddress}
      Remote Chain: ${remoteChain}
      Signer Address: ${signer.address()}
      NOTE: This is a placeholder and does NOT perform a real transaction!`
    );

    const placeholderTxId = `solana_link_placeholder_${Date.now()}`;
    return {
      txIds: [placeholderTxId],
      wormholeMessages: [],
    };
  }

  console.log("Solana platform extension: solanaLinkPoolsPlaceholder defined and exported.");

  // Prototip yerine 'as any' kullan
  (SolanaPlatform.prototype as any).linkPools = async function(
    // this: SolanaPlatform<Network, Chain>, // 'this' türünü kaldırıyoruz
    localPoolId: string,
    remotePoolId: string,
    remoteChain: Chain,
    signer: any // SolanaWalletAdapter (connection ve address() içermeli)
  ): Promise<{txid: string, messages: SDKMessageId[]}> {
    console.log(`Linking Solana pool ${localPoolId} to ${remoteChain} pool ${remotePoolId}`);

     if (!signer.connection) {
          throw new Error("Signer does not have a required 'connection' property.");
     }
     const connection: Connection = signer.connection;
     const network = SOLANA_NETWORK; // Helper'dan alınan ağ sabitini kullan

    const payerPubkey = new PublicKey(signer.address());

    try {
      const nonce = Math.floor(Math.random() * 100000);
      const localPoolIdPubkey = new PublicKey(localPoolId);
      const remoteChainId = getWormholeChainId(remoteChain);
      // const remoteChainIdBytes = Buffer.alloc(2); // Artık link instruction içinde kullanılmıyor gibi
      // remoteChainIdBytes.writeUInt16BE(remoteChainId, 0);

      let remotePoolIdBytes: Buffer;
      if (remotePoolId.startsWith('0x')) {
        remotePoolIdBytes = Buffer.from(remotePoolId.slice(2), 'hex');
      } else {
        try {
          remotePoolIdBytes = Buffer.from(bs58.decode(remotePoolId));
          if (remoteChain === 'Solana' && remotePoolIdBytes.length !== 32) {
               throw new Error('Invalid Solana address length after decode.');
          }
        } catch (e) {
          console.warn("Remote pool ID is not valid hex or base58, treating as UTF8 string:", remotePoolId);
          remotePoolIdBytes = Buffer.from(remotePoolId, 'utf8');
        }
      }

      // Payload: Sadece local Pool ID (bytes)
      const payload = Buffer.from(localPoolIdPubkey.toBytes()); // Argümansız
      console.log("Prepared payload for Wormhole message (localPoolId):", payload.toString('hex'));

      // 3.1 Kendi programınız için instruction
      const liquidityPoolProgram = new PublicKey(LIQUIDITY_POOL_PROGRAM_ID);
      const linkPoolInstruction = createLinkPoolInstruction_YOUR_IMPLEMENTATION({ // Placeholder
        programId: liquidityPoolProgram,
        poolAccount: localPoolIdPubkey,
        remoteChainId: remoteChainId,
        remotePoolAddress: remotePoolIdBytes,
        payer: payerPubkey,
      });

      // 3.2 Wormhole mesaj instruction
      const WORMHOLE_PROGRAM_ID_PUBKEY = new PublicKey(WORMHOLE_PROGRAM_ID(network));
      const messageAccountKeypair = Keypair.generate();
      const emitterPda = new PublicKey(getWormholeEmitterAddress(WORMHOLE_PROGRAM_ID_PUBKEY));

      const wormholeInstruction = createWormholePostMessageInstruction(
          payerPubkey,
          WORMHOLE_PROGRAM_ID_PUBKEY,
          messageAccountKeypair,
          emitterPda,
          nonce,
          payload,
          1 // Consistency Level: Confirmed
      );

      console.log("Building transaction with instructions...");
      const transaction = new Transaction()
        .add(linkPoolInstruction)
        .add(wormholeInstruction);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payerPubkey;

      transaction.partialSign(messageAccountKeypair);

      console.log("Signing and sending transaction...");
      const signedTx = await signer.signTransaction(transaction);
      const txid = await connection.sendRawTransaction(signedTx.serialize());

      console.log("Transaction sent with ID:", txid);
      const confirmation = await connection.confirmTransaction({
          signature: txid,
          blockhash: blockhash,
          lastValidBlockHeight: lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
         throw new Error(`Solana transaction confirmation failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log("Transaction confirmed");

      // 6. Wormhole mesaj bilgilerini al (SDK Statik Metodu ile)
      // Wormhole instance oluşturup context almamız gerekiyor
      const wh = new Wormhole(network, [SolanaPlatform]); // Platformu ekle
      const solanaContext = wh.getChain("Solana");
      // Connection'ı context'e ata (SDK bazen bunu gerektirir)
      // @ts-ignore - tip tanımında olmasa bile atamayı dene
      solanaContext.rpc = connection;

      // Düzeltme: parseSequenceFromTx yerine parseMessageFromTx kullan
      // ve ChainContext ile txid'yi (string) ver
      const messages: SDKMessageId[] = await Wormhole.parseMessageFromTx(solanaContext, txid);

      if (!messages || messages.length === 0) {
          throw new Error("Could not parse Wormhole messages from transaction");
      }
      console.log("Parsed Wormhole Messages:", messages);

      // İlk mesajın bilgilerini alalım
      const firstMessage = messages[0];
      // const sequence = firstMessage.sequence; // Artık doğrudan messages döndürüyoruz
      // const emitterAddress = firstMessage.emitter; // Artık doğrudan messages döndürüyoruz
      // console.log("Wormhole Sequence:", sequence);
      // console.log("Emitter Address:", emitterAddress.toString());

      return {
        txid,
        messages: messages // SDK'dan parse edilen mesajları döndür
      };

    } catch (error) {
      console.error("Error linking Solana pool:", error);
      throw new Error(`Failed to link Solana pool: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Bu fonksiyon SİZİN Solana programınızın instruction'ını oluşturmalıdır.
  function createLinkPoolInstruction_YOUR_IMPLEMENTATION(params: {
      programId: PublicKey;
      poolAccount: PublicKey;
      remoteChainId: number;
      remotePoolAddress: Buffer;
      payer: PublicKey;
  }): TransactionInstruction {
      console.warn("createLinkPoolInstruction_YOUR_IMPLEMENTATION needs to be implemented based on your Solana program!");
      const dataLayout = Buffer.alloc(1 + 2 + params.remotePoolAddress.length);
      dataLayout.writeUInt8(1, 0); // Discriminator
      dataLayout.writeUInt16BE(params.remoteChainId, 1);
      params.remotePoolAddress.copy(dataLayout, 3);

      const keys = [
          { pubkey: params.poolAccount, isSigner: false, isWritable: true },
          { pubkey: params.payer, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];

      return new TransactionInstruction({
          keys,
          programId: params.programId,
          data: dataLayout,
      });
  }