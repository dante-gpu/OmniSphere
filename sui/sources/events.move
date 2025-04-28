/// Events emitted by the OmniSphere protocol on Sui.
module omnisphere_sui::events {

    use sui::object::{ID};
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::type_name::{TypeName};
    use std::vector;
    use wormhole::vaa::{ParsedVAA}; // Needed for VAAProcessed event

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
        timestamp_ms: u64,
    }


    /// Emitted when a pool is linked to a remote chain pool.
    struct PoolLinked has copy, drop {
        pool_id: ID,
        remote_chain_id: u16,
        remote_address: vector<u8>, // 32-byte padded address
        timestamp_ms: u64,
    }

    /// Emitted when a user requests to remove liquidity to send to a remote chain.
    struct LiquidityRemovalRequested has copy, drop {
        pool_id: ID,
        requester: address, // Address initiating the request on Sui
        amount_a_requested: u64,
        amount_b_requested: u64,
        target_chain_id: u16,
        recipient_on_remote: vector<u8>,
        timestamp_ms: u64,
    }

    /// Emitted when liquidity is actually removed from the pool based on a VAA.
    struct LiquidityRemoved has copy, drop {
        pool_id: ID,
        recipient_on_sui: address, // Address receiving funds on Sui
        amount_a_removed: u64,
        amount_b_removed: u64,
        source_chain_id: u16,   // VAA source chain
        vaa_sequence: u64,        // VAA sequence number
        timestamp_ms: u64,
    }

    /// Generic event emitted after a VAA has been successfully processed.
    struct VAAProcessed has copy, drop {
        pool_id: ID, // Pool the VAA was processed for
        emitter_chain_id: u16,
        emitter_address: vector<u8>,
        vaa_sequence: u64,
        operation_type: u8, // The operation code from the payload
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
        operation_type: u8, payload: vector<u8>,
        ctx: &TxContext
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

    /// Emits the LiquidityRemovalRequested event.
    public fun emit_liquidity_removal_requested(
        pool_id: ID,
        requester: address,
        amount_a_requested: u64,
        amount_b_requested: u64,
        target_chain_id: u16,
        recipient_on_remote: vector<u8>,
        ctx: &TxContext
    ) {
        event::emit(LiquidityRemovalRequested {
            pool_id,
            requester,
            amount_a_requested,
            amount_b_requested,
            target_chain_id,
            recipient_on_remote,
            timestamp_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Emits the LiquidityRemoved event.
    public fun emit_liquidity_removed(
        pool_id: ID,
        recipient_on_sui: address,
        amount_a_removed: u64,
        amount_b_removed: u64,
        vaa: &ParsedVAA, // Pass the parsed VAA to get source info
        ctx: &TxContext
    ) {
        event::emit(LiquidityRemoved {
            pool_id,
            recipient_on_sui,
            amount_a_removed,
            amount_b_removed,
            source_chain_id: vaa.emitter_chain_id,
            vaa_sequence: vaa.sequence,
            timestamp_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Emits the VAAProcessed event.
    public fun emit_vaa_processed(
        pool_id: ID,
        operation_type: u8,
        vaa: &ParsedVAA, // Pass the parsed VAA
        ctx: &TxContext
    ) {
        event::emit(VAAProcessed {
            pool_id,
            emitter_chain_id: vaa.emitter_chain_id,
            emitter_address: vaa.emitter_address, // emitter_address is vector<u8>
            vaa_sequence: vaa.sequence,
            operation_type,
            timestamp_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }
}