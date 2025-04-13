import React, { useState } from 'react'; // Use React import
import { useParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  Droplets,
  TrendingUp,
  ArrowUpDown,
  Clock,
  ChevronDown,
  ExternalLink,
  ArrowRightLeft,
  Plus,
  Minus,
  Settings,
  Info,
  ArrowDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Import necessary components and hooks (assuming they exist)
import { useAddLiquidity } from '../hooks/useAddLiquidity'; // Assuming this hook exists
import { addLiquiditySchema, AddLiquidityInput } from '../lib/validations/pool'; // Assuming this exists
import { Button } from '../components/ui/Button'; // Assuming this exists
import { Card } from '../components/ui/Card'; // Assuming this exists
import { TokenInput } from '../components/forms/TokenInput'; // Assuming this exists

dayjs.extend(relativeTime);

// Import the new icons
import suiIcon from '../icons/sui.webp';
import solIcon from '../icons/sol.svg';
import usdcIcon from '../icons/usdc.png';
import usdtIcon from '../icons/tether.png';
import ethIcon from '../icons/eth.png'; // Added
import btcIcon from '../icons/btc.png'; // Added
import avaxIcon from '../icons/avax.png'; // Added
import bonkIcon from '../icons/bonk.png'; // Added
import wmaticIcon from '../icons/wmatic.png'; // Added (assuming exists)
import aptIcon from '../icons/apt.png'; // Added (assuming exists)
import rayIcon from '../icons/ray.png'; // Added (assuming exists)
import srmIcon from '../icons/srm.png'; // Added (assuming exists)
import orcaIcon from '../icons/orca.png'; // Added (assuming exists)


// Define token icons map (add other tokens if needed)
const tokenIcons: { [key: string]: string } = { // Added type annotation
  SUI: suiIcon,
  SOL: solIcon,
  USDC: usdcIcon,
  USDT: usdtIcon,
  BTC: btcIcon, // Updated
  ETH: ethIcon, // Updated
  WETH: ethIcon, // Added alias for Wrapped Ether
  APT: aptIcon, // Updated (assuming apt.png)
  WMATIC: wmaticIcon, // Updated (assuming wmatic.png)
  AVAX: avaxIcon, // Updated
  SRM: srmIcon, // Updated (assuming srm.png)
  BONK: bonkIcon, // Updated
  RAY: rayIcon, // Updated (assuming ray.png)
  ORCA: orcaIcon // Updated (assuming orca.png)
};


// Mock data - replace with real data from your API
const performanceData = Array.from({ length: 30 }, (_, i) => ({
  date: dayjs().subtract(29 - i, 'day').format('MMM DD'),
  apy: 15 + Math.random() * 10,
  volume: 100000 + Math.random() * 50000
}));

const recentTransactions = [
  {
    hash: '0x1234...5678',
    type: 'Add Liquidity',
    amount: '$50,000',
    time: '2 minutes ago',
    status: 'completed'
  },
  {
    hash: '0x8765...4321',
    type: 'Remove Liquidity',
    amount: '$25,000',
    time: '1 hour ago',
    status: 'completed'
  },
  {
    hash: '0x9876...5432',
    type: 'Swap',
    amount: '$10,000',
    time: '2 hours ago',
    status: 'completed'
  }
];

type TabType = 'add' | 'remove' | 'bridge';

// Define PoolData interface based on previous context
interface PoolData {
  id: string;
  name: string;
  onChainId: string;
  chain: 'sui' | 'solana';
  token1Symbol: string;
  token2Symbol: string;
  token1Decimals: number;
  token2Decimals: number;
}


const PoolDetailPage = () => {
  const { id } = useParams<{ id: string }>(); // Use generic type for params
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [removePercentage, setRemovePercentage] = useState(0);

  // --- Re-added state and effect for fetching pool data ---
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [errorLoadingPool, setErrorLoadingPool] = useState<string | null>(null);

  // Re-added effect to fetch pool data based on id
  React.useEffect(() => { // Use React.useEffect
    if (!id) {
      setErrorLoadingPool("Pool ID is missing from URL.");
      setIsLoadingPool(false);
      return;
    }

    setIsLoadingPool(true);
    setErrorLoadingPool(null);
    setPoolData(null);

    const timer = setTimeout(() => {
      try {
        let fetchedData: PoolData;
        if (id === '1') {
          fetchedData = {
            id: '1',
            name: 'SUI-USDC',
            onChainId: 'SUI_POOL_OBJECT_ID_PLACEHOLDER_1',
            chain: 'sui',
            token1Symbol: 'SUI',
            token2Symbol: 'USDC',
            token1Decimals: 9,
            token2Decimals: 6,
          };
        } else if (id === '2') {
          fetchedData = {
            id: '2',
            name: 'SOL-USDT',
            onChainId: 'SOL_POOL_PDA_PLACEHOLDER_2',
            chain: 'solana',
            token1Symbol: 'SOL',
            token2Symbol: 'USDT',
            token1Decimals: 9,
            token2Decimals: 6,
          };
        } else {
          throw new Error(`Pool with ID ${id} not found.`);
        }
        setPoolData(fetchedData);
      } catch (error) {
         console.error("Error fetching pool data:", error);
         setErrorLoadingPool(error instanceof Error ? error.message : "Failed to load pool data.");
      } finally {
         setIsLoadingPool(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [id]);
  // --- End re-added state and effect ---

  // Re-added addLiquidityMutation hook instantiation
  const addLiquidityMutation = useAddLiquidity(); // Assuming hook exists

  // Re-added handleAddLiquiditySubmit function
  const handleAddLiquiditySubmit = async () => {
    if (!poolData || !id) {
      console.error("Pool data not loaded or ID missing.");
      alert("Pool data is not available.");
      return;
    }
    const chainId = poolData.chain;
    const poolId = poolData.onChainId;
    if (!poolId || typeof poolId !== 'string') {
       console.error("Could not determine the on-chain pool ID.");
       alert("Could not determine the on-chain pool ID.");
       return;
    }
    const dataToValidate: AddLiquidityInput = { // Assuming AddLiquidityInput exists
      chainId: chainId,
      poolId: poolId,
      token1Amount: token1Amount,
      token2Amount: token2Amount,
      slippageTolerance: slippageTolerance,
    };
    const validationResult = addLiquiditySchema.safeParse(dataToValidate); // Assuming schema exists
    if (!validationResult.success) {
      console.error("Validation errors:", validationResult.error.flatten().fieldErrors);
      alert("Please check your input values.");
      return;
    }
    console.log("Submitting data:", validationResult.data);
    addLiquidityMutation.mutate(validationResult.data); // Call mutation
    // Removed placeholder alert, hook handles feedback
  };


  // Mock pool stats (should eventually use poolData)
  const poolStats = {
    tvl: '$5.2M',
    volume24h: '$1.2M',
    apy: '15.2%',
    fee: '0.3%',
    token1Reserve: '1.2M SUI',
    token2Reserve: '2.4M USDC',
    ratio: '1 SUI = 2 USDC',
    yourLiquidity: {
      lpTokens: '1000',
      share: '0.5%',
      value: '$25,000',
      token1Amount: '10,000 SUI',
      token2Amount: '20,000 USDC'
    }
  };

  const handleRemovePercentageChange = (value: number) => {
    setRemovePercentage(value);
    // Calculate token amounts based on percentage
  };

  const renderSettings = () => (
    <div className="p-4 bg-neutral-50 rounded-xl mb-4">
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

  const renderTabContent = () => {
     // --- Re-added loading/error checks ---
     if (isLoadingPool) {
       return <div className="text-center p-8">Loading pool details...</div>;
     }
     if (errorLoadingPool || !poolData) {
       return <div className="text-center p-8 text-red-600">Error loading pool details.</div>;
     }
     // --- End re-added loading/error checks ---

    switch (activeTab) {
      case 'add':
        return (
          <div className="space-y-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>

            {showSettings && renderSettings()}

             {/* Check for poolData before rendering form */}
            {!poolData ? (
               <div>Error loading pool details.</div>
            ) : (
              <>
                <div className="p-4 border border-neutral-200 rounded-xl">
                  <div className="flex justify-between mb-2">
                     {/* Use poolData for label */}
                    <label className="text-sm font-medium text-neutral-500">
                      {poolData.token1Symbol} Amount
                    </label>
                    <div className="text-sm text-neutral-500">
                       {/* Use poolData for balance symbol */}
                      Balance: 1,234.56 {poolData.token1Symbol}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     {/* Use TokenInput component */}
                    <TokenInput
                      label={`${poolData.token1Symbol} Amount`} // Pass label explicitly
                      value={token1Amount}
                      onChange={setToken1Amount}
                      symbol={poolData.token1Symbol}
                      balance="1,234.56" // Pass balance explicitly
                      tokenIcon={tokenIcons[poolData.token1Symbol] ?? '/placeholder-icon.png'} // Use map, provide fallback
                    />
                    <button className="btn-outline px-4">MAX</button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="p-2 bg-neutral-50 rounded-full">
                    <ArrowDown className="text-primary" size={24} />
                  </div>
                </div>

                <div className="p-4 border border-neutral-200 rounded-xl">
                  <div className="flex justify-between mb-2">
                     {/* Use poolData for label */}
                    <label className="text-sm font-medium text-neutral-500">
                      {poolData.token2Symbol} Amount
                    </label>
                    <div className="text-sm text-neutral-500">
                       {/* Use poolData for balance symbol */}
                      Balance: 5,000 {poolData.token2Symbol}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     {/* Use TokenInput component */}
                     <TokenInput
                       label={`${poolData.token2Symbol} Amount`} // Pass label explicitly
                       value={token2Amount}
                       onChange={setToken2Amount}
                       symbol={poolData.token2Symbol}
                       balance="5,000" // Pass balance explicitly
                       tokenIcon={tokenIcons[poolData.token2Symbol] ?? '/placeholder-icon.png'} // Use map, provide fallback
                     />
                    <button className="btn-outline px-4">MAX</button>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-neutral-600">Estimated Output</span>
                    <Info size={16} className="text-neutral-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>LP Tokens</span>
                      <span className="font-medium">0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Share of Pool</span>
                      <span className="font-medium">0.00%</span>
                    </div>
                  </div>
                </div>

                 {/* Re-added Button component with handler */}
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleAddLiquiditySubmit}
                  isLoading={addLiquidityMutation.isLoading || isLoadingPool} // Use hook's loading state
                  disabled={addLiquidityMutation.isLoading || isLoadingPool || !token1Amount || !token2Amount} // Add amount validation
                >
                   {addLiquidityMutation.isLoading ? 'Adding...' : isLoadingPool ? 'Loading...' : 'Add Liquidity (Demo)'}
                </Button>
              </>
            )}
          </div>
        );

      case 'remove':
         // Ensure poolData exists before rendering remove tab content
         if (!poolData) return <div>Error loading pool details.</div>;
        return (
          <div className="space-y-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>

            {showSettings && renderSettings()}

            <div className="p-4 border border-neutral-200 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Your Position</h3>
                <div className="text-sm text-neutral-500">
                  {poolStats.yourLiquidity.lpTokens} LP Tokens
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Your Share</span>
                  <span>{poolStats.yourLiquidity.share}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Value</span>
                  <span>{poolStats.yourLiquidity.value}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-neutral-200 rounded-xl">
              <label className="block text-sm font-medium text-neutral-500 mb-2">
                Amount to Remove
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={removePercentage}
                onChange={(e) => handleRemovePercentageChange(Number(e.target.value))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary" // Added accent color
              />
              <div className="flex justify-between mt-2">
                 {/* Simplified percentage buttons */}
                 {[0, 25, 50, 75, 100].map(val => (
                   <button
                     key={val}
                     onClick={() => handleRemovePercentageChange(val)}
                     className={`px-3 py-1 text-sm rounded-lg hover:bg-neutral-100 ${removePercentage === val ? 'text-primary font-medium' : ''}`}
                   >
                     {val}%
                   </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-600">You will receive (estimated):</span>
                <Info size={16} className="text-neutral-400" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                   {/* Use poolData for symbol */}
                  <span>{poolData.token1Symbol}</span>
                  <span className="font-medium">{poolStats.yourLiquidity.token1Amount}</span> {/* TODO: Calculate */}
                </div>
                <div className="flex justify-between">
                   {/* Use poolData for symbol */}
                  <span>{poolData.token2Symbol}</span>
                  <span className="font-medium">{poolStats.yourLiquidity.token2Amount}</span> {/* TODO: Calculate */}
                </div>
              </div>
            </div>

            <Button variant="primary" className="w-full"> {/* Re-added Button */}
              Remove Liquidity
            </Button>
          </div>
        );

      case 'bridge':
         // Ensure poolData exists before rendering bridge tab content
         if (!poolData) return <div>Error loading pool details.</div>;
        return (
          <div className="space-y-4">
             {/* Re-added Bridge form structure */}
             <div className="p-4 border border-neutral-200 rounded-xl">
               <div className="flex justify-between items-center mb-4">
                 <span className="font-medium">From Chain</span>
                 <select className="input w-40">
                   <option>Sui</option>
                   <option>Solana</option>
                 </select>
               </div>
               <div className="flex justify-between items-center">
                 <span className="font-medium">To Chain</span>
                 <select className="input w-40">
                   <option>Solana</option>
                   <option>Sui</option>
                 </select>
               </div>
             </div>
             <div className="p-4 border border-neutral-200 rounded-xl">
               <label className="block text-sm font-medium text-neutral-500 mb-2">
                 LP Token Amount
               </label>
               <div className="flex items-center gap-2">
                 <input
                   type="number"
                   className="input flex-1"
                   placeholder="0.00"
                 />
                 <button className="btn-outline px-4">MAX</button>
               </div>
             </div>
             <div className="p-4 bg-neutral-50 rounded-xl">
               <div className="flex items-center justify-between mb-4">
                 <span className="text-neutral-600">Bridge Details</span>
                 <Info size={16} className="text-neutral-400" />
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span>Bridge Fee</span>
                   <span>0.1%</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span>Estimated Time</span>
                   <span>2-5 minutes</span>
                 </div>
               </div>
             </div>
             <Button variant="primary" className="w-full"> {/* Re-added Button */}
               Bridge Liquidity
             </Button>
          </div>
        );
       default:
          return null;
    }
  };

   // --- Re-added loading/error checks for the main return ---
   if (isLoadingPool) {
     return <div className="container mx-auto px-4 py-8 text-center">Loading pool details...</div>;
   }
   if (errorLoadingPool || !poolData) {
     return <div className="container mx-auto px-4 py-8 text-center text-red-600">Error loading pool details: {errorLoadingPool || `Pool ID ${id} not found.`}</div>;
   }
   // --- End re-added loading/error checks ---


  return (
    <div className="container mx-auto px-4 py-8">
      {/* Pool Header */}
      <div className="bg-white rounded-xl shadow-card p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
             {/* Use poolData for name */}
            <h1 className="text-3xl font-bold mb-2">{poolData.name} Pool</h1>
            <p className="text-neutral-600">
               {/* Use poolData for chain */}
               {poolData.chain === 'sui' ? 'Sui' : poolData.chain === 'solana' ? 'Solana' : 'Unknown Chain'} Liquidity Pool
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Active
            </div>
            <button className="btn-outline">
              Share <ExternalLink size={16} className="ml-2" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-neutral-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="text-primary" size={20} />
              <span className="text-neutral-600">TVL</span>
            </div>
            <p className="text-2xl font-bold">{poolStats.tvl}</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpDown className="text-primary" size={20} />
              <span className="text-neutral-600">24h Volume</span>
            </div>
            <p className="text-2xl font-bold">{poolStats.volume24h}</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-primary" size={20} />
              <span className="text-neutral-600">APY</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{poolStats.apy}</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeftRight className="text-primary" size={20} />
              <span className="text-neutral-600">Fee</span>
            </div>
            <p className="text-2xl font-bold">{poolStats.fee}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-xl font-bold mb-6">Performance</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="apy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f4022f" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f4022f" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="apy"
                    stroke="#f4022f"
                    fillOpacity={1}
                    fill="url(#apy)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-xl font-bold mb-6">Recent Transactions</h2>
            <div className="space-y-4">
              {recentTransactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-neutral-100 rounded-lg">
                  <div className="flex items-center gap-4">
                    <ArrowUpDown className="text-primary" size={20} />
                    <div>
                      <p className="font-medium">{tx.type}</p>
                      <p className="text-sm text-neutral-600">{tx.hash}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{tx.amount}</p>
                    <p className="text-sm text-neutral-600">{tx.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex gap-2 mb-6">
              <button
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'add'
                    ? 'bg-primary text-white'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
                onClick={() => setActiveTab('add')}
              >
                <Plus size={20} className="mx-auto" />
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'remove'
                    ? 'bg-primary text-white'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
                onClick={() => setActiveTab('remove')}
              >
                <Minus size={20} className="mx-auto" />
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'bridge'
                    ? 'bg-primary text-white'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
                onClick={() => setActiveTab('bridge')}
              >
                <ArrowRightLeft size={20} className="mx-auto" />
              </button>
            </div>

            {renderTabContent()}

            <div className="mt-6 p-4 bg-neutral-50 rounded-xl">
              <h3 className="font-medium mb-4">Pool Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                   {/* Use poolData for symbol */}
                  <span className="text-neutral-600">{poolData.token1Symbol} Reserve</span>
                  <span>{poolStats.token1Reserve}</span>
                </div>
                <div className="flex justify-between">
                   {/* Use poolData for symbol */}
                  <span className="text-neutral-600">{poolData.token2Symbol} Reserve</span>
                  <span>{poolStats.token2Reserve}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Exchange Rate</span>
                  <span>{poolStats.ratio}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoolDetailPage;
