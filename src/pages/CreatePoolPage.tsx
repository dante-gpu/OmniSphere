import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Settings, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TokenSelect } from '../components/forms/TokenSelect';
import { TokenInput } from '../components/forms/TokenInput';
import { Dropdown } from '../components/ui/Dropdown';
import { useCreatePool } from '../hooks/useCreatePool'; // Import the hook

// Import available icons from src/icons
import suiIcon from '../icons/Sui Logo.webp';
import solIcon from '../icons/Solana Logo.svg';
import usdcIcon from '../icons/USDC Logo.png';
import usdtIcon from '../icons/Tether USDT Logo.png';
// Define a placeholder for missing icons
const placeholderIcon = '/placeholder-icon.png'; // Or path to a generic icon in public/

// Define types needed for the form
type ChainOption = 'sui' | 'solana';

// Define Token interface matching TokenSelect component
interface Token {
  symbol: string;
  name: string;
  icon: string; // Keep as string (path or imported variable)
}

// Mock token data using imported icons and placeholders
const MOCK_TOKENS: { [key: string]: Token } = {
  SUI: { symbol: 'SUI', name: 'Sui', icon: suiIcon },
  USDC: { symbol: 'USDC', name: 'USD Coin', icon: usdcIcon },
  USDT: { symbol: 'USDT', name: 'Tether', icon: usdtIcon },
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', icon: placeholderIcon }, // Missing
  SOL: { symbol: 'SOL', name: 'Solana', icon: solIcon },
  RAY: { symbol: 'RAY', name: 'Raydium', icon: placeholderIcon }, // Missing
  SRM: { symbol: 'SRM', name: 'Serum', icon: placeholderIcon }, // Missing
  BTC: { symbol: 'BTC', name: 'Bitcoin', icon: placeholderIcon }, // Missing
  APT: { symbol: 'APT', name: 'Aptos', icon: placeholderIcon }, // Missing
  WMATIC: { symbol: 'WMATIC', name: 'Wrapped Matic', icon: placeholderIcon }, // Missing
  AVAX: { symbol: 'AVAX', name: 'Avalanche', icon: placeholderIcon }, // Missing
  BONK: { symbol: 'BONK', name: 'Bonk', icon: placeholderIcon }, // Missing
  ORCA: { symbol: 'ORCA', name: 'Orca', icon: placeholderIcon }, // Missing
};

const CreatePoolPage = () => {
  const navigate = useNavigate();
  const [selectedChain, setSelectedChain] = useState<ChainOption>('sui');
  const [token1, setToken1] = useState<Token | null>(null);
  const [token2, setToken2] = useState<Token | null>(null);
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);

  const createPoolMutation = useCreatePool();

  // Define available tokens based on selected chain
  const availableTokens: Token[] = (selectedChain === 'sui'
    ? ['SUI', 'USDC', 'USDT', 'WETH'] // Example Sui tokens
    : ['SOL', 'USDC', 'USDT', 'RAY', 'SRM'] // Example Solana tokens
  ).map(symbol => MOCK_TOKENS[symbol]).filter(Boolean);

  const handleCreatePoolSubmit = () => {
    if (!token1 || !token2 || !token1Amount || !token2Amount || !selectedChain) {
      alert('Please select both tokens, enter amounts, and select a chain.');
      return;
    }
    if (token1.symbol === token2.symbol) {
      alert('Please select two different tokens.');
      return;
    }

    const dataToSubmit = {
      chainId: selectedChain,
      token1Symbol: token1.symbol,
      token2Symbol: token2.symbol,
      token1Amount: token1Amount,
      token2Amount: token2Amount,
      slippageTolerance: slippageTolerance,
    };

    console.log('DEMO: Submitting Create Pool Data:', dataToSubmit);

    createPoolMutation.mutate(dataToSubmit, {
       onSuccess: () => {
         alert('DEMO: Pool creation initiated! Check console and wallet for prompts (simulated).');
       },
       onError: (error) => {
         console.error("Mutation failed in component:", error);
       }
    });
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
              <TokenSelect
                 tokens={availableTokens.filter(t => t.symbol !== token2?.symbol)}
                 value={token1 ?? { symbol: 'Select', name: 'Select Token 1', icon: placeholderIcon }} // Use placeholder
                 onChange={setToken1}
                 disabled={!selectedChain}
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Token 2
              </label>
              <TokenSelect
                 tokens={availableTokens.filter(t => t.symbol !== token1?.symbol)}
                 value={token2 ?? { symbol: 'Select', name: 'Select Token 2', icon: placeholderIcon }} // Use placeholder
                 onChange={setToken2}
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
               <TokenInput
                  label={token1 ? `${token1.symbol} Amount` : 'Token 1 Amount'}
                  value={token1Amount}
                  onChange={setToken1Amount}
                  symbol={token1?.symbol}
                  balance="0.00" // TODO: Fetch real balance
                  tokenIcon={token1?.icon ?? placeholderIcon} // Use placeholder
                  disabled={!token1}
               />
               <TokenInput
                  label={token2 ? `${token2.symbol} Amount` : 'Token 2 Amount'}
                  value={token2Amount}
                  onChange={setToken2Amount}
                  symbol={token2?.symbol}
                  balance="0.00" // TODO: Fetch real balance
                  tokenIcon={token2?.icon ?? placeholderIcon} // Use placeholder
                  disabled={!token2}
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
            isLoading={createPoolMutation.isLoading}
            disabled={createPoolMutation.isLoading || !token1 || !token2 || !token1Amount || !token2Amount}
          >
             {createPoolMutation.isLoading ? 'Creating Pool...' : 'Create Pool (Demo)'}
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
