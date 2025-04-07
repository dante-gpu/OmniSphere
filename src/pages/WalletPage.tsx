import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowUpDown, History, Settings } from 'lucide-react';
import WalletConnector from '../components/wallet/WalletConnector';

const WalletPage = () => {
  // Mock data - will be replaced with real data
  const positions = [
    {
      id: '1',
      pool: 'SUI-USDC',
      share: '2.5%',
      value: '$25,000',
      earnings: '+$1,200',
    },
    {
      id: '2',
      pool: 'SOL-USDT',
      share: '1.8%',
      value: '$18,000',
      earnings: '+$800',
    },
  ];

  const transactions = [
    {
      id: '1',
      type: 'Add Liquidity',
      pool: 'SUI-USDC',
      amount: '$10,000',
      time: '2 hours ago',
    },
    {
      id: '2',
      type: 'Remove Liquidity',
      pool: 'SOL-USDT',
      amount: '$5,000',
      time: '1 day ago',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Wallet</h1>
        <WalletConnector />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Positions */}
          <div className="bg-white rounded-lg shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Positions</h2>
              <Link to="/pools" className="btn-primary">
                Add Liquidity
              </Link>
            </div>
            <div className="space-y-4">
              {positions.map((position) => (
                <div key={position.id} className="border border-neutral-100 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{position.pool}</h3>
                    <span className="text-green-600">{position.earnings}</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-600">
                    <span>Pool Share: {position.share}</span>
                    <span>Value: {position.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-lg shadow-card p-6">
            <h2 className="text-2xl font-bold mb-6">Recent Transactions</h2>
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 border border-neutral-100 rounded-lg">
                  <div className="flex items-center gap-4">
                    <ArrowUpDown className="text-primary" size={20} />
                    <div>
                      <p className="font-medium">{tx.type}</p>
                      <p className="text-sm text-neutral-600">{tx.pool}</p>
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

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-card p-6">
            <h2 className="text-xl font-bold mb-4">Portfolio Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Total Value</span>
                <span className="font-bold">$43,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Total Earnings</span>
                <span className="font-bold text-green-600">+$2,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Active Positions</span>
                <span className="font-bold">2</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-card p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="btn-outline w-full flex items-center justify-center gap-2">
                <History size={20} />
                View All Transactions
              </button>
              <button className="btn-outline w-full flex items-center justify-center gap-2">
                <Settings size={20} />
                Wallet Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;