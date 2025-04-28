/// Factory module for creating OmniSphere Liquidity Pools, potentially triggered by VAAs.
module omnisphere_sui::factory {

    // === Imports ===
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::package; // To get publisher object

    // OmniSphere Imports
    use omnisphere_sui::liquidity_pool::{Self, Pool, create_pool as create_pool_internal};
    use omnisphere_sui::types::{OPERATION_CREATE_POOL}; // Use the constant
    use omnisphere_sui::events; // Emit events if necessary

    // === Constants ===
    const ESourceFactoryNotTrusted: u64 = 201;

    // === Structs ===

    /// Factory state object, typically created once during module publishing.
    struct Factory has key {
        id: UID,
        admin: address, // Optional: Admin for factory-level settings
        // Potentially store references to trusted remote factories or configurations
        // trusted_factories: Table<u16, vector<u8>>, // chain_id -> factory_address
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
            // Initialize trusted factories if needed
        };

        // Share the factory object so it can be used by the bridge interface
        transfer::share_object(factory);

        // Destroy the publisher capability
        package::burn_publisher(publisher);
    }

    // === Public Functions ===

    /// Creates a new liquidity pool based on data from a VAA.
    /// This function should be called by the bridge interface after VAA verification.
    /// Requires the emitter to be a trusted factory address on the source chain.
    /// Assumes the factory has access to the necessary TreasuryCaps to create initial zero coins.
    public fun create_pool_from_vaa<CoinTypeA, CoinTypeB>(
        factory: &Factory,
        // Pass TreasuryCaps needed to create zero-value coins for pool initialization
        treasury_cap_a: &TreasuryCap<CoinTypeA>,
        treasury_cap_b: &TreasuryCap<CoinTypeB>,
        // VAA details (caller needs to parse these from VAA payload)
        source_chain_id: u16,
        source_factory_address: vector<u8>,
        // Add other parameters derived from VAA payload if needed (e.g., target pool link info)
        ctx: &mut TxContext
    ) {
        // TODO: Verify that the VAA emitter (source_factory_address) is a trusted factory
        // registered in the `factory` object for the `source_chain_id`.
        // assert!(is_trusted_factory(factory, source_chain_id, source_factory_address), ESourceFactoryNotTrusted);

        // Create initial empty coins using the provided TreasuryCaps
        // We mint zero value coins and immediately take them into balances.
        let coin_a_initial: Coin<CoinTypeA> = coin::mint(treasury_cap_a, 0, ctx);
        let coin_b_initial: Coin<CoinTypeB> = coin::mint(treasury_cap_b, 0, ctx);

        // Call the internal pool creation function (which now accepts zero-value coins)
        create_pool_internal<CoinTypeA, CoinTypeB>(
             coin_a_initial, // Pass the zero-value coin
             coin_b_initial, // Pass the zero-value coin
             ctx
         );

        // TODO: Emit an event for PoolCreatedFromVAA, potentially including source chain info?
        // events::emit_pool_created_from_vaa(...);

        // TODO: Optionally, link the newly created pool back to the source pool/factory.
        // This would require the source pool address in the VAA payload and calling
        // liquidity_pool::link_and_publish on the newly created pool.
    }

    // --- Helper Functions (Example) ---
    /*
    fun is_trusted_factory(
        factory: &Factory,
        chain_id: u16,
        emitter_address: vector<u8>
    ): bool {
        // Logic to check if the emitter is registered as trusted for the chain
        // e.g., table::contains(&factory.trusted_factories, chain_id) && ... compare addresses ...
        true // Placeholder
    }
    */
} 