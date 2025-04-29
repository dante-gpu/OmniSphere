/// Factory module for creating OmniSphere Liquidity Pools, potentially triggered by VAAs.
module omnisphere_sui::factory {

    // === Imports ===
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::package; // To get publisher object
    use sui::table::{Self, Table}; // For storing trusted factories

    // OmniSphere Imports
    use omnisphere_sui::liquidity_pool::{Self, Pool, create_pool as create_pool_internal, link_and_publish};
    use omnisphere_sui::types::{OPERATION_CREATE_POOL}; // Use the constant
    use omnisphere_sui::events; // Emit events if necessary
    use omnisphere_sui::events::{emit_pool_created_from_vaa}; // Specific event

    // Wormhole related imports might be needed if parsing payload here
    use wormhole::state::{Self as WormholeState}; // For link_and_publish
    use sui::sui::SUI; // For message fee coin type in link_and_publish

    // === Constants ===
    const ESourceFactoryNotTrusted: u64 = 201;
    const ENotFactoryAdmin: u64 = 202;
    const EInvalidPayloadForLinking: u64 = 203;

    // === Structs ===

    /// Factory state object, typically created once during module publishing.
    struct Factory has key {
        id: UID,
        admin: address,
        /// Table mapping `remote_chain_id` to `remote_factory_address` (vector<u8>)
        trusted_factories: Table<u16, vector<u8>>,
    }

    /// Capability required to publish the factory module.
    struct FACTORY has drop {}

    // === Initialization (Module Publisher Only) ===

    fun init(witness: FACTORY, ctx: &mut TxContext) {
        // Ensure this is only callable during publishing
        let publisher = package::claim(witness, ctx);

        let factory = Factory {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            // Initialize empty table for trusted factories
            trusted_factories: table::new<u16, vector<u8>>(ctx),
        };

        // Share the factory object so it can be used by the bridge interface
        transfer::share_object(factory);

        // Destroy the publisher capability
        package::burn_publisher(publisher);
    }

    // === Admin Functions ===

    /// Registers or updates the trusted factory address for a given remote chain ID.
    /// Only callable by the factory admin.
    public fun set_trusted_factory(
        factory: &mut Factory,
        remote_chain_id: u16,
        remote_factory_address: vector<u8>, // Should be the Wormhole-formatted (e.g., 32-byte) address
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == factory.admin, ENotFactoryAdmin);
        table::add(&mut factory.trusted_factories, remote_chain_id, remote_factory_address);
    }

    /// Removes the trusted factory address for a given remote chain ID.
    /// Only callable by the factory admin.
    public fun remove_trusted_factory(
        factory: &mut Factory,
        remote_chain_id: u16,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == factory.admin, ENotFactoryAdmin);
        table::remove(&mut factory.trusted_factories, remote_chain_id);
    }

    // === Public Functions ===

    /// Creates a new liquidity pool based on data from a VAA and links it back.
    /// Called by the bridge interface after VAA verification against the *expected* factory.
    public fun create_pool_from_vaa<CoinTypeA, CoinTypeB>(
        factory: &Factory, // Now immutable borrow is enough for check
        treasury_cap_a: &TreasuryCap<CoinTypeA>,
        treasury_cap_b: &TreasuryCap<CoinTypeB>,
        source_chain_id: u16,
        source_emitter_address: vector<u8>, // The actual emitter from the VAA
        // We need the address of the source *pool* or *entity* to link back to.
        // This must be part of the VAA payload sent by the source factory.
        source_link_address: vector<u8>, // e.g., the ID of the pool on the source chain
        // Parameters needed for linking back:
        wormhole_state: &WormholeState,
        link_message_fee: Coin<SUI>,
        ctx: &mut TxContext
    ): Pool<CoinTypeA, CoinTypeB> { // Return the created pool

        // 1. Verify the VAA emitter is a trusted factory for the source chain
        assert!(is_trusted_factory(factory, source_chain_id, &source_emitter_address), ESourceFactoryNotTrusted);

        // 2. Create initial empty coins
        let coin_a_initial: Coin<CoinTypeA> = coin::mint(treasury_cap_a, 0, ctx);
        let coin_b_initial: Coin<CoinTypeB> = coin::mint(treasury_cap_b, 0, ctx);

        // 3. Create the pool (returns the Pool object itself, as it's not shared yet)
        // Need to modify create_pool_internal or use a different approach if it shares immediately.
        // Assuming create_pool_internal is modified or we have a way to get the Pool object.
        // Let's modify the signature of this function to *return* the pool temporarily.
        // Ideally, create_pool_internal wouldn't automatically share.

        // *** TEMPORARY: Assume create_pool_internal is adapted NOT to share immediately ***
        // This might require making create_pool public(friend) and calling it differently
        // OR adding a new internal function.
        // For now, let's proceed assuming we get the pool object back.
        let mut new_pool = create_pool_placeholder_no_share<CoinTypeA, CoinTypeB>(ctx);
        // *** END TEMPORARY ***


        // 4. Link the newly created pool back to the source address
        // The source_link_address came from the VAA payload.
        link_and_publish<CoinTypeA, CoinTypeB>(
            &mut new_pool,            // Pass the newly created pool
            source_chain_id,        // Link back to the source chain
            source_link_address,    // Link back to the specific address from payload
            wormhole_state,         // Wormhole state object
            link_message_fee,       // Fee for the link message
            ctx
        );

        // 5. Emit event
        emit_pool_created_from_vaa(
            object::uid_to_inner(&new_pool.id),
            source_chain_id,
            source_emitter_address, // Factory that initiated
            source_link_address,    // Address linked back to
            ctx
        );

        // 6. Return the pool object (caller is responsible for sharing or further setup)
        new_pool
    }

    // --- Helper Functions ---

    /// Checks if the emitter address is registered as trusted for the given chain ID.
    fun is_trusted_factory(
        factory: &Factory,
        chain_id: u16,
        emitter_address: &vector<u8> // Borrow address
    ): bool {
        if (table::contains(&factory.trusted_factories, chain_id)) {
            let trusted_addr = table::borrow(&factory.trusted_factories, chain_id);
            trusted_addr == emitter_address
        } else {
            false
        }
    }

    /// Placeholder function to represent pool creation without immediate sharing.
    /// Replace with actual logic based on `liquidity_pool::create_pool` refactoring.
    fun create_pool_placeholder_no_share<CoinTypeA, CoinTypeB>(
        ctx: &mut TxContext
    ): Pool<CoinTypeA, CoinTypeB> {
         Pool<CoinTypeA, CoinTypeB> {
            id: object::new(ctx),
            admin: tx_context::sender(ctx), // Or maybe factory admin?
            reserve_a: coin::into_balance(coin::mint(&TreasuryCap_placeholder(), 0, ctx)), // Needs real caps
            reserve_b: coin::into_balance(coin::mint(&TreasuryCap_placeholder(), 0, ctx)), // Needs real caps
            status: types::new_active_status(),
            linked_chain_id: 0,
            linked_address: vector::empty<u8>(),
        }
        // NOTE: This placeholder is highly simplified and needs proper implementation
        // using TreasuryCaps passed into create_pool_from_vaa and potentially modifying
        // how liquidity_pool::create_pool works or adding a new internal creator function.
    }

} 