import { useMutation } from 'react-query';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import toast from 'react-hot-toast';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'; // Import SuiClient and getFullnodeUrl
import { parseUnits } from 'ethers'; // Using ethers for parsing units

// --- Constants ---
const SUI_PACKAGE_ID = '0xee971f83a4e21e2e1c129d4ea7478451a161fe7efd96e76c576a4df04bda6f4e'; 
const SUI_LIQUIDITY_POOL_MODULE = 'liquidity_pool'; 

// Define the token mapping (replace with import from a constants file if preferred)
const SUI_TOKEN_MAP: { [symbol: string]: { type: string; decimals: number } } = {
  "SUI": {
    "type": "0x2::sui::SUI",
    "decimals": 9
  },
  "USDC": {
    "type": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
    "decimals": 6
  }
};

// Define the input type for the hook
interface CreateSuiPoolInput {
  token1Symbol: string;
  token2Symbol: string;
  token1Amount: string;
  token2Amount: string;
  // slippageTolerance: string; // Slippage might not be needed for pool creation itself
}

// Define specific result type
type SuiPoolCreationResult = { success: boolean; poolId?: string; txDigest: string }; // Return actual digest

export function useCreateSuiPool() {
  const suiWallet = useSuiWallet();
  // Assuming wallet provides network info, default to testnet if not
  const network = suiWallet.chain?.id === 'sui:mainnet' ? 'mainnet' : 'testnet';
  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

  return useMutation<SuiPoolCreationResult, Error, CreateSuiPoolInput>(
    async (input: CreateSuiPoolInput): Promise<SuiPoolCreationResult> => {
      if (!suiWallet.connected || !suiWallet.account) {
        throw new Error('Please connect your Sui wallet first');
      }
      if (!suiWallet.signAndExecuteTransactionBlock) {
        throw new Error('Sui wallet does not support signAndExecuteTransactionBlock');
      }

      const token1Info = SUI_TOKEN_MAP[input.token1Symbol];
      const token2Info = SUI_TOKEN_MAP[input.token2Symbol];

      if (!token1Info || !token2Info) {
        throw new Error(`Unsupported token symbol provided: ${!token1Info ? input.token1Symbol : ''} ${!token2Info ? input.token2Symbol : ''}`);
      }

      console.log(`Creating Sui pool: ${input.token1Symbol}-${input.token2Symbol}`);
      console.log(`Initial Amounts: ${input.token1Amount} ${input.token1Symbol}, ${input.token2Amount} ${input.token2Symbol}`);

      try {
        const txb = new TransactionBlock();

        // 1. Parse amounts based on decimals
        const amount1BigInt = parseUnits(input.token1Amount, token1Info.decimals);
        const amount2BigInt = parseUnits(input.token2Amount, token2Info.decimals);

        // 2. Prepare Coin objects for transfer
        // This is a simplified approach assuming the user has sufficient balance in primary coin objects.
        // A robust solution would query coins and potentially merge/split as needed.
        let coin1Object;
        if (token1Info.type === '0x2::sui::SUI') {
          [coin1Object] = txb.splitCoins(txb.gas, [txb.pure(amount1BigInt.toString())]);
        } else {
          // Find a coin of the specified type - this needs error handling and better selection logic
          const coins = await suiClient.getCoins({ owner: suiWallet.account.address, coinType: token1Info.type });
          if (coins.data.length === 0) throw new Error(`Insufficient ${input.token1Symbol} balance or no suitable coin object found.`);
          // For simplicity, take the first coin object ID. A real app should select coins to cover the amount.
          const primaryCoin1Id = coins.data[0].coinObjectId;
          [coin1Object] = txb.splitCoins(txb.object(primaryCoin1Id), [txb.pure(amount1BigInt.toString())]);
        }

        let coin2Object;
        if (token2Info.type === '0x2::sui::SUI') {
          // Cannot split gas twice in the same way, handle SUI-SUI pair if needed or adjust logic
          if (token1Info.type === '0x2::sui::SUI') throw new Error("Cannot use SUI for both tokens with this simplified coin handling.");
          [coin2Object] = txb.splitCoins(txb.gas, [txb.pure(amount2BigInt.toString())]);
        } else {
          const coins = await suiClient.getCoins({ owner: suiWallet.account.address, coinType: token2Info.type });
          if (coins.data.length === 0) throw new Error(`Insufficient ${input.token2Symbol} balance or no suitable coin object found.`);
          const primaryCoin2Id = coins.data[0].coinObjectId;
          [coin2Object] = txb.splitCoins(txb.object(primaryCoin2Id), [txb.pure(amount2BigInt.toString())]);
        }

        // 3. Call the create_pool function
        txb.moveCall({
          target: `${SUI_PACKAGE_ID}::${SUI_LIQUIDITY_POOL_MODULE}::create_pool`,
          typeArguments: [token1Info.type, token2Info.type],
          arguments: [
            coin1Object, // The Coin<Token1> object
            coin2Object, // The Coin<Token2> object
          ],
        });

        console.log("Requesting Sui wallet signature for create_pool...");
        // Re-adding 'as any' to bypass potential type mismatch with wallet kit function
        const result = await suiWallet.signAndExecuteTransactionBlock({
          transactionBlock: txb as any,
        });
        console.log("Sui create_pool transaction successful:", result);

        // TODO: Extract actual Pool ID from events if the contract emits it upon creation
        // For now, returning digest. The caller might need to query based on digest.
        return { success: true, txDigest: result.digest };

      } catch (error: any) {
        console.error("Sui pool creation failed:", error);
        if (error?.message?.includes('User rejected the request')) {
          throw new Error('Sui transaction rejected by user.');
        }
        // Add more specific error handling if possible (e.g., insufficient balance)
        throw new Error(`Sui pool creation failed: ${error?.message || 'Unknown error'}`);
      }
    },
    {
      onSuccess: (result) => {
        toast.success(`Sui pool creation submitted! Digest: ${result.txDigest.substring(0, 10)}...`);
        console.log("Sui Pool Creation Submitted:", result);
        // TODO: Initiate Wormhole bridge tracking here using result.txDigest
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to create Sui pool');
      },
    }
  );
}
