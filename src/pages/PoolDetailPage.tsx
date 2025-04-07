import React, { useState } from 'react';
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

const PoolDetailPage = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [removePercentage, setRemovePercentage] = useState(0);

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
    // This would be replaced with actual calculations
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
            />
          </div>
        </div>
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
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>

            {showSettings && renderSettings()}

            <div className="p-4 border border-neutral-200 rounded-xl">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-neutral-500">
                  SUI Amount
                </label>
                <div className="text-sm text-neutral-500">
                  Balance: 1,234.56 SUI
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
                  USDC Amount
                </label>
                <div className="text-sm text-neutral-500">
                  Balance: 5,000 USDC
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
                  <span className="font-medium">0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Share of Pool</span>
                  <span className="font-medium">0.00%</span>
                </div>
              </div>
            </div>

            <button className="btn-primary w-full">
              Add Liquidity
            </button>
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
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2">
                <button
                  onClick={() => handleRemovePercentageChange(25)}
                  className="px-3 py-1 text-sm rounded-lg hover:bg-neutral-50"
                >
                  25%
                </button>
                <button
                  onClick={() => handleRemovePercentageChange(50)}
                  className="px-3 py-1 text-sm rounded-lg hover:bg-neutral-50"
                >
                  50%
                </button>
                <button
                  onClick={() => handleRemovePercentageChange(75)}
                  className="px-3 py-1 text-sm rounded-lg hover:bg-neutral-50"
                >
                  75%
                </button>
                <button
                  onClick={() => handleRemovePercentageChange(100)}
                  className="px-3 py-1 text-sm rounded-lg hover:bg-neutral-50"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-600">You will receive:</span>
                <Info size={16} className="text-neutral-400" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>SUI</span>
                  <span className="font-medium">{poolStats.yourLiquidity.token1Amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>USDC</span>
                  <span className="font-medium">{poolStats.yourLiquidity.token2Amount}</span>
                </div>
              </div>
            </div>

            <button className="btn-primary w-full">
              Remove Liquidity
            </button>
          </div>
        );

      case 'bridge':
        return (
          <div className="space-y-4">
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

            <button className="btn-primary w-full">
              Bridge Liquidity
            </button>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Pool Header */}
      <div className="bg-white rounded-xl shadow-card p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">SUI-USDC Pool</h1>
            <p className="text-neutral-600">Cross-chain Liquidity Pool</p>
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
                  <span className="text-neutral-600">SUI Reserve</span>
                  <span>{poolStats.token1Reserve}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">USDC Reserve</span>
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