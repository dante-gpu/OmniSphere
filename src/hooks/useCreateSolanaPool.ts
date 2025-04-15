import { useMutation } from 'react-query';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'; // Import SYSVAR_RENT_PUBKEY
import { Program, AnchorProvider, BN } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'; // Import ASSOCIATED_TOKEN_PROGRAM_ID
import { sha256 } from 'js-sha256';
import { Buffer } from 'buffer';
import { trackSolanaToWormhole } from '../lib/wormholePoolBridge.ts';
import { SOLANA_DEVNET_PROGRAM_ID } from '../lib/constants.ts';
import { utils } from 'ethers'; // For parsing amounts

// Assuming your IDL is imported/available, replace with actual import
import idl from '../../programs/liquidity_pool/target/idl/liquidity_pool_program.json'; // Adjust path as needed

// --- Constants ---
const SOLANA_PROGRAM_ID = new PublicKey(SOLANA_DEVNET_PROGRAM_ID); // Use constant

// Define the token mapping (replace with import from a constants file if preferred)
const SOL_TOKEN_MAP: { [symbol: string]: { mint_address: string; decimals: number } } = {
  "SOL": {
    "mint_address": "So11111111111111111111111111111111111111112",
    "decimals": 9
  },
  "USDC": {
    "mint_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Using Devnet address provided
    "decimals": 6
  },
  "USDT": {
    "mint_address": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // Using Devnet address provided
    "decimals": 6
  }
};

// Define the input type for the hook
interface CreateSolanaPoolInput {
  token1Symbol: string;
  token2Symbol: string;
  feeBasisPoints: number;
  token1Amount: string; // Amount needed for initial liquidity
  token2Amount: string; // Amount needed for initial liquidity
}

// Define specific result type
// txSignature will now be for the add_liquidity tx
type SolanaPoolCreationResult = { success: boolean; poolId: string; txSignature: string };

// Helper function to generate deterministic pool ID
const generatePoolId = (mintA: PublicKey, mintB: PublicKey): Buffer => {
  const mintABytes = mintA.toBuffer();
  const mintBBytes = mintB.toBuffer();
  // Sort buffers lexicographically
  const sortedMints = Buffer.compare(mintABytes, mintBBytes) < 0
    ? [mintABytes, mintBBytes]
    : [mintBBytes, mintABytes];
  const concatenated = Buffer.concat(sortedMints);
  const hash = sha256.digest(concatenated);
  return Buffer.from(hash);
};

export function useCreateSolanaPool() {
  const solanaWallet = useSolanaWallet();
  const { connection } = useConnection(); // Get connection from adapter

  return useMutation<SolanaPoolCreationResult, Error, CreateSolanaPoolInput>(
    async (input: CreateSolanaPoolInput): Promise<SolanaPoolCreationResult> => {
      if (!solanaWallet.connected || !solanaWallet.publicKey || !solanaWallet.signTransaction || !connection) {
        throw new Error('Please connect your Solana wallet and ensure it supports signing.');
      }

      const token1Info = SOL_TOKEN_MAP[input.token1Symbol];
      const token2Info = SOL_TOKEN_MAP[input.token2Symbol];

      if (!token1Info || !token2Info) {
        throw new Error(`Unsupported token symbol provided: ${!token1Info ? input.token1Symbol : ''} ${!token2Info ? input.token2Symbol : ''}`);
      }
      if (token1Info.mint_address === token2Info.mint_address) {
        throw new Error("Cannot create a pool with the same token.");
      }

      console.log(`Creating Solana pool: ${input.token1Symbol}-${input.token2Symbol} with fee ${input.feeBasisPoints} bps`);

      try {
        // 1. Setup Anchor Provider and Program
        const provider = new AnchorProvider(connection, solanaWallet as any, AnchorProvider.defaultOptions());
        const program = new Program(idl as any, SOLANA_PROGRAM_ID, provider);

        // 2. Get Mint PublicKeys
        const tokenAMint = new PublicKey(token1Info.mint_address);
        const tokenBMint = new PublicKey(token2Info.mint_address);

        // 3. Generate deterministic Pool ID (as Buffer, then convert to [u8; 32])
        const poolIdBuffer = generatePoolId(tokenAMint, tokenBMint);
        const poolIdArray = Array.from(poolIdBuffer); // Convert Buffer to number array
        if (poolIdArray.length !== 32) {
            throw new Error("Generated pool ID is not 32 bytes long.");
        }
        const poolIdArg = poolIdArray; // Use the number array directly

        // 4. Find PDAs
        const [poolPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("pool"), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
          program.programId
        );
        const [poolAuthorityPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("authority"), poolPda.toBuffer()],
          program.programId
        );
        const [lpMintPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("lp_mint"), poolPda.toBuffer()],
          program.programId
        );
        const [tokenAAccountPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_a"), poolPda.toBuffer()],
          program.programId
        );
        const [tokenBAccountPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_b"), poolPda.toBuffer()],
          program.programId
        );

        // 5. Build the transaction
        // 5. Build and send createPool transaction
        const createPoolTxSignature = await program.methods
          .createPool(new BN(input.feeBasisPoints), poolIdArg)
          .accounts({
            creator: provider.wallet.publicKey, // User pays for account creation
            pool: poolPda,
            poolAuthority: poolAuthorityPda,
            tokenAMint: tokenAMint,
            tokenBMint: tokenBMint,
            lpMint: lpMintPda,
            tokenAAccount: tokenAAccountPda,
            tokenBAccount: tokenBAccountPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        console.log("Solana create_pool transaction successful:", createPoolTxSignature);
        await connection.confirmTransaction(createPoolTxSignature, 'confirmed');
        console.log("Solana create_pool transaction confirmed.");

        // 6. Build and send addLiquidity transaction for initial deposit
        console.log("Adding initial liquidity...");

        // Parse amounts
        const amount1BigInt = utils.parseUnits(input.token1Amount, token1Info.decimals);
        const amount2BigInt = utils.parseUnits(input.token2Amount, token2Info.decimals);

        // Get user's ATA addresses (assuming they exist, might need creation logic elsewhere)
        const userTokenAAccount = getAssociatedTokenAddressSync(tokenAMint, provider.wallet.publicKey);
        const userTokenBAccount = getAssociatedTokenAddressSync(tokenBMint, provider.wallet.publicKey);
        const userLpTokenAccount = getAssociatedTokenAddressSync(lpMintPda, provider.wallet.publicKey); // ATA for the LP mint PDA

        const addLiquidityTxSignature = await program.methods
            .addLiquidity(
                new BN(amount1BigInt.toString()), // amount_a_desired
                new BN(amount2BigInt.toString()), // amount_b_desired
                new BN(0), // amount_a_min (set to 0 for initial liquidity)
                new BN(0)  // amount_b_min (set to 0 for initial liquidity)
            )
            .accounts({
                user: provider.wallet.publicKey,
                pool: poolPda,
                poolAuthority: poolAuthorityPda,
                tokenAAccount: tokenAAccountPda,
                tokenBAccount: tokenBAccountPda,
                userTokenA: userTokenAAccount,
                userTokenB: userTokenBAccount,
                lpMint: lpMintPda,
                userLpTokenAccount: userLpTokenAccount,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, // Use imported constant
                rent: SYSVAR_RENT_PUBKEY,
            })
            .rpc();

        console.log("Solana add_liquidity transaction successful:", addLiquidityTxSignature);
        await connection.confirmTransaction(addLiquidityTxSignature, 'confirmed');
        console.log("Solana add_liquidity transaction confirmed.");

        // Return the signature of the add_liquidity tx for Wormhole tracking
        return { success: true, poolId: poolPda.toBase58(), txSignature: addLiquidityTxSignature };

      } catch (error: any) {
        console.error("Solana pool creation failed:", error);
        if (error?.message?.includes('Transaction rejected')) {
          throw new Error('Solana transaction rejected by user.');
        }
        // Add more specific error handling if possible
        throw new Error(`Solana pool creation failed: ${error?.message || 'Unknown error'}`);
      }
    },
    {
      onSuccess: async (result) => {
        // Toast updated to reflect both steps completed before tracking
        toast.success(`Solana pool created & initial liquidity added! Signature: ${result.txSignature.substring(0, 10)}...`);
        console.log("Solana Pool Creation & Initial Liquidity Submitted:", result);

        // Initiate Wormhole bridge tracking using the add_liquidity signature
        toast.loading('Tracking Wormhole message...', { id: 'wormhole-track-sol' });
        const bridgeResult = await trackSolanaToWormhole(
            connection, // Use connection from useConnection hook
            result.txSignature,
            SOLANA_PROGRAM_ID.toBase58() // Pass program ID as string
        );

        if (bridgeResult.error) {
          toast.error(`Wormhole tracking failed: ${bridgeResult.error}`, { id: 'wormhole-track-sol' });
          console.error("Wormhole Tracking Error:", bridgeResult.error);
        } else if (bridgeResult.wormholeMessageInfo) {
          const { sequence, emitterAddress } = bridgeResult.wormholeMessageInfo;
          const emitterStr = emitterAddress.toString(); // Convert UniversalAddress to string
          // Optional: Provide link to Wormholescan
          const explorerLink = `https://wormholescan.io/#/tx/${result.txSignature}?network=TESTNET&chain=solana`;
          const successMsg = `Wormhole message found! Seq: ${sequence}. Emitter: ${emitterStr.substring(0, 6)}... View on Wormholescan: ${explorerLink}`; // Use emitterStr
          toast.success(successMsg, { id: 'wormhole-track-sol', duration: 8000 });
          console.log("Wormhole Tracking Success:", bridgeResult);
          // TODO: Potentially store VAA bytes or pass them to another function
        } else {
           toast.error('Wormhole tracking completed but no message info found.', { id: 'wormhole-track-sol' });
        }
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to create Solana pool');
      },
    }
  );
}
