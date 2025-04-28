/// Basic types for the OmniSphere protocol on Sui.
module omnisphere_sui::types {

    // use sui::object::{Self, UID}; // UID şu an kullanılmıyor
    // use sui::tx_context::{Self, TxContext}; // TxContext şu an kullanılmıyor

    // --- Pool Status ---

    /// Represents the status of a liquidity pool.
    /// Expand with more states like 'Frozen', 'Emergency' if needed later.
    struct PoolStatus has copy, drop, store {
        is_active: bool,
        is_paused: bool,
        // is_frozen: bool, // Example future state
    }

    /// Creates a new active pool status.
    public fun new_active_status(): PoolStatus {
        PoolStatus { is_active: true, is_paused: false }
    }

    /// Checks if the pool status is active.
    public fun is_active(status: &PoolStatus): bool {
        status.is_active && !status.is_paused
    }

    // --- Bridge Operation Types ---

    // Constants defining the type of bridge operation initiated.
    // These codes can be used in emitted events or stored to track operations.
    const OPERATION_CREATE_POOL_MIRROR: u8 = 0;
    const OPERATION_ADD_LIQUIDITY: u8 = 1;
    const OPERATION_REMOVE_LIQUIDITY: u8 = 2;
    const OPERATION_LINK_POOL: u8 = 3; // Linking operation code eklendi (isteğe bağlı)
    const OPERATION_CREATE_POOL: u8 = 4; // Creating a new pool/mirror pool
    // Add more operation types as needed (e.g., Swap)

    /// Represents the type of bridge operation being performed or requested.
    struct BridgeOperation has copy, drop, store {
        code: u8 // Use constants like OPERATION_CREATE_POOL_MIRROR
    }

    // --- Bridge Operation Status ---

    // Constants defining the status of a bridge operation.
    // Useful for tracking the progress of cross-chain requests, especially when processing incoming VAAs.
    const STATUS_PENDING: u8 = 0;
    const STATUS_COMPLETED: u8 = 1;
    const STATUS_FAILED: u8 = 2;
    const STATUS_REVERTED: u8 = 3; // Example additional status

    /// Represents the status of a bridge operation request.
    struct BridgeStatus has copy, drop, store {
        code: u8 // Use constants like STATUS_PENDING
        // error_message: Option<String> // Add details later if needed
    }

    // --- Constructor Functions (Optional but good practice) ---

    /// Creates a new BridgeOperation type.
    public fun new_bridge_operation(operation_code: u8): BridgeOperation {
        // Add assertions later to ensure code is valid if needed
        BridgeOperation { code: operation_code }
    }

    /// Creates a new pending BridgeStatus.
    public fun new_pending_status(): BridgeStatus {
        BridgeStatus { code: STATUS_PENDING }
    }

    // Add other shared types here as needed.
    // Example: Configuration struct
    // struct Config has key, store {
    //     id: UID,
    //     fee_basis_points: u16,
    //     admin: address,
    // }

}