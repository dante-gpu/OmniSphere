import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Network,
  BarChart3,
  ExternalLink,
  ArrowUpDown,
  Clock,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';

const HomePage = () => {
  const generateChartData = (points: number, trend: 'up' | 'down' | 'volatile') => {
    let baseValue = 50;
    return Array.from({ length: points }, (_, i) => {
      const random = Math.random() * 10;
      if (trend === 'up') baseValue += random * 0.5;
      if (trend === 'down') baseValue -= random * 0.3;
      if (trend === 'volatile') baseValue += (Math.random() > 0.5 ? 1 : -1) * random;
      return {
        name: i,
        value: Math.max(0, baseValue + random)
      };
    });
  };

  const features = [
    {
      title: "Atomic Transactions",
      description: "Execute cross-chain swaps in a single, seamless transaction with guaranteed finality",
      icon: <Network className="w-12 h-12 text-primary" />,
      stat: "$48.2M",
      label: "Total Value Locked",
      data: generateChartData(20, 'up'),
      change: "+12.5%"
    },
    {
      title: "Dynamic Liquidity Routing",
      description: "Optimize liquidity paths automatically for the most efficient cross-chain swaps",
      icon: <BarChart3 className="w-12 h-12 text-primary" />,
      stat: "$2.5M",
      label: "24h Volume",
      data: generateChartData(20, 'volatile'),
      change: "+8.3%"
    },
    {
      title: "Multiverse Strategies",
      description: "Deploy advanced yield-generating strategies across multiple blockchain ecosystems",
      icon: <ArrowUpDown className="w-12 h-12 text-primary" />,
      stat: "118",
      label: "Total Pools",
      data: generateChartData(20, 'up'),
      change: "+3.2%"
    }
  ];

  const recentTransactions = [
    {
      id: "8147...472e",
      time: "3m ago",
      type: "Swap",
      amount: "375.2 SUI/SOL",
      value: "$151.89",
      status: "Completed"
    },
    {
      id: "8542....495e",
      time: "2hr ago",
      type: "Add Liquidity",
      amount: "2495 SRI/SOL",
      value: "$53.84",
      status: "Completed"
    },
    {
      id: "679c....472c",
      time: "3hr ago",
      type: "Remove Liquidity",
      amount: "2756 SUI/SOL",
      value: "$15.59",
      status: "Completed"
    }
  ];

  const advantages = [
    {
      title: "Security First",
      description: "Our protocol implements multiple layers of security measures, including rigorous smart contract audits, secure cross-chain message passing, and real-time monitoring systems to ensure the highest level of protection for user assets and transactions."
    },
    {
      title: "Lightning Fast",
      description: "Experience near-instantaneous cross-chain swaps powered by our optimized routing algorithm and high-performance infrastructure, reducing settlement times from minutes to mere seconds."
    },
    {
      title: "Best Rates",
      description: "Our advanced routing engine analyzes multiple liquidity pools and paths across chains in real-time to ensure you always get the most competitive rates with minimal slippage."
    }
  ];

  const MiniChart = ({ data, showTooltip = false }: { data: any[], showTooltip?: boolean }) => (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f4022f" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#f4022f" stopOpacity={0}/>
          </linearGradient>
        </defs>
        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              padding: '8px'
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke="#f4022f"
          strokeWidth={2}
          fill="url(#colorValue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  return (
    <div className="min-h-screen bg-neon">
      <div className="container mx-auto px-4 pt-24 pb-16 text-center relative">
        <div className="animate-fade-in">
          <h1 className="text-6xl font-bold mb-6 gradient-text">
            Cross-Chain<br />
            Liquidity Protocol
          </h1>
          <p className="text-xl text-neutral-600 mb-12 max-w-2xl mx-auto animate-fade-in animate-delay-200">
            Experience seamless atomic liquidity composition across Sui and Solana networks
          </p>
          <div className="flex justify-center gap-4 animate-fade-in animate-delay-300">
            <Link
              to="/pools"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-primary rounded-full hover:bg-primary-dark transition-colors animate-pulse-primary"
            >
              Get Started
              <ArrowRight className="ml-2" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-primary border-2 border-primary rounded-full hover:bg-primary hover:text-white transition-colors glow-effect"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      <div id="features" className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`
                bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 
                hover-card animate-fade-in animate-shimmer
                animate-delay-${(index + 1) * 100}
              `}
            >
              <div className="mb-6">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-neutral-600 mb-8">{feature.description}</p>
              <div className="mb-2">
                <span className="text-4xl font-bold">{feature.stat}</span>
                <span className="ml-2 text-green-500">{feature.change}</span>
              </div>
              <p className="text-neutral-500 mb-4">{feature.label}</p>
              <MiniChart data={feature.data} showTooltip />
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl font-bold mb-4 gradient-text">Why Choose OmniSphere?</h2>
          <p className="text-neutral-600">Built for reliability, speed, and optimal pricing</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {advantages.map((advantage, index) => (
            <div 
              key={index} 
              className={`
                bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 
                hover-card animate-fade-in
                animate-delay-${(index + 1) * 200}
              `}
            >
              <h3 className="text-xl font-bold mb-2">{advantage.title}</h3>
              <p className="text-neutral-600">{advantage.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="col-span-2">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100">
              <h3 className="text-2xl font-bold mb-6">Supported Chains</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-neutral-50 transition-colors">
                  <img src="https://cryptologos.cc/logos/sui-sui-logo.png" alt="Sui" className="w-8 h-8" />
                  <div>
                    <span className="text-lg font-medium">Sui</span>
                    <p className="text-sm text-neutral-500">Fast, cost-efficient Layer 1</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-neutral-50 transition-colors">
                  <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="Solana" className="w-8 h-8" />
                  <div>
                    <span className="text-lg font-medium">Solana</span>
                    <p className="text-sm text-neutral-500">High-performance blockchain</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-neutral-500 text-sm mt-6 pt-6 border-t">
                <img src="https://wormhole.com/images/wormhole-logo.png" alt="Wormhole" className="w-5 h-5" />
                <span>Powered by Wormhole</span>
                <ExternalLink size={16} />
              </div>
            </div>
          </div>
          <div>
            <Link
              to="/wallet"
              className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 block mb-4 hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">Connect Wallet</span>
                <ArrowRight className="text-primary" />
              </div>
            </Link>
            <Link
              to="/pools"
              className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 block hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">Add Liquidity</span>
                <ArrowRight className="text-primary" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">Recent Transactions</h3>
            <Link to="/pools" className="text-primary hover:text-primary-dark font-medium">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="pb-4">ID</th>
                  <th className="pb-4">Time</th>
                  <th className="pb-4">Type</th>
                  <th className="pb-4">Amount</th>
                  <th className="pb-4 text-right">Value</th>
                  <th className="pb-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, index) => (
                  <tr key={index} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="py-4 font-mono">{tx.id}</td>
                    <td className="py-4 text-neutral-500">{tx.time}</td>
                    <td className="py-4">{tx.type}</td>
                    <td className="py-4">{tx.amount}</td>
                    <td className="py-4 text-right">{tx.value}</td>
                    <td className="py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;