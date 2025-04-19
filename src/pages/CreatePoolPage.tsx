import { useState, useMemo } from 'react'; // Kept named imports
import { Link } from 'react-router-dom'; // Removed useNavigate
import { ArrowLeft, Settings, ChevronDown, Plus } from 'lucide-react'; // Removed Info, RefreshCw
import { useWallet } from '@suiet/wallet-kit'; // Import useWallet
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card'; // Import Card parts
import { TokenSelect } from '../components/forms/TokenSelect';
import { TokenInput } from '../components/forms/TokenInput';
import { Dropdown } from '../components/ui/Dropdown';
// Import the new chain-specific hooks
import { useCreateSuiPool } from '../hooks/useCreateSuiPool';
import { useCreateSolanaPool } from '../hooks/useCreateSolanaPool';
import { Alert } from '../components/ui/Alert'; // Import Alert
import toast from 'react-hot-toast'; // Re-add toast import for Solana
import { usePools, Token as PoolToken } from '../context/PoolContext'; // Removed Pool import
import { parseUnits } from 'ethers/lib/utils'; // Correct import path for ethers v5 utils, removed unused formatUnits
import { SUI_TOKEN_MAP } from '../lib/constants'; // Import the centralized token map
import { useCreatePool } from '../hooks/useCreatePool';
import { CrossChainPoolConfig, PoolCreationReceipt, SupportedChain } from '../types/wormhole';
import { WormholeTransactionVerifier } from '../components/WormholeTransactionVerifier';

// Import all icons
import suiIcon from '../icons/sui.webp';
import solIcon from '../icons/sol.svg';
import usdcIcon from '../icons/usdc.png';
import usdtIcon from '../icons/tether.png';
import ethIcon from '../icons/eth.png';
import btcIcon from '../icons/btc.png';
import avaxIcon from '../icons/avax.png';
import bonkIcon from '../icons/bonk.png';
import wmaticIcon from '../icons/wmatic.png';
import aptIcon from '../icons/apt.png';
import rayIcon from '../icons/ray.png';
import srmIcon from '../icons/srm.png';
import orcaIcon from '../icons/orca.png';
const placeholderIcon = '/placeholder-icon.png'; // Keep placeholder

// Define types needed for the form
type ChainOption = 'sui' | 'solana';

// Define Token interface matching TokenSelect component
interface Token {
  symbol: string;
  name: string;
  icon: string;
}

// Mock token data using imported icons
const MOCK_TOKENS: { [key: string]: Token } = {
  SUI: { symbol: 'SUI', name: 'Sui', icon: suiIcon },
  USDC: { symbol: 'USDC', name: 'USD Coin', icon: usdcIcon },
  USDT: { symbol: 'USDT', name: 'Tether', icon: usdtIcon },
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', icon: ethIcon },
  SOL: { symbol: 'SOL', name: 'Solana', icon: solIcon },
  RAY: { symbol: 'RAY', name: 'Raydium', icon: rayIcon },
  SRM: { symbol: 'SRM', name: 'Serum', icon: srmIcon },
  BTC: { symbol: 'BTC', name: 'Bitcoin', icon: btcIcon },
  APT: { symbol: 'APT', name: 'Aptos', icon: aptIcon },
  WMATIC: { symbol: 'WMATIC', name: 'Wrapped Matic', icon: wmaticIcon },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', icon: avaxIcon },
  BONK: { symbol: 'BONK', name: 'Bonk', icon: bonkIcon },
  ORCA: { symbol: 'ORCA', name: 'Orca', icon: orcaIcon },
};

const CreatePoolPage = () => {
  // Removed: const navigate = useNavigate();
  const [selectedChain, setSelectedChain] = useState<ChainOption>('sui');
  const [token1, setToken1] = useState<Token | null>(null);
  const [token2, setToken2] = useState<Token | null>(null);
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuiCreating, setIsSuiCreating] = useState(false); // Add state for Sui loading
  const { addPool } = usePools(); // Get addPool function from context
  const wallet = useWallet(); // Get wallet context
  const { createPool: createCrossChainPool } = useCreatePool();
  const [receipt, setReceipt] = useState<PoolCreationReceipt | null>(null);

  // Conditionally use the correct hook based on the selected chain
  const { createPool: createSuiPool } = useCreateSuiPool(); // Destructure the createPool function
  const createSolanaPoolMutation = useCreateSolanaPool(); // Keep Solana hook as is for now

  // Determine the active mutation *state* (isLoading) based on the selected chain
  const isSolanaLoading = createSolanaPoolMutation.isLoading;
  // Use the new isSuiCreating state for Sui loading
  const isLoading = selectedChain === 'sui' ? isSuiCreating : isSolanaLoading;


  // Define available tokens based on selected chain
  // For Sui, filter based on keys in SUI_TOKEN_MAP to ensure we have info
  const availableTokens: Token[] = useMemo(() => {
    const symbols = selectedChain === 'sui'
      ? ['SUI', 'USDC', 'USDT', 'WETH', 'BTC', 'APT', 'WMATIC', 'AVAX', 'BONK'] // Example Sui tokens
      : ['SOL', 'USDC', 'USDT', 'RAY', 'SRM', 'BTC', 'ETH', 'BONK', 'ORCA']; // Example Solana tokens
    return symbols.map(symbol => MOCK_TOKENS[symbol]).filter(Boolean);
  }, [selectedChain]);

  // Calculate initial price ratio
  const priceRatio = useMemo(() => {
    const amount1 = parseFloat(token1Amount);
    const amount2 = parseFloat(token2Amount);
    if (amount1 > 0 && amount2 > 0 && token1 && token2) {
      const ratio1 = (amount2 / amount1).toFixed(6);
      const ratio2 = (amount1 / amount2).toFixed(6);
      return {
        t1PerT2: `1 ${token1.symbol} ≈ ${ratio1} ${token2.symbol}`,
        t2PerT1: `1 ${token2.symbol} ≈ ${ratio2} ${token1.symbol}`,
      };
    }
    return null;
  }, [token1, token2, token1Amount, token2Amount]);

  const handleSubmit = async (config: CrossChainPoolConfig) => {
    try {
      const result = await createCrossChainPool(config);
      if (result.success) {
        setReceipt(result.receipt);
        addPool(result.receipt); // Context'e yeni havuzu ekle
      }
    } catch (error) {
      console.error('Cross-chain pool creation failed:', error);
    }
  };

  const handleCreatePoolSubmit = async () => { // Make async
    setFormError(null); // Clear previous errors

    // Basic form validation
    if (!token1 || !token2) {
      setFormError('Please select both tokens.');
      return;
    }
    if (!token1Amount || parseFloat(token1Amount) <= 0 || !token2Amount || parseFloat(token2Amount) <= 0) {
      setFormError('Please enter valid amounts for both tokens.');
      return;
    }
    if (token1.symbol === token2.symbol) {
      setFormError('Please select two different tokens.');
      return;
    }
    if (!selectedChain) {
        setFormError('Please select a chain.');
        return;
    }

    // Chain-specific logic
    if (selectedChain === 'sui') {
        // --- Sui Specific Logic ---
        if (!wallet.connected || !wallet.address) {
            setFormError('Please connect your Sui wallet.');
            return;
        }

        // Use the imported SUI_TOKEN_MAP
        const token1Info = SUI_TOKEN_MAP[token1.symbol];
        const token2Info = SUI_TOKEN_MAP[token2.symbol];

        if (!token1Info || !token2Info) {
            setFormError(`Token details not found for ${!token1Info ? token1.symbol : ''} ${!token2Info ? token2.symbol : ''} on Sui. Check constants.`);
            return;
        }

        setIsSuiCreating(true); // Start loading for Sui
        setFormError(null); // Clear previous errors before trying

        try {
            // Convert amounts to BigNumber then to bigint based on decimals
            const amount1BN = parseUnits(token1Amount, token1Info.decimals);
            const amount2BN = parseUnits(token2Amount, token2Info.decimals);
            const amount1BigInt = amount1BN.toBigInt(); // Convert to bigint
            const amount2BigInt = amount2BN.toBigInt(); // Convert to bigint

            console.log(`Creating Sui Pool: ${token1.symbol}/${token2.symbol}`);
            // Use the 'type' field from SUI_TOKEN_MAP for the address
            console.log(`  Token A: ${token1Info.type}, Amount: ${amount1BigInt.toString()}`);
            console.log(`  Token B: ${token2Info.type}, Amount: ${amount2BigInt.toString()}`);

            // Call the specific create function from the hook, passing the 'type' as address
            await createSuiPool({
                wallet: wallet, // Pass the wallet context
                tokenAAddress: token1Info.type, // Use the full CoinType string
                tokenBAddress: token2Info.type, // Use the full CoinType string
                initialLiquidityA: amount1BigInt,
                initialLiquidityB: amount2BigInt,
            });

            // If createSuiPool succeeds (doesn't throw), add to context
            // Note: createSuiPool handles its own success toast
            addPool({
               name: `${token1.symbol}-${token2.symbol}`, // Use symbols for name
               chain: 'sui',
               token1: token1.symbol as PoolToken, // Keep using symbols for context
               token2: token2.symbol as PoolToken,
               fee: '0.3%', // Assuming a default fee display
               token1Amount: token1Amount, // Store original string amount for display?
               token2Amount: token2Amount,
               volume24h: '$0', // Placeholder
               apr: '0.0%', // Placeholder
               rewards: [], // Placeholder
            });

            // Reset form on success
            setToken1(null);
            setToken2(null);
            setToken1Amount('');
            setToken2Amount('');
            setFormError(null);
            // navigate('/pools'); // Optional navigation

        } catch (error: any) {
            // Error handled and toasted within createSuiPool, but set form error too
            console.error("Error during Sui pool creation submission:", error);
            // Use a more specific error message if available from the hook's error
            const displayError = error?.message?.includes('Invalid struct type')
                ? 'Invalid token address configuration. Please check token details.'
                : error?.message || 'Unknown error';
            setFormError(`Sui Pool Creation Failed: ${displayError}`);
        } finally {
            setIsSuiCreating(false); // Stop loading for Sui regardless of outcome
        }

    } else { // selectedChain === 'solana'
        // --- Solana Specific Logic (using react-query mutation) ---
        setFormError(null); // Clear previous errors before trying
        const feeBasisPoints = 30; // Example fee
        const dataToSubmit = {
            token1Symbol: token1.symbol,
            token2Symbol: token2.symbol,
            feeBasisPoints: feeBasisPoints,
            token1Amount: token1Amount,
            token2Amount: token2Amount,
        };

        console.log('Submitting Solana Create Pool Data:', dataToSubmit);

        // Use react-hot-toast for Solana mutation as it follows react-query pattern
        toast.promise(
           createSolanaPoolMutation.mutateAsync(dataToSubmit),
           {
             loading: `Initiating Solana pool creation...`,
             success: (result: any) => {
               if (result?.success && token1 && token2) {
                 addPool({
                   name: `${token1.symbol}-${token2.symbol}`,
                   chain: 'solana',
                   token1: token1.symbol as PoolToken,
                   token2: token2.symbol as PoolToken,
                   fee: `${(feeBasisPoints / 100).toFixed(2)}%`,
                   token1Amount: token1Amount,
                   token2Amount: token2Amount,
                   volume24h: '$0',
                   apr: '0.0%',
                   rewards: []
                 });
                 setToken1(null);
                 setToken2(null);
                 setToken1Amount('');
                 setToken2Amount('');
                 setFormError(null);
                 return 'Solana Pool created successfully!';
               }
               return 'Solana Pool creation simulation complete.';
             },
             error: (err: any) => `Solana Pool creation failed: ${err?.message || 'Unknown error'}`,
           }
        );
    }
  };

  const renderSettings = () => (
     <div className="p-4 bg-neutral-50 rounded-xl mb-4 mt-4 border border-neutral-200 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-neutral-700">Transaction Settings</h3>
        <button onClick={() => setShowSettings(false)} className="text-neutral-500 hover:text-neutral-800">
          <ChevronDown size={20} />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-600 mb-2">
            Slippage Tolerance (%)
          </label>
          <div className="flex gap-2 items-center">
            {['0.1', '0.5', '1.0'].map((value) => (
              <button
                key={value}
                onClick={() => setSlippageTolerance(value)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  slippageTolerance === value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippageTolerance}
              onChange={(e) => setSlippageTolerance(e.target.value)}
              className="input w-20 text-sm px-2 py-1"
              placeholder="Custom"
              step="0.1"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl"> {/* Increased max-width */}
      <Link to="/pools" className="flex items-center gap-2 text-neutral-600 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={20} />
        Back to Pools
      </Link>

      <h1 className="text-3xl font-bold mb-8 text-center md:text-left">Create New Liquidity Pool</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8"> {/* Two-column layout */}

        {/* Left Column: Inputs */}
        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <CardHeader className="p-0 mb-4">
              <h2 className="text-xl font-semibold">Select Tokens & Chain</h2>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {/* Chain Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Chain
                </label>
                <Dropdown
                  items={[
                    { label: 'Sui', value: 'sui' },
                    { label: 'Solana', value: 'solana' },
                  ]}
                  value={selectedChain}
                  onChange={(value: string) => { // Added type string to value
                    setSelectedChain(value as ChainOption);
                    setToken1(null); // Reset tokens on chain change
                    setToken2(null);
                    setToken1Amount('');
                    setToken2Amount('');
                  }}
                  className="w-full"
                />
              </div>

              {/* Token 1 Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Token 1
                </label>
                <TokenSelect
                  tokens={availableTokens.filter(t => t.symbol !== token2?.symbol)}
                  value={token1 ?? { symbol: 'Select', name: 'Select Token 1', icon: placeholderIcon }}
                  onChange={setToken1}
                  disabled={!selectedChain}
                />
              </div>

              {/* Token 2 Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Token 2
                </label>
                <TokenSelect
                  tokens={availableTokens.filter(t => t.symbol !== token1?.symbol)}
                  value={token2 ?? { symbol: 'Select', name: 'Select Token 2', icon: placeholderIcon }}
                  onChange={setToken2}
                  disabled={!selectedChain}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 shadow-sm">
            <CardHeader className="p-0 mb-4">
              <h2 className="text-xl font-semibold">Set Initial Liquidity</h2>
              <p className="text-sm text-neutral-500">Enter the amounts for each token.</p>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <TokenInput
                label={token1 ? `${token1.symbol} Amount` : 'Token 1 Amount'}
                value={token1Amount}
                onChange={setToken1Amount}
                symbol={token1?.symbol}
                balance="-" // Placeholder, fetch real balance later
                tokenIcon={token1?.icon ?? placeholderIcon}
                disabled={!token1}
              />
              <div className="flex justify-center my-2">
                 <Plus size={20} className="text-neutral-400" />
              </div>
              <TokenInput
                label={token2 ? `${token2.symbol} Amount` : 'Token 2 Amount'}
                value={token2Amount}
                onChange={setToken2Amount}
                symbol={token2?.symbol}
                balance="-" // Placeholder, fetch real balance later
                tokenIcon={token2?.icon ?? placeholderIcon}
                disabled={!token2}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Overview & Settings */}
        <div className="space-y-6">
          <Card className="p-6 shadow-sm sticky top-20"> {/* Sticky card */}
            <CardHeader className="p-0 mb-4">
              <h2 className="text-xl font-semibold">Pool Overview</h2>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {priceRatio ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Initial Price</span>
                    <span className="font-medium text-right">{priceRatio.t1PerT2}<br/>{priceRatio.t2PerT1}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Your Pool Share</span>
                    <span className="font-medium">~0.00%</span> {/* Placeholder */}
                  </div>
                </>
              ) : (
                <p className="text-sm text-neutral-500 text-center py-4">
                  Enter amounts to see the initial price ratio.
                </p>
              )}

              <div className="pt-4 border-t border-neutral-100">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center justify-between w-full text-neutral-600 hover:text-neutral-900 transition-colors text-sm font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Settings size={16} />
                    Transaction Settings
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                </button>
                {showSettings && renderSettings()}
              </div>

              {formError && (
                <Alert type="error" message={formError} /> // Removed className
              )}

              <Button
                variant="primary"
                className="w-full mt-4"
                onClick={handleCreatePoolSubmit}
                isLoading={isLoading} // Use combined loading state
                disabled={isLoading || !token1 || !token2 || !token1Amount || !token2Amount || parseFloat(token1Amount) <= 0 || parseFloat(token2Amount) <= 0 || (selectedChain === 'sui' && !wallet.connected)} // Add wallet check for Sui
              >
                {isLoading ? 'Creating Pool...' : 'Create Pool'}
              </Button>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Alert
             type="info"
             title="Pool Creation Tips"
             message="The initial ratio of tokens you deposit determines the starting price. Ensure you have sufficient balance for both tokens and transaction fees."
             // Removed icon prop, Alert should handle default icon based on type
          />
        </div>
      </div>

      {receipt && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Transaction Status</h3>
          <WormholeTransactionVerifier messages={receipt.wormholeMessages} />
          
          <div className="mt-4">
            <p>Pool ID: {receipt.poolId}</p>
            <p>Transactions:</p>
            <ul>
              {receipt.txIds.map((txid) => (
                <li key={txid}>
                  <a 
                    href={`https://explorer.solana.com/tx/${txid}`} 
                    target="_blank"
                    className="text-blue-500 hover:underline"
                  >
                    {txid.slice(0, 8)}...{txid.slice(-8)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePoolPage;
