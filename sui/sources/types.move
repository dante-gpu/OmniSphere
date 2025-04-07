/// Basic types for the OmniSphere protocol on Sui.
module omnisphere_sui::types {

    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};

    /// Represents the status of a liquidity pool.
    struct PoolStatus has copy, drop, store {
        is_active: bool,
        is_paused: bool,
    }

    /// Creates a new active pool status.
    public fun new_active_status(): PoolStatus {
        PoolStatus { is_active: true, is_paused: false }
    }

    /// Represents the status of a bridge operation.
    /// Placeholder for now.
    struct BridgeStatus has copy, drop, store {
        code: u8 // 0: Pending, 1: Completed, 2: Failed
    }

    /// Represents the type of bridge operation.
    /// Placeholder for now.
    struct BridgeOperation has copy, drop, store {
        code: u8 // 0: CreatePoolMirror, 1: AddLiquidity, 2: RemoveLiquidity
    }

    // Add other shared types here as needed.

}
