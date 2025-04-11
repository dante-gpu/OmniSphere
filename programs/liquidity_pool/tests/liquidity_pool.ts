import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  LiquidityPoolProgram, // Updated program name from lib.rs
} from "../target/types/liquidity_pool_program"; // Updated type import
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  Account,
  getMint,
  burn,
} from "@solana/spl-token";
import { Keypair, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { randomBytes } from "crypto";

// Helper function to create a new mint
async function createTestMint(provider: anchor.AnchorProvider): Promise<PublicKey> {
  return await createMint(
    provider.connection,
    provider.wallet.payer, // Payer is the provider's wallet
    provider.wallet.publicKey, // Mint authority
    null, // Freeze authority (optional)
    6 // Decimals
  );
}

// Helper function to create a token account
async function createTestTokenAccount(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  return await createAccount(
    provider.connection,
    provider.wallet.payer, // Payer
    mint, // Mint public key
    owner // Owner public key
  );
}

// Helper function to mint tokens to an account
async function mintTokens(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  destination: PublicKey,
  amount: bigint
) {
  await mintTo(
    provider.connection,
    provider.wallet.payer, // Payer
    mint, // Mint public key
    destination, // Destination token account
    provider.wallet.publicKey, // Mint authority
    amount
  );
}

describe("liquidity_pool_program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .LiquidityPoolProgram as Program<LiquidityPoolProgram>; // Updated program name

  // Keypairs and accounts to be used in tests
  let tokenAMint: PublicKey;
  let tokenBMint: PublicKey;
  let lpMint: PublicKey;
  let poolPda: PublicKey;
  let poolAuthorityPda: PublicKey;
  let tokenAAccountPda: PublicKey;
  let tokenBAccountPda: PublicKey;
  let poolBump: number;
  let authorityBump: number;
  let tokenAAccountBump: number;
  let tokenBAccountBump: number;
  let lpMintBump: number;

  let userTokenAAccount: PublicKey;
  let userTokenBAccount: PublicKey;
  let userLpTokenAccount: PublicKey;

  const user = provider.wallet.payer; // Use the provider's wallet as the user for simplicity
  const feePercentage = new BN(30); // 0.3% fee (30 basis points)
  const poolId = randomBytes(32); // Generate a random pool ID

  before(async () => {
    // Airdrop SOL to the user wallet if needed (useful for localnet/devnet)
    const airdropSignature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL // Airdrop 2 SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);

    // Create mints for Token A and Token B
    tokenAMint = await createTestMint(provider);
    tokenBMint = await createTestMint(provider);

    // Derive PDAs for the pool and its components
    [poolPda, poolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
      program.programId
    );
    [poolAuthorityPda, authorityBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), poolPda.toBuffer()],
      program.programId
    );
    [tokenAAccountPda, tokenAAccountBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_a_vault"), poolPda.toBuffer()],
      program.programId
    );
    [tokenBAccountPda, tokenBAccountBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_b_vault"), poolPda.toBuffer()],
      program.programId
    );
    [lpMint, lpMintBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp_mint"), poolPda.toBuffer()],
      program.programId
    );

    // Create user's token accounts
    userTokenAAccount = await createTestTokenAccount(provider, tokenAMint, user.publicKey);
    userTokenBAccount = await createTestTokenAccount(provider, tokenBMint, user.publicKey);
    // LP token account will be created later or during add_liquidity if needed

    // Mint initial tokens to user accounts for testing
    await mintTokens(provider, tokenAMint, userTokenAAccount, BigInt(1000 * 1e6)); // 1000 Token A
    await mintTokens(provider, tokenBMint, userTokenBAccount, BigInt(1000 * 1e6)); // 1000 Token B
  });

  it("Creates a new liquidity pool", async () => {
    const tx = await program.methods
      .createPool(feePercentage, Buffer.from(poolId))
      .accounts({
        pool: poolPda,
        poolAuthority: poolAuthorityPda,
        tokenAMint: tokenAMint,
        tokenBMint: tokenBMint,
        tokenAAccount: tokenAAccountPda,
        tokenBAccount: tokenBAccountPda,
        lpMint: lpMint,
        payer: user.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Create Pool transaction signature", tx);

    // Verify pool state
    const poolAccount = await program.account.pool.fetch(poolPda);
    assert.ok(poolAccount.tokenAMint.equals(tokenAMint));
    assert.ok(poolAccount.tokenBMint.equals(tokenBMint));
    assert.ok(poolAccount.tokenAAccount.equals(tokenAAccountPda));
    assert.ok(poolAccount.tokenBAccount.equals(tokenBAccountPda));
    assert.ok(poolAccount.lpMint.equals(lpMint));
    assert.equal(poolAccount.feePercentage.toNumber(), feePercentage.toNumber());
    assert.deepEqual(poolAccount.poolId, Array.from(poolId)); // Compare buffer/array content
    assert.equal(poolAccount.bump, poolBump);
    assert.equal(poolAccount.authorityBump, authorityBump);
    assert.equal(poolAccount.tokenAAccountBump, tokenAAccountBump);
    assert.equal(poolAccount.tokenBAccountBump, tokenBAccountBump);
    assert.equal(poolAccount.lpMintBump, lpMintBump);
    assert.equal(poolAccount.totalLiquidity.toNumber(), 0);

    // Verify token account authorities
    const tokenAAccountInfo = await getAccount(provider.connection, tokenAAccountPda);
    assert.ok(tokenAAccountInfo.owner.equals(poolAuthorityPda));
    const tokenBAccountInfo = await getAccount(provider.connection, tokenBAccountPda);
    assert.ok(tokenBAccountInfo.owner.equals(poolAuthorityPda));

    // Verify LP mint authority
    const lpMintInfo = await getMint(provider.connection, lpMint);
    assert.ok(lpMintInfo.mintAuthority?.equals(poolAuthorityPda));
  });

  it("Adds liquidity to the pool", async () => {
    const amountADesired = new BN(100 * 1e6); // 100 Token A
    const amountBDesired = new BN(100 * 1e6); // 100 Token B
    const amountAMin = new BN(95 * 1e6); // Min 95 Token A
    const amountBMin = new BN(95 * 1e6); // Min 95 Token B

    // Create user LP token account if it doesn't exist
    try {
        await getAccount(provider.connection, userLpTokenAccount);
    } catch (error) { // Account does not exist
        userLpTokenAccount = await createTestTokenAccount(provider, lpMint, user.publicKey);
    }


    const initialPoolAccount = await program.account.pool.fetch(poolPda);
    const initialLpSupply = initialPoolAccount.totalLiquidity;
    const initialPoolAReserve_bi = (await getAccount(provider.connection, tokenAAccountPda)).amount;
    const initialPoolBReserve_bi = (await getAccount(provider.connection, tokenBAccountPda)).amount;
    const initialUserAReserve_bi = (await getAccount(provider.connection, userTokenAAccount)).amount;
    const initialUserBReserve_bi = (await getAccount(provider.connection, userTokenBAccount)).amount;
    const initialPoolAReserve = new BN(initialPoolAReserve_bi.toString());
    const initialPoolBReserve = new BN(initialPoolBReserve_bi.toString());
    const initialUserAReserve = new BN(initialUserAReserve_bi.toString());
    const initialUserBReserve = new BN(initialUserBReserve_bi.toString());

    const tx = await program.methods
      .addLiquidity(amountADesired, amountBDesired, amountAMin, amountBMin)
      .accounts({
        user: user.publicKey,
        pool: poolPda,
        poolAuthority: poolAuthorityPda,
        tokenAMint: tokenAMint,
        tokenBMint: tokenBMint,
        tokenAAccount: tokenAAccountPda, // Pool's vault
        tokenBAccount: tokenBAccountPda, // Pool's vault
        lpMint: lpMint,
        userTokenAAccount: userTokenAAccount, // User's source account
        userTokenBAccount: userTokenBAccount, // User's source account
        userLpTokenAccount: userLpTokenAccount, // User's destination LP account
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Add Liquidity transaction signature", tx);

    // Verify pool state
    const finalPoolAccount = await program.account.pool.fetch(poolPda);
    const finalLpSupply = finalPoolAccount.totalLiquidity;
    const finalPoolAReserve_bi = (await getAccount(provider.connection, tokenAAccountPda)).amount;
    const finalPoolBReserve_bi = (await getAccount(provider.connection, tokenBAccountPda)).amount;
    const finalUserAReserve_bi = (await getAccount(provider.connection, userTokenAAccount)).amount;
    const finalUserBReserve_bi = (await getAccount(provider.connection, userTokenBAccount)).amount;
    const finalUserLpBalance_bi = (await getAccount(provider.connection, userLpTokenAccount)).amount;
    const finalPoolAReserve = new BN(finalPoolAReserve_bi.toString());
    const finalPoolBReserve = new BN(finalPoolBReserve_bi.toString());
    const finalUserAReserve = new BN(finalUserAReserve_bi.toString());
    const finalUserBReserve = new BN(finalUserBReserve_bi.toString());
    const finalUserLpBalance = new BN(finalUserLpBalance_bi.toString());

    // First liquidity addition should mint sqrt(amountA * amountB) LP tokens (scaled by decimals)
    // Here, 100 * 100 = 10000, sqrt(10000) = 100. Scaled: 100 * 1e6
    const expectedLpMinted = new BN(100 * 1e6); // This is already BN
    assert.ok(finalLpSupply.sub(initialLpSupply).eq(expectedLpMinted), `LP supply mismatch: ${finalLpSupply.sub(initialLpSupply)} vs ${expectedLpMinted}`);
    assert.ok(finalUserLpBalance.gt(new BN(0)), "User should receive LP tokens"); // Use BN comparison
    assert.ok(finalUserLpBalance.eq(expectedLpMinted), `User LP balance mismatch: ${finalUserLpBalance} vs ${expectedLpMinted}`);


    // Verify token movements
    assert.ok(finalPoolAReserve > initialPoolAReserve, "Pool A reserve should increase");
    assert.ok(finalPoolBReserve > initialPoolBReserve, "Pool B reserve should increase");
    assert.ok(finalUserAReserve < initialUserAReserve, "User A reserve should decrease");
    assert.ok(finalUserBReserve.lt(initialUserBReserve), "User B reserve should decrease"); // Use BN comparison

    // Check exact amounts transferred (should match desired amounts for first liquidity)
     assert.ok(initialUserAReserve.sub(finalUserAReserve).eq(amountADesired), "Incorrect Token A transferred from user");
     assert.ok(initialUserBReserve.sub(finalUserBReserve).eq(amountBDesired), "Incorrect Token B transferred from user");
     assert.ok(finalPoolAReserve.sub(initialPoolAReserve).eq(amountADesired), "Incorrect Token A transferred to pool");
     assert.ok(finalPoolBReserve.sub(initialPoolBReserve).eq(amountBDesired), "Incorrect Token B transferred to pool");
  });

   it("Removes liquidity from the pool", async () => {
    // Get initial state before removal
    const initialPoolAccount = await program.account.pool.fetch(poolPda);
    const initialLpSupply = initialPoolAccount.totalLiquidity; // This is BN
    const initialPoolAReserve_bi = (await getAccount(provider.connection, tokenAAccountPda)).amount;
    const initialPoolBReserve_bi = (await getAccount(provider.connection, tokenBAccountPda)).amount;
    const initialUserAReserve_bi = (await getAccount(provider.connection, userTokenAAccount)).amount;
    const initialUserBReserve_bi = (await getAccount(provider.connection, userTokenBAccount)).amount;
    const initialUserLpBalance_bi = (await getAccount(provider.connection, userLpTokenAccount)).amount;
    const initialPoolAReserve = new BN(initialPoolAReserve_bi.toString());
    const initialPoolBReserve = new BN(initialPoolBReserve_bi.toString());
    const initialUserAReserve = new BN(initialUserAReserve_bi.toString());
    const initialUserBReserve = new BN(initialUserBReserve_bi.toString());
    const initialUserLpBalance = new BN(initialUserLpBalance_bi.toString());


    // We added 100e6 LP tokens, let's remove half
    const liquidityAmountToRemove = initialUserLpBalance.div(new BN(2)); // Use BN division
    const amountAMin = new BN(45 * 1e6); // Expect ~50, set min slightly lower
    const amountBMin = new BN(45 * 1e6); // Expect ~50, set min slightly lower

    assert.ok(liquidityAmountToRemove.gt(new BN(0)), "Must have LP tokens to remove");

    const tx = await program.methods
      .removeLiquidity(liquidityAmountToRemove, amountAMin, amountBMin)
      .accounts({
        user: user.publicKey,
        pool: poolPda,
        poolAuthority: poolAuthorityPda,
        tokenAAccount: tokenAAccountPda, // Pool's vault
        tokenBAccount: tokenBAccountPda, // Pool's vault
        lpMint: lpMint,
        userTokenAAccount: userTokenAAccount, // User's destination account
        userTokenBAccount: userTokenBAccount, // User's destination account
        userLpTokenAccount: userLpTokenAccount, // User's source LP account
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Remove Liquidity transaction signature", tx);

    // Verify pool state
    const finalPoolAccount = await program.account.pool.fetch(poolPda);
    const finalLpSupply = finalPoolAccount.totalLiquidity; // This is BN
    const finalPoolAReserve_bi = (await getAccount(provider.connection, tokenAAccountPda)).amount;
    const finalPoolBReserve_bi = (await getAccount(provider.connection, tokenBAccountPda)).amount;
    const finalUserAReserve_bi = (await getAccount(provider.connection, userTokenAAccount)).amount;
    const finalUserBReserve_bi = (await getAccount(provider.connection, userTokenBAccount)).amount;
    const finalUserLpBalance_bi = (await getAccount(provider.connection, userLpTokenAccount)).amount;
    const finalPoolAReserve = new BN(finalPoolAReserve_bi.toString());
    const finalPoolBReserve = new BN(finalPoolBReserve_bi.toString());
    const finalUserAReserve = new BN(finalUserAReserve_bi.toString());
    const finalUserBReserve = new BN(finalUserBReserve_bi.toString());
    const finalUserLpBalance = new BN(finalUserLpBalance_bi.toString());


    // Verify LP supply decreased and user LP balance decreased
    assert.ok(finalLpSupply.lt(initialLpSupply), "LP supply should decrease");
    assert.ok(finalUserLpBalance.lt(initialUserLpBalance), "User LP balance should decrease"); // Use BN comparison
    assert.ok(initialLpSupply.sub(finalLpSupply).eq(liquidityAmountToRemove), "Incorrect LP supply reduction");
    assert.ok(initialUserLpBalance.sub(finalUserLpBalance).eq(liquidityAmountToRemove), "Incorrect user LP balance reduction");


    // Verify token movements
    assert.ok(finalPoolAReserve.lt(initialPoolAReserve), "Pool A reserve should decrease"); // Use BN comparison
    assert.ok(finalPoolBReserve.lt(initialPoolBReserve), "Pool B reserve should decrease"); // Use BN comparison
    assert.ok(finalUserAReserve.gt(initialUserAReserve), "User A reserve should increase"); // Use BN comparison
    assert.ok(finalUserBReserve.gt(initialUserBReserve), "User B reserve should increase"); // Use BN comparison

    // Verify amounts received are >= min amounts
    const amountAReceived = finalUserAReserve.sub(initialUserAReserve); // Use BN subtraction
    const amountBReceived = finalUserBReserve.sub(initialUserBReserve); // Use BN subtraction
    assert.ok(amountAReceived.gte(amountAMin), `Received less Token A than minimum: ${amountAReceived} < ${amountAMin}`);
    assert.ok(amountBReceived.gte(amountBMin), `Received less Token B than minimum: ${amountBReceived} < ${amountBMin}`);

    // Check exact amounts removed from pool
     assert.ok(initialPoolAReserve.sub(finalPoolAReserve).eq(amountAReceived), "Incorrect Token A removed from pool");
     assert.ok(initialPoolBReserve.sub(finalPoolBReserve).eq(amountBReceived), "Incorrect Token B removed from pool");

  });

  // TODO: Add tests for process_vaa (more complex, requires mocking/setting up Wormhole state)
});
