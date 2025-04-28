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
    use omnisphere_sui::types::{         // Import necessary operation codes
        OPERATION_ADD_LIQUIDITY,
        OPERATION_REMOVE_LIQUIDITY
    };
    // use omnisphere_sui::events; // Import if emitting events from here

    // === Constants ===
    const EInvalidVAAPayload: u64 = 101;
    const EInvalidOperationType: u64 = 102;
    const EVAAEmitterMismatch: u64 = 103;
    const EVAAConsumedOrInvalid: u64 = 104;
    const EAddressConversionError: u64 = 105; // Error for address conversion

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
            liquidity_pool::add_liquidity_from_remote(pool, amount_a, amount_b, ctx);
            // TODO: Emit AddLiquidityProcessed event?

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

        } else {
            // Abort if the operation type is unknown or unsupported
            abort EInvalidOperationType
        };

        // TODO: Emit a generic VAAProcessed event including sequence number, etc.?
    }

    // TODO: Implement function to process VAAs for creating *new* mirror pools.
    // This function would likely not take a `Pool` object as input but rather interact
    // with a factory or registry to create a new pool based on VAA data.
    // It would need separate VAA verification logic if the emitter is a known factory address.
}