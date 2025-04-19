import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    // SYSVAR_RENT_PUBKEY, // Kullanılmıyor gibi
    Keypair,
    // GetTransactionConfig // Kullanılmıyor
  } from '@solana/web3.js';
  import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';
  // Network, Chain, UniversalAddress ana SDK'dan import edilmeli
  import { WormholeMessageId as SDKMessageId, Chain, UniversalAddress, Network, Wormhole } from '@wormhole-foundation/sdk';
  // import { encoding } from '@wormhole-foundation/sdk-base'; // encoding kullanılmıyor
  import {
      getWormholeChainId,
      createWormholePostMessageInstruction, // Doğru ismi import et
      getWormholeEmitterAddress, // Kullanılıyor
      WORMHOLE_PROGRAM_ID, // NETWORK parametresi alan fonksiyonu import et
      LIQUIDITY_POOL_PROGRAM_ID, // Kullanılıyor
      parseWormholeSequenceFromLog // Bu satırı ekleyin
  } from './wormholeHelpers';
  import { Buffer } from 'buffer';
  import bs58 from 'bs58';

  (SolanaPlatform.prototype as any).linkPools = async function<N extends Network>(
    this: SolanaPlatform<N>,
    localPoolId: string,
    remotePoolId: string,
    remoteChain: Chain,
    signer: any // SolanaWalletAdapter type
  ): Promise<{txid: string, messages: SDKMessageId[]}> {
    console.log(`Linking Solana pool ${localPoolId} to ${remoteChain} pool ${remotePoolId}`);

     // Connection'ı signer'dan al
     if (!signer.connection) {
          throw new Error("Signer does not have a required 'connection' property.");
     }
     const connection: Connection = signer.connection;
     // Network'ü context'ten veya global'den almalıyız
     const network = this.network; // Varsayım: Platform context'inde network var
     if (!network) {
         throw new Error("Could not determine network from SolanaPlatform context.");
     }


    const payerPubkey = new PublicKey(signer.address());

    try {
      const nonce = Math.floor(Math.random() * 100000);
      const localPoolIdPubkey = new PublicKey(localPoolId);
      const remoteChainId = getWormholeChainId(remoteChain);
      const remoteChainIdBytes = Buffer.alloc(2);
      remoteChainIdBytes.writeUInt16BE(remoteChainId, 0);

      let remotePoolIdBytes: Buffer;
      if (remotePoolId.startsWith('0x')) {
        remotePoolIdBytes = Buffer.from(remotePoolId.slice(2), 'hex');
      } else {
        try {
          remotePoolIdBytes = Buffer.from(bs58.decode(remotePoolId));
          // Hedef zincir Solana ise uzunluk kontrolü yap (Sui ise yapma)
          if (remoteChain === 'Solana' && remotePoolIdBytes.length !== 32) {
               throw new Error('Invalid Solana address length after decode.');
          }
        } catch (e) {
          console.warn("Remote pool ID is not valid hex or base58, treating as UTF8 string:", remotePoolId);
          remotePoolIdBytes = Buffer.from(remotePoolId, 'utf8');
        }
      }

      // Payload: Sadece local Pool ID (bytes)
      const payload = Buffer.from(localPoolIdPubkey.toBytes()); // Argümansız toBytes()
      console.log("Prepared payload for Wormhole message (localPoolId):", payload.toString('hex'));

      // 3.1 Kendi programınız için instruction
      const liquidityPoolProgram = new PublicKey(LIQUIDITY_POOL_PROGRAM_ID);
      const linkPoolInstruction = createLinkPoolInstruction_YOUR_IMPLEMENTATION({
        programId: liquidityPoolProgram,
        poolAccount: localPoolIdPubkey,
        remoteChainId: remoteChainId,
        remotePoolAddress: remotePoolIdBytes,
        payer: payerPubkey,
      });

      // 3.2 Wormhole mesaj instruction
      const WORMHOLE_PROGRAM_ID_PUBKEY = new PublicKey(WORMHOLE_PROGRAM_ID(network)); // Ağ'a göre al
      const messageAccountKeypair = Keypair.generate();
      const wormholeInstruction = createWormholePostMessageInstruction(
          payerPubkey,
          WORMHOLE_PROGRAM_ID_PUBKEY, // Program ID'yi helper'a ver
          messageAccountKeypair,
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

      // 6. Wormhole sequence'ı al (SDK kullanarak)
      const txResponse = await connection.getTransaction(txid, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      if (!txResponse) {
           throw new Error(`Failed to fetch confirmed transaction: ${txid}`);
      }
      // Parse the Wormhole sequence from transaction
      const sequence = parseWormholeSequenceFromLog(txResponse);

      if (sequence === null) {
          throw new Error("Could not parse Wormhole sequence from transaction");
      }
      console.log("Wormhole Sequence:", sequence);

      const emitterAddressString = getWormholeEmitterAddress(WORMHOLE_PROGRAM_ID_PUBKEY); // Helper'a program ID ver
      console.log("Emitter Address:", emitterAddressString);

      // UniversalAddress import edildi
      const messageInfo: SDKMessageId = {
        chain: "Solana",
        emitter: new UniversalAddress(emitterAddressString), // UniversalAddress kullan
        sequence: sequence
      };

      return {
        txid,
        messages: [messageInfo]
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
      dataLayout.writeUInt8(1, 0);
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