/// Core liquidity pool logic for OmniSphere on Sui.
module omnisphere_sui::liquidity_pool {

    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::vec_map::{Self, VecMap};
    use sui::event;
    use std::type_name::{Self, get as get_type_name, TypeName}; // Keep TypeName, remove get_address_bytes

    use std::string::{Self, String as StdString}; // Alias std::string::String
    use std::vector;

    // Import from our other modules
    use omnisphere_sui::types::{Self, PoolStatus};
    use omnisphere_sui::events;

    // --- Constants ---
    // Add error constants later

    // --- Structs ---

    /// Represents a liquidity pool for a pair of tokens.
    /// This object is shared.
    struct Pool<phantom CoinTypeA, phantom CoinTypeB> has key {
        id: UID,
        // Using Balance to store reserves, as Coins themselves cannot be stored directly in structs.
        reserve_a: Balance<CoinTypeA>,
        reserve_b: Balance<CoinTypeB>,
        // LP token logic will be added later
        // lp_supply: u64,
        status: PoolStatus,
        // Add fee info later
        // fee_percentage: u64,
    }

    // --- Public Functions ---

    /// Creates a new liquidity pool for the given token pair and shares it.
    /// Takes the initial liquidity coins as input.
    public fun create_pool<CoinTypeA, CoinTypeB>(
        coin_a: Coin<CoinTypeA>,
        coin_b: Coin<CoinTypeB>,
        ctx: &mut TxContext
    ) {
        let reserve_a_balance = coin::into_balance(coin_a);
        let reserve_b_balance = coin::into_balance(coin_b);
        let initial_liquidity_a = balance::value(&reserve_a_balance);
        let initial_liquidity_b = balance::value(&reserve_b_balance);

        let pool = Pool<CoinTypeA, CoinTypeB> {
            id: object::new(ctx),
            reserve_a: reserve_a_balance,
            reserve_b: reserve_b_balance,
            status: types::new_active_status(),
        };

        // Emit event
        events::emit_pool_created(
            object::uid_to_inner(&pool.id),
            get_type_name<CoinTypeA>(), // Pass TypeName directly
            get_type_name<CoinTypeB>(), // Pass TypeName directly
            initial_liquidity_a,
            initial_liquidity_b,
            ctx
        );

        // Share the pool object so others can interact with it
        transfer::share_object(pool);
    }

    /// Adds liquidity to an existing pool.
    /// For simplicity, this version doesn't calculate or mint LP tokens yet.
    public fun add_liquidity<CoinTypeA, CoinTypeB>(
        pool: &mut Pool<CoinTypeA, CoinTypeB>,
        coin_a: Coin<CoinTypeA>,
        coin_b: Coin<CoinTypeB>,
        ctx: &mut TxContext
    ) {
        // TODO: Check pool status is active

        let amount_a_added = coin::value(&coin_a);
        let amount_b_added = coin::value(&coin_b);

        // Deposit the coins into the pool's balances
        let balance_a = coin::into_balance(coin_a);
        balance::join(&mut pool.reserve_a, balance_a);

        let balance_b = coin::into_balance(coin_b);
        balance::join(&mut pool.reserve_b, balance_b);

        // Emit event
        events::emit_liquidity_added(
            object::uid_to_inner(&pool.id),
            tx_context::sender(ctx),
            amount_a_added,
            amount_b_added,
            ctx
        );

        // TODO: Calculate and mint LP tokens
    }

    // --- View Functions (Read-only) ---

    /// Returns the current reserves of the pool.
    public fun get_reserves<CoinTypeA, CoinTypeB>(
        pool: &Pool<CoinTypeA, CoinTypeB>
    ): (u64, u64) {
        (balance::value(&pool.reserve_a), balance::value(&pool.reserve_b))
    }

    /// Returns the status of the pool.
    public fun get_status<CoinTypeA, CoinTypeB>(
        pool: &Pool<CoinTypeA, CoinTypeB>
    ): PoolStatus {
        pool.status
    }

    /// Returns the object ID of the pool.
    public fun get_pool_id<CoinTypeA, CoinTypeB>(
        pool: &Pool<CoinTypeA, CoinTypeB>
    ): ID {
        object::uid_to_inner(&pool.id)
    }

    // --- Test Functions ---
    // Add tests later in a separate file or module
}
