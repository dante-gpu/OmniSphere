import { useMutation } from 'react-query';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import toast from 'react-hot-toast';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { parseUnits } from 'ethers';
import { trackSuiToWormhole } from '../lib/wormholePoolBridge.ts';
import { SUI_PACKAGE_ID, SOLANA_DEVNET_PROGRAM_ID } from '../lib/constants.ts';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer'; // Import Buffer

// --- Constants ---
const SUI_LIQUIDITY_POOL_MODULE = 'liquidity_pool';
const SUI_BRIDGE_INTERFACE_MODULE = 'bridge_interface'; // Add bridge module

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

// Define specific result type (txDigest will be for the *publish* transaction)
type SuiPoolCreationResult = { success: boolean; poolObjectId?: string; txDigest: string };

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

        // 2. Prepare Coin objects for transfer (More Robust Approach)
        const owner = suiWallet.account.address;

        const prepareCoin = async (tokenSymbol: string, tokenInfo: { type: string; decimals: number }, amountBigInt: bigint) => {
            if (tokenInfo.type === '0x2::sui::SUI') {
                // For SUI, split directly from gas
                const [suiCoin] = txb.splitCoins(txb.gas, [txb.pure(amountBigInt.toString())]);
                return suiCoin;
            } else {
                // For other tokens, find coins, merge if necessary, then split
                const coins = await suiClient.getCoins({ owner, coinType: tokenInfo.type });
                if (coins.data.length === 0) {
                    throw new Error(`No ${tokenSymbol} coins found in wallet.`);
                }

                // Check total balance
                const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
                if (totalBalance < amountBigInt) {
                    throw new Error(`Insufficient ${tokenSymbol} balance. Required: ${amountBigInt}, Available: ${totalBalance}`);
                }

                // Select coins to cover the amount
                const inputCoinObjects = [];
                let collectedAmount = 0n;
                for (const coin of coins.data) {
                    inputCoinObjects.push(txb.object(coin.coinObjectId));
                    collectedAmount += BigInt(coin.balance);
                    if (collectedAmount >= amountBigInt) break;
                }

                // Merge coins if more than one is needed
                const primaryCoin = inputCoinObjects.shift()!; // Take the first coin
                if (inputCoinObjects.length > 0) {
                    txb.mergeCoins(primaryCoin, inputCoinObjects);
                }

                // Split the required amount
                const [splitCoin] = txb.splitCoins(primaryCoin, [txb.pure(amountBigInt.toString())]);
                return splitCoin;
            }
        };

        const coin1Object = await prepareCoin(input.token1Symbol, token1Info, amount1BigInt);
        const coin2Object = await prepareCoin(input.token2Symbol, token2Info, amount2BigInt);

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
        const result = await suiWallet.signAndExecuteTransactionBlock({
          transactionBlock: txb as any,
        });
        console.log("Sui create_pool transaction successful:", result);

        // --- Find the created Pool Object ID ---
        let poolObjectId: string | undefined;
        if (result.objectChanges) {
             const createdPoolChange = result.objectChanges.find(
                 (change) => change.type === 'created' &&
                              change.objectType.startsWith(`${SUI_PACKAGE_ID}::${SUI_LIQUIDITY_POOL_MODULE}::Pool<`)
             );
             // Access objectId safely after checking the type
             if (createdPoolChange && createdPoolChange.type === 'created') {
                poolObjectId = createdPoolChange.objectId;
             }
        }
         // Fallback to effects if needed
        if (!poolObjectId && result.effects?.created?.length) {
             const createdPoolEffect = result.effects.created.find(
                 (eff) => typeof eff.owner === 'object' && 'Shared' in eff.owner
             );
             poolObjectId = createdPoolEffect?.reference?.objectId;
         }

        if (!poolObjectId) {
            console.error("Could not find created Pool Object ID in transaction effects/changes:", result);
            throw new Error("Failed to find created Pool Object ID after transaction.");
        }
        console.log("Found created Pool Object ID:", poolObjectId);

        // --- 4. Call publish_create_pool_message ---
        console.log("Publishing Wormhole message for pool creation...");
        const txb2 = new TransactionBlock();
        // Convert Solana Program ID to bytes using Buffer
        const targetProgramAddressBytes = Buffer.from(
            new PublicKey(SOLANA_DEVNET_PROGRAM_ID).toBytes()
        );

        txb2.moveCall({
            target: `${SUI_PACKAGE_ID}::${SUI_BRIDGE_INTERFACE_MODULE}::publish_create_pool_message`,
            typeArguments: [token1Info.type, token2Info.type],
            arguments: [
                txb2.object(poolObjectId), // Pass the Pool object ID
                txb2.pure(CHAIN_ID_SOLANA, 'u16'),
                txb2.pure(Array.from(targetProgramAddressBytes), 'vector<u8>'), // Pass target address as bytes
            ],
        });

        const publishResult = await suiWallet.signAndExecuteTransactionBlock({
            transactionBlock: txb2 as any,
        });
        console.log("Sui publish_create_pool_message transaction successful:", publishResult);

        // Return the digest of the *publish* transaction for tracking
        return { success: true, poolObjectId, txDigest: publishResult.digest };

      } catch (error: any) {
        console.error("Sui pool creation or message publishing failed:", error);
        if (error?.message?.includes('User rejected the request')) {
          throw new Error('Sui transaction rejected by user.');
        }
        throw new Error(`Sui pool creation failed: ${error?.message || 'Unknown error'}`);
      }
    },
    {
      onSuccess: async (result) => {
        toast.success(`Sui pool created & message published! Digest: ${result.txDigest.substring(0, 10)}...`);
        console.log("Sui Pool Creation & Message Publish Submitted:", result);

        // Initiate Wormhole bridge tracking using the *publish* transaction digest
        toast.loading('Tracking Wormhole message...', { id: 'wormhole-track-sui' });
        const bridgeResult = await trackSuiToWormhole(suiClient, result.txDigest);

        if (bridgeResult.error) {
          toast.error(`Wormhole tracking failed: ${bridgeResult.error}`, { id: 'wormhole-track-sui' });
          console.error("Wormhole Tracking Error:", bridgeResult.error);
        } else if (bridgeResult.wormholeMessageInfo) {
          const { sequence, emitterAddress } = bridgeResult.wormholeMessageInfo;
          const explorerLink = `https://wormholescan.io/#/tx/${result.txDigest}?network=TESTNET&chain=sui`;
          const successMsg = `Wormhole message found! Seq: ${sequence}. Emitter: ${emitterAddress.substring(0, 6)}... View on Wormholescan: ${explorerLink}`;
          toast.success(successMsg, { id: 'wormhole-track-sui', duration: 8000 });
          console.log("Wormhole Tracking Success:", bridgeResult);
        } else {
           toast.error('Wormhole tracking completed but no message info found.', { id: 'wormhole-track-sui' });
        }
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to create Sui pool');
      },
    }
  );
}
