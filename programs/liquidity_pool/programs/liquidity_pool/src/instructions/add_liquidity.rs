use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};
use crate::state::Pool;
use crate::errors::ErrorCode; // Assuming you'll create an errors.rs file later

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    // User adding liquidity
    #[account(mut)]
    pub user: Signer<'info>,

    // Pool state account
    #[account(
        mut,
        seeds = [b"pool".as_ref(), pool.token_a_mint.key().as_ref(), pool.token_b_mint.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    // Pool authority PDA
    /// CHECK: Authority PDA, seeds checked below.
    #[account(
        seeds = [b"authority".as_ref(), pool.key().as_ref()],
        bump // We don't need the bump here as we are only using it as a signer
    )]
    pub pool_authority: AccountInfo<'info>,

    // Pool's token accounts
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

    // User's token accounts
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
        mut,
        seeds = [b"lp_mint".as_ref(), pool.key().as_ref()],
        bump = pool.lp_mint_bump,
        constraint = lp_mint.key() == pool.lp_mint @ ErrorCode::InvalidMint
    )]
    pub lp_mint: Account<'info, Mint>,

    // User's LP token account (might need to be created if it doesn't exist)
    #[account(
        init_if_needed, // Creates the account if it doesn't exist
        payer = user,
        associated_token::mint = lp_mint,
        associated_token::authority = user
    )]
    pub user_lp_token_account: Account<'info, TokenAccount>, // Changed name for clarity

    // System programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>, // Needed for init_if_needed
    pub rent: Sysvar<'info, Rent>,
}

// Handler function for adding liquidity
pub fn handler(
    ctx: Context<AddLiquidity>,
    amount_a_desired: u64,
    amount_b_desired: u64,
    amount_a_min: u64, // Minimum amount of token A user is willing to deposit
    amount_b_min: u64, // Minimum amount of token B user is willing to deposit
) -> Result<()> {
    msg!("Adding liquidity...");
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    // Check if pool is active
    require!(pool.status == 0, ErrorCode::PoolPaused); // Assuming 0 is Active

    let reserve_a = ctx.accounts.token_a_account.amount;
    let reserve_b = ctx.accounts.token_b_account.amount;
    let lp_supply = ctx.accounts.lp_mint.supply;

    let (amount_a_optimal, amount_b_optimal) = if lp_supply == 0 {
        // First liquidity provider
        (amount_a_desired, amount_b_desired)
    } else {
        // Calculate optimal amounts based on current reserves
        let amount_b_optimal_calc = amount_a_desired.checked_mul(reserve_b).unwrap().checked_div(reserve_a).unwrap();
        if amount_b_optimal_calc <= amount_b_desired {
            (amount_a_desired, amount_b_optimal_calc)
        } else {
            let amount_a_optimal_calc = amount_b_desired.checked_mul(reserve_a).unwrap().checked_div(reserve_b).unwrap();
            (amount_a_optimal_calc, amount_b_desired)
        }
    };

    // Check against minimum amounts
    require!(amount_a_optimal >= amount_a_min, ErrorCode::SlippageExceeded);
    require!(amount_b_optimal >= amount_b_min, ErrorCode::SlippageExceeded);

    // Calculate LP tokens to mint
    let liquidity_minted = if lp_supply == 0 {
        // Use geometric mean for the first provider, or a simpler approach like 100 units
        // Let's use a simpler fixed amount for the first liquidity to avoid sqrt complexity or large numbers
        // Or base it on one of the amounts, e.g., amount_a_optimal
        amount_a_optimal // Simplification: mint LP tokens equal to the amount of token A deposited initially
                         // A more common approach is sqrt(amount_a * amount_b), but requires U128 or similar
    } else {
        // Calculate based on the ratio of deposit to reserves
        std::cmp::min(
            amount_a_optimal.checked_mul(lp_supply).unwrap().checked_div(reserve_a).unwrap(),
            amount_b_optimal.checked_mul(lp_supply).unwrap().checked_div(reserve_b).unwrap(),
        )
    };

    require!(liquidity_minted > 0, ErrorCode::ZeroLiquidityMinted);

    // Transfer tokens from user to pool
    transfer_tokens(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.user_token_a.to_account_info(),
        ctx.accounts.token_a_account.to_account_info(),
        ctx.accounts.user.to_account_info(),
        amount_a_optimal,
    )?;

    transfer_tokens(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.user_token_b.to_account_info(),
        ctx.accounts.token_b_account.to_account_info(),
        ctx.accounts.user.to_account_info(),
        amount_b_optimal,
    )?;

    // Mint LP tokens to user
    mint_lp_tokens(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.lp_mint.to_account_info(),
        ctx.accounts.user_lp_token_account.to_account_info(),
        ctx.accounts.pool_authority.to_account_info(),
        pool.key(), // Pool key needed for PDA seeds
        liquidity_minted,
        *ctx.bumps.get("pool_authority").unwrap(), // Pass the specific bump seed
    )?;

    // Update pool state (reload amounts after transfer)
    pool.total_liquidity = pool.total_liquidity.checked_add(liquidity_minted).unwrap();
    pool.last_updated_at = clock.unix_timestamp;

    msg!("Liquidity added: A={}, B={}, LP={}", amount_a_optimal, amount_b_optimal, liquidity_minted);

    Ok(())
}

// Helper function for token transfers
fn transfer_tokens<'info>(
    token_program: AccountInfo<'info>,
    source: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: source,
        to: destination,
        authority: authority,
    };
    let cpi_program = token_program;
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}

// Helper function for minting LP tokens
fn mint_lp_tokens<'info>(
    token_program: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    pool_key: Pubkey, // Pass pool key
    amount: u64,
    authority_bump: u8, // Accept the specific bump seed
) -> Result<()> {
    // let authority_bump = *bumps.get("pool_authority").unwrap(); // No longer needed
    let seeds = &[&b"authority"[..], pool_key.as_ref(), &[authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = MintTo {
        mint: mint,
        to: destination,
        authority: authority,
    };
    let cpi_program = token_program;
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::mint_to(cpi_ctx, amount)?;
    Ok(())
} // Add missing closing brace for the function
