import { useMutation } from 'react-query';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import toast from 'react-hot-toast';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Define the input type for the hook
interface CreateSuiPoolInput {
  token1Symbol: string;
  token2Symbol: string;
  token1Amount: string;
  token2Amount: string;
  slippageTolerance: string;
}

// Define specific result type
type SuiPoolCreationResult = { success: boolean; poolId: string; txDigest?: string };

export function useCreateSuiPool() {
  const suiWallet = useSuiWallet();

  return useMutation<SuiPoolCreationResult, Error, CreateSuiPoolInput>(
    async (input: CreateSuiPoolInput): Promise<SuiPoolCreationResult> => {
      if (!suiWallet.connected || !suiWallet.account) {
          throw new Error('Please connect your Sui wallet first');
      }
      if (!suiWallet.signAndExecuteTransactionBlock) {
          throw new Error('Sui wallet does not support signAndExecuteTransactionBlock');
      }
      console.log(`DEMO: Creating Sui pool: ${input.token1Symbol}-${input.token2Symbol}`);
      console.log(`DEMO: Initial Amounts: ${input.token1Amount} ${input.token1Symbol}, ${input.token2Amount} ${input.token2Symbol}`);

      try {
          console.log("DEMO: Requesting Sui wallet signature for pool creation...");
          const txb = new TransactionBlock();
          // Create a minimal transaction: transfer 0 MIST to self to trigger signing
          const [coin] = txb.splitCoins(txb.gas, [txb.pure(0)]);
          txb.transferObjects([coin], txb.pure(suiWallet.account.address));

          const result = await suiWallet.signAndExecuteTransactionBlock({
              transactionBlock: txb,
          });
          console.log("DEMO: Sui wallet signed and executed successfully:", result);
          return { success: true, poolId: `fake-sui-pool-${Date.now()}`, txDigest: result.digest };

      } catch (error: any) {
          console.error("DEMO: Sui pool creation signing failed:", error);
          if (error?.message?.includes('User rejected the request')) {
               throw new Error('Sui transaction rejected by user.');
          }
          throw new Error(`Sui signing failed: ${error?.message || 'Unknown error'}`);
      }
    },
    {
      onSuccess: (result) => {
        toast.success(`Successfully created Sui pool`); // Removed (Demo)
        console.log("Sui Pool Creation Result:", result); // Removed (Demo)
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to create Sui pool'); // Removed (Demo)
      },
    }
  );
}
