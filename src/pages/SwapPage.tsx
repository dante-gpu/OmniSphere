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

  // Token Selection
  const [fromToken, setFromToken] = useState({
    symbol: 'SUI',
    name: 'Sui',
    icon: 'https://cryptologos.cc/logos/sui-sui-logo.png'
  });
  
  const [toToken, setToToken] = useState({
    symbol: 'USDC',
    name: 'USD Coin',
    icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  });

  // Amount Inputs
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  // Get token balances
  const { balance: fromBalance, loading: loadingFromBalance } = useTokenBalance(fromToken.symbol);
  const { balance: toBalance, loading: loadingToBalance } = useTokenBalance(toToken.symbol);

  // Get token prices
  const { price: fromPrice } = useTokenPrice(fromToken.symbol);
  const { price: toPrice } = useTokenPrice(toToken.symbol);

  // Available tokens
  const tokens = [
    {
      symbol: 'SUI',
      name: 'Sui',
      icon: 'https://cryptologos.cc/logos/sui-sui-logo.png'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      icon: 'https://cryptologos.cc/logos/solana-sol-logo.png'
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
    }
  ];

  // Handle token swap
  const handleFromAmountChange = async (value: string) => {
    setFromAmount(value);
    if (value) {
      const output = await calculateOutputAmount(fromToken.symbol, toToken.symbol, value);
      setToAmount(output.toString());
      
      // Update price impact
      const impact = await getPriceImpact(fromToken.symbol, toToken.symbol, value);
      setPriceImpact(impact);
      
      // Get and set swap route
      const route = await getSwapRoute(fromToken.symbol, toToken.symbol, value);
      setSwapRoute(route);
    } else {
      setToAmount('');
      setPriceImpact(0);
      setSwapRoute([]);
    }
  };

  const handleToAmountChange = async (value: string) => {
    setToAmount(value);
    if (value) {
      const output = await calculateOutputAmount(toToken.symbol, fromToken.symbol, value, true);
      setFromAmount(output.toString());
      
      // Update price impact
      const impact = await getPriceImpact(fromToken.symbol, toToken.symbol, output.toString());
      setPriceImpact(impact);
      
      // Get and set swap route
      const route = await getSwapRoute(fromToken.symbol, toToken.symbol, output.toString());
      setSwapRoute(route);
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
    setFromAmount('');
    setToAmount('');
    setPriceImpact(0);
    setSwapRoute([]);
  };

  const handleSwap = async () => {
    if (!fromAmount || !toAmount) return;
    
    try {
      await executeSwap({
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        fromAmount,
        toAmount,
        slippage: parseFloat(slippage)
      });
      
      // Reset form after successful swap
      setFromAmount('');
      setToAmount('');
      setPriceImpact(0);
      setSwapRoute([]);
    } catch (error) {
      // Error handling is done in the useSwap hook
    }
  };

  // Update the connection check to see if *neither* wallet is connected
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

  const isSwapDisabled = !fromAmount || !toAmount || loadingFromBalance || loadingToBalance;
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
                onChange={setFromToken}
                tokens={tokens}
              />
              <TokenInput
                label="From"
                value={fromAmount}
                onChange={handleFromAmountChange}
                balance={fromBalance}
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
                onChange={setToToken}
                tokens={tokens}
              />
              <TokenInput
                label="To"
                value={toAmount}
                onChange={handleToAmountChange}
                balance={toBalance}
                symbol={toToken.symbol}
                tokenIcon={toToken.icon}
                isLoading={loadingToBalance}
              />
            </div>

            {/* Swap Details */}
            {fromAmount && toAmount && (
              <div className="p-4 bg-neutral-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Rate</span>
                  <span>
                    1 {fromToken.symbol} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken.symbol}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Price Impact</span>
                  <span className={priceImpact > 2 ? 'text-red-500' : 'text-green-500'}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Route</span>
                  <span>{swapRoute.join(' → ')}</span>
                </div>

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
                message="High price impact! The size of your trade will significantly affect the market price."
              />
            )}

            <Button
              onClick={handleSwap}
              disabled={isSwapDisabled}
              className="w-full"
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
