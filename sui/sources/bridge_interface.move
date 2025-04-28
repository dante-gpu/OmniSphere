module omnisphere_sui::bridge_interface {

    // Imports... (mevcutları koruyun)
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::vector;
    use sui::clock::{Self, Clock};
    use sui::transfer;
    use sui::coin::{Coin};
    use std::option::{Self, Option};

    use omnisphere_sui::liquidity_pool::{Self, Pool};
    // use omnisphere_sui::types::{Self, BridgeOperation}; // Artık bu modülde kullanılmıyor gibi
    use omnisphere_sui::events;
    use wormhole::state::{State as WormholeState};
    use wormhole::vaa::{ParsedVAA};
    use wormhole::wormhole::{Self, parse_and_verify_vaa, consume_message};

    // === Constants ===
    const EInvalidVAAPayload: u64 = 101;
    const EInvalidOperationType: u64 = 102;
    const EVAAEmitterMismatch: u64 = 103;
    const EVAAConsumedOrInvalid: u64 = 104;

    // --- Public Functions ---

    public fun publish_create_pool_message<CoinTypeA, CoinTypeB>(
        pool: &Pool<CoinTypeA, CoinTypeB>,
        target_chain_id: u16,
        target_program_address: vector<u8>,
        ctx: &mut TxContext
    ) {
        // --- Simulation Only ---
        let simulated_sequence = (tx_context::epoch_timestamp_ms(ctx) % 10000u64);
        let payload = vector::empty<u8>();
        // let pool_id = liquidity_pool::get_pool_id(pool); // Getter kullan

        // Note: The operation_type '0' (CreatePoolMirror) is hardcoded here.
        events::emit_bridge_message_published(
            liquidity_pool::get_pool_id(pool), // Getter kullan
            target_chain_id,
            target_program_address,
            0u8, // CreatePoolMirror operation code (example)
            payload,
            simulated_sequence,
            ctx
        );
    }

    // TODO: Add functions for other bridge operations (e.g., handling incoming messages) here later.

    // === Helper Functions ===

    /// Reads a u64 value from a byte vector slice (Big Endian).
    fun bytes_to_u64(bytes: &vector<u8>, start_index: u64): u64 {
        assert!(vector::length(bytes) >= (start_index + 8) as u64, 0); // Ensure enough bytes
        let val = 0u64;
        let i = 0;
        while (i < 8) {
            let byte_val = (vector::borrow(bytes, start_index + i) as u64);
            val = (val << 8) + byte_val;
            i = i + 1;
        };
        val
    }

    /// Reads an address (32 bytes) from a byte vector slice.
    fun bytes_to_address(bytes: &vector<u8>, start_index: u64): address {
        assert!(vector::length(bytes) >= (start_index + 32) as u64, 0); // Ensure enough bytes
        let addr_bytes = vector::empty<u8>();
        let i = 0;
        while (i < 32) {
            vector::push_back(&mut addr_bytes, *vector::borrow(bytes, start_index + i));
            i = i + 1;
        };
        // Assuming a function exists to convert vector<u8> to address.
        // If not, this part needs adjustment based on Sui's address representation.
        // For demonstration, let's assume direct conversion is possible or a std lib function exists.
        // Placeholder: Replace with actual conversion logic if needed.
        @0x0 // Placeholder, replace with actual conversion
        // Example using a hypothetical function: std::address::from_bytes(addr_bytes)
    }

    // === Incoming Message Processing ===

    /// Processes a verified Wormhole VAA intended for a specific liquidity pool.
    /// This function assumes the VAA is targeted at an *existing, linked* pool.
    public fun process_vaa_for_pool<CoinTypeA, CoinTypeB>(
        vaa_bytes: vector<u8>,
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        wormhole_state: &WormholeState,
        clock: &Clock, // Current time for VAA verification
        ctx: &mut TxContext
    ) {
        // 1. Parse and Verify VAA
        // The clock object is passed to check against the VAA timestamp if necessary.
        let parsed_vaa_option: Option<ParsedVAA> = parse_and_verify_vaa(
            wormhole_state,
            clock,
            vaa_bytes
        );

        assert!(option::is_some(&parsed_vaa_option), EVAAConsumedOrInvalid);
        let vaa = option::destroy_some(parsed_vaa_option);

        // 2. Check Emitter matches linked address/chain
        let (linked_chain, linked_addr) = liquidity_pool::get_link_info(pool);
        assert!(vaa.emitter_chain_id == linked_chain && vaa.emitter_address == linked_addr, EVAAEmitterMismatch);

        // 3. Consume Message to prevent replays
        // This function should mark the VAA as processed in Wormhole's state.
        consume_message(wormhole_state, vaa, ctx); // Pass the owned vaa

        // 4. Parse Payload
        let payload = vaa.payload; // Payload is typically vector<u8>
        let payload_len = vector::length(&payload);
        assert!(payload_len > 0, EInvalidVAAPayload);

        let operation_type = *vector::borrow(&payload, 0);

        // 5. Dispatch based on Operation Type
        if (operation_type == OPERATION_ADD_LIQUIDITY) {
            // Expected Payload: [op_code(1)] [amount_a(8)] [amount_b(8)] = 17 bytes
            assert!(payload_len == 17, EInvalidVAAPayload);
            let amount_a = bytes_to_u64(&payload, 1);
            let amount_b = bytes_to_u64(&payload, 9);

            // Call the liquidity pool function (needs to be added)
            liquidity_pool::add_liquidity_from_remote(pool, amount_a, amount_b, ctx);

        } else if (operation_type == OPERATION_REMOVE_LIQUIDITY) {
            // Expected Payload: [op_code(1)] [amount_a(8)] [amount_b(8)] [recipient(32)] = 49 bytes
            assert!(payload_len == 49, EInvalidVAAPayload);
            let amount_a = bytes_to_u64(&payload, 1);
            let amount_b = bytes_to_u64(&payload, 9);
            let recipient_on_sui = bytes_to_address(&payload, 17); // Assuming 32-byte address

            // Call the liquidity pool function (needs to be added)
            let (coin_a_removed, coin_b_removed) = liquidity_pool::remove_liquidity_for_remote(
                pool,
                amount_a,
                amount_b,
                ctx
            );

            // Transfer the removed coins to the recipient specified in the VAA
            transfer::public_transfer(coin_a_removed, recipient_on_sui);
            transfer::public_transfer(coin_b_removed, recipient_on_sui);

            // TODO: Emit an event for successful remote liquidity removal fulfillment

        } else {
            // Unknown operation type
            abort EInvalidOperationType
        };

        // TODO: Emit a generic VAAProcessed event?
    }

    // TODO: Add function to process VAAs for creating *new* mirror pools,
    // which wouldn't target an existing pool object directly. This might
    // require interaction with a factory or registry pattern.
}