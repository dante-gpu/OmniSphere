import React, { useState, useEffect } from 'react'; // Added useEffect
import { useParams } from 'react-router-dom';
// Removed duplicate useForm import if it existed, ensure it's imported if needed later
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button'; // Import Button component
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

// Import our hook and validation schema
import { useAddLiquidity } from '../hooks/useAddLiquidity';
import { addLiquiditySchema, AddLiquidityInput } from '../lib/validations/pool';

dayjs.extend(relativeTime);

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

// Define a type for our fetched pool data
interface PoolData {
  id: string;
  name: string;
  onChainId: string;
  chain: 'sui' | 'solana';
  token1Symbol: string;
  token2Symbol: string;
  token1Decimals: number;
  token2Decimals: number;
  // Add other necessary pool details
}


const PoolDetailPage = () => {
  const { id } = useParams<{ id: string }>(); // Ensure id is treated as string
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [removePercentage, setRemovePercentage] = useState(0);

  // Instantiate the mutation hook
  const addLiquidityMutation = useAddLiquidity();

  // State for fetched pool data
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [errorLoadingPool, setErrorLoadingPool] = useState<string | null>(null);

  // Effect to fetch pool data based on id
  useEffect(() => {
    if (!id) {
      setErrorLoadingPool("Pool ID is missing from URL.");
      setIsLoadingPool(false);
      return;
    }

    setIsLoadingPool(true);
    setErrorLoadingPool(null);
    setPoolData(null); // Clear previous data

    // Simulate API call
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
          // Handle unknown ID - throw an error or set specific state
          throw new Error(`Pool with ID ${id} not found.`);
        }
        setPoolData(fetchedData);
      } catch (error) {
         console.error("Error fetching pool data:", error);
         setErrorLoadingPool(error instanceof Error ? error.message : "Failed to load pool data.");
      } finally {
         setIsLoadingPool(false);
      }
    }, 500); // Simulate loading time

    return () => clearTimeout(timer);
  }, [id]); // Re-fetch if id changes


  // Mock pool stats (should eventually use poolData)
  const poolStats = {
    tvl: '$5.2M',
    volume24h: '$1.2M',
    apy: '15.2%',
    fee: '0.3%',
    token1Reserve: '1.2M SUI', // Should use poolData.token1Symbol
    token2Reserve: '2.4M USDC', // Should use poolData.token2Symbol
    ratio: '1 SUI = 2 USDC', // Should be calculated
    yourLiquidity: {
      lpTokens: '1000',
      share: '0.5%',
      value: '$25,000',
      token1Amount: '10,000 SUI', // Should use poolData.token1Symbol
      token2Amount: '20,000 USDC' // Should use poolData.token2Symbol
    }
  };

  const handleRemovePercentageChange = (value: number) => {
    setRemovePercentage(value);
    // TODO: Calculate token amounts based on percentage
  };

  // Handle form submission for adding liquidity
  const handleAddLiquiditySubmit = async () => {
    if (!poolData) {
      alert("Pool data is not available.");
      return;
    }

    const dataToValidate: AddLiquidityInput = {
      chainId: poolData.chain,
      poolId: poolData.onChainId,
      token1Amount: token1Amount,
      token2Amount: token2Amount,
      slippageTolerance: slippageTolerance,
    };

    const validationResult = addLiquiditySchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      // TODO: Show validation errors more gracefully
      console.error("Validation errors:", validationResult.error.flatten().fieldErrors);
      alert("Please check your input values.");
      return;
    }

    console.log("Submitting data:", validationResult.data);
    addLiquidityMutation.mutate(validationResult.data);
  };

  // --- Render Functions ---

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
    if (isLoadingPool) {
      return <div className="text-center p-8">Loading pool details...</div>;
    }
    if (errorLoadingPool || !poolData) {
      return <div className="text-center p-8 text-red-600">Error loading pool details.</div>;
    }

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

            <div className="p-4 border border-neutral-200 rounded-xl">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-neutral-500">
                  {poolData.token1Symbol} Amount
                </label>
                <div className="text-sm text-neutral-500">
                  {/* TODO: Fetch and display actual balance */}
                  Balance: 1,234.56 {poolData.token1Symbol}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="0.00"
                  value={token1Amount}
                  onChange={(e) => setToken1Amount(e.target.value)}
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
                <label className="text-sm font-medium text-neutral-500">
                  {poolData.token2Symbol} Amount
                </label>
                <div className="text-sm text-neutral-500">
                  {/* TODO: Fetch and display actual balance */}
                  Balance: 5,000 {poolData.token2Symbol}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="0.00"
                  value={token2Amount}
                  onChange={(e) => setToken2Amount(e.target.value)}
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
                  <span className="font-medium">0.00</span> {/* TODO: Calculate */}
                </div>
                <div className="flex justify-between">
                  <span>Share of Pool</span>
                  <span className="font-medium">0.00%</span> {/* TODO: Calculate */}
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleAddLiquiditySubmit}
              isLoading={addLiquidityMutation.isLoading}
              disabled={addLiquidityMutation.isLoading}
            >
              {addLiquidityMutation.isLoading ? 'Adding...' : 'Add Liquidity'}
            </Button>
          </div>
        );

      case 'remove':
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
                  {poolStats.yourLiquidity.lpTokens} LP Tokens {/* TODO: Use actual data */}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Your Share</span>
                  <span>{poolStats.yourLiquidity.share}</span> {/* TODO: Use actual data */}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Value</span>
                  <span>{poolStats.yourLiquidity.value}</span> {/* TODO: Use actual data */}
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
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-2">
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
                  <span>{poolData.token1Symbol}</span>
                  <span className="font-medium">{poolStats.yourLiquidity.token1Amount}</span> {/* TODO: Calculate based on percentage */}
                </div>
                <div className="flex justify-between">
                  <span>{poolData.token2Symbol}</span>
                  <span className="font-medium">{poolStats.yourLiquidity.token2Amount}</span> {/* TODO: Calculate based on percentage */}
                </div>
              </div>
            </div>

            <Button variant="primary" className="w-full"> {/* TODO: Add onClick handler */}
              Remove Liquidity
            </Button>
          </div>
        );

      case 'bridge':
        return (
          <div className="space-y-4">
            {/* TODO: Implement Bridge UI and Logic */}
            <p className="text-center text-neutral-500 p-4">Bridge functionality coming soon.</p>
            {/*
            <div className="p-4 border border-neutral-200 rounded-xl">
              ... From/To Chain selection ...
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl">
              ... LP Token Amount input ...
            </div>
            <div className="p-4 bg-neutral-50 rounded-xl">
              ... Bridge Details ...
            </div>
            <Button variant="primary" className="w-full">
              Bridge Liquidity
            </Button>
            */}
          </div>
        );
      default:
         return null; // Should not happen
    }
  };

  // --- Main Component Return ---

  // Display loading state for the whole page until pool data is fetched
  if (isLoadingPool) {
     return <div className="container mx-auto px-4 py-8 text-center">Loading pool details...</div>;
  }

  // Display error state if loading failed
  if (errorLoadingPool || !poolData) {
     return <div className="container mx-auto px-4 py-8 text-center text-red-600">Error loading pool details: {errorLoadingPool || `Pool ID ${id} not found.`}</div>;
  }

  // Render page content once data is loaded
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Pool Header */}
      <div className="bg-white rounded-xl shadow-card p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{poolData.name} Pool</h1> {/* Dynamic Name */}
            <p className="text-neutral-600">
               {poolData.chain === 'sui' ? 'Sui' : poolData.chain === 'solana' ? 'Solana' : 'Unknown Chain'} Liquidity Pool {/* Dynamic Chain */}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Active {/* TODO: Make dynamic */}
            </div>
            <button className="btn-outline">
              Share <ExternalLink size={16} className="ml-2" />
            </button>
          </div>
        </div>

        {/* Stats - Use poolStats (currently mock, should be updated with fetched data) */}
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
                  <span className="text-neutral-600">{poolData.token1Symbol} Reserve</span> {/* Dynamic */}
                  <span>{poolStats.token1Reserve}</span> {/* TODO: Use actual data */}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">{poolData.token2Symbol} Reserve</span> {/* Dynamic */}
                  <span>{poolStats.token2Reserve}</span> {/* TODO: Use actual data */}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Exchange Rate</span>
                  <span>{poolStats.ratio}</span> {/* TODO: Calculate */}
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
