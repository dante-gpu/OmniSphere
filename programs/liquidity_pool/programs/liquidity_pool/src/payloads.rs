use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};

// Matches the BridgeOperation enum/struct on the Sui side (adjust fields as needed)
// We only need Deserialize here as we are receiving this from Sui via Wormhole
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub enum BridgeOperationCode {
    AddLiquidityCompletion = 0, // Example: Corresponds to completing AddLiquidity on Solana
    RemoveLiquidityCompletion = 1, // Example: Corresponds to completing RemoveLiquidity on Solana
    // Add other operation codes defined in your cross-chain protocol
}

// Payload structure for completing an AddLiquidity operation initiated on Sui
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct AddLiquidityCompletionPayload {
    pub recipient_address: [u8; 32], // Solana address (as bytes) to receive LP tokens
    pub lp_amount_to_mint: u64,      // Amount of LP tokens calculated on Sui side
    pub original_pool_id: [u8; 32],  // Pool ID from Sui to verify against Solana pool
}

// Payload structure for completing a RemoveLiquidity operation initiated on Sui
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct RemoveLiquidityCompletionPayload {
    pub recipient_address: [u8; 32], // Solana address (as bytes) to receive tokens
    pub amount_a_to_transfer: u64,   // Amount of token A calculated on Sui side
    pub amount_b_to_transfer: u64,   // Amount of token B calculated on Sui side
    pub original_pool_id: [u8; 32],  // Pool ID from Sui to verify against Solana pool
}

// Generic payload wrapper (optional, but can be useful)
// The first byte indicates the operation type, followed by the specific payload data
// Deserialization needs to handle this structure.
