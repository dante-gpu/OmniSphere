import { SuiClient, getFullnodeUrl, OwnedObjectRef, TransactionEffects, SuiObjectChange, SuiObjectChangeCreated } from '@mysten/sui/client'; 
import { Transaction } from '@mysten/sui/transactions';
import { WalletContextState } from '@suiet/wallet-kit';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard'; // Import the CORRECT type from the correct package
import { toast } from 'react-toastify';
import { SUI_PACKAGE_ID } from '../lib/constants'; // Assuming constants are defined - Removed unused SUI_ADMIN_CAP_ID, SUI_CLOCK_ID

interface CreateSuiPoolParams {
    wallet: WalletContextState;
    tokenAAddress: string; // CoinType for Token A
    tokenBAddress: string; // CoinType for Token B
    initialLiquidityA: bigint;
    initialLiquidityB: bigint;
    // Removed unused fee parameters as the current contract doesn't use them
    // feeNumerator: bigint;
    // feeDenominator: bigint;
}

export const useCreateSuiPool = () => {
    const createPool = async ({
        wallet,
        tokenAAddress,
        tokenBAddress,
        initialLiquidityA,
        initialLiquidityB,
        // Removed unused fee parameters
    }: CreateSuiPoolParams) => {
        if (!wallet.connected || !wallet.address) {
            toast.error('Please connect your Sui wallet.');
            return;
        }

        // Determine the network from the connected wallet's chain info
        // Assuming wallet.chain.name format like 'sui:devnet', 'sui:testnet', 'sui:mainnet'
        const networkName = wallet.chain?.name?.split(':')[1] as 'devnet' | 'testnet' | 'mainnet' | undefined;

        if (!networkName || !['devnet', 'testnet', 'mainnet'].includes(networkName)) {
             toast.error(`Unsupported or unknown Sui network: ${wallet.chain?.name}`);
             console.error("Unsupported Sui network:", wallet.chain);
             return;
        }
        console.log(`Connecting SuiClient to: ${networkName}`);
        const client = new SuiClient({ url: getFullnodeUrl(networkName) });


        try {
            const txb = new Transaction(); // Instantiate Transaction

            // --- Robust Coin Selection Logic ---
            // 1. Fetch all coins of type A and B for the user
            const coinsA = await client.getCoins({ owner: wallet.address, coinType: tokenAAddress });
            const coinsB = await client.getCoins({ owner: wallet.address, coinType: tokenBAddress });

            // 2. Calculate total balance for each token type
            const totalBalanceA = coinsA.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
            const totalBalanceB = coinsB.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));

            // 3. Check if balances are sufficient
            if (totalBalanceA < initialLiquidityA) {
                throw new Error(`Insufficient balance for Token A. Required: ${initialLiquidityA}, Available: ${totalBalanceA}`);
            }
            if (totalBalanceB < initialLiquidityB) {
                throw new Error(`Insufficient balance for Token B. Required: ${initialLiquidityB}, Available: ${totalBalanceB}`);
            }

            // 4. Prepare coin inputs for the transaction
            // This uses txb.splitCoins which requires a single coin object large enough.
            // If the required amount is split across multiple coin objects, they need to be merged first.
            // For simplicity, we'll find the largest coin and try to split from it.
            // A more robust solution would merge coins if necessary.

            const findLargestCoin = (coins: typeof coinsA.data) => coins.sort((a, b) => BigInt(b.balance) < BigInt(a.balance) ? -1 : 1)[0];

            const largestCoinA = findLargestCoin(coinsA.data);
            const largestCoinB = findLargestCoin(coinsB.data);

            // --- Enhanced Coin Selection & Merging ---
            const prepareCoinInput = (
                coins: typeof coinsA.data,
                requiredAmount: bigint,
                tokenSymbol: string // For error messages
            ): ReturnType<typeof txb.splitCoins>[0] => {
                // Sort coins descending by balance
                const sortedCoins = coins.sort((a, b) => BigInt(b.balance) < BigInt(a.balance) ? -1 : 1);

                // Find the primary coin (largest balance)
                const primaryCoin = sortedCoins[0];
                if (!primaryCoin) {
                    throw new Error(`No coin objects found for ${tokenSymbol}.`); // Should be caught by balance check earlier, but good practice
                }

                const primaryCoinRef = txb.object(primaryCoin.coinObjectId);
                let currentBalance = BigInt(primaryCoin.balance);

                // If primary coin is not enough, merge others into it
                if (currentBalance < requiredAmount) {
                    const coinsToMerge: ReturnType<typeof txb.object>[] = [];
                    for (let i = 1; i < sortedCoins.length; i++) {
                        coinsToMerge.push(txb.object(sortedCoins[i].coinObjectId));
                        currentBalance += BigInt(sortedCoins[i].balance);
                        if (currentBalance >= requiredAmount) {
                            break; // Stop merging once we have enough
                        }
                    }
                    // Check again after potential merge candidates are identified
                    if (currentBalance < requiredAmount) {
                         // This should ideally not happen if totalBalance check passed, but handles edge cases
                         throw new Error(`Logic error: Total balance sufficient but couldn't gather enough coins for ${tokenSymbol}.`);
                    }
                    if (coinsToMerge.length > 0) {
                        console.log(`Merging ${coinsToMerge.length} additional coin(s) for ${tokenSymbol}`);
                        txb.mergeCoins(primaryCoinRef, coinsToMerge);
                    }
                }

                // Split the required amount from the primary coin (which might have been merged into)
                const [splitCoin] = txb.splitCoins(primaryCoinRef, [requiredAmount]);
                return splitCoin;
            };

            const splitCoinA = prepareCoinInput(coinsA.data, initialLiquidityA, 'Token A');
            const splitCoinB = prepareCoinInput(coinsB.data, initialLiquidityB, 'Token B');
            // --- End Enhanced Coin Selection ---


            // Call the create_pool function from the Move module
            // NOTE: The Move contract version read ('sui/sources/liquidity_pool.move')
            // only takes coin_a, coin_b, and ctx. It does NOT take AdminCap or fee arguments.
            // Adjusting the call accordingly. If your deployed contract *does* take those,
            // revert this call to the previous version.
            txb.moveCall({
                target: `${SUI_PACKAGE_ID}::liquidity_pool::create_pool`,
                typeArguments: [tokenAAddress, tokenBAddress], // Specify the coin types
                arguments: [
                    // Arguments based on the contract version read:
                    splitCoinA, // Pass the split coin object for token A
                    splitCoinB, // Pass the split coin object for token B
                    // ctx is implicit
                ],
            });

            // Set gas budget, etc.
            txb.setGasBudget(30000000); // Increased budget slightly

            console.log('Transaction Block:', JSON.stringify(txb.blockData, null, 2));


            // Sign and execute the transaction
            // Aligning with @suiet/wallet-kit documentation example
            // Use the correct return type from the wallet kit method
            const result: SuiSignAndExecuteTransactionOutput = await wallet.signAndExecuteTransaction({
                transaction: txb, // Pass the Transaction instance using the 'transaction' property
            });

            console.log('Transaction Result (from wallet kit):', result);
            toast.success(`Pool created successfully! Digest: ${result.digest}`);

            // Fetch the full transaction details to get parsed effects
            console.log('Fetching full transaction details for digest:', result.digest);
            const txDetails = await client.getTransactionBlock({
                digest: result.digest,
                options: { showEffects: true }, // Ensure effects are included and parsed
            });
            console.log('Full Transaction Details:', txDetails);

            // Optional: Find the created pool object ID from the parsed effects or object changes
            const effects: TransactionEffects | null | undefined = txDetails.effects; // Allow null type
            const objectChanges: SuiObjectChange[] | null | undefined = txDetails.objectChanges; // Allow null type

            // Example using objectChanges (more reliable for finding created object details)
            if (objectChanges) {
                const createdPoolChange = objectChanges.find(
                    (change): change is SuiObjectChangeCreated => // Type guard
                        change.type === 'created' &&
                        change.objectType.includes('::liquidity_pool::Pool') // Check the objectType string
                );
                if (createdPoolChange) {
                    console.log("Created Pool Object ID (from objectChanges):", createdPoolChange.objectId);
                    console.log("Created Pool Object Type:", createdPoolChange.objectType);
                }
            }
            // Example using effects.created (less detailed)
            else if (effects && effects.created && effects.created.length > 0) {
                 const createdObjects: OwnedObjectRef[] = effects.created;
                 // Note: Cannot reliably get objectType from effects.created alone.
                 // You might find *an* object, but confirming it's the pool requires objectChanges or separate fetches.
                 console.log("Found created objects in effects (less detailed):", createdObjects.map(o => o.reference.objectId)); // Correct property access
                 // const poolObjectRef = createdObjects.find(obj => /* some heuristic, but type info isn't here */);
                 // if (poolObjectRef) console.log("Created Pool Object ID (from effects):", poolObjectRef.reference.objectId); // Correct property access
            }


        } catch (error: any) {
            console.error('Error creating Sui pool:', error);
            let errorMessage = error.message || error.toString();
             if (error instanceof Error && error.message.includes('InsufficientGas')) {
                 errorMessage = 'Insufficient gas budget. Please try increasing it or check network fees.';
            } else if (error instanceof Error && error.message.includes('Coin balance insufficient') || error.message.includes('Insufficient balance')) {
                 errorMessage = 'Insufficient token balance for initial liquidity.';
            } else if (error instanceof Error && error.message.includes('Unable to fetch')) {
                errorMessage = `Network error or invalid token address: ${errorMessage}`;
            }
            // Add more specific error checks based on common Sui errors
            toast.error(`Failed to create pool: ${errorMessage}`);
        }
    };

    return { createPool };
};
