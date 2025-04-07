/// Events emitted by the OmniSphere protocol on Sui.
module omnisphere_sui::events {

    use sui::object::{ID};
    use sui::tx_context::{Self, TxContext}; // Import Self as tx_context
    use sui::event;

    /// Emitted when a new liquidity pool is created.
    struct PoolCreated has copy, drop {
        pool_id: ID, // The ID of the newly created Pool object
        creator: address, // Address that created the pool
        token_a_type: vector<u8>, // Type name of token A
        token_b_type: vector<u8>, // Type name of token B
        initial_liquidity_a: u64,
        initial_liquidity_b: u64,
        timestamp_ms: u64,
    }

    /// Emitted when liquidity is added to a pool.
    struct LiquidityAdded has copy, drop {
        pool_id: ID,
        provider: address,
        token_a_added: u64,
        token_b_added: u64,
        // lp_tokens_minted: u64, // Add later when LP tokens are implemented
        timestamp_ms: u64,
    }

    /// Emitted when a cross-chain operation (like creating a pool mirror) is initiated via Wormhole.
    /// This event serves as a signal that a VAA should be expected.
    struct BridgeMessagePublished has copy, drop {
        sender_pool_id: ID, // ID of the pool initiating the message
        target_chain_id: u16, // Wormhole Chain ID of the target chain (e.g., Solana = 1)
        target_address: vector<u8>, // Address on the target chain (e.g., Solana program address or PDA)
        operation_type: u8, // Corresponds to types::BridgeOperation code
        payload: vector<u8>, // The actual data being sent
        sequence: u64, // Wormhole message sequence number
        timestamp_ms: u64,
    }

    // --- Event Emission Functions ---

    public fun emit_pool_created( // Changed to public
        pool_id: ID,
        token_a_type: vector<u8>,
        token_b_type: vector<u8>,
        initial_liquidity_a: u64,
        initial_liquidity_b: u64,
        ctx: &TxContext
    ) {
        event::emit(PoolCreated {
            pool_id,
            creator: tx_context::sender(ctx),
            token_a_type,
            token_b_type,
            initial_liquidity_a,
            initial_liquidity_b,
            timestamp_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }

     public fun emit_liquidity_added( // Changed to public
        pool_id: ID,
        provider: address,
        token_a_added: u64,
        token_b_added: u64,
        ctx: &TxContext
    ) {
        event::emit(LiquidityAdded {
            pool_id,
            provider,
            token_a_added,
            token_b_added,
            timestamp_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    public fun emit_bridge_message_published( // Changed to public
        sender_pool_id: ID,
        target_chain_id: u16,
        target_address: vector<u8>,
        operation_type: u8,
        payload: vector<u8>,
        sequence: u64, // This sequence number comes from the Wormhole publish_message call
        ctx: &TxContext
    ) {
        event::emit(BridgeMessagePublished {
            sender_pool_id,
            target_chain_id,
            target_address,
            operation_type,
            payload,
            sequence,
            timestamp_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }

}
