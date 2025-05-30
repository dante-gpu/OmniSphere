module omnisphere_sui::bridge_interface {

    // === Imports ===
    use sui::object::{ID};
    use sui::tx_context::{TxContext};
    use sui::clock::{Clock}; // Clock object is needed for VAA verification
    use sui::transfer;       // For transferring coins
    use sui::coin::{Coin};   // For Coin type
    use sui::address;        // For address utilities
    use std::vector;
    use std::option::{Self, Option};

    // Wormhole Imports (Must be defined in Move.toml)
    use wormhole::state::{State as WormholeState};
    use wormhole::vaa::{ParsedVAA};
    use wormhole::wormhole::{Self, parse_and_verify_vaa, consume_message};

    // OmniSphere Imports
    use omnisphere_sui::liquidity_pool::{Self, Pool};
    use omnisphere_sui::factory::{Self, Factory}; // Import Factory
    use omnisphere_sui::types::{         // Import necessary operation codes
        OPERATION_ADD_LIQUIDITY,
        OPERATION_REMOVE_LIQUIDITY,
        OPERATION_CREATE_POOL
    };
    use omnisphere_sui::events::{ // Import specific event emitters
        emit_liquidity_removed, emit_vaa_processed
    };
    // use omnisphere_sui::events; // Import if emitting events from here

    // === Constants ===
    const EInvalidVAAPayload: u64 = 101;
    const EInvalidOperationType: u64 = 102;
    const EVAAEmitterMismatch: u64 = 103;
    const EVAAConsumedOrInvalid: u64 = 104;
    const EAddressConversionError: u64 = 105; // Error for address conversion
    const EFactoryMismatch: u64 = 106; // Error if VAA emitter is not the expected factory

    // === Helper Functions ===

    /// Reads a u64 value from a byte vector slice (Big Endian).
    /// Assumes the vector has enough bytes starting from `start_index`.
    fun bytes_to_u64(bytes: &vector<u8>, start_index: u64): u64 {
        // Check bounds in production code if necessary, asserted in calling functions
        let val = 0u64;
        let i = 0;
        while (i < 8) {
            let byte_val = (*vector::borrow(bytes, start_index + i) as u64);
            val = (val << 8) + byte_val;
            i = i + 1;
        };
        val
    }

    /// Reads a Sui address (32 bytes) from a byte vector slice.
    /// Assumes the vector has enough bytes starting from `start_index`.
    fun bytes_to_address(bytes: &vector<u8>, start_index: u64): address {
        // Check bounds in production code if necessary, asserted in calling functions
        let addr_bytes = vector::slice(bytes, start_index, start_index + 32);
        // Use Sui's standard library function for conversion
        address::from_bytes(addr_bytes) // This assumes `address::from_bytes` exists and takes `vector<u8>`
        // If `from_bytes` fails, manual construction might be needed,
        // but standard libraries usually provide this.
    }


    // === Incoming Message Processing ===

    /// Processes a verified Wormhole VAA intended for a specific liquidity pool.
    /// This function is called after verifying the VAA source matches the linked pool.
    /// It parses the payload and dispatches to the appropriate function in `liquidity_pool`.
    public fun process_vaa_for_pool<CoinTypeA, CoinTypeB>(
        vaa_bytes: vector<u8>,
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        // TreasuryCaps needed if processing an ADD_LIQUIDITY operation for wrapped assets
        treasury_cap_a: &TreasuryCap<CoinTypeA>,
        treasury_cap_b: &TreasuryCap<CoinTypeB>,
        wormhole_state: &WormholeState,
        clock: &Clock, // Current time for VAA verification
        ctx: &mut TxContext
    ) {
        // 1. Parse and Verify VAA using Wormhole library
        let parsed_vaa_option: Option<ParsedVAA> = parse_and_verify_vaa(
            wormhole_state,
            clock, // Pass clock for timestamp validation
            vaa_bytes
        );

        assert!(option::is_some(&parsed_vaa_option), EVAAConsumedOrInvalid);
        let vaa = option::destroy_some(parsed_vaa_option);

        // 2. Check Emitter matches the linked address and chain ID stored in the pool
        let (linked_chain, linked_addr_bytes) = liquidity_pool::get_link_info(pool);
        // Convert linked_addr_bytes to address for comparison if necessary, or compare bytes directly
        // Assuming vaa.emitter_address is vector<u8>
        assert!(vaa.emitter_chain_id == linked_chain && vaa.emitter_address == linked_addr_bytes, EVAAEmitterMismatch);

        // 3. Consume Message via Wormhole library to prevent replays
        consume_message(wormhole_state, vaa, ctx); // Pass the owned ParsedVAA

        // 4. Parse Payload from the consumed VAA
        let payload = vaa.payload; // payload is vector<u8>
        let payload_len = vector::length(&payload);
        assert!(payload_len > 0, EInvalidVAAPayload); // Payload must have at least operation type

        let operation_type = *vector::borrow(&payload, 0);

        // 5. Dispatch based on Operation Type defined in `types.move`
        if (operation_type == OPERATION_ADD_LIQUIDITY) {
            // Expected Payload: [op_code(1)] [amount_a(8)] [amount_b(8)] = 17 bytes total
            assert!(payload_len == 17, EInvalidVAAPayload);
            let amount_a = bytes_to_u64(&payload, 1); // Read amount_a from index 1
            let amount_b = bytes_to_u64(&payload, 9); // Read amount_b from index 9

            // Call the corresponding function in the liquidity pool module
            // This function needs `public(friend)` visibility in liquidity_pool.move
            liquidity_pool::add_liquidity_from_remote(
                pool,
                amount_a,
                amount_b,
                treasury_cap_a, // Pass the cap
                treasury_cap_b, // Pass the cap
                ctx
            );
            // TODO: Emit AddLiquidityProcessed event?
            // Emit VAAProcessed event
            emit_vaa_processed(pool_id, operation_type, &vaa, ctx);

        } else if (operation_type == OPERATION_REMOVE_LIQUIDITY) {
            // Expected Payload: [op_code(1)] [amount_a(8)] [amount_b(8)] [recipient_on_sui(32)] = 49 bytes total
            assert!(payload_len == 49, EInvalidVAAPayload);
            let amount_a = bytes_to_u64(&payload, 1);       // Read amount_a from index 1
            let amount_b = bytes_to_u64(&payload, 9);       // Read amount_b from index 9
            let recipient_on_sui = bytes_to_address(&payload, 17); // Read recipient Sui address from index 17

            // Call the corresponding function in the liquidity pool module
            // This function needs `public(friend)` visibility and returns the coins
            let (coin_a_removed, coin_b_removed) = liquidity_pool::remove_liquidity_for_remote(
                pool,
                amount_a,
                amount_b,
                ctx
            );

            // Transfer the removed coins to the recipient specified in the VAA payload
            transfer::public_transfer(coin_a_removed, recipient_on_sui);
            transfer::public_transfer(coin_b_removed, recipient_on_sui);

            // TODO: Emit RemoteLiquidityFulfilled event?
            // Emit LiquidityRemoved and VAAProcessed events
            emit_liquidity_removed(pool_id, recipient_on_sui, amount_a, amount_b, &vaa, ctx);
            emit_vaa_processed(pool_id, operation_type, &vaa, ctx);

        } else {
            // Abort if the operation type is unknown or unsupported
            abort EInvalidOperationType
        };

        // TODO: Emit a generic VAAProcessed event including sequence number, etc.?
        // Done above within specific operation blocks
    }

    /// Processes a verified Wormhole VAA intended for the Factory (e.g., to create a new pool).
    /// Verifies the emitter is a known/trusted remote factory address.
    public fun process_vaa_for_factory<CoinTypeA, CoinTypeB>(
        vaa_bytes: vector<u8>,
        factory: &Factory,         // Pass the shared Factory object
        // Required TreasuryCaps to initialize the pool with zero coins
        treasury_cap_a: &TreasuryCap<CoinTypeA>,
        treasury_cap_b: &TreasuryCap<CoinTypeB>,
        wormhole_state: &WormholeState, // Needed for linking back
        clock: &Clock,
        link_message_fee: Coin<SUI>, // Needed for linking back
        // TODO: Define expected remote factory address/chain based on CoinTypeA/B or other logic
        // This likely needs configuration stored within the Factory object itself.
        expected_remote_chain_id: u16,
        expected_remote_factory_address: vector<u8>,
        ctx: &mut TxContext
    ) {
        // 1. Parse and Verify VAA
        let parsed_vaa_option: Option<ParsedVAA> = parse_and_verify_vaa(
            wormhole_state, clock, vaa_bytes
        );
        assert!(option::is_some(&parsed_vaa_option), EVAAConsumedOrInvalid);
        let vaa = option::destroy_some(parsed_vaa_option);

        // 2. Check Emitter matches the *expected* remote factory address and chain
        assert!(vaa.emitter_chain_id == expected_remote_chain_id &&
                vaa.emitter_address == expected_remote_factory_address,
                EFactoryMismatch);

        // 3. Consume Message
        consume_message(wormhole_state, vaa, ctx); // Pass the owned ParsedVAA

        // 4. Parse Payload
        let payload = vaa.payload;
        let payload_len = vector::length(&payload);
        assert!(payload_len > 0, EInvalidVAAPayload);
        let operation_type = *vector::borrow(&payload, 0);

        // 5. Ensure operation is CREATE_POOL
        assert!(operation_type == OPERATION_CREATE_POOL, EInvalidOperationType);

        // TODO: Extract necessary parameters for pool creation from the payload.
        // Assuming Payload: [op_code(1)] [source_link_address(32)] = 33 bytes
        assert!(payload_len == 33, EInvalidVAAPayload);
        let source_link_address = vector::slice(&payload, 1, 33);

        // 6. Call Factory function to create and link the pool
        let new_pool = factory::create_pool_from_vaa<CoinTypeA, CoinTypeB>(
            factory,
            treasury_cap_a, // Pass the cap
            treasury_cap_b, // Pass the cap
            vaa.emitter_chain_id,      // Source chain from VAA
            vaa.emitter_address,       // Source factory address from VAA
            source_link_address,       // Source pool address from Payload
            wormhole_state,            // Wormhole state for linking
            link_message_fee,          // Fee for linking message
            ctx
        );

        // 7. Share the newly created and linked pool
        transfer::share_object(new_pool);

        // TODO: Emit VAAProcessed event for factory operation?
        // emit_vaa_processed(object::id_from_uid(&factory.id), operation_type, &vaa, ctx);
    }

    // TODO: Implement function to process VAAs for creating *new* mirror pools.
    // This function would likely not take a `Pool` object as input but rather interact
    // with a factory or registry to create a new pool based on VAA data.
    // It would need separate VAA verification logic if the emitter is a known factory address.
    // --> This is now handled by `process_vaa_for_factory`
}