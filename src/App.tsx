import React, { useMemo } from 'react'; // Added useMemo
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { WalletProvider } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css'; // Added Suiet CSS
import { Toaster } from 'react-hot-toast';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css'; // Added Solana UI CSS
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import PoolsPage from './pages/PoolsPage';
import PoolDetailPage from './pages/PoolDetailPage';
import WalletPage from './pages/WalletPage';
import BridgePage from './pages/BridgePage';
import AnalyticsPage from './pages/AnalyticsPage';
import PoolAnalyticsPage from './pages/PoolAnalyticsPage';
import UserAnalyticsPage from './pages/UserAnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import NotificationsPage from './pages/settings/NotificationsPage';
import SecurityPage from './pages/settings/SecurityPage';
import SwapPage from './pages/SwapPage';
import CreatePoolPage from './pages/CreatePoolPage'; // Import the new page

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function App() {
  // Solana Setup
  const solanaNetwork = clusterApiUrl('devnet');
  const solanaWallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Add other wallets here if needed
    ],
    [] // network dependency removed as clusterApiUrl is stable for 'devnet'
  );

  return (
    <ConnectionProvider endpoint={solanaNetwork}>
      <SolanaWalletProvider wallets={solanaWallets} autoConnect>
        <WalletModalProvider>
          {/* Sui Wallet Provider (already present) */}
          <WalletProvider>
            <QueryClientProvider client={queryClient}>
              <Router>
                <div className="min-h-screen flex flex-col">
                  <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/pools" element={<PoolsPage />} />
                <Route path="/pools/:id" element={<PoolDetailPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/bridge" element={<BridgePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/analytics/pools/:id" element={<PoolAnalyticsPage />} />
                <Route path="/analytics/user" element={<UserAnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/notifications" element={<NotificationsPage />} />
                <Route path="/settings/security" element={<SecurityPage />} />
                <Route path="/swap" element={<SwapPage />} />
                <Route path="/pools/new" element={<CreatePoolPage />} /> {/* Add route for creating pool */}
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
                </Router>
              </QueryClientProvider>
            </WalletProvider>
          </WalletModalProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    );
  }

export default App;
