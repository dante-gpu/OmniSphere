import { useMutation } from 'react-query';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'; // Import SYSVAR_RENT_PUBKEY
import { Program, AnchorProvider, BN } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'; // Import ASSOCIATED_TOKEN_PROGRAM_ID
import { sha256 } from 'js-sha256';
import { Buffer } from 'buffer';
// import { trackSolanaToWormhole } from '../lib/wormholePoolBridge.ts'; // Removed old tracking function
import { getWormholeMessageId } from '../lib/wormholePoolBridge.ts'; // Import helper
import { SOLANA_DEVNET_PROGRAM_ID } from '../lib/constants.ts';
import { utils } from 'ethers'; // For parsing amounts
import {
  Wormhole,
  WormholeMessageId,
  Chain,
  Network,
} from '@wormhole-foundation/sdk'; // Import SDK components
import { SolanaPlatform } from '@wormhole-foundation/sdk-solana'; // Import Solana platform
import { SuiPlatform } from '@wormhole-foundation/sdk-sui'; // Import Sui platform (needed for Wormhole init)


// Import the IDL JSON correctly using Vite's JSON import capability
import idlJson from '../../programs/liquidity_pool/target/idl/liquidity_pool_program.json?raw'; // Adjust path as needed, use ?raw
const idl = JSON.parse(idlJson); // Parse the raw JSON string

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

        // Use new SDK to find Wormhole message and fetch VAA
        toast.loading('Tracking Wormhole message using new SDK...', { id: 'wormhole-track-sol-sdk' });

        try {
            const network: Network = "Testnet"; // Assuming Testnet
            const chain: Chain = "Solana";

            // Initialize Wormhole SDK
            const wh = new Wormhole(network, [SolanaPlatform, SuiPlatform]); // Include platforms
            const solanaContext = wh.getChain(chain);
            // solanaContext.rpc = connection; // Removed direct assignment - SDK might handle RPC internally or need different config

            // Parse the transaction to find emitted Wormhole messages
            // The SDK might use its internally configured RPC or require one to be passed here if not set globally.
            // Let's assume for now parseTransaction can work without direct rpc assignment on context.
            const messageIds: WormholeMessageId[] = await solanaContext.parseTransaction(result.txSignature);

            if (!messageIds || messageIds.length === 0) {
                throw new Error("No Wormhole messages found in the transaction.");
            }

            // Assuming the first message is the relevant one
            const messageId = messageIds[0];
            console.log("Found Wormhole Message ID:", messageId);

            // Fetch the VAA bytes
            console.log("Fetching VAA bytes...");
            const vaaBytes = await wh.getVaaBytes(messageId);

            if (!vaaBytes) {
                throw new Error("Could not fetch VAA bytes for the message.");
            }

            console.log("Successfully fetched VAA bytes.");
            const emitterStr = messageId.emitter.toString();
            // Provide a link to the message on Wormholescan
            const explorerLink = `https://testnet.wormholescan.io/#/tx/${result.txSignature}?details=messages`; // Link to messages tab
            const successMsg = `Wormhole message found! Seq: ${messageId.sequence}. Emitter: ${emitterStr.substring(0, 6)}... VAA Bytes fetched. View on Wormholescan: ${explorerLink}`;
            toast.success(successMsg, { id: 'wormhole-track-sol-sdk', duration: 10000 });
            // TODO: Decide what to do with the vaaBytes (e.g., store them, pass to another process).

        } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            toast.error(`Wormhole tracking failed: ${errorMsg}`, { id: 'wormhole-track-sol-sdk' });
            console.error("Wormhole SDK Tracking Error:", error);
        }
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to create Solana pool');
      },
    }
  );
}
