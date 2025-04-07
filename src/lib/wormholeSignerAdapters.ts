import {
  Chain,
  Signer,
  UnsignedTransaction,
  SignedTx,
  TxHash,
  ChainContext, // May be needed for transaction processing
  NativeAddress,
  Network, // Import Network type
  SignOnlySigner, // Import specific signer types
  SignAndSendSigner,
} from "@wormhole-foundation/sdk";
import { WalletContextState as SolanaWalletContextState } from "@solana/wallet-adapter-react";
// Removed SuiWalletContextState import again
import { Transaction, TransactionSignature } from "@solana/web3.js"; // Import Solana Transaction and TransactionSignature
// Import Sui TransactionBlock if needed for type casting or manipulation
import { TransactionBlock } from "@mysten/sui.js/transactions"; // Import Sui TransactionBlock
import { SuiSignAndExecuteTransactionBlockOutput } from "@mysten/wallet-standard"; // Import Sui result type

// --- Solana Signer Adapter ---

// Define the structure expected from the Solana useWallet hook more explicitly
// Adjust based on the actual properties you use from the hook
interface SolanaWalletAdapter {
  publicKey: { toBase58(): string } | null;
  signTransaction?<T extends Transaction>(transaction: T): Promise<T>;
  signAllTransactions?<T extends Transaction>(transactions: T[]): Promise<T[]>;
  sendTransaction?(transaction: Transaction, connection: any, options?: any): Promise<string>; // TxHash
  // Add other methods/properties if needed by the SDK's Signer implementation
}

// Implement SignOnlySigner for Solana with correct generics
export class SolanaSignerAdapter implements SignOnlySigner<Network, "Solana"> {
  // Assuming the wallet object from useWallet has publicKey and signTransaction/signAllTransactions
  // Correct ChainContext generic type
  constructor(private walletAdapter: SolanaWalletAdapter, private chainCtx: ChainContext<Network, "Solana">) {
    if (!walletAdapter.publicKey) {
      throw new Error("Solana Wallet Adapter does not have a public key");
    }
  }

  chain(): "Solana" { // Explicit return type
    return "Solana";
  }

  address(): string {
    // Assuming publicKey is available and has toBase58 method
    return this.walletAdapter.publicKey!.toBase58();
  }

  // Implement sign method
  async sign(txs: UnsignedTransaction<Network, "Solana">[]): Promise<SignedTx[]> {
    if (!this.walletAdapter.signTransaction && !this.walletAdapter.signAllTransactions) {
      throw new Error("Wallet adapter does not support signing method required by Wormhole SDK");
    }

    // Extract Solana Transaction objects from UnsignedTransactions
    // Assuming tx.transaction is already a Solana Transaction object
    const transactionsToSign: Transaction[] = txs.map((tx) => tx.transaction as Transaction);

    try {
      let signedTransactions: Transaction[];
      if (this.walletAdapter.signAllTransactions) {
        console.log(`Signing ${transactionsToSign.length} transactions with signAllTransactions...`);
        signedTransactions = await this.walletAdapter.signAllTransactions(transactionsToSign);
      } else if (this.walletAdapter.signTransaction) {
        console.log(`Signing ${transactionsToSign.length} transactions individually with signTransaction...`);
        signedTransactions = [];
        for (const tx of transactionsToSign) {
          signedTransactions.push(await this.walletAdapter.signTransaction(tx));
        }
      } else {
        // Should be caught by the initial check, but as a safeguard:
        throw new Error("No suitable signing method found on wallet adapter.");
      }

      // Serialize signed transactions. Wormhole SDK expects Uint8Array[] or similar.
      // tx.serialize() returns Buffer, which is compatible with Uint8Array.
      const serializedSignedTxs: SignedTx[] = signedTransactions.map(tx => tx.serialize());
      console.log("Successfully signed and serialized transactions.");
      return serializedSignedTxs;

    } catch (error) {
      console.error("Error signing Solana transactions:", error);
      throw new Error(`Failed to sign Solana transactions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}


// --- Sui Signer Adapter ---

// Define the structure expected from the Sui useWallet hook more explicitly
// Adjust based on the actual properties you use from the hook
interface SuiWalletAdapter {
  account: { address: string } | null;
  signAndExecuteTransactionBlock?(input: {
    transactionBlock: TransactionBlock; // Use imported type
    options?: any; // Include options if needed
    chain?: string; // Include chain if needed
  }): Promise<SuiSignAndExecuteTransactionBlockOutput>; // Use imported result type
  // Add other methods/properties if needed
}

// Implement SignAndSendSigner for Sui with correct generics
export class SuiSignerAdapter implements SignAndSendSigner<Network, "Sui"> {
  // Correct ChainContext generic type
  constructor(private walletAdapter: SuiWalletAdapter, private chainCtx: ChainContext<Network, "Sui">) {
     if (!walletAdapter.account) {
      throw new Error("Sui Wallet Adapter does not have an account");
    }
     if (!walletAdapter.signAndExecuteTransactionBlock) {
       throw new Error("Wallet adapter does not support signAndExecuteTransactionBlock method required by Wormhole SDK");
     }
  }

  chain(): "Sui" { // Explicit return type
    return "Sui";
  }

  address(): string {
    return this.walletAdapter.account!.address;
  }

  // Implement signAndSend method
  async signAndSend(txs: UnsignedTransaction<Network, "Sui">[]): Promise<TxHash[]> {
    console.log(`SuiSignerAdapter: Signing and sending ${txs.length} transactions...`);

    const txHashes: TxHash[] = [];
    for (const tx of txs) {
      // Assuming tx.transaction is already a Sui TransactionBlock object prepared by the SDK
      const suiTx = tx.transaction as TransactionBlock; // Cast for type safety

      if (!(suiTx instanceof TransactionBlock)) {
         console.error("Transaction object is not an instance of TransactionBlock:", suiTx);
         throw new Error("Invalid transaction type received for Sui signing.");
      }

      try {
        console.log(`Executing transaction block for description: ${tx.description}`);
        const result: SuiSignAndExecuteTransactionBlockOutput =
          await this.walletAdapter.signAndExecuteTransactionBlock!({
            transactionBlock: suiTx,
            // chain: 'sui:testnet' // Optional: Specify chain if required by adapter
          });

        if (!result || !result.digest) {
          throw new Error("Invalid result structure from signAndExecuteTransactionBlock");
        }
        console.log(`Sui Tx successful: ${result.digest}`);
        txHashes.push(result.digest);

      } catch (e) {
        console.error("Sui signAndSend error:", e);
        // Improve error message if possible
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to sign and send Sui transaction (${tx.description}): ${errorMessage}`);
      }
    }
    return txHashes;
  }

  // Sign-only might be harder with Sui standard wallets
  async sign(txs: UnsignedTransaction<Network, "Sui">[]): Promise<SignedTx[]> {
     console.warn("SuiSignerAdapter: sign() called, but signAndSend() is typically used for Sui.", txs);
     // Placeholder - sign-only is less common for Sui wallet standards
     throw new Error("SuiSignerAdapter.sign not implemented/supported");
     // return []; // Placeholder return
  }
}
