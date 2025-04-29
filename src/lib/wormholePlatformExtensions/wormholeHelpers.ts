import { PublicKey, AccountMeta, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } from '@solana/web3.js';
// SDK importlarını ana paketten yapalım
import { Chain, toChainId, isChain, isChainId, UniversalAddress, Network, CONFIG } from '@wormhole-foundation/sdk';
// getWormholeDerivedAccounts için doğru import yolu (veya CONFIG kullanımı)
// SDK v0.3.x+ için platform context'inden alınır: chainContext.getWormholeDerivedAccounts()
// Manuel PDA türetme daha stabil olabilir:
import { utils } from "@wormhole-foundation/sdk-solana"; // Solana utils PDA için
import { Buffer } from 'buffer';

// Ağ'a göre Program ID'leri (ÖNCE BUNLARI KONTROL EDİN!)
const NETWORK: Network = 'Devnet'; // VEYA 'Testnet' - Solana için Devnet, Sui için Testnet kullanılıyor gibi
export const SOLANA_NETWORK: Network = 'Devnet'; // Solana için Devnet
export const SUI_NETWORK: Network = 'Testnet';   // Sui için Testnet

export const WORMHOLE_PROGRAM_ID = (network: Network): string => {
    if (!CONFIG[network]) throw new Error(`Network configuration not found for ${network}`);
    // Solana için Core Bridge adresini al
    const coreBridgeAddress = CONFIG[network].chains.Solana?.contracts.coreBridge;
    if (!coreBridgeAddress) throw new Error(`Core Bridge address not found for Solana on ${network}`);
    return coreBridgeAddress;
};
// Kendi likidite havuzu programınızın ID'si
export const LIQUIDITY_POOL_PROGRAM_ID = 'GL6uWvwZAapbf54GQb7PwKxXrC6gnjyNcrBMeAvkh7mg'; // KENDİ PROGRAM ID'NİZ

// Wormhole Core Bridge PDA'larını alma
export function getWormholePDAs(
    wormholeProgramId: PublicKey
): {
    config: PublicKey; // bridge pda
    emitterAcc: PublicKey; // emitter pda
    sequence: PublicKey; // sequence pda - DİKKAT: Bu emitter'a bağlıdır!
    feeCollector: PublicKey; // feeCollector pda
    clock: PublicKey; // sysvar
    rent: PublicKey; // sysvar
    systemProgram: PublicKey; // sysvar
} {
    const bridge = utils.deriveAddress([Buffer.from("Bridge")], wormholeProgramId);
    const emitter = utils.deriveAddress([Buffer.from("emitter")], wormholeProgramId);
    const sequence = utils.deriveAddress([Buffer.from("Sequence"), emitter.toBytes()], wormholeProgramId);
    const feeCollector = utils.deriveAddress([Buffer.from("fee_collector")], wormholeProgramId);

    return {
        config: bridge,
        emitterAcc: emitter,
        sequence: sequence,
        feeCollector: feeCollector,
        clock: new PublicKey("SysvarC1ock11111111111111111111111111111111"), // SYSVAR_CLOCK_PUBKEY
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
    };
}

// Wormhole post_message talimatı oluşturma
export function createWormholePostMessageInstruction(
    payer: PublicKey,
    wormholeProgramId: PublicKey,
    messageAccountKeypair: Keypair,
    emitterAccount: PublicKey, // Emitter PDA'sı
    nonce: number,
    payload: Buffer | Uint8Array,
    consistencyLevel: number
): TransactionInstruction {
   const pdas = getWormholePDAs(wormholeProgramId); // PDA'ları al

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
     { pubkey: pdas.config, isSigner: false, isWritable: false },         // bridge config
     { pubkey: messageAccountKeypair.publicKey, isSigner: true, isWritable: true },  // message (signer!)
     // Emitter PDA'dır ve program tarafından imzalanır, dışarıdan signer olmamalı.
     { pubkey: emitterAccount, isSigner: false, isWritable: false },       // emitter (PDA, signer değil)
     { pubkey: pdas.sequence, isSigner: false, isWritable: true },        // sequence (emitter'a bağlı)
     { pubkey: payer, isSigner: true, isWritable: true },                 // payer
     { pubkey: pdas.feeCollector, isSigner: false, isWritable: true },    // fee_collector
     { pubkey: pdas.clock, isSigner: false, isWritable: false },           // clock sysvar
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
    if (!isChainId(chainId)) {
        throw new Error(`Invalid Chain ID for Wormhole: ${chain}`);
    }
    return chainId;
}

// Wormhole emitter adresi alma (Varsayılan Core Bridge Emitter)
export function getWormholeEmitterAddress(wormholeProgramId: PublicKey): string {
    const [emitter] = PublicKey.findProgramAddressSync(
        [Buffer.from("emitter")],
        wormholeProgramId
    );
    return emitter.toBase58();
}