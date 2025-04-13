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
import { Card } from '../components/ui/Card';
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

// Define token icons map first using local paths (relative to /public)
// IMPORTANT: User needs to place these icon files in the /public/icons/ directory
const tokenIcons = {
  SUI: '/icons/sui.png',
  SOL: '/icons/sol.png',
  USDC: '/icons/usdc.png',
  USDT: '/icons/usdt.png',
  BTC: '/icons/btc.png',
  ETH: '/icons/eth.png',
  APT: '/icons/apt.png',
  WMATIC: '/icons/wmatic.png', // Assuming polygon icon is named wmatic.png
  AVAX: '/icons/avax.png',
  SRM: '/icons/srm.png',
  BONK: '/icons/bonk.png',
  RAY: '/icons/ray.png',
  ORCA: '/icons/orca.png'
};

// Define Token type based on the keys of the icon map
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
  token1Balance: string;
  token2Balance: string;
  change24h: string;
  volumeHistory: { time: string; value: number }[];
  impermanentLoss: string;
  rewards: string[];
  utilization: number;
}

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

  // Mock data for pools
  const pools: Pool[] = [
    {
      id: '1',
      name: 'SUI-USDC',
      tvl: '$2.5M',
      volume24h: '$450K',
      apr: '12.5%',
      chain: 'Sui',
      token1: 'SUI',
      token2: 'USDC',
      fee: '0.3%',
      token1Balance: '1.25M',
      token2Balance: '1.25M',
      change24h: '+5.2%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.5%',
      rewards: ['SUI'],
      utilization: 75
    },
    {
      id: '2',
      name: 'SOL-USDT',
      tvl: '$1.8M',
      volume24h: '$320K',
      apr: '8.2%',
      chain: 'Solana',
      token1: 'SOL',
      token2: 'USDT',
      fee: '0.3%',
      token1Balance: '8.9K',
      token2Balance: '890K',
      change24h: '+3.1%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.3%',
      rewards: ['SOL'],
      utilization: 82
    },
    {
      id: '3',
      name: 'SUI-SOL',
      tvl: '$3.2M',
      volume24h: '$680K',
      apr: '15.8%',
      chain: 'Cross-chain',
      token1: 'SUI',
      token2: 'SOL',
      fee: '0.4%',
      token1Balance: '1.6M',
      token2Balance: '16K',
      change24h: '+7.5%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.7%',
      rewards: ['SUI', 'SOL'],
      utilization: 88
    },
    {
      id: '4',
      name: 'SUI-BTC',
      tvl: '$4.1M',
      volume24h: '$890K',
      apr: '11.2%',
      chain: 'Cross-chain',
      token1: 'SUI',
      token2: 'BTC',
      fee: '0.3%',
      token1Balance: '2.05M',
      token2Balance: '50',
      change24h: '+4.8%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.9%',
      rewards: ['SUI'],
      utilization: 71
    },
    {
      id: '5',
      name: 'SUI-ETH',
      tvl: '$3.8M',
      volume24h: '$720K',
      apr: '13.5%',
      chain: 'Cross-chain',
      token1: 'SUI',
      token2: 'ETH',
      fee: '0.3%',
      token1Balance: '1.9M',
      token2Balance: '500',
      change24h: '+6.3%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.6%',
      rewards: ['SUI', 'ETH'],
      utilization: 79
    },
    {
      id: '6',
      name: 'SOL-BTC',
      tvl: '$5.2M',
      volume24h: '$1.1M',
      apr: '14.2%',
      chain: 'Cross-chain',
      token1: 'SOL',
      token2: 'BTC',
      fee: '0.4%',
      token1Balance: '26K',
      token2Balance: '65',
      change24h: '+8.1%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-1.1%',
      rewards: ['SOL'],
      utilization: 94
    },
    {
      id: '7',
      name: 'SUI-APT',
      tvl: '$1.5M',
      volume24h: '$280K',
      apr: '9.8%',
      chain: 'Cross-chain',
      token1: 'SUI',
      token2: 'APT',
      fee: '0.3%',
      token1Balance: '750K',
      token2Balance: '25K',
      change24h: '+2.8%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.4%',
      rewards: ['SUI', 'APT'],
      utilization: 68
    },
    {
      id: '8',
      name: 'SOL-ETH',
      tvl: '$4.5M',
      volume24h: '$950K',
      apr: '12.8%',
      chain: 'Cross-chain',
      token1: 'SOL',
      token2: 'ETH',
      fee: '0.3%',
      token1Balance: '22.5K',
      token2Balance: '600',
      change24h: '+5.9%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.8%',
      rewards: ['SOL', 'ETH'],
      utilization: 86
    },
    {
      id: '9',
      name: 'SUI-WMATIC',
      tvl: '$1.2M',
      volume24h: '$180K',
      apr: '8.5%',
      chain: 'Cross-chain',
      token1: 'SUI',
      token2: 'WMATIC',
      fee: '0.3%',
      token1Balance: '600K',
      token2Balance: '400K',
      change24h: '+1.9%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.2%',
      rewards: ['SUI'],
      utilization: 62
    },
    {
      id: '10',
      name: 'SOL-AVAX',
      tvl: '$2.1M',
      volume24h: '$420K',
      apr: '10.5%',
      chain: 'Cross-chain',
      token1: 'SOL',
      token2: 'AVAX',
      fee: '0.3%',
      token1Balance: '10.5K',
      token2Balance: '30K',
      change24h: '+4.2%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.5%',
      rewards: ['SOL', 'AVAX'],
      utilization: 77
    },
    {
      id: '11',
      name: 'SUI-SRM',
      tvl: '$980K',
      volume24h: '$150K',
      apr: '7.8%',
      chain: 'Cross-chain',
      token1: 'SUI',
      token2: 'SRM',
      fee: '0.3%',
      token1Balance: '490K',
      token2Balance: '35K',
      change24h: '+1.5%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.3%',
      rewards: ['SUI'],
      utilization: 58
    },
    {
      id: '12',
      name: 'SUI-BONK',
      tvl: '$850K',
      volume24h: '$120K',
      apr: '22.5%',
      chain: 'Cross-chain',
      token1: 'SUI',
      token2: 'BONK',
      fee: '0.3%',
      token1Balance: '425K',
      token2Balance: '8.5B',
      change24h: '+12.5%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.8%',
      rewards: ['SUI', 'BONK'],
      utilization: 85
    },
    {
      id: '13',
      name: 'SOL-RAY',
      tvl: '$1.6M',
      volume24h: '$350K',
      apr: '18.2%',
      chain: 'Solana',
      token1: 'SOL',
      token2: 'RAY',
      fee: '0.3%',
      token1Balance: '8K',
      token2Balance: '160K',
      change24h: '+6.8%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-1.2%',
      rewards: ['RAY'],
      utilization: 78
    },
    {
      id: '14',
      name: 'SUI-ORCA',
      tvl: '$2.2M',
      volume24h: '$480K',
      apr: '16.5%',
      chain: 'Cross-chain',
      token1: 'SUI',
      token2: 'ORCA',
      fee: '0.3%',
      token1Balance: '1.1M',
      token2Balance: '220K',
      change24h: '+4.2%',
      volumeHistory: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 10000
      })),
      impermanentLoss: '-0.5%',
      rewards: ['SUI', 'ORCA'],
      utilization: 92
    }
  ];

  // tokenIcons map is now defined at the top level

  const filteredPools = pools
    .filter(pool => {
      const matchesSearch = pool.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChain = selectedChain === 'all' || pool.chain === selectedChain;
      const matchesToken = selectedTokenFilter === 'all' || 
        pool.token1 === selectedTokenFilter || 
        pool.token2 === selectedTokenFilter;
      const matchesTVL = !minTVL || 
        parseFloat(pool.tvl.replace('$', '').replace('M', '000K').replace('K', '')) >= 
        parseFloat(minTVL);
      const matchesAPR = !minAPR || 
        parseFloat(pool.apr.replace('%', '')) >= parseFloat(minAPR);
      
      return matchesSearch && matchesChain && matchesToken && matchesTVL && matchesAPR;
    })
    .sort((a, b) => {
      const getValue = (pool: Pool) => {
        switch (sortBy) {
          case 'tvl':
            return parseFloat(pool.tvl.replace('$', '').replace('M', '000K').replace('K', ''));
          case 'volume':
            return parseFloat(pool.volume24h.replace('$', '').replace('M', '000K').replace('K', ''));
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
    return acc + parseFloat(pool.tvl.replace('$', '').replace('M', '000000').replace('K', '000'));
  }, 0);

  const total24hVolume = pools.reduce((acc, pool) => {
    return acc + parseFloat(pool.volume24h.replace('$', '').replace('M', '000000').replace('K', '000'));
  }, 0);

  const averageAPR = pools.reduce((acc, pool) => {
    return acc + parseFloat(pool.apr.replace('%', ''));
  }, 0) / pools.length;

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
           {/* Add Liquidity Button */}
           <Link to="/pools/new"> {/* TODO: Define this route later */}
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
                  { label: 'SUI', value: 'SUI' },
                  { label: 'SOL', value: 'SOL' },
                  { label: 'USDC', value: 'USDC' },
                  { label: 'USDT', value: 'USDT' }
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
                Minimum TVL
              </label>
              <input
                type="number"
                value={minTVL}
                onChange={(e) => setMinTVL(e.target.value)}
                placeholder="Enter minimum TVL"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">
                Minimum APR
              </label>
              <input
                type="number"
                value={minAPR}
                onChange={(e) => setMinAPR(e.target.value)}
                placeholder="Enter minimum APR"
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
            ${(totalTVL / 1000000).toFixed(2)}M
          </p>
          <p className="text-sm text-green-600">+5.8% (24h)</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpDown className="text-primary" size={24} />
            <h3 className="font-medium">24h Volume</h3>
          </div>
          <p className="text-2xl font-bold">
            ${(total24hVolume / 1000000).toFixed(2)}M
          </p>
          <p className="text-sm text-green-600">+12.3% (24h)</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-primary" size={24} />
            <h3 className="font-medium">Average APR</h3>
          </div>
          <p className="text-2xl font-bold">{averageAPR.toFixed(2)}%</p>
          <p className="text-sm text-green-600">+2.1% (24h)</p>
        </Card>
      </div>

      {/* Pools Table */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">All Pools</h2>
            <div className="flex items-center gap-4">
              <Dropdown
                items={[
                  { label: 'TVL', value: 'tvl' },
                  { label: 'Volume', value: 'volume' },
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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50">
                <th className="px-6 py-4 text-left text-sm font-medium text-neutral-500">Pool</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-neutral-500">Chain</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-neutral-500">TVL</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-neutral-500">24h Volume</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-neutral-500">APR</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-neutral-500">24h Change</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-neutral-500">Fee</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-neutral-500">Utilization</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-neutral-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPools.map((pool) => (
                <tr key={pool.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {/* Access icons safely, providing a fallback if symbol doesn't exist */}
                        <img
                          src={tokenIcons[pool.token1] ?? '/placeholder-icon.png'} // Use direct access, provide fallback
                          alt={pool.token1}
                          className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" // Added bg color for fallback visibility
                        />
                        <img
                          src={tokenIcons[pool.token2] ?? '/placeholder-icon.png'} // Use direct access, provide fallback
                          alt={pool.token2}
                          className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" // Added bg color for fallback visibility
                        />
                      </div>
                      <div>
                        <span className="font-medium">{pool.name}</span>
                        {pool.rewards.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {pool.rewards.map((rewardSymbol) => ( // Iterate through reward symbols
                              <img
                                key={rewardSymbol}
                                src={tokenIcons[rewardSymbol as Token] ?? '/placeholder-icon.png'} // Use reward symbol, provide fallback
                                alt={rewardSymbol}
                                className="w-4 h-4 bg-gray-200" // Added bg color
                                title={`Earn ${rewardSymbol} rewards`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        pool.chain === 'Cross-chain'
                          ? 'info'
                          : pool.chain === 'Sui'
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {pool.chain}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{pool.tvl}</td>
                  <td className="px-6 py-4 text-right text-neutral-600">
                    <div>
                      {pool.volume24h}
                      <div className="h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={pool.volumeHistory}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#f4022f"
                              fill="#f4022f20"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-green-600 font-medium">{pool.apr}</div>
                    <div className="text-sm text-neutral-500">
                      IL: {pool.impermanentLoss}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={pool.change24h.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                      {pool.change24h}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-600">{pool.fee}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pool.utilization}%` }}
                        />
                      </div>
                      <span className="text-sm">{pool.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/pools/${pool.id}`}
                        className="text-primary hover:text-primary-dark font-medium"
                      >
                        Details
                      </Link>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedPool(pool.id)}
                      >
                        Manage
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default PoolsPage;
