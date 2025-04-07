use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount, Transfer},
};
use crate::state::{Pool, BridgeRequest, BridgeStatus};
use crate::errors::ErrorCode;
use crate::payloads::{AddLiquidityCompletionPayload, RemoveLiquidityCompletionPayload};
use wormhole_anchor_sdk::wormhole; // Keep anchor sdk import for PostedVaa etc.
use wormhole_sdk::Vaa; // Import Vaa from the core wormhole_sdk crate root
use borsh::BorshDeserialize;
use crate::instructions::add_liquidity::mint_lp_tokens;
use crate::instructions::remove_liquidity::transfer_pool_tokens;

#[derive(Accounts)]
pub struct ProcessVAA<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [b"Bridge".as_ref()],
        bump,
        seeds::program = wormhole::program::ID
    )]
    pub wormhole_bridge: Account<'info, wormhole::BridgeData>,

    #[account()] // Remove seeds, bump, and seeds::program constraints
    pub posted_vaa: Account<'info, wormhole::PostedVaa<Vaa>>,

    #[account(
        mut,
        seeds = [b"pool".as_ref(), pool.token_a_mint.key().as_ref(), pool.token_b_mint.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Authority PDA, seeds checked. Used as signer if needed.
    #[account(
        seeds = [b"authority".as_ref(), pool.key().as_ref()],
        bump
    )]
    pub pool_authority: AccountInfo<'info>,

    #[account(address = pool.token_a_mint @ ErrorCode::InvalidMint)]
    pub token_a_mint: Account<'info, Mint>,
    #[account(address = pool.token_b_mint @ ErrorCode::InvalidMint)]
    pub token_b_mint: Account<'info, Mint>,

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

    #[account(
        mut,
        seeds = [b"lp_mint".as_ref(), pool.key().as_ref()],
        bump = pool.lp_mint_bump,
        constraint = lp_mint.key() == pool.lp_mint @ ErrorCode::InvalidMint
    )]
    pub lp_mint: Account<'info, Mint>,

    /// CHECK: Recipient address derived from VAA payload. Account type checked in handler.
    #[account(mut)]
    pub recipient: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = lp_mint,
        associated_token::authority = recipient
    )]
    pub recipient_lp_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_a_mint,
        associated_token::authority = recipient
    )]
    pub recipient_token_a_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_b_mint,
        associated_token::authority = recipient
    )]
    pub recipient_token_b_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


pub fn handler(
    ctx: Context<ProcessVAA>,
    _vaa_hash: [u8; 32]
) -> Result<()> {
    msg!("Processing VAA...");

    let posted_vaa = &ctx.accounts.posted_vaa;
    let vaa = &**posted_vaa;

    let payload: &[u8] = &vaa.payload;
    require!(!payload.is_empty(), ErrorCode::InvalidVaaPayload);

    let operation_code = payload[0];
    let specific_payload_data = &payload[1..];

    msg!("VAA Details: Chain={}, Addr={}, Seq={}",
        vaa.emitter_chain,
        hex::encode(vaa.emitter_address),
        vaa.sequence
    );
    msg!("Processing Operation Code: {}", operation_code);

    match operation_code {
        0 => { // AddLiquidityCompletion
            msg!("Processing Add Liquidity Completion...");
            let completion_payload = AddLiquidityCompletionPayload::try_from_slice(specific_payload_data)
                .map_err(|_| error!(ErrorCode::InvalidVaaPayload))?;
            msg!("Payload: {:?}", completion_payload);

            require!(
                ctx.accounts.recipient.key().to_bytes() == completion_payload.recipient_address,
                ErrorCode::RecipientMismatch
            );
            require!(
                ctx.accounts.pool.pool_id == completion_payload.original_pool_id,
                ErrorCode::PoolIdMismatch
            );

            mint_lp_tokens(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.lp_mint.to_account_info(),
                ctx.accounts.recipient_lp_token_account.to_account_info(),
                ctx.accounts.pool_authority.to_account_info(),
    pub rent: Sysvar<'info, Rent>,
}


pub fn handler(
    ctx: Context<ProcessVAA>,
    _vaa_hash: [u8; 32] // vaa_hash is used for PDA derivation, not directly in handler usually
) -> Result<()> {
    msg!("Processing VAA...");

    // --- VAA Verification ---
    // Access the deserialized VAA data from the PostedVaa account.
    let posted_vaa = &ctx.accounts.posted_vaa;
    // Access the inner Vaa struct using deref
    let vaa = &**posted_vaa;

    // Optional: Check against replay using BridgeRequest account
    /*
    let bridge_request = &mut ctx.accounts.bridge_request;
    require!(bridge_request.status == BridgeStatus::Pending, ErrorCode::VaaAlreadyProcessed);
    */

    // --- Payload Processing ---
    let payload: &[u8] = &vaa.payload;
    require!(!payload.is_empty(), ErrorCode::InvalidVaaPayload);

    // The first byte indicates the operation type/code
    let operation_code = payload[0];
    let specific_payload_data = &payload[1..]; // Data for the specific operation

    msg!("VAA Details: Chain={}, Addr={}, Seq={}",
        vaa.emitter_chain,
        hex::encode(vaa.emitter_address),
        vaa.sequence
    );
    msg!("Processing Operation Code: {}", operation_code);

    // TODO: Add checks for emitter_chain and emitter_address if needed
    // require!(vaa.emitter_chain == SUI_CHAIN_ID, ErrorCode::InvalidEmitterChain);
    // require!(vaa.emitter_address == SUI_BRIDGE_ADDRESS, ErrorCode::InvalidEmitterAddress);

    match operation_code {
        0 => { // AddLiquidityCompletion
            msg!("Processing Add Liquidity Completion...");
            let completion_payload = AddLiquidityCompletionPayload::try_from_slice(specific_payload_data)
                .map_err(|_| error!(ErrorCode::InvalidVaaPayload))?;
            msg!("Payload: {:?}", completion_payload);

            // Verify recipient matches the account passed in context
            require!(
                ctx.accounts.recipient.key().to_bytes() == completion_payload.recipient_address,
                ErrorCode::RecipientMismatch
            );
            // Verify pool ID matches
            require!(
                ctx.accounts.pool.pool_id == completion_payload.original_pool_id,
                ErrorCode::PoolIdMismatch
            );

            // Mint LP tokens to recipient
            mint_lp_tokens(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.lp_mint.to_account_info(),
                ctx.accounts.recipient_lp_token_account.to_account_info(),
                ctx.accounts.pool_authority.to_account_info(),
                ctx.accounts.pool.key(),
                completion_payload.lp_amount_to_mint,
                ctx.bumps.pool_authority, // Access bump directly
            )?;
            msg!("Minted {} LP tokens to {}", completion_payload.lp_amount_to_mint, ctx.accounts.recipient.key());

        }
        1 => { // RemoveLiquidityCompletion
            msg!("Processing Remove Liquidity Completion...");
            let completion_payload = RemoveLiquidityCompletionPayload::try_from_slice(specific_payload_data)
                 .map_err(|_| error!(ErrorCode::InvalidVaaPayload))?;
            msg!("Payload: {:?}", completion_payload);

             // Verify recipient matches the account passed in context
            require!(
                ctx.accounts.recipient.key().to_bytes() == completion_payload.recipient_address,
                ErrorCode::RecipientMismatch
            );
             // Verify pool ID matches
            require!(
                ctx.accounts.pool.pool_id == completion_payload.original_pool_id,
                ErrorCode::PoolIdMismatch
            );

            // Transfer Token A from pool to recipient
            transfer_pool_tokens(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.token_a_account.to_account_info(),
                ctx.accounts.recipient_token_a_account.to_account_info(),
                ctx.accounts.pool_authority.to_account_info(),
                ctx.accounts.pool.key(),
                completion_payload.amount_a_to_transfer,
                ctx.bumps.pool_authority, // Access bump directly
            )?;
             msg!("Transferred {} Token A to {}", completion_payload.amount_a_to_transfer, ctx.accounts.recipient.key());

            // Transfer Token B from pool to recipient
             transfer_pool_tokens(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.token_b_account.to_account_info(),
                ctx.accounts.recipient_token_b_account.to_account_info(),
                ctx.accounts.pool_authority.to_account_info(),
                ctx.accounts.pool.key(),
                completion_payload.amount_b_to_transfer,
                ctx.bumps.pool_authority, // Access bump directly
            )?;
            msg!("Transferred {} Token B to {}", completion_payload.amount_b_to_transfer, ctx.accounts.recipient.key());

        }
        _ => {
            msg!("Unknown operation code in payload: {}", operation_code);
            return err!(ErrorCode::InvalidBridgeOperation);
        }
    }

     // --- Mark VAA as Processed (Optional using BridgeRequest account) ---
    // Update the status in the BridgeRequest account
    /*
    bridge_request.status = BridgeStatus::Completed;
    bridge_request.payload = payload.to_vec(); // Store payload for reference if needed
    */

    msg!("VAA processed successfully.");
    Ok(())
}


// Note: The helper functions mint_lp_tokens and transfer_pool_tokens are assumed
// to be imported from add_liquidity.rs and remove_liquidity.rs respectively.
// Ensure they are correctly implemented and accessible.

// Also, add necessary error variants to errors.rs (e.g., RecipientMismatch, PoolIdMismatch)
