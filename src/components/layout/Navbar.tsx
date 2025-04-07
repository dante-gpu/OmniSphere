import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, BarChart2, ArrowRightLeft } from 'lucide-react';
import { useWallet } from '@suiet/wallet-kit';
import WalletConnector from '../wallet/WalletConnector';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const { account, connected } = useWallet();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="bg-white border-b border-neutral-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary">OmniSphere</span>
            </Link>
            <div className="hidden md:flex ml-10 space-x-8">
              <Link 
                to="/pools" 
                className={`
                  text-neutral-500 hover:text-neutral-900 flex items-center space-x-1 
                  px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors
                  ${isActive('/pools') ? 'text-primary font-medium' : ''}
                `}
              >
                Pools
              </Link>
              <Link 
                to="/swap" 
                className={`
                  text-neutral-500 hover:text-neutral-900 flex items-center space-x-1 
                  px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors
                  ${isActive('/swap') ? 'text-primary font-medium' : ''}
                `}
              >
                <ArrowRightLeft size={20} className="mr-1" />
                Swap
              </Link>
              <Link 
                to="/bridge" 
                className={`
                  text-neutral-500 hover:text-neutral-900 flex items-center space-x-1 
                  px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors
                  ${isActive('/bridge') ? 'text-primary font-medium' : ''}
                `}
              >
                Bridge
              </Link>
              <div className="relative">
                <button
                  onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                  className={`
                    text-neutral-500 hover:text-neutral-900 flex items-center space-x-1 
                    px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors
                    ${isActive('/analytics') ? 'text-primary font-medium' : ''}
                  `}
                >
                  <BarChart2 size={20} />
                  <span>Analytics</span>
                  <ChevronDown
                    size={16}
                    className={`ml-1 transition-transform duration-200 ${isAnalyticsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isAnalyticsOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 animate-fade-in">
                    <Link
                      to="/analytics"
                      className="block px-4 py-2 text-neutral-600 hover:bg-neutral-50 hover:text-primary transition-colors"
                      onClick={() => setIsAnalyticsOpen(false)}
                    >
                      Overview
                    </Link>
                    <Link
                      to="/analytics/user"
                      className="block px-4 py-2 text-neutral-600 hover:bg-neutral-50 hover:text-primary transition-colors"
                      onClick={() => setIsAnalyticsOpen(false)}
                    >
                      Portfolio Analytics
                    </Link>
                  </div>
                )}
              </div>
              <Link 
                to="/wallet" 
                className={`
                  text-neutral-500 hover:text-neutral-900 flex items-center space-x-1 
                  px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors
                  ${isActive('/wallet') ? 'text-primary font-medium' : ''}
                `}
              >
                Wallet
              </Link>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {connected && account && (
              <div className="px-4 py-2 bg-neutral-50 rounded-lg">
                <span className="text-sm text-neutral-500">Connected to Sui</span>
              </div>
            )}
            <WalletConnector />
          </div>

          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-neutral-500 hover:text-neutral-900 p-2 rounded-lg hover:bg-neutral-50"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/pools"
              className="block px-3 py-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50"
              onClick={() => setIsOpen(false)}
            >
              Pools
            </Link>
            <Link
              to="/swap"
              className="block px-3 py-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center">
                <ArrowRightLeft size={20} className="mr-2" />
                Swap
              </div>
            </Link>
            <Link
              to="/bridge"
              className="block px-3 py-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50"
              onClick={() => setIsOpen(false)}
            >
              Bridge
            </Link>
            <div className="px-3 py-2">
              <button
                onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                className="flex items-center justify-between w-full text-neutral-500 hover:text-neutral-900"
              >
                <span>Analytics</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${isAnalyticsOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isAnalyticsOpen && (
                <div className="pl-4 mt-2 space-y-2">
                  <Link
                    to="/analytics"
                    className="block py-2 text-neutral-500 hover:text-neutral-900"
                    onClick={() => {
                      setIsOpen(false);
                      setIsAnalyticsOpen(false);
                    }}
                  >
                    Overview
                  </Link>
                  <Link
                    to="/analytics/user"
                    className="block py-2 text-neutral-500 hover:text-neutral-900"
                    onClick={() => {
                      setIsOpen(false);
                      setIsAnalyticsOpen(false);
                    }}
                  >
                    Portfolio Analytics
                  </Link>
                </div>
              )}
            </div>
            <Link
              to="/wallet"
              className="block px-3 py-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50"
              onClick={() => setIsOpen(false)}
            >
              Wallet
            </Link>
            <div className="px-3 py-2">
              <WalletConnector />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;