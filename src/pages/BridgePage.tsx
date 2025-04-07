import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  ArrowDown, 
  Clock, 
  Shield, 
  Zap, 
  Info, 
  ExternalLink,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type Chain = 'sui' | 'solana';
type Token = 'SUI' | 'SOL' | 'USDC' | 'USDT';

interface BridgeTransaction {
  id: string;
  fromChain: Chain;
  toChain: Chain;
  token: Token;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
}

const BridgePage = () => {
  const [fromChain, setFromChain] = useState<Chain>('sui');
  const [toChain, setToChain] = useState<Chain>('solana');
  const [selectedToken, setSelectedToken] = useState<Token>('SUI');
  const [amount, setAmount] = useState('');

  // Mock data for bridge transactions
  const transactions: BridgeTransaction[] = [
    {
      id: '0x1234...5678',
      fromChain: 'sui',
      toChain: 'solana',
      token: 'SUI',
      amount: '100',
      status: 'completed',
      timestamp: Date.now() - 3600000
    },
    {
      id: '0x8765...4321',
      fromChain: 'solana',
      toChain: 'sui',
      token: 'USDC',
      amount: '1000',
      status: 'pending',
      timestamp: Date.now() - 7200000
    }
  ];

  const fees = {
    bridgeFee: '0.1%',
    estimatedGas: '0.01 SUI',
    total: '≈ $2.50'
  };

  const chainIcons = {
    sui: 'https://cryptologos.cc/logos/sui-sui-logo.png',
    solana: 'https://cryptologos.cc/logos/solana-sol-logo.png'
  };

  const tokenIcons = {
    SUI: 'https://cryptologos.cc/logos/sui-sui-logo.png',
    SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  };

  const handleSwapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-neutral-600 bg-neutral-50';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Bridge Assets</h1>

        {/* Main Bridge Card */}
        <div className="bg-white rounded-xl shadow-card p-6 mb-8">
          {/* Chain Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">From</label>
              <div className="relative">
                <select
                  value={fromChain}
                  onChange={(e) => setFromChain(e.target.value as Chain)}
                  className="input pl-12 appearance-none"
                >
                  <option value="sui">Sui Network</option>
                  <option value="solana">Solana</option>
                </select>
                <img
                  src={chainIcons[fromChain]}
                  alt={fromChain}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              </div>
            </div>

            <div className="relative flex items-center">
              <button
                onClick={handleSwapChains}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-white border border-neutral-200 hover:border-primary transition-colors z-10"
              >
                <ArrowRightLeft className="text-primary" size={20} />
              </button>

              <div className="w-full space-y-2">
                <label className="block text-sm font-medium text-neutral-600">To</label>
                <div className="relative">
                  <select
                    value={toChain}
                    onChange={(e) => setToChain(e.target.value as Chain)}
                    className="input pl-12 appearance-none"
                  >
                    <option value="solana">Solana</option>
                    <option value="sui">Sui Network</option>
                  </select>
                  <img
                    src={chainIcons[toChain]}
                    alt={toChain}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                  />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Token Selection and Amount */}
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">Token</label>
              <div className="relative">
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value as Token)}
                  className="input pl-12 appearance-none"
                >
                  <option value="SUI">SUI</option>
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
                <img
                  src={tokenIcons[selectedToken]}
                  alt={selectedToken}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input pr-24"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1 text-sm text-primary hover:bg-neutral-50 rounded-lg transition-colors">
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="bg-neutral-50 rounded-xl p-4 mb-6">
            <h3 className="font-medium mb-4">Fee Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Bridge Fee</span>
                <span>{fees.bridgeFee}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Estimated Gas</span>
                <span>{fees.estimatedGas}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-neutral-200">
                <span>Total</span>
                <span>{fees.total}</span>
              </div>
            </div>
          </div>

          <button className="btn-primary w-full">
            Bridge Assets
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-neutral-100">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-primary" size={24} />
              <h3 className="font-medium">Processing Time</h3>
            </div>
            <p className="text-neutral-600">Average completion time: 2-5 minutes</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-neutral-100">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="text-primary" size={24} />
              <h3 className="font-medium">Security</h3>
            </div>
            <p className="text-neutral-600">Fully audited smart contracts with secure message passing</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-neutral-100">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="text-primary" size={24} />
              <h3 className="font-medium">Fast & Efficient</h3>
            </div>
            <p className="text-neutral-600">Optimized for speed and low transaction costs</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Transactions</h2>
            <button className="p-2 hover:bg-neutral-50 rounded-lg transition-colors">
              <RefreshCw size={20} className="text-neutral-600" />
            </button>
          </div>

          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 border border-neutral-100 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <img src={chainIcons[tx.fromChain]} alt={tx.fromChain} className="w-5 h-5" />
                    <ArrowRightLeft size={16} className="text-neutral-400" />
                    <img src={chainIcons[tx.toChain]} alt={tx.toChain} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{tx.amount} {tx.token}</p>
                    <p className="text-sm text-neutral-500">{tx.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                  <p className="text-sm text-neutral-500 mt-1">{dayjs(tx.timestamp).fromNow()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BridgePage;