use anchor_lang::prelude::*;

// Represents a user's liquidity position in a specific pool
#[account]
#[derive(Default)]
pub struct Position {
    pub owner: Pubkey,      // The owner of this liquidity position
    pub pool: Pubkey,       // The pool this position belongs to
    pub liquidity: u64,     // Amount of LP tokens held by the owner
    pub last_claimed_at: i64, // Timestamp when fees were last claimed (optional)
    // Add other relevant fields like rewards tracking if needed
}

impl Position {
    // Discriminator (8) + Pubkey (2 * 32) + u64 (1) + i64 (1)
    pub const SIZE: usize = 8 + (32 * 2) + 8 + 8;
}
