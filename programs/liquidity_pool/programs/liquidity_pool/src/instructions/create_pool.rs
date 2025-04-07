use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::Pool; // Import the Pool state

#[derive(Accounts)]
#[instruction(fee_percentage: u64, pool_id: [u8; 32])] // Define instruction arguments used in seeds/constraints
pub struct CreatePool<'info> {
    // Payer of the transaction and initial pool creator
    #[account(mut)]
    pub creator: Signer<'info>,

    // Pool state account (PDA) - needs to be initialized
    #[account(
        init,
        payer = creator,
        space = Pool::SIZE, // Use the calculated size from state/pool.rs
        seeds = [b"pool".as_ref(), token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    // Authority PDA for the pool (will own token accounts and LP mint)
    /// CHECK: This is a PDA, seeds are checked below. No data read/written directly.
    #[account(
        seeds = [b"authority".as_ref(), pool.key().as_ref()],
        bump
    )]
    pub pool_authority: AccountInfo<'info>,

    // Token mints
    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,

    // LP token mint (PDA) - needs to be initialized
    #[account(
        init,
        payer = creator,
        mint::decimals = 6, // Example: Set LP token decimals (adjust as needed)
        mint::authority = pool_authority,
        seeds = [b"lp_mint".as_ref(), pool.key().as_ref()],
        bump
    )]
    pub lp_mint: Account<'info, Mint>,

    // Token accounts owned by the pool authority (PDAs) - need to be initialized
    #[account(
        init,
        payer = creator,
        token::mint = token_a_mint,
        token::authority = pool_authority,
        seeds = [b"token_a".as_ref(), pool.key().as_ref()],
        bump
    )]
    pub token_a_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        token::mint = token_b_mint,
        token::authority = pool_authority,
        seeds = [b"token_b".as_ref(), pool.key().as_ref()],
        bump
    )]
    pub token_b_account: Account<'info, TokenAccount>,

    // System programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

// Instruction handler function
pub fn handler(ctx: Context<CreatePool>, fee_percentage: u64, pool_id: [u8; 32]) -> Result<()> {
    msg!("Creating new liquidity pool...");

    // Get the accounts
    let pool = &mut ctx.accounts.pool;
    let creator = &ctx.accounts.creator; // Not directly used here but good practice to have

    // Get bumps
    let authority_bump = *ctx.bumps.get("pool_authority").unwrap();
    let lp_mint_bump = *ctx.bumps.get("lp_mint").unwrap();
    let token_a_bump = *ctx.bumps.get("token_a_account").unwrap();
    let token_b_bump = *ctx.bumps.get("token_b_account").unwrap();
    let pool_bump = *ctx.bumps.get("pool").unwrap(); // Bump for the pool account itself

    // Initialize the pool state
    pool.authority = ctx.accounts.pool_authority.key();
    pool.token_a_mint = ctx.accounts.token_a_mint.key();
    pool.token_b_mint = ctx.accounts.token_b_mint.key();
    pool.token_a_account = ctx.accounts.token_a_account.key();
    pool.token_b_account = ctx.accounts.token_b_account.key();
    pool.lp_mint = ctx.accounts.lp_mint.key();
    pool.fee_percentage = fee_percentage;
    pool.total_liquidity = 0; // Initially no liquidity
    pool.pool_id = pool_id;
    pool.status = 0; // 0: Active
    pool.last_updated_at = Clock::get()?.unix_timestamp;
    pool.protocol_fee_a = 0;
    pool.protocol_fee_b = 0;
    pool.bump = pool_bump; // Store the bump for the main pool account PDA
    pool.lp_mint_bump = lp_mint_bump;
    pool.token_a_bump = token_a_bump;
    pool.token_b_bump = token_b_bump;

    msg!("Pool created successfully with ID: {:?}", pool_id);
    msg!("Pool account address: {}", pool.key());
    msg!("Pool authority PDA: {}", pool.authority);
    msg!("LP Mint PDA: {}", pool.lp_mint);

    Ok(())
}
