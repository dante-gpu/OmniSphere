import { useMutation } from 'react-query';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { PublicKey, SystemProgram, Transaction, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'; // Import SYSVAR_RENT_PUBKEY
import { Program, AnchorProvider, BN, web3 } from '@project-serum/anchor'; // Import web3 from anchor
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { sha256 } from 'js-sha256';
import { Buffer } from 'buffer';
import { trackSolanaToWormhole } from '../lib/wormholePoolBridge.ts'; // Import the tracking function
import { SOLANA_DEVNET_PROGRAM_ID } from '../lib/constants.ts'; // Import program ID constant

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
  feeBasisPoints: number; // Fee in basis points (e.g., 30 for 0.3%)
  // Amounts are not needed for pool creation itself, only for initial liquidity
}

// Define specific result type
type SolanaPoolCreationResult = { success: boolean; poolId: string; txSignature: string }; // Return actual signature

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
        const txSignature = await program.methods
          .createPool(new BN(input.feeBasisPoints), poolIdArg)
          .accounts({
            creator: provider.wallet.publicKey,
            pool: poolPda,
            poolAuthority: poolAuthorityPda,
            tokenAMint: tokenAMint,
            tokenBMint: tokenBMint,
            lpMint: lpMintPda,
            tokenAAccount: tokenAAccountPda,
            tokenBAccount: tokenBAccountPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY, // Use imported SYSVAR_RENT_PUBKEY
          })
          .rpc(); // Use rpc() to build, sign, and send

        console.log("Solana create_pool transaction successful:", txSignature);

        return { success: true, poolId: poolPda.toBase58(), txSignature };

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
      onSuccess: async (result) => { // Make onSuccess async
        toast.success(`Solana pool creation submitted! Signature: ${result.txSignature.substring(0, 10)}...`);
        console.log("Solana Pool Creation Submitted:", result);

        // Initiate Wormhole bridge tracking
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
          // Optional: Provide link to Wormholescan
          const explorerLink = `https://wormholescan.io/#/tx/${result.txSignature}?network=TESTNET&chain=solana`;
          const successMsg = `Wormhole message found! Seq: ${sequence}. Emitter: ${emitterAddress.substring(0, 6)}... View on Wormholescan: ${explorerLink}`;
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
