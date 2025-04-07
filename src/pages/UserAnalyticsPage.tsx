import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpDown,
  TrendingUp,
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
const generateUserData = (days: number) => {
  return Array.from({ length: days }).map((_, i) => ({
    date: dayjs().subtract(days - i - 1, 'day').format('MMM DD'),
    value: 100000 + Math.random() * 50000,
    pnl: 5000 + Math.random() * 2500,
    fees: 500 + Math.random() * 250
  }));
};

const positions = [
  {
    pool: 'SUI-USDC',
    value: '$25,000',
    share: '2.5%',
    pnl: '+$1,200',
    apy: '12.5%'
  },
  {
    pool: 'SOL-USDT',
    value: '$18,000',
    share: '1.8%',
    pnl: '+$800',
    apy: '8.2%'
  }
];

const COLORS = ['#f4022f', '#ff6b62', '#ffb4ae', '#ffe5e3'];

const UserAnalyticsPage = () => {
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(30, 'day').toDate(),
    endDate: new Date()
  });
  
  const [activeMetric, setActiveMetric] = useState('value');
  const [activeTab, setActiveTab] = useState('overview');
  
  const userData = generateUserData(30);

  const metrics = [
    {
      title: 'Total Value',
      value: '$43,000',
      change: '+12.5%',
      icon: <Wallet className="text-primary" size={24} />
    },
    {
      title: 'Total PnL',
      value: '+$2,000',
      change: '+8.3%',
      icon: <TrendingUp className="text-primary" size={24} />
    },
    {
      title: 'Total Fees Earned',
      value: '$500',
      change: '+15.2%',
      icon: <ArrowUpDown className="text-primary" size={24} />
    },
    {
      title: 'Time Weighted APY',
      value: '10.5%',
      change: '+2.1%',
      icon: <Clock className="text-primary" size={24} />
    }
  ];

  const portfolioComposition = [
    { name: 'SUI-USDC', value: 25000 },
    { name: 'SOL-USDT', value: 18000 }
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
            {/* Portfolio Composition */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Portfolio Composition</h2>
                <UITooltip content="Distribution of your liquidity positions">
                  <Info size={20} className="text-neutral-400" />
                </UITooltip>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={portfolioComposition}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {portfolioComposition.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {portfolioComposition.map((pool, index) => (
                    <div key={pool.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{pool.name}</span>
                      </div>
                      <span className="font-medium">
                        ${(pool.value / 1000).toFixed(1)}K
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Main Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Portfolio Performance</h2>
                <div className="flex items-center gap-4">
                  <Dropdown
                    items={[
                      { label: 'Portfolio Value', value: 'value' },
                      { label: 'PnL', value: 'pnl' },
                      { label: 'Fees Earned', value: 'fees' }
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
                    <AreaChart data={userData}>
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

          {/* Positions Table */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Active Positions</h2>
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
                    key: 'pool',
                    header: 'Pool',
                    cell: (row) => (
                      <a href="#" className="text-primary hover:underline">
                        {row.pool}
                      </a>
                    )
                  },
                  {
                    key: 'value',
                    header: 'Value',
                    cell: (row) => row.value
                  },
                  {
                    key: 'share',
                    header: 'Pool Share',
                    cell: (row) => row.share
                  },
                  {
                    key: 'pnl',
                    header: 'PnL',
                    cell: (row) => (
                      <span className={row.pnl.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                        {row.pnl}
                      </span>
                    )
                  },
                  {
                    key: 'apy',
                    header: 'APY',
                    cell: (row) => (
                
                      <Badge variant="success">
                        {row.apy}
                      </Badge>
                    )
                  }
                ]}
                data={positions}
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
          <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
          <p className="text-neutral-600">Track your liquidity positions and performance</p>
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

export default UserAnalyticsPage;