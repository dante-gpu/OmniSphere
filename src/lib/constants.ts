// Define Wormhole RPC hosts for different networks
// Add Mainnet hosts if needed later
export const WORMHOLE_RPC_HOSTS = {
  Testnet: [
    "https://wormhole-v2-testnet-api.certus.one",
    "https://api.testnet.wormscan.io",
    // Add more testnet RPCs if available
  ],
  Mainnet: [
    "https://wormhole-v2-mainnet-api.certus.one",
    "https://api.wormscan.io",
    // Add more mainnet RPCs
  ],
  // Add Devnet if needed, though often Testnet RPCs are used
};

// Add other constants like program IDs, token mappings etc. here
// Or import them from other dedicated files

export const SUI_PACKAGE_ID = '0xee971f83a4e21e2e1c129d4ea7478451a161fe7efd96e76c576a4df04bda6f4e'; // our deployed liquidity pool package ID
export const SOLANA_DEVNET_PROGRAM_ID = 'AGHWA8Ff6ZPzFZxjHsH7CRFiwXSucXLhbZ3SUQYYLNoZ';

// --- Sui Token Information ---
// for these tokens on your target network (devnet/testnet/mainnet).
// The 'type' field should match the full CoinType string.
export interface SuiTokenInfo {
  symbol: string;
  type: string; // Full CoinType: PackageID::ModuleName::StructName
  decimals: number;
  // Add other relevant info like icon URL if needed
}

export const SUI_TOKEN_MAP: { [symbol: string]: SuiTokenInfo } = {
  'SUI': {
    symbol: 'SUI',
    type: '0x2::sui::SUI',
    decimals: 9,
  },
  'USDC': {
    symbol: 'USDC',
    // Using the verified Testnet USDC address
    type: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
    decimals: 6,
  },
  'USDT': {
    symbol: 'USDT',
    // Replace with actual USDT package ID and module name if different
    type: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb::usdt::USDT',
    decimals: 6,
  },
  // Add other supported Sui tokens here following the same structure
  // 'WETH': { symbol: 'WETH', type: '0xcccc...::weth::WETH', decimals: 8 },
  // 'BTC': { symbol: 'BTC', type: '0xdddd...::btc::BTC', decimals: 8 },
};
