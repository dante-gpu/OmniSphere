import * as React from 'react'; // Changed import style
import { useState, useMemo } from 'react'; // Kept named imports
import { Link } from 'react-router-dom'; // Removed useNavigate
import { ArrowLeft, Settings, ChevronDown, Plus } from 'lucide-react'; // Removed Info, RefreshCw
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card'; // Import Card parts
import { TokenSelect } from '../components/forms/TokenSelect';
import { TokenInput } from '../components/forms/TokenInput';
import { Dropdown } from '../components/ui/Dropdown';
// Import the new chain-specific hooks
import { useCreateSuiPool } from '../hooks/useCreateSuiPool';
import { useCreateSolanaPool } from '../hooks/useCreateSolanaPool';
import { Alert } from '../components/ui/Alert'; // Import Alert
import toast from 'react-hot-toast'; // Import toast
import { usePools, Token as PoolToken } from '../context/PoolContext'; // Removed Pool import

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
  const { addPool } = usePools(); // Get addPool function from context

  // Conditionally use the correct hook based on the selected chain
  const createSuiPoolMutation = useCreateSuiPool();
  const createSolanaPoolMutation = useCreateSolanaPool();

  // Determine the active mutation based on the selected chain
  const activeMutation = selectedChain === 'sui' ? createSuiPoolMutation : createSolanaPoolMutation;

  // Define available tokens based on selected chain
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

  const handleCreatePoolSubmit = () => {
    setFormError(null); // Clear previous errors
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

    // Define fee (e.g., 0.3% = 30 basis points) - Can be made configurable later
    const feeBasisPoints = 30;

    let dataToSubmit: any; // Use 'any' for now, or define a union type
    let mutationToCall: any; // Use 'any' for now

    if (selectedChain === 'sui') {
        dataToSubmit = {
            token1Symbol: token1.symbol,
            token2Symbol: token2.symbol,
            token1Amount: token1Amount,
            token2Amount: token2Amount,
        };
        mutationToCall = createSuiPoolMutation;
        console.log('Submitting Sui Create Pool Data:', dataToSubmit);
    } else { // selectedChain === 'solana'
        dataToSubmit = {
            token1Symbol: token1.symbol,
            token2Symbol: token2.symbol,
            feeBasisPoints: feeBasisPoints,
            token1Amount: token1Amount, // Add amount for initial liquidity
            token2Amount: token2Amount, // Add amount for initial liquidity
        };
        mutationToCall = createSolanaPoolMutation;
        console.log('Submitting Solana Create Pool Data:', dataToSubmit);
    }


    toast.promise(
       mutationToCall.mutateAsync(dataToSubmit), // Pass the correctly structured data
       {
         loading: `Initiating ${selectedChain} pool creation...`,
         success: (result: any) => { // Added type any to result temporarily
           // Add the newly created pool to the context
           // Ensure result structure matches expected success shape from hooks
           if (result?.success && token1 && token2) {
             addPool({
               name: `${token1.symbol}-${token2.symbol}`,
               chain: selectedChain,
               token1: token1.symbol as PoolToken,
               token2: token2.symbol as PoolToken,
               fee: '0.3%',
               // Pass initial amounts for context to use
               token1Amount: token1Amount,
               token2Amount: token2Amount,
               // Add required placeholder values for properties not omitted in NewPoolInput
               volume24h: '$0',
               apr: '0.0%',
               rewards: []
               // tvl, token1Balance, token2Balance etc. are handled by the context's addPool function
             });
             // Reset form after successful addition
             setToken1(null);
             setToken2(null);
             setToken1Amount('');
             setToken2Amount('');
             setFormError(null);
             // Optionally navigate after success
             // navigate('/pools');
             return 'Pool created successfully!'; // Message for toast
           }
           return 'Pool creation simulation complete.'; // Fallback message
         },
         error: (err: any) => `Pool creation failed: ${err?.message || 'Unknown error'}`,
       }
    );
    // Reset form on success? Maybe navigate away? - Moved inside success callback
    // setToken1(null);
    // setToken2(null);
    // setToken1Amount('');
    // setToken2Amount('');
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
            isLoading={activeMutation.isLoading} // Use active mutation state
            disabled={activeMutation.isLoading || !token1 || !token2 || !token1Amount || !token2Amount || parseFloat(token1Amount) <= 0 || parseFloat(token2Amount) <= 0} // Use active mutation state
          >
            {activeMutation.isLoading ? 'Creating Pool...' : 'Create Pool'}
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
    </div>
  );
};

export default CreatePoolPage;
