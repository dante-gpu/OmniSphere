import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Settings, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TokenSelect } from '../components/forms/TokenSelect';
import { TokenInput } from '../components/forms/TokenInput';
import { Dropdown } from '../components/ui/Dropdown';
// TODO: Import useCreatePool hook once created
// import { useCreatePool } from '../hooks/useCreatePool';

// Define types needed for the form
type ChainOption = 'sui' | 'solana';

// Define Token interface matching TokenSelect component
interface Token {
  symbol: string;
  name: string; // Added name
  icon: string; // Added icon URL
}

// Mock token data (replace with actual data source)
const MOCK_TOKENS: { [key: string]: Token } = {
  SUI: { symbol: 'SUI', name: 'Sui', icon: 'https://cryptologos.cc/logos/sui-sui-logo.png' },
  USDC: { symbol: 'USDC', name: 'USD Coin', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' },
  USDT: { symbol: 'USDT', name: 'Tether', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  RAY: { symbol: 'RAY', name: 'Raydium', icon: 'https://cryptologos.cc/logos/raydium-ray-logo.png' },
  SRM: { symbol: 'SRM', name: 'Serum', icon: 'https://cryptologos.cc/logos/serum-srm-logo.png' },
};

const CreatePoolPage = () => {
  const navigate = useNavigate();
  const [selectedChain, setSelectedChain] = useState<ChainOption>('sui');
  const [token1, setToken1] = useState<Token | null>(null); // State holds Token object or null
  const [token2, setToken2] = useState<Token | null>(null); // State holds Token object or null
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);

  // TODO: Instantiate the mutation hook
  // const createPoolMutation = useCreatePool();

  // Define available tokens based on selected chain
  const availableTokens: Token[] = (selectedChain === 'sui'
    ? ['SUI', 'USDC', 'USDT', 'WETH']
    : ['SOL', 'USDC', 'USDT', 'RAY', 'SRM']
  ).map(symbol => MOCK_TOKENS[symbol]).filter(Boolean); // Get full Token objects

  const handleCreatePoolSubmit = () => {
    // Basic validation
    if (!token1 || !token2 || !token1Amount || !token2Amount || !selectedChain) {
      alert('Please select both tokens, enter amounts, and select a chain.');
      return;
    }
    if (token1.symbol === token2.symbol) {
      alert('Please select two different tokens.');
      return;
    }

    console.log('DEMO: Submitting Create Pool Data:', {
      chainId: selectedChain,
      token1Symbol: token1.symbol, // Send only symbol
      token2Symbol: token2.symbol, // Send only symbol
      token1Amount: token1Amount,
      token2Amount: token2Amount,
      slippageTolerance: slippageTolerance,
    });

    // TODO: Call the actual mutation
    // createPoolMutation.mutate({
    //   chainId: selectedChain,
    //   token1Symbol: token1.symbol,
    //   token2Symbol: token2.symbol,
    //   token1Amount: token1Amount,
    //   token2Amount: token2Amount,
    //   slippageTolerance: slippageTolerance,
    // });

    // Simulate success for demo
    alert('DEMO: Pool creation initiated! Check console and wallet for prompts (simulated).');
    // Optionally navigate away after submission attempt
    // navigate('/pools');
  };

  const renderSettings = () => (
     <div className="p-4 bg-neutral-50 rounded-xl mb-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Transaction Settings</h3>
        <button onClick={() => setShowSettings(false)} className="text-neutral-500">
          <ChevronDown size={20} />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-600 mb-2">
            Slippage Tolerance
          </label>
          <div className="flex gap-2">
            {['0.1', '0.5', '1.0'].map((value) => (
              <button
                key={value}
                onClick={() => setSlippageTolerance(value)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  slippageTolerance === value
                    ? 'bg-primary text-white'
                    : 'bg-white text-neutral-600'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippageTolerance}
              onChange={(e) => setSlippageTolerance(e.target.value)}
              className="input w-24 text-sm"
              placeholder="Custom"
              step="0.1"
            />
          </div>
        </div>
        {/* Add other settings like deadline if needed */}
      </div>
    </div>
  );


  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/pools" className="flex items-center gap-2 text-neutral-600 hover:text-primary mb-6">
        <ArrowLeft size={20} />
        Back to Pools
      </Link>

      <h1 className="text-3xl font-bold mb-8">Create New Liquidity Pool</h1>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Chain Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select Chain
            </label>
            <Dropdown
              items={[
                { label: 'Sui', value: 'sui' },
                { label: 'Solana', value: 'solana' },
              ]}
              value={selectedChain}
              onChange={(value) => {
                 setSelectedChain(value as ChainOption);
                 // Reset token selections when chain changes
                 setToken1(null);
                 setToken2(null);
              }}
              className="w-full"
            />
          </div>

          {/* Token Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Token 1
              </label>
              {/* Pass the full Token object or a default/placeholder if null */}
              <TokenSelect
                 tokens={availableTokens.filter(t => t.symbol !== token2?.symbol)} // Exclude selected token 2
                 value={token1 ?? { symbol: 'Select', name: 'Select Token 1', icon: '' }} // Provide default object
                 onChange={setToken1} // onChange expects (token: Token) => void
                 // Removed placeholder prop
                 disabled={!selectedChain}
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Token 2
              </label>
              <TokenSelect
                 tokens={availableTokens.filter(t => t.symbol !== token1?.symbol)} // Exclude selected token 1
                 value={token2 ?? { symbol: 'Select', name: 'Select Token 2', icon: '' }} // Provide default object
                 onChange={setToken2}
                 // Removed placeholder prop
                 disabled={!selectedChain}
              />
            </div>
          </div>

          {/* Amount Inputs */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Initial Liquidity Amounts
            </label>
            <div className="space-y-4">
               {/* Pass props matching TokenInputProps */}
               <TokenInput
                  label={token1 ? `${token1.symbol} Amount` : 'Token 1 Amount'}
                  value={token1Amount}
                  onChange={setToken1Amount}
                  symbol={token1?.symbol} // Pass symbol for balance display
                  balance="0.00" // TODO: Fetch real balance
                  // Removed placeholder prop, input already has one internally
                  tokenIcon={token1?.icon} // Pass icon URL
                  disabled={!token1} // Disable if token not selected
               />
               <TokenInput
                  label={token2 ? `${token2.symbol} Amount` : 'Token 2 Amount'}
                  value={token2Amount}
                  onChange={setToken2Amount}
                  symbol={token2?.symbol} // Pass symbol for balance display
                  balance="0.00" // TODO: Fetch real balance
                  // Removed placeholder prop, input already has one internally
                  tokenIcon={token2?.icon} // Pass icon URL
                  disabled={!token2} // Disable if token not selected
               />
            </div>
          </div>

          {/* Settings Toggle */}
           <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors text-sm"
            >
              <Settings size={16} />
              <span>Transaction Settings</span>
            </button>

            {showSettings && renderSettings()}


          {/* Action Button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleCreatePoolSubmit}
            // isLoading={createPoolMutation.isLoading} // TODO: Uncomment when hook is ready
            // disabled={createPoolMutation.isLoading || !token1 || !token2 || !token1Amount || !token2Amount} // TODO: Uncomment and refine disabled logic
            disabled={!token1 || !token2 || !token1Amount || !token2Amount} // Basic disabled logic for demo
          >
             {/* {createPoolMutation.isLoading ? 'Creating Pool...' : 'Create Pool'} // TODO: Uncomment */}
             Create Pool (Demo)
          </Button>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg">
            <Info size={20} className="flex-shrink-0 mt-1" />
            <p className="text-sm">
              Creating a new pool requires providing initial liquidity for both tokens.
              The ratio of these initial amounts will determine the starting price in the pool.
              A small transaction fee will apply.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CreatePoolPage;
