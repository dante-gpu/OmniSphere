import React, { useState } from 'react';
import { 
  TrendingUp, 
  ArrowUpDown, 
  Users, 
  Activity,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { DateRangePicker } from '../components/forms/DateRangePicker';
import { Dropdown } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Tabs } from '../components/ui/Tabs';
import dayjs from 'dayjs';

// Mock data
const generateTimeSeriesData = (days: number) => {
  return Array.from({ length: days }).map((_, i) => ({
    date: dayjs().subtract(days - i - 1, 'day').format('MMM DD'),
    tvl: 1000000 + Math.random() * 500000,
    volume: 500000 + Math.random() * 250000,
    fees: 5000 + Math.random() * 2500,
    transactions: 1000 + Math.random() * 500
  }));
};

const poolMetrics = [
  {
    name: 'SUI-USDC',
    tvl: '$2.5M',
    volume24h: '$450K',
    fees24h: '$1.35K',
    apy: '12.5%',
    change: '+5.2%'
  },
  {
    name: 'SOL-USDT',
    tvl: '$1.8M',
    volume24h: '$320K',
    fees24h: '$960',
    apy: '8.2%',
    change: '+3.1%'
  }
];

const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(30, 'day').toDate(),
    endDate: new Date()
  });
  
  const [activeMetric, setActiveMetric] = useState('tvl');
  const [activeTab, setActiveTab] = useState('overview');
  
  const timeSeriesData = generateTimeSeriesData(30);

  const metrics = [
    {
      title: 'Total Value Locked',
      value: '$4.3M',
      change: '+12.5%',
      icon: <TrendingUp className="text-primary" size={24} />
    },
    {
      title: '24h Volume',
      value: '$770K',
      change: '+8.3%',
      icon: <ArrowUpDown className="text-primary" size={24} />
    },
    {
      title: 'Total Users',
      value: '12.5K',
      change: '+15.2%',
      icon: <Users className="text-primary" size={24} />
    },
    {
      title: 'Active Pools',
      value: '8',
      change: '+1',
      icon: <Activity className="text-primary" size={24} />
    }
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

          {/* Main Chart */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Protocol Metrics</h2>
              <div className="flex items-center gap-4">
                <Dropdown
                  items={[
                    { label: 'TVL', value: 'tvl' },
                    { label: 'Volume', value: 'volume' },
                    { label: 'Fees', value: 'fees' },
                    { label: 'Transactions', value: 'transactions' }
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
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
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

          {/* Pool Metrics Table */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Pool Metrics</h2>
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
                    key: 'name',
                    header: 'Pool',
                    cell: (row) => row.name,
                    sortable: true
                  },
                  {
                    key: 'tvl',
                    header: 'TVL',
                    cell: (row) => row.tvl,
                    sortable: true
                  },
                  {
                    key: 'volume24h',
                    header: '24h Volume',
                    cell: (row) => row.volume24h,
                    sortable: true
                  },
                  {
                    key: 'fees24h',
                    header: '24h Fees',
                    cell: (row) => row.fees24h,
                    sortable: true
                  },
                  {
                    key: 'apy',
                    header: 'APY',
                    cell: (row) => (
                      <span className="text-green-600">{row.apy}</span>
                    ),
                    sortable: true
                  },
                  {
                    key: 'change',
                    header: '24h Change',
                    cell: (row) => (
                      <Badge
                        variant={row.change.startsWith('+') ? 'success' : 'error'}
                      >
                        {row.change}
                      </Badge>
                    ),
                    sortable: true
                  }
                ]}
                data={poolMetrics}
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
        <h1 className="text-3xl font-bold">Analytics</h1>
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

export default AnalyticsPage;