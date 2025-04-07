import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  TrendingUp,
  ArrowUpDown,
  Users,
  Clock,
  Download,
  Filter,
  Info
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { DateRangePicker } from '../components/forms/DateRangePicker';
import { Dropdown } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Tabs } from '../components/ui/Tabs';
import { Tooltip as UITooltip } from '../components/ui/Tooltip';
import dayjs from 'dayjs';

// Mock data
const generatePoolData = (days: number) => {
  return Array.from({ length: days }).map((_, i) => ({
    date: dayjs().subtract(days - i - 1, 'day').format('MMM DD'),
    tvl: 500000 + Math.random() * 250000,
    volume: 250000 + Math.random() * 100000,
    fees: 2500 + Math.random() * 1000,
    apy: 10 + Math.random() * 5
  }));
};

const transactions = [
  {
    hash: '0x1234...5678',
    type: 'Swap',
    amount: '$10,000',
    fee: '$30',
    time: '2 minutes ago',
    account: '0x8765...4321'
  },
  {
    hash: '0x8765...4321',
    type: 'Add Liquidity',
    amount: '$25,000',
    fee: '$75',
    time: '5 minutes ago',
    account: '0x9876...5432'
  }
];

const COLORS = ['#f4022f', '#ff6b62', '#ffb4ae', '#ffe5e3'];

const PoolAnalyticsPage = () => {
  const { id } = useParams();
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(30, 'day').toDate(),
    endDate: new Date()
  });
  
  const [activeMetric, setActiveMetric] = useState('tvl');
  const [activeTab, setActiveTab] = useState('overview');
  
  const poolData = generatePoolData(30);

  const metrics = [
    {
      title: 'Total Value Locked',
      value: '$2.5M',
      change: '+12.5%',
      icon: <TrendingUp className="text-primary" size={24} />
    },
    {
      title: '24h Volume',
      value: '$450K',
      change: '+8.3%',
      icon: <ArrowUpDown className="text-primary" size={24} />
    },
    {
      title: 'Total LPs',
      value: '1.2K',
      change: '+15.2%',
      icon: <Users className="text-primary" size={24} />
    },
    {
      title: 'APY',
      value: '12.5%',
      change: '+2.1%',
      icon: <Clock className="text-primary" size={24} />
    }
  ];

  const compositionData = [
    { name: 'SUI', value: 1250000 },
    { name: 'USDC', value: 1250000 }
  ];

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-neutral-600">{metric.title}</span>
                    {metric.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className={`text-sm ${
                      metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pool Composition */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Pool Composition</h2>
                <UITooltip content="Distribution of assets in the pool">
                  <Info size={20} className="text-neutral-400" />
                </UITooltip>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={compositionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {compositionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {compositionData.map((token, index) => (
                    <div key={token.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{token.name}</span>
                      </div>
                      <span className="font-medium">
                        ${(token.value / 1000000).toFixed(2)}M
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Main Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Pool Metrics</h2>
                <div className="flex items-center gap-4">
                  <Dropdown
                    items={[
                      { label: 'TVL', value: 'tvl' },
                      { label: 'Volume', value: 'volume' },
                      { label: 'Fees', value: 'fees' },
                      { label: 'APY', value: 'apy' }
                    ]}
                    value={activeMetric}
                    onChange={setActiveMetric}
                    className="w-40"
                  />
                  <Button
                    variant="outline"
                    leftIcon={<Download size={20} />}
                  >
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={poolData}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
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
                        dataKey={activeMetric}
                        stroke="#f4022f"
                        fillOpacity={1}
                        fill="url(#colorMetric)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Transactions</h2>
              <Button
                variant="ghost"
                leftIcon={<Filter size={20} />}
              >
                Filter
              </Button>
            </CardHeader>
            <CardContent>
              <Table
                columns={[
                  {
                    key: 'hash',
                    header: 'Transaction',
                    cell: (row) => (
                      <a href="#" className="text-primary hover:underline">
                        {row.hash}
                      </a>
                    )
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    cell: (row) => row.type
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    cell: (row) => row.amount
                  },
                  {
                    key: 'fee',
                    header: 'Fee',
                    cell: (row) => row.fee
                  },
                  {
                    key: 'account',
                    header: 'Account',
                    cell: (row) => (
                      <a href="#" className="text-primary hover:underline">
                        {row.account}
                      </a>
                    )
                  },
                  {
                    key: 'time',
                    header: 'Time',
                    cell: (row) => row.time
                  }
                ]}
                data={transactions}
              />
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">SUI-USDC Pool</h1>
          <p className="text-neutral-600">Pool Analytics</p>
        </div>
        <div className="w-full md:w-auto">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
    </div>
  );
};

export default PoolAnalyticsPage;