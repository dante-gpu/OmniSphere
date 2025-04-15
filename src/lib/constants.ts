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

export const SUI_TESTNET_PACKAGE_ID = '0xee971f83a4e21e2e1c129d4ea7478451a161fe7efd96e76c576a4df04bda6f4e';
export const SOLANA_DEVNET_PROGRAM_ID = 'AGHWA8Ff6ZPzFZxjHsH7CRFiwXSucXLhbZ3SUQYYLNoZ';
