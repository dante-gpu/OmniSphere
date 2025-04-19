/// Core liquidity pool logic for OmniSphere on Sui.
module omnisphere_sui::liquidity_pool {

    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::event; // events modülümüzü kullanıyoruz
    use sui::sui::SUI;

    use std::type_name::{Self, get as get_type_name, TypeName};
    use std::vector;
    use std::option::{Self, Option};

    // === Wormhole Imports ===
    use wormhole::state::{Self as WormholeState}; // Wormhole State object tipi
    use wormhole::wormhole; // publish_message vb. fonksiyonlar

    // === Diğer Modüller ===
    use omnisphere_sui::types::{Self, PoolStatus, new_active_status};
    use omnisphere_sui::events;

    // --- Constants ---
    const ENotAdmin: u64 = 1;
    const EInvalidRemoteAddressLength: u64 = 2;
    const EPoolNotActive: u64 = 3;

    // --- Structs ---

    /// Represents a liquidity pool for a pair of tokens.
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

    /// Pads a vector with leading zeros (or truncates) to reach the target length (32).
    fun pad_vector_to_32(v: vector<u8>): vector<u8> {
        // ... (Önceki cevaptaki implementasyon) ...
        let len = vector::length(&v);
        if (len == 32) {
            v
        } else if (len < 32) {
            let mut padded = vector::empty<u8>();
            let diff = 32 - len;
            let i = 0;
            while (i < diff) {
                vector::push_back(&mut padded, 0u8);
                i = i + 1;
            };
            vector::append(&mut padded, v);
            padded
        } else { // len > 32
            let mut truncated = vector::empty<u8>();
            let start = len - 32;
            let i = start;
            while (i < len) {
                vector::push_back(&mut truncated, *vector::borrow(&v, i));
                i = i + 1;
            };
            truncated
        }
    }


    // --- Public Functions ---

    /// Creates a new liquidity pool and shares it.
    public fun create_pool<CoinTypeA, CoinTypeB>(
        coin_a: Coin<CoinTypeA>,
        coin_b: Coin<CoinTypeB>,
        ctx: &mut TxContext
    ) {
        // ... (Önceki cevaptaki implementasyon - admin ayarlanıyor) ...
        let creator = tx_context::sender(ctx);
        let reserve_a_balance = coin::into_balance(coin_a);
        let reserve_b_balance = coin::into_balance(coin_b);
        let initial_liquidity_a = balance::value(&reserve_a_balance);
        let initial_liquidity_b = balance::value(&reserve_b_balance);

        let pool = Pool<CoinTypeA, CoinTypeB> {
            id: object::new(ctx),
            admin: creator, // Set creator as admin
            reserve_a: reserve_a_balance,
            reserve_b: reserve_b_balance,
            status: new_active_status(),
            linked_chain_id: 0, // Initially not linked
            linked_address: vector::empty<u8>(), // Initially not linked
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
        // ... (Önceki cevaptaki implementasyon) ...
         assert!(pool.status.is_active, EPoolNotActive);

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

    /// Links the pool to a remote pool and publishes a Wormhole message. (REAL IMPLEMENTATION)
    public fun link_and_publish<CoinTypeA, CoinTypeB>(
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        remote_chain_id: u16,
        remote_address: vector<u8>,
        wormhole_state: &WormholeState, // Get the Wormhole State object as input
        message_fee: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // 1. Auth Check
        let sender = tx_context::sender(ctx);
        assert!(sender == pool.admin, ENotAdmin);

        // 2. Pad Remote Address
        let remote_address_padded = pad_vector_to_32(remote_address);

        // 3. Update Pool State
        pool.linked_chain_id = remote_chain_id;
        pool.linked_address = remote_address_padded;

        // 4. Prepare Payload (Local Pool ID)
        let pool_id_bytes = object::id_to_bytes(object::uid_as_inner(&pool.id));
        let payload = pad_vector_to_32(pool_id_bytes);

        // 5. Publish Wormhole Message (REAL CALL)
        let consistency_level = 1; // Finalized

        // *** VERIFY wormhole::publish_message SIGNATURE ***
        // Ensure the function signature matches the Wormhole library version in your Move.toml
        wormhole::publish_message(
            wormhole_state,
            message_fee,
            payload,
            consistency_level,
            ctx
        );
        // Check if your Wormhole version requires nonce as an argument. If so:
        // let nonce = wormhole::next_sequence(wormhole_state);
        // wormhole::publish_message(wormhole_state, message_fee, payload, nonce, consistency_level, ctx);

        // 6. Emit Event
        events::emit_pool_linked(
             object::uid_to_inner(&pool.id),
             remote_chain_id,
             pool.linked_address, // Use padded address
             ctx
        );
    }

    // --- View Functions ---
    // ... (get_reserves, get_status, get_pool_id, get_admin, get_link_info - önceki ile aynı) ...
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