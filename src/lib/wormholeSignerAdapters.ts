import {
  // Chain, // Removed unused import
  UnsignedTransaction,
  SignedTx,
  TxHash,
  ChainContext, // Keep ChainContext for potential future use in tx conversion
  // NativeAddress, // Removed unused import
  Network,
  SignOnlySigner, // Import specific signer types
  SignAndSendSigner,
  // chainToPlatform, // Removed unused import
} from "@wormhole-foundation/sdk";
// Removed unused SolanaWalletContextState import
// Removed unused SuiWalletContextState import
import { Transaction as SolanaTransaction } from "@solana/web3.js"; // Keep Solana Transaction import
import { Transaction as SuiTransaction } from "@mysten/sui/transactions"; // Corrected import path
import { SuiSignAndExecuteTransactionBlockOutput } from "@mysten/wallet-standard"; // Import Sui result type

// --- Solana Signer Adapter ---

// Define the structure expected from the Solana useWallet hook more explicitly
// Adjust based on the actual properties you use from the hook
interface SolanaWalletAdapter {
  publicKey: { toBase58(): string } | null;
  signTransaction?<T extends SolanaTransaction>(transaction: T): Promise<T>;
  signAllTransactions?<T extends SolanaTransaction>(transactions: T[]): Promise<T[]>;
  sendTransaction?(transaction: SolanaTransaction, connection: any, options?: any): Promise<string>; // TxHash
  // Add other methods/properties if needed by the SDK's Signer implementation
}

// Implement SignOnlySigner for Solana with correct generics
export class SolanaSignerAdapter implements SignOnlySigner<Network, "Solana"> {
  // Removed unused chainCtx parameter
  constructor(private walletAdapter: SolanaWalletAdapter) {
    if (!walletAdapter.publicKey) {
      throw new Error("Solana Wallet Adapter does not have a public key");
    }
    if (!walletAdapter.signTransaction && !walletAdapter.signAllTransactions) {
      throw new Error("Wallet adapter must support signTransaction or signAllTransactions");
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
    // Extract Solana Transaction objects from UnsignedTransactions
    // Assuming tx.transaction is already a Solana Transaction object prepared by the SDK
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
        console.log(`Signing ${transactionsToSign.length} transactions with signAllTransactions...`);
        signedTransactions = await this.walletAdapter.signAllTransactions(transactionsToSign);
      } else if (this.walletAdapter.signTransaction) {
        // Fallback to signing one by one if signAllTransactions is not available
        console.log(`Signing ${transactionsToSign.length} transactions individually with signTransaction...`);
        signedTransactions = [];
        for (const tx of transactionsToSign) {
          signedTransactions.push(await this.walletAdapter.signTransaction(tx));
        }
      } else {
        // Should be caught by constructor check, but added for safety
        throw new Error("No suitable signing method found on wallet adapter.");
      }

      // Serialize signed transactions. Wormhole SDK expects Uint8Array[] or similar.
      // tx.serialize returns Buffer, which is compatible with Uint8Array.
      // requireAllSignatures: false because the wallet adapter only adds the user's signature.
      const serializedSignedTxs: SignedTx[] = signedTransactions.map(tx => tx.serialize({ requireAllSignatures: false }));
      console.log("Successfully signed and serialized Solana transactions.");
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
    transactionBlock: SuiTransaction;
    options?: any;
    chain?: string;
  }): Promise<SuiSignAndExecuteTransactionBlockOutput>;
  // Add other methods/properties if needed
}

// Implement SignAndSendSigner for Sui with correct generics
export class SuiSignerAdapter implements SignAndSendSigner<Network, "Sui"> {
  // Removed unused chainCtx parameter
  // Use `any` for walletAdapter type due to persistent import issues with @suiet/wallet-kit types
  constructor(private walletAdapter: any) {
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
      // Assuming tx.transaction is already a Sui Transaction object prepared by the SDK
      const suiTx = tx.transaction as SuiTransaction; // Cast for type safety

      if (!(suiTx instanceof SuiTransaction)) {
         console.error("Transaction object is not an instance of Transaction:", suiTx);
         throw new Error("Invalid transaction type received for Sui signing.");
      }

      try {
        console.log(`Executing transaction block for description: ${tx.description}`);
        // Ensure the input matches what signAndExecuteTransactionBlock expects
        // The exact chain identifier format ('sui:testnet', 'sui:mainnet') might be needed
        // depending on the wallet kit version. Let's assume it's not strictly needed for now.
        const result: SuiSignAndExecuteTransactionBlockOutput =
          await this.walletAdapter.signAndExecuteTransactionBlock!({
            transactionBlock: suiTx,
            // chain: `${chainToPlatform(this.chainCtx.chain)}:${this.chainCtx.network}` // Example if chain identifier needed
          });

        // Extract digest from result - structure depends on wallet kit version
        if (!result || !result.digest) {
           throw new Error("Invalid result structure from signAndExecuteTransactionBlock: Missing digest.");
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

  // Comment out the unused sign method for Sui
  // async sign(txs: UnsignedTransaction<Network, "Sui">[]): Promise<SignedTx[]> {
  //    console.warn("SuiSignerAdapter: sign() called, but signAndSend() is typically used for Sui.", txs);
  //    // Placeholder - sign-only is less common for Sui wallet standards
  //    throw new Error("SuiSignerAdapter.sign not implemented/supported");
  //    // return [];
  // }
}
