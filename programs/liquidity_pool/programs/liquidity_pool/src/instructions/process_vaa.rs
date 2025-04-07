use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount, Transfer},
};
use crate::state::{Pool, BridgeRequest, BridgeStatus};
use crate::errors::ErrorCode;
use crate::payloads::{AddLiquidityCompletionPayload, RemoveLiquidityCompletionPayload};
use wormhole_anchor_sdk::wormhole; // Keep anchor sdk import for BridgeData etc.
use wormhole_vaas::{Vaa, Readable, payloads::PayloadKind}; // Import Vaa, Readable, and PayloadKind
use std::io::Cursor; // Import Cursor for reading from slice
use borsh::BorshDeserialize; // Keep for our custom payload deserialization
use crate::instructions::add_liquidity::mint_lp_tokens;
use crate::instructions::remove_liquidity::transfer_pool_tokens;
use hex; // Import hex for encoding

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

    /// CHECK: Posted VAA account. Data is manually deserialized and verified.
    /// Client is responsible for passing the correct account address.
    #[account()]
    pub posted_vaa: AccountInfo<'info>, // Load as AccountInfo

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

    // --- VAA Verification ---
    // Manually deserialize and verify the VAA data from the account info
    let posted_vaa_account_info = &ctx.accounts.posted_vaa;
    let posted_vaa_data = posted_vaa_account_info.try_borrow_data()?;
    // Use Vaa::read with Cursor
    let mut cursor = Cursor::new(&posted_vaa_data[..]);
    let vaa: Vaa = Vaa::read(&mut cursor)?;

    // TODO: Add proper VAA verification logic here using wormhole_bridge data
    // This typically involves checking the guardian signatures against the current guardian set
    // stored in the wormhole_bridge account. This is crucial for security.
    // Example placeholder:
    // verify_vaa(&ctx.accounts.wormhole_bridge, &vaa)?;

    // Optional: Check against replay using BridgeRequest account
    /*
    let bridge_request = &mut ctx.accounts.bridge_request;
    require!(bridge_request.status == BridgeStatus::Pending, ErrorCode::VaaAlreadyProcessed);
    */

    // --- Payload Processing ---
    // Extract the raw payload bytes by matching the PayloadKind enum
    let payload: &[u8] = match &vaa.body.payload {
        PayloadKind::Unknown(bytes) => bytes.as_slice(), // Get bytes from Unknown variant
        // Handle other known Wormhole payload types if necessary for your protocol
        // e.g., PayloadKind::TokenTransfer { ... } => return err!(ErrorCode::UnexpectedPayloadKind),
        _ => return err!(ErrorCode::UnsupportedPayloadKind), // Error if not Unknown
    };
    require!(!payload.is_empty(), ErrorCode::InvalidVaaPayload);

    let operation_code = payload[0];
    let specific_payload_data = &payload[1..];

    msg!("VAA Details: Chain={}, Addr={}, Seq={}",
        vaa.emitter_chain, // Access directly from Vaa struct
        hex::encode(vaa.emitter_address), // Access directly from Vaa struct
        vaa.sequence // Access directly from Vaa struct
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
                ctx.accounts.pool.key(),
                completion_payload.lp_amount_to_mint,
                ctx.bumps.pool_authority,
            )?;
            msg!("Minted {} LP tokens to {}", completion_payload.lp_amount_to_mint, ctx.accounts.recipient.key());

        }
        1 => { // RemoveLiquidityCompletion
            msg!("Processing Remove Liquidity Completion...");
            let completion_payload = RemoveLiquidityCompletionPayload::try_from_slice(specific_payload_data)
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

            transfer_pool_tokens(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.token_a_account.to_account_info(),
                ctx.accounts.recipient_token_a_account.to_account_info(),
                ctx.accounts.pool_authority.to_account_info(),
                ctx.accounts.pool.key(),
                completion_payload.amount_a_to_transfer,
                ctx.bumps.pool_authority,
            )?;
             msg!("Transferred {} Token A to {}", completion_payload.amount_a_to_transfer, ctx.accounts.recipient.key());

             transfer_pool_tokens(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.token_b_account.to_account_info(),
                ctx.accounts.recipient_token_b_account.to_account_info(),
                ctx.accounts.pool_authority.to_account_info(),
                ctx.accounts.pool.key(),
                completion_payload.amount_b_to_transfer,
                ctx.bumps.pool_authority,
            )?;
            msg!("Transferred {} Token B to {}", completion_payload.amount_b_to_transfer, ctx.accounts.recipient.key());

        }
        _ => {
            msg!("Unknown operation code in payload: {}", operation_code);
            return err!(ErrorCode::InvalidBridgeOperation);
        }
    }

    msg!("VAA processed successfully.");
    Ok(())
}
