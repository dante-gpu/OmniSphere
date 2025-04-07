use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Pool {
    pub authority: Pubkey,          // Pool PDA
    pub token_a_mint: Pubkey,       // Token A mint address
    pub token_b_mint: Pubkey,       // Token B mint address
    pub token_a_account: Pubkey,    // Token A account (PDA owned by authority)
    pub token_b_account: Pubkey,    // Token B account (PDA owned by authority)
    pub lp_mint: Pubkey,            // LP token mint (Mint PDA owned by authority)
    pub fee_percentage: u64,        // Fee percentage (basis points, e.g., 30 for 0.3%)
    pub total_liquidity: u64,       // Total LP token amount currently minted
    pub pool_id: [u8; 32],          // Unique pool identifier matching with Sui side
    pub status: u8,                 // Pool status (0: active, 1: paused)
    pub last_updated_at: i64,       // Last update timestamp (Unix timestamp)
    pub protocol_fee_a: u64,        // Accumulated protocol fees in token A
    pub protocol_fee_b: u64,        // Accumulated protocol fees in token B
    pub bump: u8,                   // PDA bump seed for the authority
    pub lp_mint_bump: u8,           // PDA bump seed for the LP mint
    pub token_a_bump: u8,           // PDA bump seed for token A account
    pub token_b_bump: u8,           // PDA bump seed for token B account
}

impl Pool {
    // Calculate size based on fields
    // Discriminator (8) + Pubkey (32 * 6) + u64 (5) + [u8; 32] (1) + u8 (1) + i64 (1) + u8 (4)
    pub const SIZE: usize = 8 + (32 * 6) + (8 * 5) + 32 + 1 + 8 + 4;
}

// Enum for Pool Status (optional but good practice)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PoolStatus {
    Active,
    Paused,
    Deprecated,
}

impl Default for PoolStatus {
    fn default() -> Self {
        PoolStatus::Active
    }
}

// Implement conversion from u8 if needed, or use the enum directly in the Pool struct
// For simplicity, the Pool struct uses u8 for status directly as shown in the README example.
