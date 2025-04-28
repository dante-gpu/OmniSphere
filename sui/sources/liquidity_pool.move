/// Core liquidity pool logic for OmniSphere on Sui.
module omnisphere_sui::liquidity_pool {

    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance, supply as balance_supply};
    // use sui::event; // Using events module
    use sui::sui::SUI;

    use std::type_name::{Self, get as get_type_name, TypeName};
    use std::vector;
    use std::option::{Self, Option};
    use std::intrinsics; // abort için

    // === Wormhole Imports ===
    // Move.toml must define 'wormhole' address and Wormhole dependency!
    use wormhole::state::{Self as WormholeState};
    use wormhole::wormhole;

    // === Other Modules ===
    use omnisphere_sui::types::{Self, PoolStatus, new_active_status, is_active as pool_is_active,
                               OPERATION_ADD_LIQUIDITY, OPERATION_REMOVE_LIQUIDITY};
    use omnisphere_sui::events::{
        emit_pool_created, emit_liquidity_added, emit_pool_linked,
        emit_liquidity_removal_requested
    };

    // --- Constants ---
    const ENotAdmin: u64 = 1;
    const EPoolNotActive: u64 = 3;
    const EPoolNotLinked: u64 = 4;
    const EInsufficientLiquidity: u64 = 5;
    const ETransferFailed: u64 = 6; // Transfer hatası için
    const EArithmeticError: u64 = 7; // Aritmetik taşma vb.

    // --- Structs ---
    struct Pool<phantom CoinTypeA, phantom CoinTypeB> has key, store {
        id: UID,
        admin: address,
        reserve_a: Balance<CoinTypeA>,
        reserve_b: Balance<CoinTypeB>,
        status: PoolStatus,
        linked_chain_id: u16,
        linked_address: vector<u8>,
    }

    // --- Helper Functions ---

    /// Pads a vector with leading zeros or truncates to exactly 32 bytes (Simplified Implementation).
    fun pad_vector_to_32(v: vector<u8>): vector<u8> {
        let len = vector::length(&v);
        // Create a new vector of 32 zeros
        let output_vector = vector::empty<u8>();
        let i = 0;
        while (i < 32) {
            vector::push_back(&mut output_vector, 0u8);
            i = i + 1;
        };

        // Determine the starting index for copying from input vector 'v'
        let copy_len = if (len > 32) { 32 } else { len }; // Copy at most 32 bytes
        let src_start_index = if (len > 32) { len - 32 } else { 0 }; // Start from beginning if < 32, else from end
        let dest_start_index = 32 - copy_len; // Where to start writing in output_vector (right-aligned)

        // Copy the relevant bytes from 'v' to 'output_vector'
        let j = 0;
        while (j < copy_len) {
            let src_index = src_start_index + j;
            let dest_index = dest_start_index + j;
            let byte = *vector::borrow(&v, src_index);
            // Replace the zero at dest_index with the byte from v
            *vector::borrow_mut(&mut output_vector, dest_index) = byte;
            j = j + 1;
        };

        output_vector
    }

    /// Converts u64 to vector<u8> (Big Endian).
    fun u64_to_bytes(val: u64): vector<u8> {
        let bytes = vector::empty<u8>();
        let i = 0;
        while (i < 8) {
            // Shift right to get the most significant byte first for Big Endian
            let byte = ((val >> (56 - i * 8)) & 0xFF) as u8;
            vector::push_back(&mut bytes, byte);
            i = i + 1;
        };
        bytes
    }

    /// Converts address to vector<u8> (assuming 32 bytes).
    fun address_to_bytes(addr: address): vector<u8> {
        // Placeholder: Replace with actual Sui SDK function if available
        // This is a simplification; actual conversion might be different.
        let bytes = vector::empty<u8>();
        let i = 0;
        while (i < 32) {
            // Fill with zeros as a placeholder
            vector::push_back(&mut bytes, 0u8);
            i = i + 1;
        };
        // Ideally, use something like: sui::address::to_bytes(addr)
        bytes
    }

    // --- Public Functions ---

    /// Creates a new liquidity pool and shares it.
    public fun create_pool<CoinTypeA, CoinTypeB>(
        coin_a: Coin<CoinTypeA>,
        coin_b: Coin<CoinTypeB>,
        ctx: &mut TxContext
    ) {
        // ... (Implementation unchanged) ...
        let creator = tx_context::sender(ctx);
        let reserve_a_balance = coin::into_balance(coin_a);
        let reserve_b_balance = coin::into_balance(coin_b);
        let initial_liquidity_a = balance::value(&reserve_a_balance);
        let initial_liquidity_b = balance::value(&reserve_b_balance);

        let pool = Pool<CoinTypeA, CoinTypeB> {
            id: object::new(ctx),
            admin: creator,
            reserve_a: reserve_a_balance,
            reserve_b: reserve_b_balance,
            status: new_active_status(),
            linked_chain_id: 0,
            linked_address: vector::empty<u8>(),
        };

        events::emit_pool_created(
            object::uid_to_inner(&pool.id),
            get_type_name<CoinTypeA>(),
            get_type_name<CoinTypeB>(),
            initial_liquidity_a,
            initial_liquidity_b,
            ctx
        );
        transfer::share_object(pool);
    }

    /// Adds liquidity to an existing pool.
    public fun add_liquidity<CoinTypeA, CoinTypeB>(
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        coin_a: Coin<CoinTypeA>,
        coin_b: Coin<CoinTypeB>,
        ctx: &mut TxContext
    ) {
        // ... (Implementation unchanged) ...
         assert!(pool_is_active(&pool.status), EPoolNotActive);

        let amount_a_added = coin::value(&coin_a);
        let amount_b_added = coin::value(&coin_b);

        let balance_a = coin::into_balance(coin_a);
        balance::join(&mut pool.reserve_a, balance_a);

        let balance_b = coin::into_balance(coin_b);
        balance::join(&mut pool.reserve_b, balance_b);

        events::emit_liquidity_added(
            object::uid_to_inner(&pool.id),
            tx_context::sender(ctx),
            amount_a_added,
            amount_b_added,
            ctx
        );
    }

    /// Adds liquidity provided from a remote chain via VAA.
    /// Internal function called by the bridge interface after VAA verification.
    public(friend) fun add_liquidity_from_remote<CoinTypeA, CoinTypeB>(
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        amount_a: u64,
        amount_b: u64,
        // TODO: Pass TreasuryCap<CoinTypeA> and TreasuryCap<CoinTypeB> if needed for minting wrapped assets.
        // Alternatively, the bridge/pool might hold these capabilities.
        ctx: &mut TxContext // Context is needed for events
    ) {
        assert!(pool_is_active(&pool.status), EPoolNotActive);

        // --- Real Token Handling (Placeholder) ---
        // 1. Determine if CoinTypeA/CoinTypeB are wrapped assets requiring minting.
        // 2. If minting is required, use the appropriate TreasuryCap to mint Coins.
        //    Example (requires TreasuryCap passed or held by contract):
        //    let coin_a_minted: Coin<CoinTypeA> = coin::mint_and_transfer(treasury_cap_a, amount_a, recipient, ctx);
        //    let coin_b_minted: Coin<CoinTypeB> = coin::mint_and_transfer(treasury_cap_b, amount_b, recipient, ctx);
        //    let balance_a = coin::into_balance(coin_a_minted);
        //    let balance_b = coin::into_balance(coin_b_minted);
        // 3. If tokens are unlocked from escrow (another pattern), implement that logic.

        // --- Current Simplified Implementation (Using balance::increase_supply) ---
        // WARNING: This is NOT production-ready without proper token handling.
        // It assumes the balances can be artificially inflated for demonstration.
        balance::increase_supply(&mut pool.reserve_a, amount_a); // Needs supply capability held by the Balance itself
        balance::increase_supply(&mut pool.reserve_b, amount_b); // Needs supply capability held by the Balance itself
        // --- End Simplified Implementation ---

        // Join the actual balances (minted/unlocked) to the pool
        // balance::join(&mut pool.reserve_a, balance_a);
        // balance::join(&mut pool.reserve_b, balance_b);

        // Emit event (Consider adding VAA details like sequence number)
        events::emit_liquidity_added(
            object::uid_to_inner(&pool.id),
            @0x0, // Placeholder: Use a designated bridge address or parse from VAA if needed
            amount_a,
            amount_b,
            ctx
        );
    }

    /// Removes liquidity from the pool to be sent to a remote chain.
    /// Internal function called by the bridge interface after VAA verification.
    /// Returns the Coin objects to be transferred to the recipient.
    public(friend) fun remove_liquidity_for_remote<CoinTypeA, CoinTypeB>(
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        amount_a_to_remove: u64,
        amount_b_to_remove: u64,
        _ctx: &mut TxContext // Context might be needed for future logic/events
    ): (Coin<CoinTypeA>, Coin<CoinTypeB>) {
        assert!(pool_is_active(&pool.status), EPoolNotActive);

        let current_reserve_a = balance::value(&pool.reserve_a);
        let current_reserve_b = balance::value(&pool.reserve_b);

        assert!(current_reserve_a >= amount_a_to_remove, EInsufficientLiquidity);
        assert!(current_reserve_b >= amount_b_to_remove, EInsufficientLiquidity);

        // Withdraw the specified amounts from the pool reserves
        let coin_a = coin::take(&mut pool.reserve_a, amount_a_to_remove, _ctx);
        let coin_b = coin::take(&mut pool.reserve_b, amount_b_to_remove, _ctx);

        // TODO: Emit LiquidityRemoved event if necessary
        // Event emission moved to bridge_interface after successful transfer

        (coin_a, coin_b)
    }

    /// Initiates a request to remove liquidity and send it to the linked remote chain.
    /// Publishes a Wormhole message containing the amounts and recipient.
    public fun request_remove_liquidity<CoinTypeA, CoinTypeB>(
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        amount_a_to_remove: u64,
        amount_b_to_remove: u64,
        recipient_on_remote: vector<u8>, // Recipient address on the target chain (e.g., Solana pubkey)
        wormhole_state: &WormholeState,
        message_fee: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(pool_is_active(&pool.status), EPoolNotActive);
        assert!(pool.linked_chain_id != 0, EPoolNotLinked); // Ensure pool is linked

        let current_reserve_a = balance::value(&pool.reserve_a);
        let current_reserve_b = balance::value(&pool.reserve_b);

        assert!(current_reserve_a >= amount_a_to_remove, EInsufficientLiquidity);
        assert!(current_reserve_b >= amount_b_to_remove, EInsufficientLiquidity);

        // Note: We don't actually remove liquidity here. We just publish the message.
        // The liquidity will be removed on the Sui side *only* when the corresponding
        // VAA for this removal request is processed by process_vaa_for_pool.
        // This prevents locking funds before the cross-chain message is confirmed.

        // Construct Payload for Wormhole message:
        // [op_code(1)] [amount_a(8)] [amount_b(8)] [recipient(variable)]
        let mut payload = vector::empty<u8>();
        vector::push_back(&mut payload, OPERATION_REMOVE_LIQUIDITY);
        vector::append(&mut payload, u64_to_bytes(amount_a_to_remove));
        vector::append(&mut payload, u64_to_bytes(amount_b_to_remove));
        vector::append(&mut payload, recipient_on_remote); // Append recipient address

        // Publish Wormhole Message
        let consistency_level = 1; // Finalized
        wormhole::publish_message(
            wormhole_state,
            message_fee,
            payload,
            consistency_level,
            ctx
        );

        // TODO: Emit LiquidityRemovalRequested event
        // events::emit_liquidity_removal_requested(...);
        // Emit the event
        emit_liquidity_removal_requested(
            object::uid_to_inner(&pool.id),
            tx_context::sender(ctx),
            amount_a_to_remove,
            amount_b_to_remove,
            pool.linked_chain_id,
            recipient_on_remote,
            // TODO: Pass Wormhole sequence number if publish_message returns it
            ctx
        );
    }

    /// Links the pool to a remote pool and publishes a Wormhole message. (REAL IMPLEMENTATION)
    public fun link_and_publish<CoinTypeA, CoinTypeB>(
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        remote_chain_id: u16,
        remote_address: vector<u8>,
        wormhole_state: &WormholeState, // Input: Wormhole State object
        message_fee: Coin<SUI>,      // Input: Fee coin
        ctx: &mut TxContext
    ) {
        // 1. Auth Check
        let sender = tx_context::sender(ctx);
        assert!(sender == pool.admin, ENotAdmin);

        // 2. Pad Remote Address using the simplified function
        let remote_address_padded = pad_vector_to_32(remote_address);

        // 3. Update Pool State
        pool.linked_chain_id = remote_chain_id;
        pool.linked_address = remote_address_padded;

        // 4. Prepare Payload (Local Pool ID)
        let pool_id_bytes = object::id_to_bytes(object::uid_as_inner(&pool.id));
        let payload = pad_vector_to_32(pool_id_bytes);

        // 5. Publish Wormhole Message (Using Parameters)
        let consistency_level = 1; // Finalized

        // *** VERIFY wormhole::publish_message SIGNATURE for your Wormhole lib version ***
        wormhole::publish_message(
            wormhole_state,     // Pass the state object
            message_fee,        // Pass the fee coin
            payload,            // Pass the payload
            consistency_level,  // Pass the consistency level
            ctx                 // Pass the context
        );
        // NOTE: Check if nonce is required as an explicit argument.

        // 6. Emit Event
        events::emit_pool_linked(
             object::uid_to_inner(&pool.id),
             remote_chain_id,
             pool.linked_address, // Use the padded address stored in pool
             ctx
        );
    }

    // --- View Functions ---
    // ... (Unchanged) ...
     public fun get_reserves<CoinTypeA, CoinTypeB>(pool: &Pool<CoinTypeA, CoinTypeB>): (u64, u64) {
        (balance::value(&pool.reserve_a), balance::value(&pool.reserve_b))
    }
    public fun get_status<CoinTypeA, CoinTypeB>(pool: &Pool<CoinTypeA, CoinTypeB>): PoolStatus {
        pool.status
    }
    public fun get_pool_id<CoinTypeA, CoinTypeB>(pool: &Pool<CoinTypeA, CoinTypeB>): ID {
        object::uid_to_inner(&pool.id)
    }
    public fun get_admin<CoinTypeA, CoinTypeB>(pool: &Pool<CoinTypeA, CoinTypeB>): address {
        pool.admin
    }
    public fun get_link_info<CoinTypeA, CoinTypeB>(pool: &Pool<CoinTypeA, CoinTypeB>): (u16, vector<u8>) {
        (pool.linked_chain_id, pool.linked_address)
    }
}