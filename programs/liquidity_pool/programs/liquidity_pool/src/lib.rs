use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, MintTo, Burn}; // Import necessary SPL token types

// Declare modules within this crate
pub mod instructions;
pub mod state;
pub mod errors;
pub mod payloads; // Declare payloads module

// Import modules created earlier (relative path from this file's perspective)
// Note: Anchor build might handle paths differently, but typically modules are declared relative to lib.rs
// If build fails, we might need to adjust these paths or the workspace structure.
// For now, assuming the build process correctly finds these modules within the workspace.
// Use `crate::` to refer to modules within the same crate (program)
use crate::instructions::*;
use crate::state::*;
use crate::errors::ErrorCode;

// Declare the program ID - Using the placeholder from README.md
declare_id!("LiQP5xRQqd3s8YTRuuBE3KxmzWF8x7LpxAqJ9Vr5FvT");

#[program]
pub mod liquidity_pool_program { // Renamed module to avoid conflict with crate name
    use super::*; // Make items from outer scope available

    // Instruction: Create a new liquidity pool
    pub fn create_pool(
        ctx: Context<CreatePool>,
        fee_percentage: u64,
        pool_id: [u8; 32] // Unique ID matching Sui side
    ) -> Result<()> {
        instructions::create_pool::handler(ctx, fee_percentage, pool_id)
    }

    // Instruction: Add liquidity to an existing pool
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a_desired: u64,
        amount_b_desired: u64,
        amount_a_min: u64,
        amount_b_min: u64
    ) -> Result<()> {
        instructions::add_liquidity::handler(
            ctx,
            amount_a_desired,
            amount_b_desired,
            amount_a_min,
            amount_b_min
        )
    }

    // Instruction: Remove liquidity from a pool
    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        liquidity_amount: u64, // Amount of LP tokens to burn
        amount_a_min: u64,
        amount_b_min: u64
    ) -> Result<()> {
        instructions::remove_liquidity::handler(
            ctx,
            liquidity_amount,
            amount_a_min,
            amount_b_min
        )
    }

    // Instruction: Process a Wormhole VAA
    pub fn process_vaa(
        ctx: Context<ProcessVAA>,
        vaa_hash: [u8; 32] // Identifier for the VAA to process
    ) -> Result<()> {
        instructions::process_vaa::handler(ctx, vaa_hash)
    }

    // TODO: Add other instructions as needed (e.g., swap, update_fees, etc.)
}

// Optional: Define events if needed using #[event] macro
/*
#[event]
pub struct LiquidityAdded {
    pool: Pubkey,
    user: Pubkey,
    amount_a: u64,
    amount_b: u64,
    lp_tokens_minted: u64,
}

#[event]
pub struct LiquidityRemoved {
    pool: Pubkey,
    user: Pubkey,
    amount_a: u64,
    amount_b: u64,
    lp_tokens_burned: u64,
}
*/
