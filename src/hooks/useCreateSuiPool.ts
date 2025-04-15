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
        // Use wallet.chain.id which should be like 'sui:devnet', 'sui:testnet', 'sui:mainnet'
        const chainId = wallet.chain?.id;
        const networkName = chainId?.split(':')[1] as 'devnet' | 'testnet' | 'mainnet' | undefined;

        if (!networkName || !['devnet', 'testnet', 'mainnet'].includes(networkName)) {
             toast.error(`Unsupported or unknown Sui network ID: ${chainId}`);
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

            // Helper function to prepare a coin input for the transaction.
            // It finds the largest coin object, merges smaller ones into it if necessary
            // to reach the required amount, and then splits the exact amount needed.
            const prepareCoinInput = (
                coins: typeof coinsA.data, // Array of coin objects for a specific type
                requiredAmount: bigint,    // The amount needed for the transaction
                tokenSymbol: string        // For logging/error messages
            ): ReturnType<typeof txb.splitCoins>[0] => { // Returns the result of txb.splitCoins
                // Sort coins by balance in descending order to use the largest ones first.
                const sortedCoins = coins.sort((a, b) => BigInt(b.balance) < BigInt(a.balance) ? -1 : 1);

                const primaryCoin = sortedCoins[0];
                if (!primaryCoin) {
                    // This should theoretically be caught by the totalBalance check earlier,
                    // but it's good defensive programming.
                    throw new Error(`No coin objects found for ${tokenSymbol}.`);
                }

                // Get a reference to the primary coin object within the transaction block.
                const primaryCoinRef = txb.object(primaryCoin.coinObjectId);
                let currentBalance = BigInt(primaryCoin.balance);

                // If the largest coin isn't enough, try merging smaller coins into it.
                if (currentBalance < requiredAmount) {
                    const coinsToMergeRefs: ReturnType<typeof txb.object>[] = [];
                    for (let i = 1; i < sortedCoins.length; i++) {
                        coinsToMergeRefs.push(txb.object(sortedCoins[i].coinObjectId));
                        currentBalance += BigInt(sortedCoins[i].balance);
                        // Stop merging as soon as we have enough balance.
                        if (currentBalance >= requiredAmount) {
                            break;
                        }
                    }
                    // Double-check if merging provided enough balance.
                    if (currentBalance < requiredAmount) {
                         // This indicates a potential logic error if the initial totalBalance check passed.
                         throw new Error(`Logic error: Total balance sufficient but couldn't gather enough coins for ${tokenSymbol}.`);
                    }
                    // If we identified coins to merge, add the merge operation to the transaction block.
                    if (coinsToMergeRefs.length > 0) {
                        console.log(`Merging ${coinsToMergeRefs.length} additional coin(s) for ${tokenSymbol}`);
                        txb.mergeCoins(primaryCoinRef, coinsToMergeRefs);
                    }
                }

                // Split the exact required amount from the primary coin (which may now contain merged balances).
                // `splitCoins` returns an array of new coin objects; we take the first one.
                const [splitCoin] = txb.splitCoins(primaryCoinRef, [requiredAmount]);
                return splitCoin;
            };

            // Prepare the specific coin inputs needed for the `create_pool` function call.
            const splitCoinA = prepareCoinInput(coinsA.data, initialLiquidityA, 'Token A');
            const splitCoinB = prepareCoinInput(coinsB.data, initialLiquidityB, 'Token B');
            // --- End Coin Preparation ---


            // --- Move Call ---
            // Construct the call to the `create_pool` function in the deployed Move module.
            // IMPORTANT: Ensure the `target`, `typeArguments`, and `arguments` match the
            // exact signature of the deployed `create_pool` function on-chain.
            // This version assumes the function takes only the two coin objects as arguments
            // besides the implicit context (`ctx`).
            txb.moveCall({
                target: `${SUI_PACKAGE_ID}::liquidity_pool::create_pool`, // Function identifier: package::module::function
                typeArguments: [tokenAAddress, tokenBAddress], // Generic types for the pool (CoinTypeA, CoinTypeB)
                arguments: [
                    splitCoinA, // The prepared coin object for Token A.
                    splitCoinB, // The prepared coin object for Token B.
                ],
            });

            // Set a gas budget for the transaction. Adjust as needed based on network conditions and transaction complexity.
            txb.setGasBudget(30_000_000); // Using underscores for readability

            console.log('Transaction Block Data:', JSON.stringify(txb.blockData, null, 2));


            // --- Sign and Execute ---
            // Use the connected wallet adapter (`@suiet/wallet-kit`) to sign and execute the transaction block.
            const result: SuiSignAndExecuteTransactionOutput = await wallet.signAndExecuteTransaction({
                transaction: txb, // Pass the constructed Transaction instance.
            });

            console.log('Transaction submitted:', result);
            toast.success(`Pool creation transaction submitted! Digest: ${result.digest.substring(0, 10)}...`);

            // --- Transaction Confirmation and Result Parsing ---
            console.log('Waiting for transaction confirmation and fetching details for digest:', result.digest);
            // Fetch the transaction details using the digest to get the effects and object changes.
            // `showEffects` and `showObjectChanges` are crucial for seeing the outcome.
            const txDetails = await client.getTransactionBlock({
                digest: result.digest,
                options: { showEffects: true, showObjectChanges: true }, // Request effects and object changes
            });
            console.log('Full Transaction Details:', txDetails);

            // Check if the transaction was successful based on effects status.
            if (txDetails.effects?.status.status !== 'success') {
                throw new Error(`Transaction failed: ${txDetails.effects?.status.error || 'Unknown error'}`);
            }

            toast.success(`Pool created successfully! Digest: ${result.digest.substring(0, 10)}...`);

            // Attempt to find the newly created Pool object ID.
            // Using `objectChanges` is generally more reliable as it provides the object type.
            const objectChanges = txDetails.objectChanges;
            if (objectChanges) {
                // Find the change record for an object that was 'created' and matches the Pool type structure.
                const createdPoolChange = objectChanges.find(
                    (change): change is SuiObjectChangeCreated => // Type guard to ensure correct properties
                        change.type === 'created' &&
                        change.objectType.endsWith('::liquidity_pool::Pool') // Check if the type string ends with the Pool struct name
                );
                if (createdPoolChange) {
                    console.log("Created Pool Object ID:", createdPoolChange.objectId);
                    console.log("Created Pool Object Type:", createdPoolChange.objectType);
                    // TODO: Potentially return or store this pool ID for later use.
                } else {
                    console.warn("Could not find created Pool object in objectChanges.");
                }
            } else {
                console.warn("Transaction details did not include objectChanges.");
                // Fallback: Look at effects.created (less reliable for type checking)
                const effects = txDetails.effects;
                if (effects?.created && effects.created.length > 0) {
                     console.log("Found created objects in effects (type unknown without objectChanges):", effects.created.map(o => o.reference.objectId));
                }
            }

        } catch (error: any) {
            console.error('Error creating Sui pool:', error);
            let errorMessage = error.message || error.toString();
            // Provide more user-friendly error messages for common issues.
             if (error instanceof Error && error.message.includes('InsufficientGas')) {
                 errorMessage = 'Insufficient gas budget for the transaction.';
            } else if (error instanceof Error && (error.message.includes('Coin balance insufficient') || error.message.includes('Insufficient balance'))) {
                 errorMessage = 'Insufficient token balance for the initial liquidity amount.';
            } else if (error instanceof Error && error.message.includes('Unable to fetch') || error.message.includes('Failed to fetch')) {
                errorMessage = `Network error or potentially invalid token address: ${errorMessage}`;
            } else if (error instanceof Error && error.message.includes('Transaction failed:')) {
                // Extract the specific error from the transaction failure message if available
                errorMessage = error.message;
            }
            // Add more specific error checks based on common Sui contract errors if needed.
            toast.error(`Failed to create pool: ${errorMessage}`);
        }
    };

    return { createPool };
};
