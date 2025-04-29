import {
  UnsignedTransaction,
  SignedTx,
  TxHash,
  Network,
  SignAndSendSigner, 
} from "@wormhole-foundation/sdk";
import { Connection, Transaction as SolanaTransaction } from "@solana/web3.js"; 
import { Transaction as SuiTransaction } from "@mysten/sui/transactions";
import { SuiSignAndExecuteTransactionBlockOutput } from "@mysten/wallet-standard";

// --- Solana Signer Adapter ---

// Solana useWallet hook'undan beklenen yapıyı daha açık tanımlayalım
interface SolanaWalletAdapter {
  publicKey: { toBase58(): string } | null;
  signTransaction?<T extends SolanaTransaction>(transaction: T): Promise<T>;
  signAllTransactions?<T extends SolanaTransaction>(transactions: T[]): Promise<T[]>;
  // sendTransaction zorunlu, çünkü SignAndSendSigner implemente ediyoruz
  sendTransaction(transaction: SolanaTransaction, connection: Connection, options?: any): Promise<TxHash>; // TxHash (string) döner
}

// SignAndSendSigner olarak güncelleyelim
export class SolanaSignerAdapter implements SignAndSendSigner<Network, "Solana"> {
  // Connection parametresini ekleyelim
  constructor(
      private walletAdapter: SolanaWalletAdapter,
      private connection: Connection // Connection'ı constructor'da alıp saklayalım
    ) {
    if (!walletAdapter.publicKey) {
      throw new Error("Solana Wallet Adapter does not have a public key");
    }
    // Hem imzalama hem de gönderme metodu olmalı
    if (!walletAdapter.signTransaction && !walletAdapter.signAllTransactions) {
      throw new Error("Wallet adapter must support signTransaction or signAllTransactions");
    }
    if (!walletAdapter.sendTransaction) {
      throw new Error("Wallet adapter must support sendTransaction for SignAndSendSigner implementation");
    }
  }

  chain(): "Solana" {
    return "Solana";
  }

  address(): string {
    return this.walletAdapter.publicKey!.toBase58();
  }

  // signAndSend metodunu implemente edelim
  async signAndSend(txs: UnsignedTransaction<Network, "Solana">[]): Promise<TxHash[]> {
    const txHashes: TxHash[] = [];
    console.log(`SolanaSignerAdapter: Signing and sending ${txs.length} transactions...`);

    for (const tx of txs) {
      // tx.transaction'ın SolanaTransaction olduğunu varsayalım
      const solanaTx = tx.transaction as SolanaTransaction;

      if (!(solanaTx instanceof SolanaTransaction)) {
        console.error(`Transaction for description "${tx.description}" is not a Solana Transaction object`, solanaTx);
        throw new Error(`Invalid transaction type for Solana signing: ${tx.description}`);
      }

      try {
        let signedTx: SolanaTransaction;
        // Sadece tekil imzalama destekleniyorsa onu kullanalım (Wormhole SDK genellikle tek tek gönderir)
        if (this.walletAdapter.signTransaction) {
           console.log(`Signing transaction: ${tx.description}`);
           signedTx = await this.walletAdapter.signTransaction(solanaTx);
        } else {
           // signAllTransactions varsa ve sadece bir tx varsa onu kullanalım?
           // Genellikle signTransaction beklenir. Eğer yoksa hata constructor'da yakalanmalı.
           throw new Error("Wallet adapter does not support the required signTransaction method.");
        }

        console.log(`Sending signed transaction: ${tx.description}`);
        // Sakladığımız connection nesnesini kullanarak gönderelim
        const txHash = await this.walletAdapter.sendTransaction(signedTx, this.connection);
        console.log(`Solana Tx successful (${tx.description}): ${txHash}`);
        txHashes.push(txHash);

      } catch (error) {
        console.error(`Error signing/sending Solana transaction (${tx.description}):`, error);
        throw new Error(`Failed to sign and send Solana transaction (${tx.description}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return txHashes;
  }

  // sign metodunu da implemente edebiliriz (SignOnlySigner arayüzü için),
  // ancak SDK genellikle signAndSend'i tercih edecektir.
  async sign(txs: UnsignedTransaction<Network, "Solana">[]): Promise<SignedTx[]> {
    console.log(`SolanaSignerAdapter: sign() called for ${txs.length} transactions (signAndSend is preferred)...`);
    const transactionsToSign: SolanaTransaction[] = txs.map((tx, idx) => {
      if (!(tx.transaction instanceof SolanaTransaction)) {
        console.error(`Transaction at index ${idx} is not a Solana Transaction object`, tx.transaction);
        throw new Error(`Invalid transaction type at index ${idx} for Solana signing.`);
      }
      return tx.transaction;
    });

    try {
      let signedTransactions: SolanaTransaction[];
      if (this.walletAdapter.signAllTransactions) {
        signedTransactions = await this.walletAdapter.signAllTransactions(transactionsToSign);
      } else if (this.walletAdapter.signTransaction) {
        signedTransactions = [];
        for (const tx of transactionsToSign) {
          signedTransactions.push(await this.walletAdapter.signTransaction(tx));
        }
      } else {
        throw new Error("No suitable signing method found on wallet adapter.");
      }

      // İmzalanmış işlemleri serileştir (Uint8Array beklenir)
      const serializedSignedTxs: SignedTx[] = signedTransactions.map(tx => tx.serialize({ requireAllSignatures: false }));
      console.log("Successfully signed (but did not send) Solana transactions.");
      return serializedSignedTxs;

    } catch (error) {
      console.error("Error signing Solana transactions:", error);
      throw new Error(`Failed to sign Solana transactions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}


// --- Sui Signer Adapter ---

// Sui useWallet hook'undan beklenen yapıyı daha açık tanımlayalım
interface SuiWalletAdapter {
  account: { address: string } | null;
  // signAndExecuteTransactionBlock zorunlu
  signAndExecuteTransactionBlock(input: {
    transactionBlock: SuiTransaction;
    options?: any;
    chain?: string; // e.g., 'sui:testnet'
  }): Promise<SuiSignAndExecuteTransactionBlockOutput>;
}

// Sui için SignAndSendSigner implementasyonu doğru görünüyor
export class SuiSignerAdapter implements SignAndSendSigner<Network, "Sui"> {
  constructor(private walletAdapter: SuiWalletAdapter) { // Doğrudan SuiWalletAdapter türünü kullanalım
     if (!walletAdapter.account) {
      throw new Error("Sui Wallet Adapter does not have an account");
    }
     if (!walletAdapter.signAndExecuteTransactionBlock) {
       throw new Error("Wallet adapter does not support signAndExecuteTransactionBlock method required by Wormhole SDK");
     }
  }

  chain(): "Sui" {
    return "Sui";
  }

  address(): string {
    return this.walletAdapter.account!.address;
  }

  async signAndSend(txs: UnsignedTransaction<Network, "Sui">[]): Promise<TxHash[]> {
    console.log(`SuiSignerAdapter: Signing and sending ${txs.length} transactions...`);
    const txHashes: TxHash[] = [];
    for (const tx of txs) {
      const suiTx = tx.transaction as SuiTransaction;

      if (!(suiTx instanceof SuiTransaction)) {
         console.error("Transaction object is not an instance of SuiTransaction:", suiTx);
         throw new Error("Invalid transaction type received for Sui signing.");
      }

      try {
        console.log(`Executing transaction block for description: ${tx.description}`);
        // TODO: Ağ bilgisini (Testnet/Mainnet) dinamik olarak alıp chain identifier oluşturmak gerekebilir.
        // Örnek: const chainIdentifier = `sui:${network.toLowerCase()}`;
        const result: SuiSignAndExecuteTransactionBlockOutput =
          await this.walletAdapter.signAndExecuteTransactionBlock({
            transactionBlock: suiTx,
            // chain: chainIdentifier // Gerekirse zincir bilgisini ekle
          });

        if (!result || !result.digest) {
           throw new Error("Invalid result structure from signAndExecuteTransactionBlock: Missing digest.");
        }
        console.log(`Sui Tx successful (${tx.description}): ${result.digest}`);
        txHashes.push(result.digest);

      } catch (e) {
        console.error(`Sui signAndSend error (${tx.description}):`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to sign and send Sui transaction (${tx.description}): ${errorMessage}`);
      }
    }
    return txHashes;
  }
}