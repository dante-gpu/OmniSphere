import { useState, useEffect } from 'react'; // Removed React default import
import { useWallet as useSuiWallet } from '@suiet/wallet-kit'; // Rename Sui hook
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'; // Import Solana hook
import {
  ArrowDownUp,
  Settings,
  Info,
  ChevronDown,
  RefreshCw,
  ArrowDown
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { TokenSelect } from '../components/forms/TokenSelect';
import { TokenInput } from '../components/forms/TokenInput';
import { SlippageInput } from '../components/forms/SlippageInput';
import { useSwap } from '../hooks/useSwap';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenPrice } from '../hooks/useTokenPrice';

// Import the new icons
import suiIcon from '../icons/sui.webp';
import solIcon from '../icons/sol.svg';
import usdcIcon from '../icons/usdc.png';
import usdtIcon from '../icons/tether.png';
import ethIcon from '../icons/eth.png'; // Added
import btcIcon from '../icons/btc.png'; // Added
import avaxIcon from '../icons/avax.png'; // Added
import bonkIcon from '../icons/bonk.png'; // Added
import wmaticIcon from '../icons/wmatic.png'; // Assuming this exists based on PoolsPage
// Define a placeholder for missing icons (if needed elsewhere, keep consistent)
const placeholderIcon = '/placeholder-icon.png'; // Or path to a generic icon in public/


// Define a more detailed token type
interface TokenInfo {
  symbol: string;
  name: string;
  icon: string;
  decimals: number; // Added decimals
  type: string; // Added Sui type identifier or Solana mint address
}

// Define available tokens using local paths
// IMPORTANT: User needs to place these icon files in the /public/icons/ directory
const AVAILABLE_TOKENS: TokenInfo[] = [
  {
    symbol: 'SUI',
    name: 'Sui',
    icon: suiIcon, // Use imported icon
    decimals: 9,
    type: '0x2::sui::SUI'
  },
  {
    symbol: 'USDC', // Assuming Sui USDC for now
    name: 'USD Coin (Sui)',
    icon: usdcIcon, // Use imported icon
    decimals: 6, // Verify
    type: '0xPLACEHOLDER::usdc::USDC' // Replace with actual Sui USDC type
  },
  {
    symbol: 'SOL', // Assuming wrapped SOL on Sui
    name: 'Solana (Wormhole)',
    icon: solIcon, // Use imported icon
    decimals: 9, // Verify wrapped SOL decimals
    type: '0xWORMHOLE_PLACEHOLDER::sol::SOL' // Replace with actual wrapped SOL type
  },
  {
    symbol: 'USDT', // Assuming wrapped USDT on Sui
    name: 'Tether (Wormhole)',
    icon: usdtIcon, // Use imported icon
    decimals: 6, // Verify wrapped USDT decimals
    type: '0xWORMHOLE_PLACEHOLDER::usdt::USDT' // Replace with actual wrapped USDT type
  },
  {
    symbol: 'WETH', // Assuming wrapped ETH on Sui
    name: 'Wrapped Ether (Wormhole)',
    icon: ethIcon, // Use imported icon
    decimals: 8, // Verify wrapped ETH decimals
    type: '0xWORMHOLE_PLACEHOLDER::weth::WETH' // Replace with actual wrapped ETH type
  },
  {
    symbol: 'BTC', // Assuming wrapped BTC on Sui
    name: 'Bitcoin (Wormhole)',
    icon: btcIcon, // Use imported icon
    decimals: 8, // Verify wrapped BTC decimals
    type: '0xWORMHOLE_PLACEHOLDER::btc::BTC' // Replace with actual wrapped BTC type
  },
  {
    symbol: 'AVAX', // Assuming wrapped AVAX on Sui
    name: 'Avalanche (Wormhole)',
    icon: avaxIcon, // Use imported icon
    decimals: 8, // Verify wrapped AVAX decimals
    type: '0xWORMHOLE_PLACEHOLDER::avax::AVAX' // Replace with actual wrapped AVAX type
  },
  {
    symbol: 'BONK', // Assuming wrapped BONK on Sui
    name: 'Bonk (Wormhole)',
    icon: bonkIcon, // Use imported icon
    decimals: 5, // Verify wrapped BONK decimals
    type: '0xWORMHOLE_PLACEHOLDER::bonk::BONK' // Replace with actual wrapped BONK type
  },
  {
    symbol: 'WMATIC', // Assuming wrapped MATIC on Sui
    name: 'Wrapped Matic (Wormhole)',
    icon: wmaticIcon, // Use imported icon
    decimals: 8, // Verify wrapped MATIC decimals
    type: '0xWORMHOLE_PLACEHOLDER::wmatic::WMATIC' // Replace with actual wrapped MATIC type
  },
  // TODO: Add Solana native tokens if needed, potentially differentiating by chain context
  // {
  //   symbol: 'USDC',
  //   name: 'USD Coin (Solana)',
  //   icon: '/icons/usdc.png',
  //   decimals: 6,
  //   type: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Example Solana USDC mint
  // },
];


const SwapPage = () => {
  const { connected: suiConnected } = useSuiWallet(); // Get Sui connection status
  const { connected: solanaConnected } = useSolanaWallet(); // Get Solana connection status
  const isAnyWalletConnected = suiConnected || solanaConnected; // Check if either is connected

  const {
    executeSwap,
    calculateOutputAmount,
    getSwapRoute,
    getPriceImpact
  } = useSwap();

  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [swapRoute, setSwapRoute] = useState<string[]>([]);
  const [priceImpact, setPriceImpact] = useState<number>(0);

  // Token Selection - Initialize with default tokens from the list
  const [fromToken, setFromToken] = useState<TokenInfo>(AVAILABLE_TOKENS[0]); // Default to SUI
  const [toToken, setToToken] = useState<TokenInfo>(AVAILABLE_TOKENS[1]); // Default to USDC

  // Amount Inputs
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  // Get token balances (hook needs adjustment if token type/address matters)
  const { balance: fromBalance, loading: loadingFromBalance } = useTokenBalance(fromToken.symbol);
  const { balance: toBalance, loading: loadingToBalance } = useTokenBalance(toToken.symbol);

  // Get token prices
  const { price: fromPrice } = useTokenPrice(fromToken.symbol);
  const { price: toPrice } = useTokenPrice(toToken.symbol);

  // Handle token swap
  const handleFromAmountChange = async (value: string) => {
    setFromAmount(value);
    if (value && parseFloat(value) > 0 && fromToken && toToken) {
      try {
        const output = await calculateOutputAmount(fromToken.symbol, toToken.symbol, value);
        setToAmount(output.toString());
        const impact = await getPriceImpact(fromToken.symbol, toToken.symbol, value);
        setPriceImpact(impact);
        const route = await getSwapRoute(fromToken.symbol, toToken.symbol, value);
        setSwapRoute(route);
      } catch (e) {
        console.error("Error calculating output:", e);
        setToAmount('');
        setPriceImpact(0);
        setSwapRoute([]);
      }
    } else {
      setToAmount('');
      setPriceImpact(0);
      setSwapRoute([]);
    }
  };

  // Note: handleToAmountChange might need reverse calculation logic in useSwap hook
  const handleToAmountChange = async (value: string) => {
     setToAmount(value);
     if (value && parseFloat(value) > 0 && fromToken && toToken) {
       try {
         // Assuming calculateOutputAmount can handle reverse calculation if last arg is true
         const input = await calculateOutputAmount(toToken.symbol, fromToken.symbol, value, true);
         setFromAmount(input.toString());
         const impact = await getPriceImpact(fromToken.symbol, toToken.symbol, input.toString());
         setPriceImpact(impact);
         const route = await getSwapRoute(fromToken.symbol, toToken.symbol, input.toString());
         setSwapRoute(route);
       } catch (e) {
         console.error("Error calculating input:", e);
         setFromAmount('');
         setPriceImpact(0);
         setSwapRoute([]);
       }
     } else {
       setFromAmount('');
       setPriceImpact(0);
       setSwapRoute([]);
     }
   };


  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    // Swap amounts as well
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
    // Recalculate route/impact if needed based on the new 'fromAmount'
    if(toAmount) {
       handleFromAmountChange(toAmount);
    } else {
       setPriceImpact(0);
       setSwapRoute([]);
    }
  };

  const handleSwap = async () => {
    if (!fromAmount || !toAmount || !fromToken || !toToken) return;

    try {
      // Pass the full token objects to executeSwap
      await executeSwap({
        fromToken: fromToken, // Pass the object
        toToken: toToken,   // Pass the object
        fromAmount,
        slippage: parseFloat(slippage)
      });

      // Reset form after successful swap
      setFromAmount('');
      setToAmount('');
      setPriceImpact(0);
      setSwapRoute([]);
    } catch (error) {
      // Error handling is done in the useSwap hook
      console.error("Swap execution failed:", error);
    }
  };

  // Update the connection check to see if *neither* wallet is connected
  // This might need refinement based on which chain the selected tokens belong to
  if (!isAnyWalletConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert
          type="warning"
          title="Wallet Not Connected"
          message="Please connect your wallet to start swapping tokens."
        />
      </div>
    );
  }

  const isSwapDisabled = !fromAmount || !toAmount || loadingFromBalance || loadingToBalance || parseFloat(fromAmount) <= 0;
  const showPriceImpactWarning = priceImpact > 2;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Swap Tokens</h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-neutral-50 rounded-lg transition-colors"
            >
              <Settings size={20} className="text-neutral-600" />
            </button>
          </div>

          {showSettings && (
            <div className="mb-6">
              <SlippageInput
                value={slippage}
                onChange={setSlippage}
                error={
                  parseFloat(slippage) < 0.1
                    ? 'Slippage too low'
                    : parseFloat(slippage) > 5
                    ? 'Slippage too high'
                    : undefined
                }
              />
            </div>
          )}

          <div className="space-y-4">
            {/* From Token */}
            <div className="space-y-2">
              <TokenSelect
                value={fromToken}
                // Find the full TokenInfo object when TokenSelect returns a basic Token
                onChange={(selectedTokenFromSelect) => {
                   const fullTokenInfo = AVAILABLE_TOKENS.find(t => t.symbol === selectedTokenFromSelect.symbol);
                   if (fullTokenInfo) {
                       setFromToken(fullTokenInfo);
                       // Recalculate output when 'from' token changes
                       handleFromAmountChange(fromAmount);
                   }
                }}
                // Pass the basic Token structure expected by TokenSelect items
                tokens={AVAILABLE_TOKENS.filter(t => t.symbol !== toToken?.symbol).map(t => ({ symbol: t.symbol, name: t.name, icon: t.icon }))}
              />
              <TokenInput
                label="From"
                value={fromAmount}
                onChange={handleFromAmountChange}
                // Handle potential null balance, default to undefined or '0'
                balance={fromBalance ?? undefined}
                symbol={fromToken.symbol}
                tokenIcon={fromToken.icon}
                isLoading={loadingFromBalance}
                onMaxClick={() => handleFromAmountChange(fromBalance || '0')}
              />
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwapTokens}
                className="p-2 hover:bg-neutral-50 rounded-full transition-colors"
              >
                <ArrowDown size={24} className="text-primary" />
              </button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <TokenSelect
                value={toToken}
                 // Find the full TokenInfo object when TokenSelect returns a basic Token
                onChange={(selectedTokenFromSelect) => {
                   const fullTokenInfo = AVAILABLE_TOKENS.find(t => t.symbol === selectedTokenFromSelect.symbol);
                   if (fullTokenInfo) {
                       setToToken(fullTokenInfo);
                       // Recalculate output when 'to' token changes (based on fromAmount)
                       handleFromAmountChange(fromAmount);
                   }
                }}
                 // Pass the basic Token structure expected by TokenSelect items
                tokens={AVAILABLE_TOKENS.filter(t => t.symbol !== fromToken?.symbol).map(t => ({ symbol: t.symbol, name: t.name, icon: t.icon }))}
              />
              <TokenInput
                label="To (estimated)" // Label updated
                value={toAmount}
                onChange={handleToAmountChange} // Allow changing 'to' amount
                 // Handle potential null balance
                balance={toBalance ?? undefined}
                symbol={toToken.symbol}
                tokenIcon={toToken.icon}
                isLoading={loadingToBalance}
                // MAX button doesn't make sense for 'to' amount
              />
            </div>

            {/* Swap Details */}
            {fromAmount && toAmount && parseFloat(fromAmount) > 0 && (
              <div className="p-4 bg-neutral-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Rate</span>
                  <span>
                    1 {fromToken.symbol} ≈ {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken.symbol}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Price Impact</span>
                  <span className={priceImpact > 2 ? 'text-red-500' : 'text-green-500'}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>

                {swapRoute.length > 0 && (
                   <div className="flex justify-between text-sm">
                     <span className="text-neutral-600">Route</span>
                     <span className="text-right">{swapRoute.join(' → ')}</span>
                   </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Minimum Received</span>
                  <span>
                    {(parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {toToken.symbol}
                  </span>
                </div>
              </div>
            )}

            {showPriceImpactWarning && (
              <Alert
                type="warning"
                message="High price impact! The size of your trade may significantly affect the market price."
              />
            )}

            <Button
              onClick={handleSwap}
              disabled={isSwapDisabled} // Use calculated disabled state
              className="w-full"
              // TODO: Add loading state from useSwap hook
            >
              Swap
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SwapPage;
