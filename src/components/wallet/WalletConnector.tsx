import React, { useState } from 'react';
import { Wallet, X, ExternalLink, LogOut, ChevronDown, Copy, CheckCircle } from 'lucide-react';
import { ConnectButton, WalletProvider, useWallet } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';

const WalletModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-900"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Connect Wallet</h2>
        
        <div className="space-y-4">
          <div className="p-6 border border-neutral-200 rounded-xl hover:border-primary transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img src="https://cryptologos.cc/logos/sui-sui-logo.png" alt="Sui" className="w-8 h-8" />
                <h3 className="font-medium">Sui Wallet</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Recommended</span>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Connect to Sui Network using Suiet wallet for the best experience
            </p>
            <ConnectButton className="w-full btn-primary" />
          </div>

          <div className="text-center">
            <a 
              href="https://suiet.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-primary hover:text-primary-dark"
            >
              Don't have Suiet wallet? Install now
              <ExternalLink size={14} className="ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const WalletDropdown = () => {
  const { account, connected, disconnect } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!connected || !account) return null;

  const copyAddress = async () => {
    await navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-outline flex items-center space-x-2 group"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
        </div>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 z-50">
          <div className="px-4 py-3 border-b border-neutral-100">
            <div className="text-sm text-neutral-500">Connected to Sui Network</div>
            <div className="flex items-center justify-between mt-2">
              <div className="font-mono text-sm">{account.address.slice(0, 10)}...{account.address.slice(-8)}</div>
              <button
                onClick={copyAddress}
                className="p-2 hover:bg-neutral-50 rounded-lg transition-colors"
                title="Copy address"
              >
                {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-neutral-500" />}
              </button>
            </div>
          </div>
          
          <button
            onClick={disconnect}
            className="w-full px-4 py-3 flex items-center space-x-2 text-left hover:bg-neutral-50 text-neutral-700 transition-colors"
          >
            <LogOut size={16} />
            <span>Disconnect Wallet</span>
          </button>
        </div>
      )}
    </div>
  );
};

const WalletConnector = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { connected } = useWallet();

  return (
    <WalletProvider>
      {connected ? (
        <WalletDropdown />
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Wallet size={20} />
          <span>Connect Wallet</span>
        </button>
      )}
      
      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </WalletProvider>
  );
};

export default WalletConnector;