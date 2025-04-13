import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  TrendingUp,
  Droplets,
  Settings,
  Info,
  ChevronDown,
  Plus,
  Minus,
  ArrowDown,
  RefreshCw,
  Filter,
  SlidersHorizontal,
  Clock,
  Wallet,
  BarChart2
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card'; // Updated import
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
import { PlusCircle } from 'lucide-react'; // Import PlusCircle icon
import { Tooltip } from '../components/ui/Tooltip';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { TokenSelect } from '../components/forms/TokenSelect';
import { TokenInput } from '../components/forms/TokenInput';
import { SlippageInput } from '../components/forms/SlippageInput';
import { useWallet } from '@suiet/wallet-kit';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

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

// TokenIcons'ı daha strict bir şekilde tanımla
const tokenIcons = {
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
} as const; 


type Token = keyof typeof tokenIcons;

type TabType = 'add' | 'remove';

interface Pool {
  id: string;
  name: string;
  tvl: string;
  volume24h: string;
  apr: string;
  chain: string;
  token1: Token;
  token2: Token;
  fee: string;
  token1Balance: string; // Kept for potential future use
  token2Balance: string; // Kept for potential future use
  change24h: string; // Volume change
  volumeHistory: { time: string; value: number }[];
  impermanentLoss: string; // Kept for potential future use
  rewards: string[];
  utilization: number; // Kept for potential future use
}

// Helper to format large numbers
const formatNumber = (numStr: string): string => {
  const num = parseFloat(numStr.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return numStr; // Return original if parsing fails
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

const PoolsPage = () => {
  const { connected } = useWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('tvl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minTVL, setMinTVL] = useState<string>('');
  const [minAPR, setMinAPR] = useState<string>('');
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>('all');

  // Mock data for pools (ensure values are parseable numbers for sorting)
  const pools: Pool[] = [
    { id: '1', name: 'SUI-USDC', tvl: '$2500000', volume24h: '$450000', apr: '12.5%', chain: 'Sui', token1: 'SUI', token2: 'USDC', fee: '0.3%', token1Balance: '1.25M', token2Balance: '1.25M', change24h: '+5.2%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 10000 })), impermanentLoss: '-0.5%', rewards: ['SUI'], utilization: 75 },
    { id: '2', name: 'SOL-USDT', tvl: '$1800000', volume24h: '$320000', apr: '8.2%', chain: 'Solana', token1: 'SOL', token2: 'USDT', fee: '0.3%', token1Balance: '8.9K', token2Balance: '890K', change24h: '+3.1%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 8000 })), impermanentLoss: '-0.3%', rewards: ['SOL'], utilization: 82 },
    { id: '3', name: 'SUI-SOL', tvl: '$3200000', volume24h: '$680000', apr: '15.8%', chain: 'Cross-chain', token1: 'SUI', token2: 'SOL', fee: '0.4%', token1Balance: '1.6M', token2Balance: '16K', change24h: '+7.5%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 15000 })), impermanentLoss: '-0.7%', rewards: ['SUI', 'SOL'], utilization: 88 },
    { id: '4', name: 'SUI-BTC', tvl: '$4100000', volume24h: '$890000', apr: '11.2%', chain: 'Cross-chain', token1: 'SUI', token2: 'BTC', fee: '0.3%', token1Balance: '2.05M', token2Balance: '50', change24h: '+4.8%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 18000 })), impermanentLoss: '-0.9%', rewards: ['SUI'], utilization: 71 },
    { id: '5', name: 'SUI-ETH', tvl: '$3800000', volume24h: '$720000', apr: '13.5%', chain: 'Cross-chain', token1: 'SUI', token2: 'ETH', fee: '0.3%', token1Balance: '1.9M', token2Balance: '500', change24h: '+6.3%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 16000 })), impermanentLoss: '-0.6%', rewards: ['SUI', 'ETH'], utilization: 79 },
    { id: '6', name: 'SOL-BTC', tvl: '$5200000', volume24h: '$1100000', apr: '14.2%', chain: 'Cross-chain', token1: 'SOL', token2: 'BTC', fee: '0.4%', token1Balance: '26K', token2Balance: '65', change24h: '+8.1%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 20000 })), impermanentLoss: '-1.1%', rewards: ['SOL'], utilization: 94 },
    { id: '7', name: 'SUI-APT', tvl: '$1500000', volume24h: '$280000', apr: '9.8%', chain: 'Cross-chain', token1: 'SUI', token2: 'APT', fee: '0.3%', token1Balance: '750K', token2Balance: '25K', change24h: '+2.8%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 7000 })), impermanentLoss: '-0.4%', rewards: ['SUI', 'APT'], utilization: 68 },
    { id: '8', name: 'SOL-ETH', tvl: '$4500000', volume24h: '$950000', apr: '12.8%', chain: 'Cross-chain', token1: 'SOL', token2: 'ETH', fee: '0.3%', token1Balance: '22.5K', token2Balance: '600', change24h: '+5.9%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 19000 })), impermanentLoss: '-0.8%', rewards: ['SOL', 'ETH'], utilization: 86 },
    { id: '9', name: 'SUI-WMATIC', tvl: '$1200000', volume24h: '$180000', apr: '8.5%', chain: 'Cross-chain', token1: 'SUI', token2: 'WMATIC', fee: '0.3%', token1Balance: '600K', token2Balance: '400K', change24h: '+1.9%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 6000 })), impermanentLoss: '-0.2%', rewards: ['SUI'], utilization: 62 },
    { id: '10', name: 'SOL-AVAX', tvl: '$2100000', volume24h: '$420000', apr: '10.5%', chain: 'Cross-chain', token1: 'SOL', token2: 'AVAX', fee: '0.3%', token1Balance: '10.5K', token2Balance: '30K', change24h: '+4.2%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 9000 })), impermanentLoss: '-0.5%', rewards: ['SOL', 'AVAX'], utilization: 77 },
    { id: '11', name: 'SUI-SRM', tvl: '$980000', volume24h: '$150000', apr: '7.8%', chain: 'Cross-chain', token1: 'SUI', token2: 'SRM', fee: '0.3%', token1Balance: '490K', token2Balance: '35K', change24h: '+1.5%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 5000 })), impermanentLoss: '-0.3%', rewards: ['SUI'], utilization: 58 },
    { id: '12', name: 'SUI-BONK', tvl: '$850000', volume24h: '$120000', apr: '22.5%', chain: 'Cross-chain', token1: 'SUI', token2: 'BONK', fee: '0.3%', token1Balance: '425K', token2Balance: '8.5B', change24h: '+12.5%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 4000 })), impermanentLoss: '-0.8%', rewards: ['SUI', 'BONK'], utilization: 85 },
    { id: '13', name: 'SOL-RAY', tvl: '$1600000', volume24h: '$350000', apr: '18.2%', chain: 'Solana', token1: 'SOL', token2: 'RAY', fee: '0.3%', token1Balance: '8K', token2Balance: '160K', change24h: '+6.8%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 8500 })), impermanentLoss: '-1.2%', rewards: ['RAY'], utilization: 78 },
    { id: '14', name: 'SUI-ORCA', tvl: '$2200000', volume24h: '$480000', apr: '16.5%', chain: 'Cross-chain', token1: 'SUI', token2: 'ORCA', fee: '0.3%', token1Balance: '1.1M', token2Balance: '220K', change24h: '+4.2%', volumeHistory: Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, value: Math.random() * 11000 })), impermanentLoss: '-0.5%', rewards: ['SUI', 'ORCA'], utilization: 92 }
  ];

  const filteredPools = pools
    .filter(pool => {
      const matchesSearch = pool.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChain = selectedChain === 'all' || pool.chain === selectedChain;
      const matchesToken = selectedTokenFilter === 'all' ||
        pool.token1 === selectedTokenFilter ||
        pool.token2 === selectedTokenFilter;
      const matchesTVL = !minTVL ||
        parseFloat(pool.tvl.replace(/[^0-9.]/g, '')) >= parseFloat(minTVL);
      const matchesAPR = !minAPR ||
        parseFloat(pool.apr.replace('%', '')) >= parseFloat(minAPR);

      return matchesSearch && matchesChain && matchesToken && matchesTVL && matchesAPR;
    })
    .sort((a, b) => {
      const getValue = (pool: Pool) => {
        switch (sortBy) {
          case 'tvl':
            return parseFloat(pool.tvl.replace(/[^0-9.]/g, ''));
          case 'volume':
            return parseFloat(pool.volume24h.replace(/[^0-9.]/g, ''));
          case 'apr':
            return parseFloat(pool.apr.replace('%', ''));
          case 'utilization':
            return pool.utilization;
          default:
            return 0;
        }
      };

      const aValue = getValue(a);
      const bValue = getValue(b);

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

  const totalTVL = pools.reduce((acc, pool) => {
    return acc + parseFloat(pool.tvl.replace(/[^0-9.]/g, ''));
  }, 0);

  const total24hVolume = pools.reduce((acc, pool) => {
    return acc + parseFloat(pool.volume24h.replace(/[^0-9.]/g, ''));
  }, 0);

  const averageAPR = pools.length > 0 ? pools.reduce((acc, pool) => {
    return acc + parseFloat(pool.apr.replace('%', ''));
  }, 0) / pools.length : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Liquidity Pools</h1>
          <p className="text-neutral-600">Provide liquidity and earn rewards</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search pools..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            leftIcon={<Filter size={20} />}
          >
            Filters
          </Button>
           <Link to="/pools/new">
             <Button variant="primary" leftIcon={<PlusCircle size={20} />}>
               Add Liquidity
             </Button>
           </Link>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card className="mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">
                Chain
              </label>
              <Dropdown
                items={[
                  { label: 'All Chains', value: 'all' },
                  { label: 'Sui', value: 'Sui' },
                  { label: 'Solana', value: 'Solana' },
                  { label: 'Cross-chain', value: 'Cross-chain' }
                ]}
                value={selectedChain}
                onChange={setSelectedChain}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">
                Token
              </label>
              <Dropdown
                items={[
                  { label: 'All Tokens', value: 'all' },
                  ...Object.keys(tokenIcons).map(symbol => ({ label: symbol, value: symbol }))
                ]}
                value={selectedTokenFilter}
                onChange={setSelectedTokenFilter}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">
                Time Range
              </label>
              <Dropdown
                items={[
                  { label: '24 Hours', value: '24h' },
                  { label: '7 Days', value: '7d' },
                  { label: '30 Days', value: '30d' }
                ]}
                value={timeRange}
                onChange={setTimeRange}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">
                Minimum TVL ($)
              </label>
              <input
                type="text" // Change type to text
                inputMode="numeric" // Add inputMode hint
                pattern="[0-9]*" // Add pattern hint
                value={minTVL || ''} // Ensure value is always string or empty string
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, ''); // Allow only digits
                  setMinTVL(numericValue);
                }}
                placeholder="e.g., 100000"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">
                Minimum APR (%)
              </label>
              <input
                type="text" // Change type to text
                inputMode="numeric" // Add inputMode hint
                pattern="[0-9]*" // Add pattern hint
                value={minAPR || ''} // Ensure value is always string or empty string
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, ''); // Allow only digits
                  setMinAPR(numericValue);
                }}
                placeholder="e.g., 5"
                className="input w-full"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Droplets className="text-primary" size={24} />
            <h3 className="font-medium">Total Value Locked</h3>
          </div>
          <p className="text-2xl font-bold">
            {formatNumber(totalTVL.toString())}
          </p>
          {/* <p className="text-sm text-green-600">+5.8% (24h)</p> */} {/* Placeholder */}
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpDown className="text-primary" size={24} />
            <h3 className="font-medium">24h Volume</h3>
          </div>
          <p className="text-2xl font-bold">
            {formatNumber(total24hVolume.toString())}
          </p>
           {/* <p className="text-sm text-green-600">+12.3% (24h)</p> */} {/* Placeholder */}
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-primary" size={24} />
            <h3 className="font-medium">Average APR</h3>
          </div>
          <p className="text-2xl font-bold">{averageAPR.toFixed(2)}%</p>
           {/* <p className="text-sm text-green-600">+2.1% (24h)</p> */} {/* Placeholder */}
        </Card>
      </div>

      {/* Pool List Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold">All Pools ({filteredPools.length})</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">Sort by:</span>
          <Dropdown
            items={[
              { label: 'TVL', value: 'tvl' },
              { label: 'Volume (24h)', value: 'volume' },
              { label: 'APR', value: 'apr' },
              { label: 'Utilization', value: 'utilization' }
            ]}
            value={sortBy}
            onChange={setSortBy}
            className="w-32"
          />
          <button
            onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
            className="p-2 hover:bg-neutral-50 rounded-lg transition-colors"
          >
            <ArrowUpDown size={20} className="text-neutral-600" />
          </button>
        </div>
      </div>

      {/* NEW: Pool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPools.map((pool) => (
          <Card key={pool.id} className="hover:shadow-md transition-shadow duration-200 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <img
                    src={tokenIcons[pool.token1] ?? '/placeholder-icon.png'}
                    alt={pool.token1}
                    className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"
                  />
                  <img
                    src={tokenIcons[pool.token2] ?? '/placeholder-icon.png'}
                    alt={pool.token2}
                    className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"
                  />
                </div>
                <h3 className="text-lg font-bold">{pool.name}</h3>
              </div>
              <Badge
                variant={
                  pool.chain === 'Cross-chain' ? 'info' : pool.chain === 'Sui' ? 'success' : 'warning'
                }
                className="text-xs"
              >
                {pool.chain}
              </Badge>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between pt-4">
              <div className="space-y-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">TVL</span>
                  <span className="font-medium">{formatNumber(pool.tvl)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">Volume (24h)</span>
                  <span className="font-medium">{formatNumber(pool.volume24h)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">APR</span>
                  <span className="font-medium text-green-600">{pool.apr}</span>
                </div>
                {pool.rewards.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-500">Rewards</span>
                    <div className="flex items-center gap-1">
                      {pool.rewards.map((rewardSymbol) => (
                        <Tooltip key={rewardSymbol} content={`Earn ${rewardSymbol}`}>
                          <img
                            src={tokenIcons[rewardSymbol as Token] ?? '/placeholder-icon.png'}
                            alt={rewardSymbol}
                            className="w-5 h-5 bg-gray-200 rounded-full"
                          />
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
                {/* Optional: Add Volume Sparkline */}
                <div className="h-10 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pool.volumeHistory} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`colorVol-${pool.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f4022f" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#f4022f" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#f4022f"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill={`url(#colorVol-${pool.id})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
                <Link
                  to={`/pools/${pool.id}`}
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  Details
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedPool(pool.id)} // Assuming this opens a manage modal
                >
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Removed original table */}

    </div>
  );
};

export default PoolsPage;
