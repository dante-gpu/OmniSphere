import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';

// Re-use the Pool interface structure from PoolsPage.tsx
// Import necessary icons for default pools
import suiIcon from '../icons/sui.webp';
import solIcon from '../icons/sol.svg';
import usdcIcon from '../icons/usdc.png';
import usdtIcon from '../icons/tether.png';
import ethIcon from '../icons/eth.png';
import btcIcon from '../icons/btc.png';
import aptIcon from '../icons/apt.png';
import wmaticIcon from '../icons/wmatic.png';
import avaxIcon from '../icons/avax.png';
import srmIcon from '../icons/srm.png';
import bonkIcon from '../icons/bonk.png';
import rayIcon from '../icons/ray.png';
import orcaIcon from '../icons/orca.png';

const tokenIcons = {
  SUI: suiIcon, SOL: solIcon, USDC: usdcIcon, USDT: usdtIcon, BTC: btcIcon,
  ETH: ethIcon, WETH: ethIcon, APT: aptIcon, WMATIC: wmaticIcon, AVAX: avaxIcon,
  SRM: srmIcon, BONK: bonkIcon, RAY: rayIcon, ORCA: orcaIcon
} as const;

export type Token = keyof typeof tokenIcons; // Export Token type

export interface Pool {
  id: string;
  name: string;
  tvl: string;
  volume24h: string;
  apr: string;
  chain: string;
  token1: Token;
  token2: Token;
  fee: string;
  token1Balance: string;
  token2Balance: string;
  change24h: string;
  volumeHistory: { time: string; value: number }[];
  impermanentLoss: string;
  rewards: string[];
  utilization: number;
}

// Define the initial mock pools data (same as in PoolsPage)
const INITIAL_MOCK_POOLS: Pool[] = [
    { id: '1', name: 'SUI-USDC', tvl: '$2500000', volume24h: '$450000', apr: '12.5%', chain: 'Sui', token1: 'SUI', token2: 'USDC', fee: '0.3%', token1Balance: '1.25M', token2Balance: '1.25M', change24h: '+5.2%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 10000 })), impermanentLoss: '-0.5%', rewards: ['SUI'], utilization: 75 },
    { id: '2', name: 'SOL-USDT', tvl: '$1800000', volume24h: '$320000', apr: '8.2%', chain: 'Solana', token1: 'SOL', token2: 'USDT', fee: '0.3%', token1Balance: '8.9K', token2Balance: '890K', change24h: '+3.1%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 8000 })), impermanentLoss: '-0.3%', rewards: ['SOL'], utilization: 82 },
    { id: '3', name: 'SUI-SOL', tvl: '$3200000', volume24h: '$680000', apr: '15.8%', chain: 'Cross-chain', token1: 'SUI', token2: 'SOL', fee: '0.4%', token1Balance: '1.6M', token2Balance: '16K', change24h: '+7.5%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 15000 })), impermanentLoss: '-0.7%', rewards: ['SUI', 'SOL'], utilization: 88 },
    // Add more initial pools if needed...
];

interface PoolContextType {
  pools: Pool[];
  addPool: (newPoolData: Omit<Pool, 'id' | 'volumeHistory' | 'impermanentLoss' | 'utilization' | 'change24h' | 'token1Balance' | 'token2Balance'>) => void;
  getPoolById: (id: string) => Pool | undefined;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

export const PoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pools, setPools] = useState<Pool[]>(() => {
    // Load pools from local storage or use initial mock data
    try {
      const storedPools = localStorage.getItem('omnispherePools');
      return storedPools ? JSON.parse(storedPools) : INITIAL_MOCK_POOLS;
    } catch (error) {
      console.error("Error reading pools from localStorage", error);
      return INITIAL_MOCK_POOLS;
    }
  });

  // Save pools to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('omnispherePools', JSON.stringify(pools));
    } catch (error) {
      console.error("Error saving pools to localStorage", error);
    }
  }, [pools]);

  const addPool = (newPoolData: Omit<Pool, 'id' | 'volumeHistory' | 'impermanentLoss' | 'utilization' | 'change24h' | 'token1Balance' | 'token2Balance'>) => {
    const newPool: Pool = {
      ...newPoolData,
      id: `pool-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // Generate unique ID
      // Add default/placeholder values for fields not provided by CreatePoolPage
      tvl: '$0',
      volume24h: '$0',
      apr: '0.0%',
      token1Balance: '0',
      token2Balance: '0',
      change24h: '+0.0%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: 0 })),
      impermanentLoss: '0.0%',
      rewards: [], // Start with no rewards
      utilization: 0,
      fee: '0.3%', // Default fee, adjust if needed
    };
    setPools(prevPools => [...prevPools, newPool]);
  };

  const getPoolById = (id: string): Pool | undefined => {
    return pools.find(pool => pool.id === id);
  };

  const contextValue = useMemo(() => ({ pools, addPool, getPoolById }), [pools]);

  return (
    <PoolContext.Provider value={contextValue}>
      {children}
    </PoolContext.Provider>
  );
};

export const usePools = (): PoolContextType => {
  const context = useContext(PoolContext);
  if (context === undefined) {
    throw new Error('usePools must be used within a PoolProvider');
  }
  return context;
};
