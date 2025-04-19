import { PublicKey, AccountMeta, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } from '@solana/web3.js';
// SDK importlarını ana paketten yapalım
import { Chain, toChainId, isChain, UniversalAddress, Network, CONFIG } from '@wormhole-foundation/sdk';
// Solana'ya özel helper'ları sdk-solana'dan alalım - BU MUHTEMELEN YANLIŞ YER!
// getWormholeDerivedAccounts genellikle doğrudan SDK içinde veya config'de olur.
// Şimdilik CONFIG'ten almayı deneyelim.
// import { getWormholeDerivedAccounts } from '@wormhole-foundation/sdk-solana'; // Kaldırıldı
import { Buffer } from 'buffer';

// Ağ'a göre Program ID'leri (ÖNCE BUNLARI KONTROL EDİN!)
const NETWORK: Network = 'Testnet'; // VEYA 'Devnet' VEYA 'Mainnet' - BURAYI AYARLAYIN!

export const WORMHOLE_PROGRAM_ID = (network?: string): string => {
    // CONFIG sabitini kullanarak doğru adresleri al
    if (!CONFIG[NETWORK]) throw new Error(`Network configuration not found for ${NETWORK}`);
    const coreBridgeAddress = CONFIG[NETWORK].chains.Solana?.contracts.coreBridge;
    if (!coreBridgeAddress) throw new Error(`Core Bridge address not found for Solana on ${NETWORK}`);
    return coreBridgeAddress;
};

// Kendi likidite havuzu programınızın ID'si
export const LIQUIDITY_POOL_PROGRAM_ID = 'GL6uWvwZAapbf54GQb7PwKxXrC6gnjyNcrBMeAvkh7mg'; // KENDİ PROGRAM ID'NİZ

// Wormhole Core Bridge programı için gereken PDA'ları alma
// Bu fonksiyon artık gerekli olmayabilir, çünkü instruction oluştururken kullanılabilirler
// veya platform context üzerinden erişilebilirler. Şimdilik tutalım ama gözden geçirin.
export function getWormholePDAs(
    wormholeProgramId: PublicKey, // Program ID'yi parametre olarak al
): {
    config: PublicKey; // bridge pda
    emitter: PublicKey; // emitter pda
    sequence: PublicKey; // sequence pda - DİKKAT: Bu emitter'a bağlıdır!
    feeCollector: PublicKey; // feeCollector pda
    clock: PublicKey; // sysvar
    rent: PublicKey; // sysvar
    systemProgram: PublicKey; // sysvar
} {
    const [bridge] = PublicKey.findProgramAddressSync(
        [Buffer.from("Bridge")], wormholeProgramId
    );
    const [emitter] = PublicKey.findProgramAddressSync(
        [Buffer.from("emitter")], wormholeProgramId
    );
    // Sequence adresi emitter adresine bağlıdır!
    const [sequence] = PublicKey.findProgramAddressSync(
        [Buffer.from("Sequence"), emitter.toBytes()], wormholeProgramId
    );
    const [feeCollector] = PublicKey.findProgramAddressSync(
        [Buffer.from("fee_collector")], wormholeProgramId
    );

    return {
        config: bridge,
        emitter: emitter,
        sequence: sequence,
        feeCollector: feeCollector,
        clock: PublicKey.default, // TODO: SYSVAR_CLOCK_PUBKEY import edilmeli @solana/web3.js'den
        rent: SYSVAR_RENT_PUBKEY, // Import edilmiş olmalı @solana/web3.js'den
        systemProgram: SystemProgram.programId, // Import edilmiş olmalı @solana/web3.js'den
    };
}

// Wormhole post_message talimatı oluşturma
// SDK'nın kendi publishMessage metodu varsa o tercih edilmeli.
export function createWormholePostMessageInstruction(
    payer: PublicKey,
    wormholeProgramId: PublicKey, // Program ID parametre olarak alınmalı
    messageAccountKeypair: Keypair, // Mesaj hesabının Keypair'i
    nonce: number,
    payload: Buffer | Uint8Array,
    consistencyLevel: number // Örn: 1 (Confirmed)
): TransactionInstruction {
   const pdas = getWormholePDAs(wormholeProgramId); // PDA'ları al

   // post_message instruction discriminator (IDL'den kontrol edin, genellikle 1)
   const functionDiscriminator = Buffer.from([1]);

   const nonceBytes = Buffer.alloc(4);
   nonceBytes.writeUInt32LE(nonce, 0);

   const consistencyLevelBytes = Buffer.from([consistencyLevel]);

   // post_message data: discriminator + nonce + payload + consistencyLevel
   const data = Buffer.concat([
       functionDiscriminator,
       nonceBytes,
       Buffer.from(payload),
       consistencyLevelBytes,
   ]);

   const keys: AccountMeta[] = [
     { pubkey: pdas.config, isSigner: false, isWritable: false },         // bridge config
     { pubkey: messageAccountKeypair.publicKey, isSigner: true, isWritable: true },  // message (signer!)
     { pubkey: pdas.emitter, isSigner: false, isWritable: false },       // emitter (PDA, signer değil)
     { pubkey: pdas.sequence, isSigner: false, isWritable: true },       // sequence (emitter'a bağlı)
     { pubkey: payer, isSigner: true, isWritable: true },                 // payer
     { pubkey: pdas.feeCollector, isSigner: false, isWritable: true },    // fee_collector
     { pubkey: pdas.clock, isSigner: false, isWritable: false },           // clock sysvar
     // Rent ve SystemProgram genellikle Solana runtime tarafından otomatik sağlanır,
     // instruction içinde belirtmek her zaman gerekli olmayabilir.
     // { pubkey: pdas.rent, isSigner: false, isWritable: false },           // rent sysvar
     // { pubkey: pdas.systemProgram, isSigner: false, isWritable: false },  // system_program
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
    if (chainId === undefined) {
      throw new Error(`Unknown or unsupported chain for Wormhole ID: ${chain}`);
    }
    return chainId;
}

// Wormhole emitter adresi alma
// Bu fonksiyon, mesajı yayınlayan programın adresini döndürmeli.
// Eğer Core Bridge'in kendi emitter'ı kullanılacaksa PDA adresi doğrudur.
// Eğer KENDİ programınız mesajı yayınlayacaksa, o programın emitter PDA'sını almalısınız.
export function getWormholeEmitterAddress(wormholeProgramId: PublicKey): string {
    const [emitter] = PublicKey.findProgramAddressSync(
        [Buffer.from("emitter")],
        wormholeProgramId
    );
    return emitter.toBase58();
}

// Wormhole mesaj sequence'ını transaction log'larından çıkarma
export function parseWormholeSequenceFromLog(txResponse: any): bigint | null {
  try {
    // Transaction log'larını kontrol et
    const logs = txResponse.meta?.logMessages || [];
    
    // Sequence log'unu ara
    for (const log of logs) {
      // Standart Wormhole log formatı: "Sequence: 12345"
      const sequenceMatch = log.match(/Sequence: (\d+)/i);
      if (sequenceMatch && sequenceMatch[1]) {
        return BigInt(sequenceMatch[1]);
      }
      
      // Alternatif format: "sequence=12345"
      const altMatch = log.match(/sequence=(\d+)/i);
      if (altMatch && altMatch[1]) {
        return BigInt(altMatch[1]);
      }
    }
    
    console.warn("Could not find Wormhole sequence in transaction logs");
    return null;
  } catch (error) {
    console.error("Error parsing Wormhole sequence:", error);
    return null;
  }
}