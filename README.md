# OmniSphere: Multi-Universe Liquidity Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sui](https://img.shields.io/badge/Sui-Move-blue)](https://sui.io/)
[![Solana](https://img.shields.io/badge/Solana-Rust-red)](https://solana.com/)
[![Wormhole](https://img.shields.io/badge/Integration-Wormhole-purple)](https://wormhole.com/)

<div align="center">
  <img src="https://github.com/user-attachments/assets/e78437f9-2e4a-4487-8104-bf63904caf8d" width="300" alt="OmniSphere Logo"/>
</div>

> **OmniSphere** is a revolutionary cross-chain liquidity protocol designed to enable seamless liquidity composition and interaction across multiple blockchain universes, initially focusing on Sui and Solana, powered by Wormhole's interoperability infrastructure.

**🎥 Watch the Demo Video:** [https://screen.studio/share/XdI4weMv](https://screen.studio/share/XdI4weMv)

---

## 📑 Table of Contents

- [🌟 Overview](#-overview)
  - [Vision & Objectives](#vision--objectives)
  - [Key Innovations](#key-innovations)
- [🎯 Project Goals](#-project-goals)
- [💰 Revenue Model](#-revenue-model)
- [🚀 Deployed Contracts](#-deployed-contracts)
- [🏗️ System Architecture](#️-system-architecture)
  - [Architecture Diagram](#architecture-diagram)
  - [Layer Descriptions](#layer-descriptions)
- [⚙️ Technical Components](#️-technical-components)
  - [Sui Ecosystem Integration](#sui-ecosystem-integration)
  - [Solana Ecosystem Integration](#solana-ecosystem-integration)
  - [Wormhole Integration](#wormhole-integration)
- [📊 Sui Smart Contracts](#-sui-smart-contracts)
  - [Module Structure](#module-structure)
  - [Key Functions (Examples)](#key-functions-examples)
- [⚡ Solana Programs](#-solana-programs)
  - [Program Structure](#program-structure)
  - [Key Instructions (Examples)](#key-instructions-examples)
- [🌉 Cross-Chain Bridge Mechanism](#-cross-chain-bridge-mechanism)
  - [Message Format](#message-format)
  - [VAA Flow](#vaa-flow)
- [💧 Liquidity Protocol Mechanisms](#-liquidity-protocol-mechanisms)
- [🔒 Security Architecture](#-security-architecture)
- [🔮 Future Development Roadmap](#-future-development-roadmap)
- [🧩 Contributing](#-contributing)
  - [Basic Development Setup](#basic-development-setup)
- [📄 License](#-license)

---

## 🌟 Overview

OmniSphere tackles the challenge of fragmented liquidity in the blockchain space. By leveraging the high-performance capabilities of the Sui blockchain and the robust cross-chain messaging provided by Wormhole, OmniSphere facilitates atomic interactions between liquidity pools and DeFi protocols across different ecosystems, starting with Sui and Solana.

### Vision & Objectives

Our vision is to create a unified liquidity layer where assets and DeFi strategies can flow freely and efficiently between blockchains. Key objectives include:

-   **Unify Liquidity**: Reduce fragmentation by enabling seamless asset and data movement.
-   **Enhance Capital Efficiency**: Allow users and protocols to utilize liquidity where it's most needed or profitable.
-   **Simplify User Experience**: Abstract away the complexities of cross-chain interactions for end-users.
-   **Enable Novel DeFi Strategies**: Facilitate the creation of complex strategies that compose elements from multiple chains.

### Key Innovations

-   **Atomic Cross-Chain Swaps & Liquidity Management**: Execute complex operations spanning Sui and Solana as single, indivisible transactions.
-   **Wormhole-Powered Bridging**: Utilize Wormhole's secure VAA mechanism for reliable cross-chain state verification and message passing.
-   **Optimized User Interface**: A clean React frontend providing intuitive access to cross-chain pooling and swapping features.
-   **Multi-Chain Contract Architecture**: Dedicated smart contracts on Sui (Move) and Solana (Rust/Anchor) managing pool state and interacting with the bridge.

---

## 🎯 Project Goals

*(Please replace placeholders below with the actual project goals)*

Our primary goals for OmniSphere are:

*   **[Placeholder Goal 1: e.g., Achieve seamless liquidity bridging and atomic swaps between Sui and Solana.]**
*   **[Placeholder Goal 2: e.g., Offer competitive rates and low slippage for cross-chain operations.]**
*   **[Placeholder Goal 3: e.g., Implement robust security measures and undergo independent audits.]**
*   **[Placeholder Goal 4: e.g., Build an active community and establish a clear path towards decentralized governance.]**
*   **[Placeholder Goal 5: e.g., Expand support to additional high-potential blockchain ecosystems.]**

---

## 💰 Revenue Model

*(Please replace placeholders below with the actual revenue model)*

OmniSphere plans to ensure sustainability and fund ongoing development through:

*   **[Placeholder Model 1: e.g., A small percentage fee (e.g., 0.05%) applied to cross-chain swaps facilitated by the protocol.]**
*   **[Placeholder Model 2: e.g., A protocol fee representing a fraction (e.g., 1/6th) of the standard liquidity provider fees collected by OmniSphere pools.]**
*   **[Placeholder Model 3: e.g., Potential future value accrual mechanisms tied to a native governance token (if introduced).]**
*   **[Placeholder Model 4: e.g., Possible introduction of premium features or analytics services for advanced users or institutions.]**

---

## 🚀 Deployed Contracts

OmniSphere is currently deployed on the following **development/test networks**:

*   **Sui Testnet:**
    *   Package ID: `[YOUR_SUI_PACKAGE_ID_HERE]` *(Please replace with actual ID)*
    *   *Explorer Link: (Add link once ID is available)*
*   **Solana Devnet:**
    *   Program ID: `[YOUR_SOLANA_PROGRAM_ID_HERE]` *(Please replace with actual ID)*
    *   *Explorer Link: (Add link once ID is available)*

**Note:** These addresses are for development and testing purposes only. Mainnet deployment addresses will be announced upon official launch.

---

## 🏗️ System Architecture

OmniSphere utilizes a layered architecture designed for modularity and clarity, facilitating interaction between the user, the bridge, and the underlying blockchains.

### Architecture Diagram

```mermaid
graph LR
    subgraph User Layer
        Frontend[React Frontend App]
        Wallets[Sui/Solana Wallets]
    end
    
    subgraph Service Layer
        API[OmniSphere API (Optional)]
        Indexer[Event Indexer (Optional)]
    end

    subgraph Bridge Layer
        Wormhole[Wormhole Protocol & Guardians]
    end
    
    subgraph Blockchain Layer
        SuiContracts[Sui Move Contracts (Pool & Bridge Interface)]
        SolanaProgram[Solana Anchor Program (Pool & VAA Processor)]
    end

    User(User) --> Wallets
    User --> Frontend
    
    Frontend --> Wallets
    Frontend --> API
    API --> Indexer
    
    Frontend -- Initiates TX --> SuiContracts
    Frontend -- Initiates TX --> SolanaProgram
    
    SuiContracts -- Sends/Receives Messages --> Wormhole
    SolanaProgram -- Sends/Receives Messages --> Wormhole
    
    SuiContracts -- Emits Events --> Indexer
    SolanaProgram -- Emits Events --> Indexer
```

### Layer Descriptions

1.  **User Layer**:
    *   **Frontend Application**: The React-based web interface (`src/`) where users interact with the protocol, view pools, and initiate transactions.
    *   **Wallets**: Integrations with Sui (`@suiet/wallet-kit`) and Solana (`@solana/wallet-adapter-react`) wallets for transaction signing and connection management.
2.  **Service Layer (Optional)**:
    *   **API/Indexer**: Potential off-chain services for aggregating data, providing analytics, or facilitating transaction relaying. Not strictly required for core functionality but enhances UX.
3.  **Bridge Layer**:
    *   **Wormhole Protocol**: The core interoperability layer. Handles the emission, verification (by Guardians), and delivery of cross-chain messages (VAAs). Integration managed via `@certusone/wormhole-sdk`.
4.  **Blockchain Layer**:
    *   **Sui Move Contracts** (`sui/sources/`): Smart contracts deployed on Sui managing liquidity pools (`liquidity_pool.move`) and interacting with the Wormhole bridge (`bridge_interface.move`).
    *   **Solana Anchor Program** (`programs/liquidity_pool/`): The Rust-based program deployed on Solana, handling pool logic and VAA processing (`process_vaa.rs`) using the Anchor framework.

---

## ⚙️ Technical Components

### Sui Ecosystem Integration
-   **Move Language**: Chosen for its strong safety guarantees, resource-oriented model, and suitability for financial applications. The object model allows for fine-grained asset control.
-   **Sui Features**: Leverages Sui's parallel execution for potentially faster processing of independent pool operations and its object-centric storage model.
-   **SDKs**: Uses `@mysten/sui.js` for core interactions and `@suiet/wallet-kit` for user wallet connections.

### Solana Ecosystem Integration
-   **Rust & Anchor**: Rust provides performance and memory safety, while the Anchor framework simplifies Solana program development, providing abstractions for account handling, instruction processing, and state management.
-   **SPL Tokens**: Adheres to the Solana Program Library (SPL) standard for token interactions.
-   **SDKs**: Uses `@solana/web3.js` for network communication and `@solana/wallet-adapter-react` for wallet integration.

### Wormhole Integration
-   **Core Bridge Contracts**: Interacts with the deployed Wormhole core bridge contracts on both Sui and Solana to publish messages and verify VAAs.
-   **VAAs (Verified Action Approvals)**: The cornerstone of cross-chain security. VAAs are messages signed by a supermajority (2/3+) of Wormhole Guardians, attesting to an observation on a source chain.
-   **SDK**: The `@certusone/wormhole-sdk` is used in the frontend/backend (or relayer) to fetch signed VAAs from the Guardian network and submit them to the target chain contracts.

---

## 📊 Sui Smart Contracts

Located in `sui/sources/`.

### Module Structure
-   `liquidity_pool.move`: Manages pool creation, LP token minting/burning, adding/removing liquidity.
-   `bridge_interface.move`: Handles publishing messages to Wormhole and processing verified VAAs received from other chains.
-   `events.move`, `types.move`, `errors.move`: Define data structures and constants used across modules.

### Key Functions (Examples)

```move
// sui/sources/liquidity_pool.move
// Simplified example of adding liquidity
public fun add_liquidity<CoinTypeA, CoinTypeB>(
    pool: &mut LiquidityPool<CoinTypeA, CoinTypeB>,
    coin_a: Coin<CoinTypeA>,
    coin_b: Coin<CoinTypeB>,
    ctx: &mut TxContext
): LiquidityProviderToken<CoinTypeA, CoinTypeB> {
    // ... calculate optimal amounts based on pool ratio ...
    // ... update reserves ...
    // ... calculate LP tokens to mint ...
    // ... emit LiquidityAdded event ...
    // ... return LP token object ...
}

// sui/sources/bridge_interface.move
// Simplified example of initiating a bridge operation
public fun initiate_bridge<CoinTypeA, CoinTypeB>(
    pool: &mut LiquidityPool<CoinTypeA, CoinTypeB>,
    wormhole_state: &mut wormhole::state::State, // Reference to Wormhole state object
    target_chain_id: u16,
    target_address: vector<u8>,
    operation_payload: vector<u8>, // Serialized operation data
    ctx: &mut TxContext
): BridgeRequest { // Returns an object tracking the request
    // ... construct payload ...
    
    // Publish message via Wormhole core contract
    let sequence = wormhole::publish_message(
        wormhole_state,
        ctx.clock(), // Access clock for nonce generation
        operation_payload,
        0 // Consistency level
    );

    // ... create and store BridgeRequest object ...
    // ... emit BridgeInitiated event ...
}
```

---

## ⚡ Solana Programs

Located in `programs/liquidity_pool/`.

### Program Structure
-   `lib.rs`: Defines the main program module and instructions using Anchor macros.
-   `instructions/`: Contains the logic for each instruction (e.g., `create_pool.rs`, `process_vaa.rs`).
-   `state/`: Defines account structures (e.g., `pool.rs`).
-   `errors.rs`: Defines custom program errors.

### Key Instructions (Examples)

```rust
// programs/liquidity_pool/programs/liquidity_pool/src/lib.rs
#[program]
pub mod liquidity_pool {
    // ... other instructions ...

    // Processes a VAA received from Wormhole
    pub fn process_vaa(
        ctx: Context<ProcessVAA>,
        vaa_hash: [u8; 32] // Hash of the VAA data
    ) -> Result<()> {
        instructions::process_vaa::handler(ctx, vaa_hash)
    }
}

// programs/liquidity_pool/programs/liquidity_pool/src/instructions/process_vaa.rs
// Simplified handler logic
pub fn handler(
    ctx: Context<ProcessVAA>,
    vaa_hash: [u8; 32]
) -> Result<()> {
    // 1. Verify the VAA using Wormhole core program CPI
    let vaa = wormhole::parse_and_verify_vaa(
        &ctx.accounts.wormhole_bridge, // Wormhole bridge state account
        &ctx.accounts.vaa_account,    // Account containing VAA data posted by relayer
        vaa_hash,
    )?;

    // 2. Ensure VAA hasn't been processed before (check sequence number against state)
    // ... check logic ...

    // 3. Parse the payload based on OmniSphere's message format
    let payload = vaa.payload.as_slice();
    let operation_type = payload[0];
    // ... deserialize rest of payload based on operation_type ...

    // 4. Execute the corresponding action (e.g., mint LP tokens, transfer assets)
    match operation_type {
        // ... handle different operations ...
        _ => return err!(ErrorCode::InvalidBridgeOperation)
    }

    // 5. Mark VAA sequence as processed
    // ... update state ...

    Ok(())
}
```

---

## 🌉 Cross-Chain Bridge Mechanism

OmniSphere's cross-chain functionality relies heavily on the Wormhole protocol.

### Message Format
A standardized payload structure is used for messages sent via Wormhole, typically including:
-   An **Operation Code** (e.g., Add Liquidity, Remove Liquidity).
-   Relevant parameters for the operation (e.g., amounts, target addresses, pool identifiers).

### VAA Flow
The core flow for a cross-chain action (e.g., User on Sui adds liquidity to a Solana pool):

1.  **Initiation (Sui)**: User calls `add_liquidity_cross_chain` (hypothetical function) on the Sui contract. The contract locks the user's Sui-side tokens and calls `wormhole::publish_message` on the Wormhole core bridge contract, emitting the operation details.
2.  **Observation & Signing (Wormhole Guardians)**: The Wormhole Guardian network observes the published message on Sui. After reaching consensus (2/3+ signatures), they produce a signed VAA containing the payload.
3.  **Relaying**: An off-chain relayer (or potentially the frontend) fetches the signed VAA from the Guardians.
4.  **Submission (Solana)**: The relayer submits the VAA to the Solana OmniSphere program's `process_vaa` instruction.
5.  **Verification & Execution (Solana)**:
    *   The Solana program calls the Wormhole core bridge program on Solana via CPI to verify the VAA signatures.
    *   It checks if the VAA sequence number has already been processed to prevent replays.
    *   It parses the payload from the VAA.
    *   It executes the corresponding action (e.g., minting Solana-side LP tokens or crediting the equivalent liquidity).
6.  **Confirmation (Optional)**: The Solana program could potentially emit its own Wormhole message confirming the execution, which could be relayed back to Sui to unlock/finalize the state if needed (implementing a two-phase commit).

---

## 💧 Liquidity Protocol Mechanisms

-   **Pricing**: Uses the Constant Product Market Maker (CPMM) model (`x * y = k`).
-   **Liquidity Management**: Implements standard add/remove liquidity logic, ensuring proportional asset handling and LP token minting/burning. Cross-chain operations involve locking/unlocking assets and minting/burning LP tokens based on verified Wormhole messages.
-   **Fees**: A swap fee (e.g., 0.3%) is charged, benefiting LPs. A portion may be allocated as a protocol fee.
-   **Slippage**: User-defined slippage tolerance protects against excessive price changes during transaction execution.

---

## 🔒 Security Architecture

-   **Audits**: Plans for rigorous third-party audits.
-   **Wormhole Reliance**: Inherits the security assumptions of the Wormhole network (trust in 2/3+ of Guardians).
-   **Contract Best Practices**: Implementation follows secure development patterns for Move and Rust/Anchor.
-   **Testing**: Extensive test suite covering unit, integration, and cross-chain scenarios.
-   **Upgradeability & Governance**: Secure upgrade paths planned, likely controlled by multi-sig initially, transitioning to DAO governance.

---

## 🔮 Future Development Roadmap

*(High-level example - update with specifics)*

-   **Phase 1 (Current)**: MVP - Sui/Solana pools, core liquidity functions, Wormhole bridging, frontend.
-   **Phase 2**: Additional chain support, cross-chain swaps, governance token.
-   **Phase 3**: Advanced DeFi strategy composition, mobile app.
-   **Phase 4**: AI optimizations, full DAO governance.

---

## 🧩 Contributing

Contributions are welcome! Please outline contribution guidelines in a `CONTRIBUTING.md` file.

### Basic Development Setup

1.  **Clone:** `git clone https://github.com/omnisphere/omnisphere-protocol.git`
2.  **Install Root Dependencies:** `cd omnisphere-protocol && npm install`
3.  **Install Frontend Dependencies:** `cd src && npm install` *(Adjust path if needed)*
4.  **Install/Setup Sui:** See [Sui Docs](https://docs.sui.io/guides/developer/getting-started/install).
5.  **Install/Setup Solana & Anchor:** See [Solana Docs](https://docs.solana.com/cli/install) and [Anchor Docs](https://www.anchor-lang.com/docs/installation).
6.  **Build Contracts/Programs:**
    *   Sui: `cd ../sui && sui move build`
    *   Solana: `cd ../programs/liquidity_pool && anchor build`
7.  **Run Frontend:** `cd ../../src && npm run dev` *(Adjust path if needed)*

*(Note: Full end-to-end testing requires a more complex local setup including chain simulators and potentially a local Wormhole guardian.)*

---

## 📄 License

OmniSphere Protocol is licensed under the [MIT License](LICENSE).
