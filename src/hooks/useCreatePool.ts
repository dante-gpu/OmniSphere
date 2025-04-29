import { useCallback } from 'react';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { createCrossChainPool } from '../lib/crossChainPoolManager';
import { CrossChainPoolConfig, SupportedChain, Chain } from '../types/wormhole';

// Use only supported chains in the type definition
type ChainSigners = {
  [key in SupportedChain]: any;
} & Record<Chain, any>; // Add index signature for type compatibility

export function useCreatePool() {
  const suiWallet = useSuiWallet();
  const solanaWallet = useSolanaWallet();

  const createPool = useCallback(async (config: CrossChainPoolConfig) => {
    const signers = {
      'Solana': solanaWallet,
      'Sui': suiWallet
    } as ChainSigners;
    try {
      const receipt = await createCrossChainPool(config, signers as unknown as Record<Chain, any>);
      return { success: true, receipt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [suiWallet, solanaWallet]);

  return { createPool };
}
