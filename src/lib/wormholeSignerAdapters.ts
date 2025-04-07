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
import { Transaction } from "@solana/web3.js"; // Import Solana Transaction
// Import Sui TransactionBlock if needed for type casting or manipulation
// import { TransactionBlock } from "@mysten/sui.js/transactions";

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
  async sign(txs: UnsignedTransaction<Network, "Solana">[]): Promise<SignedTx[]> { // Add generics to UnsignedTransaction
    console.log("SolanaSignerAdapter: Signing transactions (placeholder)...", txs);
    // TODO:
    // 1. Convert each UnsignedTransaction to a Solana web3.js Transaction object.
    //    - This might involve using chainCtx or platform methods if the SDK provides helpers.
    //    - Or manually constructing the Transaction based on UnsignedTransaction fields.
    // 2. Use walletAdapter.signTransaction or signAllTransactions to sign.
    // 3. Serialize the signed transactions into the format expected by Wormhole SDK (SignedTx[]).
    //    - This might just be the raw signed transaction buffer/string.
    if (!this.walletAdapter.signTransaction && !this.walletAdapter.signAllTransactions) {
       throw new Error("Wallet adapter does not support signing method required by Wormhole SDK");
    }
    // Placeholder implementation:
    // const transactionsToSign: Transaction[] = txs.map(tx => { /* Convert tx.transaction */ return new Transaction(); });
    // const signedTxs = await this.walletAdapter.signAllTransactions!(transactionsToSign);
    // return signedTxs.map(tx => tx.serialize()); // Example serialization
    throw new Error("SolanaSignerAdapter.sign not implemented");
    // return []; // Placeholder return
  }
}


// --- Sui Signer Adapter ---

// Define the structure expected from the Sui useWallet hook more explicitly
// Adjust based on the actual properties you use from the hook
// Using `any` for now for the adapter type due to persistent import issues
interface SuiWalletAdapter {
  account: { address: string } | null;
  signAndExecuteTransactionBlock?(input: any): Promise<any>; // Check exact input/output types
  // Add other methods/properties if needed
}

// Implement SignAndSendSigner for Sui with correct generics
export class SuiSignerAdapter implements SignAndSendSigner<Network, "Sui"> {
  // Correct ChainContext generic type
  // Use `any` for walletAdapter type due to import issues
  constructor(private walletAdapter: any, private chainCtx: ChainContext<Network, "Sui">) {
     if (!walletAdapter.account) {
      throw new Error("Sui Wallet Adapter does not have an account");
    }
  }

  chain(): "Sui" { // Explicit return type
    return "Sui";
  }

  address(): string {
    return this.walletAdapter.account!.address;
  }

  // Implement signAndSend method
  async signAndSend(txs: UnsignedTransaction<Network, "Sui">[]): Promise<TxHash[]> { // Add generics to UnsignedTransaction
    console.log("SuiSignerAdapter: Signing and sending transactions (placeholder)...", txs);
    // TODO:
    // 1. Convert each UnsignedTransaction to a Sui TransactionBlock object.
    //    - This might involve using chainCtx or platform methods if the SDK provides helpers.
    //    - Or manually constructing the TransactionBlock.
    // 2. Use walletAdapter.signAndExecuteTransactionBlock for each transaction.
    // 3. Extract and return the transaction digests (TxHash[]) from the results.
    if (!this.walletAdapter.signAndExecuteTransactionBlock) {
       throw new Error("Wallet adapter does not support signAndExecuteTransactionBlock method required by Wormhole SDK");
    }

    const txHashes: TxHash[] = [];
    for (const tx of txs) {
       // Placeholder: Assume tx.transaction is the Sui TransactionBlock or can be converted
       // const suiTx = tx.transaction as TransactionBlock; // Needs proper conversion/casting
       const suiTx = tx.transaction; // Assuming it's already the correct type for now
       try {
          // Ensure the input matches what signAndExecuteTransactionBlock expects
          const result = await this.walletAdapter.signAndExecuteTransactionBlock({ transactionBlock: suiTx });
          // Extract digest from result - structure depends on wallet kit version
          if (!result || !result.digest) {
             throw new Error("Invalid result structure from signAndExecuteTransactionBlock");
          }
          txHashes.push(result.digest);
          console.log("Sui Tx Result:", result);
       } catch (e) {
          console.error("Sui signAndSend error:", e);
          throw new Error(`Failed to sign and send Sui transaction: ${e}`);
       }
    }
    return txHashes;
  }

  // Comment out the unused sign method for Sui
  // async sign(txs: UnsignedTransaction[]): Promise<SignedTx[]> {
  //    console.warn("SuiSignerAdapter: sign() called, but signAndSend() is typically used for Sui.", txs);
  //    // Placeholder - sign-only is less common for Sui wallet standards
  //    throw new Error("SuiSignerAdapter.sign not implemented/supported");
  //    // return [];
  // }
}
