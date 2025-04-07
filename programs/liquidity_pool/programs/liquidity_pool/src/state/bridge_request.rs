use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct BridgeRequest {
    pub wormhole_sequence: u64,     // Wormhole message sequence number
    pub emitter_chain: u16,         // Source chain ID (Wormhole Chain ID)
    pub emitter_address: [u8; 32],  // Source emitter address (Wormhole format)
    pub status: BridgeStatus,       // Bridge request status
    pub payload: Vec<u8>,           // Bridge operation payload (variable size)
    pub created_at: i64,            // Creation timestamp
    // Add bump seed if this account is a PDA
    // pub bump: u8,
}

// Define BridgeStatus enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BridgeStatus {
    Pending,
    Completed,
    Failed,
}

impl Default for BridgeStatus {
    fn default() -> Self {
        BridgeStatus::Pending
    }
}

// Note: Size calculation for accounts with Vec<u8> is tricky.
// Anchor usually handles this, but for manual calculation:
// Discriminator (8) + u64 (1) + u16 (1) + [u8; 32] (1) + Enum (1 byte for status) + Vec (4 bytes for length) + i64 (1) + Payload size
// The maximum size depends on the maximum payload length allowed.
// Let's assume a max payload of 1024 bytes for estimation as per README.
// SIZE ~ 8 + 8 + 2 + 32 + 1 + 4 + 8 + 1024 = 1087 bytes (approx max)
// It's often better to let Anchor manage size or use fixed-size arrays if possible.
