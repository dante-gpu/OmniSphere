import type { Chain, TokenId, Network } from '@wormhole-foundation/sdk';

export interface CrossChainPoolConfig {
  chainA: Chain;
  chainB: Chain;
  tokenA: TokenId;
  tokenB: TokenId;
  feeBps: number; // Basis points (0.01%)
  poolType: 'stable' | 'volatile';
}

export interface PoolCreationReceipt {
  poolId: string;
  chain: Chain;
  txIds: string[];
  wormholeMessages: WormholeMessageId[];
}

export interface WormholeMessageId {
  chain: Chain;
  emitter: string;
  sequence: string;
}

// Mevcut ağ yapılandırması
export const CURRENT_NETWORK: Network = "Testnet";
export type SupportedChain = Extract<Chain, "Solana" | "Sui">;

export type { Chain } from '@wormhole-foundation/sdk'; 


