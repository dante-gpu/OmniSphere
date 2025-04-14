import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  Droplets,
  TrendingUp,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  ArrowRightLeft,
  Plus,
  Minus,
  Settings,
  Info,
  ArrowDown,
  Loader2 // Added for loading state
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

// Context and Hooks
import { usePools, Pool, Token as PoolToken } from '../context/PoolContext';
import { useAddLiquidity } from '../hooks/useAddLiquidity'; // Assuming this hook exists
import { addLiquiditySchema, AddLiquidityInput } from '../lib/validations/pool'; // Assuming this exists

// UI Components
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card'; // Use Card parts
import { TokenInput } from '../components/forms/TokenInput';
import { Alert } from '../components/ui/Alert';
import { Tooltip as UITooltip } from '../components/ui/Tooltip'; // Import custom Tooltip with alias

// Icons
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
const placeholderIcon = '/placeholder-icon.png';

dayjs.extend(relativeTime);

// Define token icons map
const tokenIcons: { [key: string]: string } = {
  SUI: suiIcon,
  SOL: solIcon,
  USDC: usdcIcon,
  USDT: usdtIcon,
  BTC: btcIcon,
  ETH: ethIcon,
  WETH: ethIcon,
  APT: aptIcon,
  WMATIC: wmaticIcon,
  AVAX: avaxIcon,
  SRM: srmIcon,
  BONK: bonkIcon,
  RAY: rayIcon,
  ORCA: orcaIcon
};

// Mock data for charts/transactions (replace with real data fetching if available)
const performanceData = Array.from({ length: 30 }, (_, i) => ({
  date: dayjs().subtract(29 - i, 'day').format('MMM DD'),
  apy: 15 + Math.random() * 10,
  volume: 100000 + Math.random() * 50000
}));

const recentTransactions = [
  { hash: '0x123...', type: 'Add Liquidity', amount: '$50,000', time: '2 minutes ago', status: 'completed' },
  { hash: '0x876...', type: 'Remove Liquidity', amount: '$25,000', time: '1 hour ago', status: 'completed' },
  { hash: '0x987...', type: 'Swap', amount: '$10,000', time: '2 hours ago', status: 'completed' }
];

type TabType = 'add' | 'remove' | 'bridge';

const PoolDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { getPoolById } = usePools();

  const [poolData, setPoolData] = useState<Pool | null>(null);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [errorLoadingPool, setErrorLoadingPool] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [removePercentage, setRemovePercentage] = useState(0);

  // Fetch pool data from context
  useEffect(() => {
    setIsLoadingPool(true);
    setErrorLoadingPool(null);
    if (id) {
      const foundPool = getPoolById(id);
      if (foundPool) {
        setPoolData(foundPool);
        // Set initial amounts for the form if needed (e.g., for Add Liquidity)
        // setToken1Amount(foundPool.token1Balance); // Example if needed
        // setToken2Amount(foundPool.token2Balance); // Example if needed
      } else {
        setErrorLoadingPool(`Pool with ID ${id} not found.`);
      }
      setIsLoadingPool(false);
    } else {
      setErrorLoadingPool("Pool ID is missing from URL.");
      setIsLoadingPool(false);
    }
  }, [id, getPoolById]);

  // TODO: Update mutation hooks if their logic needs context data
  const addLiquidityMutation = useAddLiquidity();
  // const removeLiquidityMutation = useRemoveLiquidity(); // Assuming this exists
  // const bridgeLiquidityMutation = useBridgeLiquidity(); // Assuming this exists

  const handleAddLiquiditySubmit = async () => {
    if (!poolData) {
      alert("Pool data is not available.");
      return;
    }
    // Use context pool ID
    const dataToValidate: AddLiquidityInput = {
      chainId: poolData.chain as 'sui' | 'solana', // Cast needed? Check hook input type
      poolId: poolData.id,
      token1Amount: token1Amount,
      token2Amount: token2Amount,
      slippageTolerance: slippageTolerance,
    };
    const validationResult = addLiquiditySchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      console.error("Validation errors:", validationResult.error.flatten().fieldErrors);
      alert("Please check your input values.");
      return;
    }
    console.log("Submitting Add Liquidity data:", validationResult.data);
    addLiquidityMutation.mutate(validationResult.data);
  };

  const handleRemoveLiquiditySubmit = () => {
    if (!poolData) return;
    console.log("Submitting Remove Liquidity:", { poolId: poolData.id, percentage: removePercentage });
    // removeLiquidityMutation.mutate({ poolId: poolData.id, percentage: removePercentage });
    alert(`DEMO: Remove ${removePercentage}% liquidity from pool ${poolData.id}`);
  };

  const handleBridgeLiquiditySubmit = () => {
    if (!poolData) return;
    console.log("Submitting Bridge Liquidity:", { poolId: poolData.id /*, other params */ });
    // bridgeLiquidityMutation.mutate({ poolId: poolData.id, /* other params */ });
    alert(`DEMO: Bridge liquidity for pool ${poolData.id}`);
  };


  const handleRemovePercentageChange = (value: number) => {
    setRemovePercentage(value);
    // TODO: Calculate estimated token amounts based on percentage and poolData.yourLiquidity (if available)
  };

  // --- Loading and Error States ---
  if (isLoadingPool) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (errorLoadingPool || !poolData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Alert type="error" title="Error Loading Pool" message={errorLoadingPool || `Pool with ID ${id} not found.`} />
        <Link to="/pools" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft size={16} className="mr-2" /> Back to Pools
          </Button>
        </Link>
      </div>
    );
  }
  // --- End Loading and Error States ---

  // Helper function to format chain name
  const formatChainName = (chain: string) => {
    if (chain === 'sui') return 'Sui';
    if (chain === 'solana') return 'Solana';
    return chain.charAt(0).toUpperCase() + chain.slice(1); // Capitalize other chains
  };

  // Placeholder for user's liquidity data - fetch this separately if needed
  const userLiquidity = {
    lpTokens: '0', // Placeholder
    share: '0.00%', // Placeholder
    value: '$0.00', // Placeholder
    token1Amount: '0', // Placeholder
    token2Amount: '0' // Placeholder
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
        {/* Add other settings like deadline if needed */}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'add':
        return (
          <div className="space-y-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between w-full text-neutral-600 hover:text-neutral-900 transition-colors text-sm font-medium p-2 rounded-md hover:bg-neutral-50"
            >
              <span className="flex items-center gap-2">
                <Settings size={16} />
                Transaction Settings
              </span>
              <ChevronDown size={16} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            </button>

            {showSettings && renderSettings()}

            <TokenInput
              label={`${poolData.token1} Amount`}
              value={token1Amount}
              onChange={setToken1Amount}
              symbol={poolData.token1}
              balance="-" // TODO: Fetch user balance
              tokenIcon={tokenIcons[poolData.token1] ?? placeholderIcon}
            />
            <div className="flex justify-center my-1">
              <Plus size={20} className="text-neutral-400" />
            </div>
            <TokenInput
              label={`${poolData.token2} Amount`}
              value={token2Amount}
              onChange={setToken2Amount}
              symbol={poolData.token2}
              balance="-" // TODO: Fetch user balance
              tokenIcon={tokenIcons[poolData.token2] ?? placeholderIcon}
            />

            {/* Estimated Output Section */}
            <Card className="bg-neutral-50 border-neutral-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <span>Estimated Output</span>
                  <UITooltip content={<span>Output is estimated. Actual amount may vary due to price changes and fees.</span>}>
                    <Info size={16} className="cursor-help" />
                  </UITooltip>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">LP Tokens</span>
                  <span className="font-medium">0.00</span> {/* TODO: Calculate */}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Share of Pool</span>
                  <span className="font-medium">0.00%</span> {/* TODO: Calculate */}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleAddLiquiditySubmit}
              isLoading={addLiquidityMutation.isLoading}
              disabled={addLiquidityMutation.isLoading || !token1Amount || !token2Amount || parseFloat(token1Amount) <= 0 || parseFloat(token2Amount) <= 0}
            >
              {addLiquidityMutation.isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
            </Button>
          </div>
        );

      case 'remove':
        return (
          <div className="space-y-4">
             <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between w-full text-neutral-600 hover:text-neutral-900 transition-colors text-sm font-medium p-2 rounded-md hover:bg-neutral-50"
            >
              <span className="flex items-center gap-2">
                <Settings size={16} />
                Transaction Settings
              </span>
              <ChevronDown size={16} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            </button>

            {showSettings && renderSettings()}

            {/* Your Position Card */}
            <Card className="border-neutral-200">
              <CardHeader className="p-4 border-b border-neutral-100">
                 <h3 className="font-medium">Your Position</h3>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-neutral-600">LP Tokens</span>
                   <span>{userLiquidity.lpTokens}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-neutral-600">Share of Pool</span>
                   <span>{userLiquidity.share}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-neutral-600">Value</span>
                   <span>{userLiquidity.value}</span>
                 </div>
              </CardContent>
            </Card>

            {/* Amount to Remove Card */}
            <Card className="border-neutral-200">
               <CardHeader className="p-4 border-b border-neutral-100">
                 <label className="block text-sm font-medium text-neutral-700">
                   Amount to Remove
                 </label>
               </CardHeader>
               <CardContent className="p-4">
                 <input
                   type="range"
                   min="0"
                   max="100"
                   value={removePercentage}
                   onChange={(e) => handleRemovePercentageChange(Number(e.target.value))}
                   className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary mb-2"
                 />
                 <div className="flex justify-between text-xs text-neutral-500">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                 </div>
                 <div className="flex justify-center mt-2">
                    <span className="text-lg font-medium text-primary">{removePercentage}%</span>
                 </div>
               </CardContent>
            </Card>

            {/* Estimated Receive Card */}
            <Card className="bg-neutral-50 border-neutral-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
                  <span>You will receive (estimated):</span>
                  <UITooltip content={<span>Output is estimated. Actual amount may vary due to price changes and fees.</span>}>
                    <Info size={16} className="cursor-help" />
                  </UITooltip>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm flex items-center gap-1">
                     <img src={tokenIcons[poolData.token1] ?? placeholderIcon} alt={poolData.token1} className="w-4 h-4" />
                     {poolData.token1}
                  </span>
                  <span className="font-medium">{userLiquidity.token1Amount}</span> {/* TODO: Calculate based on percentage */}
                </div>
                <div className="flex justify-between">
                   <span className="text-sm flex items-center gap-1">
                     <img src={tokenIcons[poolData.token2] ?? placeholderIcon} alt={poolData.token2} className="w-4 h-4" />
                     {poolData.token2}
                  </span>
                  <span className="font-medium">{userLiquidity.token2Amount}</span> {/* TODO: Calculate based on percentage */}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleRemoveLiquiditySubmit}
              // isLoading={removeLiquidityMutation.isLoading}
              disabled={removePercentage <= 0 /* || removeLiquidityMutation.isLoading */}
            >
              Remove Liquidity
            </Button>
          </div>
        );

      case 'bridge':
        return (
          <div className="space-y-4">
             <Alert type="info" message="Bridge functionality is coming soon." />
             {/* Placeholder for Bridge form */}
             <Card className="border-neutral-200">
                <CardHeader className="p-4">
                   <h3 className="font-medium">Bridge Liquidity (Coming Soon)</h3>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">From Chain</label>
                      <input className="input w-full bg-neutral-100" value={formatChainName(poolData.chain)} disabled />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">To Chain</label>
                      <select className="input w-full" disabled>
                         <option>{poolData.chain === 'sui' ? 'Solana' : 'Sui'}</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">LP Token Amount</label>
                      <div className="flex items-center gap-2">
                         <input type="number" className="input flex-1" placeholder="0.00" disabled />
                         <Button variant="outline" disabled>MAX</Button>
                      </div>
                   </div>
                   <Card className="bg-neutral-50 border-neutral-200">
                      <CardContent className="p-3 space-y-1">
                         <div className="flex justify-between text-xs text-neutral-600">
                            <span>Bridge Fee</span>
                            <span>~0.1%</span>
                         </div>
                         <div className="flex justify-between text-xs text-neutral-600">
                            <span>Estimated Time</span>
                            <span>~2-5 minutes</span>
                         </div>
                      </CardContent>
                   </Card>
                   <Button variant="primary" className="w-full" disabled>
                      Bridge Liquidity
                   </Button>
                </CardContent>
             </Card>
          </div>
        );
       default:
          return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/pools" className="flex items-center gap-2 text-neutral-600 hover:text-primary mb-6 transition-colors text-sm">
        <ArrowLeft size={16} />
        Back to Pools
      </Link>

      {/* Pool Header Card */}
      <Card className="mb-8 shadow-sm">
        <CardHeader className="p-6 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="flex -space-x-2">
                  <img src={tokenIcons[poolData.token1] ?? placeholderIcon} alt={poolData.token1} className="w-8 h-8 rounded-full border-2 border-white" />
                  <img src={tokenIcons[poolData.token2] ?? placeholderIcon} alt={poolData.token2} className="w-8 h-8 rounded-full border-2 border-white" />
               </div>
               <div>
                  <h1 className="text-2xl font-bold">{poolData.name}</h1>
                  <p className="text-sm text-neutral-500">{formatChainName(poolData.chain)} Pool</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
              {/* <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Active
              </div> */}
              <Button variant="outline" size="sm">
                Share <ExternalLink size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Stats */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <Droplets size={14} />
              <span>TVL</span>
            </div>
            <p className="text-lg font-semibold">{poolData.tvl}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <ArrowUpDown size={14} />
              <span>24h Volume</span>
            </div>
            <p className="text-lg font-semibold">{poolData.volume24h}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <TrendingUp size={14} />
              <span>APR</span>
            </div>
            <p className="text-lg font-semibold text-green-600">{poolData.apr}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <ArrowLeftRight size={14} />
              <span>Fee</span>
            </div>
            <p className="text-lg font-semibold">{poolData.fee}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Charts & Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart Card */}
          <Card className="shadow-sm">
            <CardHeader className="p-6">
              <h2 className="text-lg font-semibold">Performance</h2>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  {/* Use poolData.volumeHistory for the chart data */}
                  <AreaChart data={poolData.volumeHistory}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1"> {/* Changed gradient ID */}
                        <stop offset="5%" stopColor="#f4022f" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f4022f" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    {/* Use 'time' for XAxis and 'value' for YAxis dataKey */}
                    <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                    {/* Use the Tooltip directly imported from recharts */}
                    <Tooltip contentStyle={{ fontSize: '12px', padding: '4px 8px' }} />
                    <Area
                      type="monotone"
                      dataKey="value" // Use 'value' from volumeHistory
                      stroke="#f4022f"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#volumeGradient)" // Use updated gradient ID
                      name="Volume" // Update name for tooltip
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pool Information Card */}
           <Card className="shadow-sm">
             <CardHeader className="p-6">
               <h2 className="text-lg font-semibold">Pool Information</h2>
             </CardHeader>
             <CardContent className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
               <div className="space-y-1">
                 <span className="text-neutral-500">{poolData.token1} Reserve</span>
                 <p className="font-medium">{poolData.token1Balance}</p>
               </div>
               <div className="space-y-1">
                 <span className="text-neutral-500">{poolData.token2} Reserve</span>
                 <p className="font-medium">{poolData.token2Balance}</p>
               </div>
               <div className="space-y-1">
                 <span className="text-neutral-500">Exchange Rate</span>
                 <p className="font-medium">1 {poolData.token1} ≈ ? {poolData.token2}</p> {/* TODO: Calculate */}
               </div>
                <div className="space-y-1">
                 <span className="text-neutral-500">Pool ID</span>
                 <p className="font-medium break-all text-xs">{poolData.id}</p>
               </div>
             </CardContent>
           </Card>


          {/* Recent Transactions Card */}
          <Card className="shadow-sm">
            <CardHeader className="p-6">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-3">
                {recentTransactions.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neutral-100 rounded-full">
                         <ArrowUpDown className="text-neutral-500" size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tx.type}</p>
                        <p className="text-xs text-neutral-500">{tx.hash}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{tx.amount}</p>
                      <p className="text-xs text-neutral-500">{tx.time}</p>
                    </div>
                  </div>
                ))}
                 {recentTransactions.length === 0 && (
                    <p className="text-sm text-neutral-500 text-center py-4">No recent transactions for this pool.</p>
                 )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions Card */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm sticky top-20">
            <CardHeader className="p-0">
               {/* Tabs */}
               <div className="flex border-b border-neutral-200">
                 <button
                   className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex justify-center items-center gap-2 ${
                     activeTab === 'add'
                       ? 'text-primary border-b-2 border-primary'
                       : 'text-neutral-500 hover:text-neutral-800'
                   }`}
                   onClick={() => setActiveTab('add')}
                 >
                   <Plus size={16} /> Add
                 </button>
                 <button
                   className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex justify-center items-center gap-2 ${
                     activeTab === 'remove'
                       ? 'text-primary border-b-2 border-primary'
                       : 'text-neutral-500 hover:text-neutral-800'
                   }`}
                   onClick={() => setActiveTab('remove')}
                 >
                   <Minus size={16} /> Remove
                 </button>
                 <button
                   className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex justify-center items-center gap-2 ${
                     activeTab === 'bridge'
                       ? 'text-primary border-b-2 border-primary'
                       : 'text-neutral-500 hover:text-neutral-800'
                   }`}
                   onClick={() => setActiveTab('bridge')}
                 >
                   <ArrowRightLeft size={16} /> Bridge
                 </button>
               </div>
            </CardHeader>
            <CardContent className="p-6">
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PoolDetailPage;
