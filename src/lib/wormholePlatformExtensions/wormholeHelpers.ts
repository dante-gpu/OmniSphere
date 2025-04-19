import { PublicKey, AccountMeta, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } from '@solana/web3.js';
// SDK importlarını ana paketten yapalım
import { Chain, toChainId, isChain, UniversalAddress, Network, CONFIG } from '@wormhole-foundation/sdk';
// getWormholeDerivedAccounts'ı sdk-solana/src/utils altından deneyelim (Bu yol SDK versiyonuna göre değişebilir!)
// Eğer bulunamazsa, CONFIG sabitini kullanarak adresleri manuel almak gerekebilir.
import { Buffer } from 'buffer';

// Ağ'a göre Program ID'leri
const NETWORK: Network = 'Testnet'; // VEYA 'Devnet' - BURAYI AYARLAYIN!

export const WORMHOLE_PROGRAM_ID = (): string => {
    if (!CONFIG[NETWORK]) throw new Error(`Network configuration not found for ${NETWORK}`);
    const coreBridgeAddress = CONFIG[NETWORK].chains.Solana?.contracts.coreBridge;
    if (!coreBridgeAddress) throw new Error(`Core Bridge address not found for Solana on ${NETWORK}`);
    return coreBridgeAddress;
};
export const LIQUIDITY_POOL_PROGRAM_ID = 'GL6uWvwZAapbf54GQb7PwKxXrC6gnjyNcrBMeAvkh7mg'; // KENDİ PROGRAM ID'NİZ

// Wormhole Core Bridge PDA'larını alma
export function getWormholePDAs(
    wormholeProgramId: PublicKey,
    emitterAddress?: PublicKey // Sequence için emitter gerekli
): {
    config: PublicKey;
    emitterAcc: PublicKey; // Emitter account (genellikle PDA)
    sequence: PublicKey; // Sequence account (emitter'a bağlı)
    feeCollector: PublicKey;
    clock: PublicKey; // SYSVAR_CLOCK_PUBKEY olmalı
    rent: PublicKey;
    systemProgram: PublicKey;
} {
    const [bridge] = PublicKey.findProgramAddressSync(
        [Buffer.from("Bridge")], wormholeProgramId
    );
    // Emitter adresini dışarıdan almak daha doğru olabilir (örn. getWormholeEmitterAddress ile)
    // veya varsayılan emitter PDA'sını kullanabiliriz.
    const [emitter] = emitterAddress ? [emitterAddress] : PublicKey.findProgramAddressSync(
        [Buffer.from("emitter")], wormholeProgramId
    );
    const [sequence] = PublicKey.findProgramAddressSync(
        [Buffer.from("Sequence"), emitter.toBytes()], // sequence emitter'a bağlıdır!
        wormholeProgramId
    );
    const [feeCollector] = PublicKey.findProgramAddressSync(
        [Buffer.from("fee_collector")], wormholeProgramId
    );

    return {
        config: bridge,
        emitterAcc: emitter,
        sequence: sequence,
        feeCollector: feeCollector,
        clock: new PublicKey("SysvarC1ock11111111111111111111111111111111"), // Gerçek Clock Sysvar ID'si
        rent: SYSVAR_RENT_PUBKEY, // Import edilmiş olmalı
        systemProgram: SystemProgram.programId, // Import edilmiş olmalı
    };
}

// Wormhole post_message talimatı oluşturma
export function createWormholePostMessageInstruction(
    payer: PublicKey,
    wormholeProgramId: PublicKey,
    messageAccountKeypair: Keypair,
    emitterKeypairOrPda: PublicKey, // Emitter'ı sağla (PDA veya Keypair olabilir)
    nonce: number,
    payload: Buffer | Uint8Array,
    consistencyLevel: number
): TransactionInstruction {
   const pdas = getWormholePDAs(wormholeProgramId, emitterKeypairOrPda); // Emitter'ı vererek sequence'ı doğru al

   const functionDiscriminator = Buffer.from([1]); // Varsayım: 1 = post_message

   const nonceBytes = Buffer.alloc(4);
   nonceBytes.writeUInt32LE(nonce, 0);

   const consistencyLevelBytes = Buffer.from([consistencyLevel]);

   const data = Buffer.concat([
       functionDiscriminator,
       nonceBytes,
       Buffer.from(payload),
       consistencyLevelBytes,
   ]);

   const keys: AccountMeta[] = [
     { pubkey: pdas.config, isSigner: false, isWritable: false },          // bridge config
     { pubkey: messageAccountKeypair.publicKey, isSigner: true, isWritable: true }, // message (signer!)
     // Emitter PDA ise signer false, Keypair ise true olmalı.
     // Genellikle Core Bridge'in kendi emitter PDA'sı kullanılır ve signer=false'dur.
     { pubkey: pdas.emitterAcc, isSigner: false, isWritable: false },       // emitter (PDA, signer değil)
     { pubkey: pdas.sequence, isSigner: false, isWritable: true },         // sequence (emitter'a bağlı)
     { pubkey: payer, isSigner: true, isWritable: true },                  // payer
     { pubkey: pdas.feeCollector, isSigner: false, isWritable: true },     // fee_collector
     { pubkey: pdas.clock, isSigner: false, isWritable: false },            // clock sysvar
     { pubkey: pdas.rent, isSigner: false, isWritable: false },            // rent sysvar
     { pubkey: pdas.systemProgram, isSigner: false, isWritable: false },   // system_program
   ];

  return new TransactionInstruction({
    keys,
    programId: wormholeProgramId,
    data,
  });
}


// Zincir adlarını Wormhole ID'lerine çevirme
export function getWormholeChainId(chain: Chain | string): number {
    if (!isChain(chain)) {
        throw new Error(`Unknown or invalid chain name: ${chain}`);
    }
    const chainId = toChainId(chain);
    if (chainId === 0 || chainId === undefined) {
        throw new Error(`Invalid Chain ID for Wormhole. Chain provided: ${chain}`);
    }
    return chainId;
}

// Wormhole emitter adresi alma
// Bu genellikle mesajı GÖNDEREN programın/kontratın adresidir.
// Eğer Core Bridge'in kendisi mesajı yayınlıyorsa (bazı senaryolarda), o zaman bu PDA doğru olabilir.
// Eğer KENDİ programınız `post_message` instruction'ını çağırıyorsa,
// emitter sizin programınızın PDA'sı veya Keypair'i olmalıdır.
// Şimdilik Core Bridge'in varsayılan emitter PDA'sını döndürelim.
export function getWormholeEmitterAddress(wormholeProgramId: PublicKey): string {
    const [emitter] = PublicKey.findProgramAddressSync(
        [Buffer.from("emitter")],
        wormholeProgramId
    );
    return emitter.toBase58();
}