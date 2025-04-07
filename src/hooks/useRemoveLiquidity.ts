import { useMutation } from 'react-query';
import { useWallet } from '@suiet/wallet-kit';
import toast from 'react-hot-toast';
import type { RemoveLiquidityInput } from '../lib/validations/pool';

export function useRemoveLiquidity() {
  const { connected } = useWallet();

  return useMutation(
    async (data: RemoveLiquidityInput) => {
      if (!connected) {
        throw new Error('Please connect your wallet first');
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock success
      return { success: true };
    },
    {
      onSuccess: () => {
        toast.success('Successfully removed liquidity');
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to remove liquidity');
      },
    }
  );
}