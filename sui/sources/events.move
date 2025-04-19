/// Events emitted by the OmniSphere protocol on Sui.
module omnisphere_sui::events {

    use sui::object::{ID};
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::type_name::{TypeName};
    use std::vector;

    // ... (PoolCreated, LiquidityAdded, BridgeMessagePublished structları önceki ile aynı) ...
     struct PoolCreated has copy, drop {
        pool_id: ID,
        creator: address,
        token_a_type: TypeName,
        token_b_type: TypeName,
        initial_liquidity_a: u64,
        initial_liquidity_b: u64,
        timestamp_ms: u64,
    }
    struct LiquidityAdded has copy, drop {
        pool_id: ID,
        provider: address,
        token_a_added: u64,
        token_b_added: u64,
        timestamp_ms: u64,
    }
    struct BridgeMessagePublished has copy, drop {
        sender_pool_id: ID,
        target_chain_id: u16,
        target_address: vector<u8>,
        operation_type: u8,
        payload: vector<u8>,
        sequence: u64,
        timestamp_ms: u64,
    }


    /// Emitted when a pool is linked to a remote chain pool.
    struct PoolLinked has copy, drop {
        pool_id: ID,
        remote_chain_id: u16,
        remote_address: vector<u8>, // 32-byte padded address
        timestamp_ms: u64,
    }

    // --- Event Emission Functions ---
    // ... (emit_pool_created, emit_liquidity_added, emit_bridge_message_published önceki ile aynı) ...
    public fun emit_pool_created(
        pool_id: ID,
        token_a_type: TypeName,
        token_b_type: TypeName,
        initial_liquidity_a: u64,
        initial_liquidity_b: u64,
        ctx: &TxContext
    ) { /* ... */ event::emit(/* ... */); }

     public fun emit_liquidity_added(
        pool_id: ID,
        provider: address,
        token_a_added: u64,
        token_b_added: u64,
        ctx: &TxContext
    ) { /* ... */ event::emit(/* ... */); }

    public fun emit_bridge_message_published(
        sender_pool_id: ID, target_chain_id: u16, target_address: vector<u8>,
        operation_type: u8, payload: vector<u8>, sequence: u64, ctx: &TxContext
    ) { /* ... */ event::emit(/* ... */); }

    /// Emits the PoolLinked event.
    public fun emit_pool_linked(
        pool_id: ID,
        remote_chain_id: u16,
        remote_address: vector<u8>,
        ctx: &TxContext
    ) {
        event::emit(PoolLinked {
            pool_id,
            remote_chain_id,
            remote_address,
            timestamp_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }
}