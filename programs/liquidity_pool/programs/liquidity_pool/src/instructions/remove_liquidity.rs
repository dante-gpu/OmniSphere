use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, Burn};
use crate::state::Pool;
use crate::errors::ErrorCode; // Assuming errors.rs exists

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    // User removing liquidity
    #[account(mut)]
    pub user: Signer<'info>,

    // Pool state account
    #[account(
        mut, // Pool state will be updated (total_liquidity, last_updated_at)
        seeds = [b"pool".as_ref(), pool.token_a_mint.key().as_ref(), pool.token_b_mint.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    // Pool authority PDA
    /// CHECK: Authority PDA, seeds checked below. Used as signer.
    #[account(
        seeds = [b"authority".as_ref(), pool.key().as_ref()],
        bump // Bump needed for signing CPIs
    )]
    pub pool_authority: AccountInfo<'info>,

    // Pool's token accounts (funds transferred from here)
    #[account(
        mut,
        seeds = [b"token_a".as_ref(), pool.key().as_ref()],
        bump = pool.token_a_bump,
        constraint = token_a_account.key() == pool.token_a_account @ ErrorCode::InvalidPoolTokenAccount
    )]
    pub token_a_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"token_b".as_ref(), pool.key().as_ref()],
        bump = pool.token_b_bump,
        constraint = token_b_account.key() == pool.token_b_account @ ErrorCode::InvalidPoolTokenAccount
    )]
    pub token_b_account: Account<'info, TokenAccount>,

    // User's token accounts (funds transferred to here)
    #[account(
        mut,
        constraint = user_token_a.mint == pool.token_a_mint @ ErrorCode::InvalidMint,
        constraint = user_token_a.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_b.mint == pool.token_b_mint @ ErrorCode::InvalidMint,
        constraint = user_token_b.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_token_b: Account<'info, TokenAccount>,

    // LP token mint
    #[account(
        mut, // Supply will decrease
        seeds = [b"lp_mint".as_ref(), pool.key().as_ref()],
        bump = pool.lp_mint_bump,
        constraint = lp_mint.key() == pool.lp_mint @ ErrorCode::InvalidMint
    )]
    pub lp_mint: Account<'info, Mint>,

    // User's LP token account (LP tokens burned from here)
    #[account(
        mut,
        constraint = user_lp_token_account.mint == lp_mint.key() @ ErrorCode::InvalidMint,
        constraint = user_lp_token_account.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_lp_token_account: Account<'info, TokenAccount>,

    // System programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>, // Not strictly needed here but often included
}

// Handler function for removing liquidity
pub fn handler(
    ctx: Context<RemoveLiquidity>,
    liquidity_amount: u64, // Amount of LP tokens to burn
    amount_a_min: u64,     // Minimum amount of token A user expects back
    amount_b_min: u64,     // Minimum amount of token B user expects back
) -> Result<()> {
    msg!("Removing liquidity...");
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    // Check if pool is active
    require!(pool.status == 0, ErrorCode::PoolPaused);
    require!(liquidity_amount > 0, ErrorCode::ZeroLiquidityBurned);

    let reserve_a = ctx.accounts.token_a_account.amount;
    let reserve_b = ctx.accounts.token_b_account.amount;
    let lp_supply = ctx.accounts.lp_mint.supply;

    require!(lp_supply > 0, ErrorCode::PoolEmpty); // Cannot remove from empty pool
    require!(liquidity_amount <= ctx.accounts.user_lp_token_account.amount, ErrorCode::InsufficientLpTokens);

    // Calculate the amount of token A and B to return
    // amount = (liquidity_to_burn / total_lp_supply) * reserve
    let amount_a_out = liquidity_amount.checked_mul(reserve_a).unwrap().checked_div(lp_supply).unwrap();
    let amount_b_out = liquidity_amount.checked_mul(reserve_b).unwrap().checked_div(lp_supply).unwrap();

    // Check against minimum amounts (slippage protection)
    require!(amount_a_out >= amount_a_min, ErrorCode::SlippageExceeded);
    require!(amount_b_out >= amount_b_min, ErrorCode::SlippageExceeded);

    // Transfer tokens from pool to user
    transfer_pool_tokens(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.token_a_account.to_account_info(),
        ctx.accounts.user_token_a.to_account_info(),
        ctx.accounts.pool_authority.to_account_info(),
        pool.key(),
        amount_a_out,
        ctx.bumps.pool_authority, // Access bump directly
    )?;

    transfer_pool_tokens(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.token_b_account.to_account_info(),
        ctx.accounts.user_token_b.to_account_info(),
        ctx.accounts.pool_authority.to_account_info(),
        pool.key(),
        amount_b_out,
        ctx.bumps.pool_authority, // Access bump directly
    )?;

    // Burn user's LP tokens
    burn_lp_tokens(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.user_lp_token_account.to_account_info(),
        ctx.accounts.lp_mint.to_account_info(),
        ctx.accounts.user.to_account_info(), // User authorizes burning their own tokens
        liquidity_amount,
    )?;

    // Update pool state
    pool.total_liquidity = pool.total_liquidity.checked_sub(liquidity_amount).unwrap();
    pool.last_updated_at = clock.unix_timestamp;

    msg!("Liquidity removed: A={}, B={}, LP={}", amount_a_out, amount_b_out, liquidity_amount);

    Ok(())
}

    // Helper function for transferring tokens FROM the pool PDA
    pub fn transfer_pool_tokens<'info>( // Make helper public
        token_program: AccountInfo<'info>,
        source: AccountInfo<'info>, // Pool's token account
        destination: AccountInfo<'info>, // User's token account
    authority: AccountInfo<'info>, // Pool authority PDA
    pool_key: Pubkey,
    amount: u64,
    authority_bump: u8, // Accept the specific bump seed
) -> Result<()> {
    // let authority_bump = *bumps.get("pool_authority").unwrap(); // No longer needed
    let seeds = &[&b"authority"[..], pool_key.as_ref(), &[authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: source,
        to: destination,
        authority: authority,
    };
    let cpi_program = token_program;
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}

    // Helper function for burning LP tokens
    pub fn burn_lp_tokens<'info>( // Make helper public
        token_program: AccountInfo<'info>,
        account_to_burn_from: AccountInfo<'info>, // User's LP token account
        mint: AccountInfo<'info>, // LP mint
    authority: AccountInfo<'info>, // User signing the transaction
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Burn {
        mint: mint,
        from: account_to_burn_from,
        authority: authority,
    };
    let cpi_program = token_program;
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::burn(cpi_ctx, amount)?;
    Ok(())
}
