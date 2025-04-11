import { useMutation } from 'react-query';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js'; // For signing simulation

// Define the input type for the hook, matching the form data
interface CreatePoolInput {
  chainId: 'sui' | 'solana';
  token1Symbol: string;
  token2Symbol: string;
  token1Amount: string;
  token2Amount: string;
  slippageTolerance: string; // Keep for consistency, though not used in demo simulation
}

export function useCreatePool() {
  const suiWallet = useSuiWallet();
  const solanaWallet = useSolanaWallet();

  return useMutation(
    async (data: CreatePoolInput) => {
      const { chainId, token1Symbol, token2Symbol, token1Amount, token2Amount } = data;

      if (chainId === 'sui') {
        if (!suiWallet.connected || !suiWallet.account) {
          throw new Error('Please connect your Sui wallet first');
        }
        console.log(`DEMO: Creating Sui pool: ${token1Symbol}-${token2Symbol}`);
        console.log(`DEMO: Initial Amounts: ${token1Amount} ${token1Symbol}, ${token2Amount} ${token2Symbol}`);

        // --- Sui Transaction Logic (DEMO SIMULATION) ---
        // Simulate wallet interaction and network delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // Simulate success
        console.log('DEMO: Sui pool creation successful (simulated)');
        // Return a fake pool ID or identifier
        return { success: true, poolId: `fake-sui-pool-${Date.now()}` };
        // --- End Sui Transaction Logic ---

      } else if (chainId === 'solana') {
        // Ensure signTransaction is available
        if (!solanaWallet.connected || !solanaWallet.publicKey || !solanaWallet.signTransaction) {
          throw new Error('Please connect your Solana wallet and ensure it supports signing.');
        }
        console.log(`DEMO: Creating Solana pool: ${token1Symbol}-${token2Symbol}`);
        console.log(`DEMO: Initial Amounts: ${token1Amount} ${token1Symbol}, ${token2Amount} ${token2Symbol}`);

        // --- Solana Transaction Logic (DEMO SIMULATION with Signing) ---
        try {
          // 1. Create a dummy transaction for signing prompt
          const dummyTx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: solanaWallet.publicKey,
              toPubkey: solanaWallet.publicKey,
              lamports: 0,
            })
          );
          dummyTx.feePayer = solanaWallet.publicKey;
          dummyTx.recentBlockhash = '11111111111111111111111111111111'; // Placeholder

          // 2. Request signature (DOES NOT SEND)
          console.log("DEMO: Requesting Solana wallet signature for pool creation...");
          const signedTx = await solanaWallet.signTransaction(dummyTx);
          console.log("DEMO: Solana wallet signed successfully for pool creation (simulated, tx not sent).");

          // 3. Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // 4. Return simulated success
          return { success: true, poolId: `fake-solana-pool-${Date.now()}` };

        } catch (error) {
           console.error("DEMO: Solana pool creation signing failed:", error);
           if (error instanceof Error && error.message?.includes('Transaction rejected')) {
              throw new Error('Solana transaction rejected by user.');
           }
           let errorMessage = "Unknown Solana signing error";
           if (error instanceof Error) {
             errorMessage = error.message;
           }
           throw new Error(`Solana signing failed: ${errorMessage}`);
        }
        // --- End Solana Transaction Logic ---

      } else {
        throw new Error(`Unsupported chainId: ${chainId}`);
      }
    },
    {
      onSuccess: (result) => {
        toast.success(`Successfully created pool (Demo)`);
        console.log("Pool Creation Result (Demo):", result);
        // TODO: Invalidate pool list query? Navigate to the new pool page?
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to create pool (Demo)');
      },
    }
  );
}
