use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("The specified pool is paused.")]
    PoolPaused,

    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,

    #[msg("Attempted to mint zero liquidity tokens.")]
    ZeroLiquidityMinted,

    #[msg("Attempted to burn zero liquidity tokens.")]
    ZeroLiquidityBurned,

    #[msg("Insufficient LP tokens.")]
    InsufficientLpTokens,

    #[msg("Cannot remove liquidity from an empty pool.")]
    PoolEmpty,

    #[msg("Invalid pool token account provided.")]
    InvalidPoolTokenAccount,

    #[msg("Invalid token mint provided.")]
    InvalidMint,

    #[msg("Invalid token account owner.")]
    InvalidOwner,

    #[msg("Invalid VAA payload.")]
    InvalidVaaPayload,

    #[msg("Invalid bridge operation type in VAA.")]
    InvalidBridgeOperation,

    #[msg("This VAA has already been processed.")]
    VaaAlreadyProcessed,

    // Add more specific error codes as needed
    #[msg("Calculation overflow.")]
    Overflow,

    #[msg("Calculation underflow.")]
    Underflow,

    #[msg("Invalid authority.")]
    InvalidAuthority,

    #[msg("Invalid pool status.")]
    InvalidPoolStatus,
}
