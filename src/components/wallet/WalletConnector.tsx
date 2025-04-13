import * as React from 'react'; // Changed React import
import { useState, useMemo } from 'react'; // Separate hook imports
import { Wallet, LogOut, ChevronDown, Copy, CheckCircle } from 'lucide-react';
import { ConnectButton, useWallet as useSuiWallet, type WalletContextState } from '@suiet/wallet-kit'; // Added explicit type import
import '@suiet/wallet-kit/style.css';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

// Import the new icon
import suiIcon from '../../icons/sui.webp'; // Adjust path

// Combined Dropdown/Status component for connected wallets
const ConnectedWalletDisplay = () => {
  const suiWallet = useSuiWallet();
  const solanaWallet = useSolanaWallet();
  const [suiOpen, setSuiOpen] = useState(false);
  const [solanaOpen, setSolanaOpen] = useState(false);
  const [suiCopied, setSuiCopied] = useState(false);
  const [solanaCopied, setSolanaCopied] = useState(false);

  const copySuiAddress = async () => {
    if (!suiWallet.account) return;
    await navigator.clipboard.writeText(suiWallet.account.address);
    setSuiCopied(true);
    setTimeout(() => setSuiCopied(false), 2000);
  };

  const copySolanaAddress = async () => {
    if (!solanaWallet.publicKey) return;
    await navigator.clipboard.writeText(solanaWallet.publicKey.toBase58());
    setSolanaCopied(true);
    setTimeout(() => setSolanaCopied(false), 2000);
  };

  const suiDisplayAddress = useMemo(() => {
    if (!suiWallet.account) return '';
    const addr = suiWallet.account.address;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, [suiWallet.account]);

  const solanaDisplayAddress = useMemo(() => {
    if (!solanaWallet.publicKey) return '';
    const addr = solanaWallet.publicKey.toBase58();
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }, [solanaWallet.publicKey]);


  if (!suiWallet.connected && !solanaWallet.connected) {
    return null; // Should be handled by WalletConnector component
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Sui Wallet Display */}
      {suiWallet.connected && suiWallet.account && (
        <div className="relative">
          <button
            onClick={() => setSuiOpen(!suiOpen)}
            className="btn-outline flex items-center space-x-2 group"
          >
             {/* Use imported icon */}
             <img src={suiIcon} alt="Sui" className="w-4 h-4" />
            <span>{suiDisplayAddress}</span>
            <ChevronDown size={16} className={`transition-transform duration-200 ${suiOpen ? 'rotate-180' : ''}`} />
          </button>
          {suiOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 z-50">
              <div className="px-4 py-3 border-b border-neutral-100">
                {/* Changed wallet?.name to adapter?.name */}
                <div className="text-sm text-neutral-500">Sui Wallet ({suiWallet.adapter?.name})</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="font-mono text-sm">{suiWallet.account.address.slice(0, 10)}...{suiWallet.account.address.slice(-8)}</div>
                  <button onClick={copySuiAddress} className="p-2 hover:bg-neutral-50 rounded-lg transition-colors" title="Copy address">
                    {suiCopied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-neutral-500" />}
                  </button>
                </div>
              </div>
              <button onClick={() => suiWallet.disconnect()} className="w-full px-4 py-3 flex items-center space-x-2 text-left hover:bg-neutral-50 text-neutral-700 transition-colors">
                <LogOut size={16} />
                <span>Disconnect Sui</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Solana Wallet Display */}
      {solanaWallet.connected && solanaWallet.publicKey && (
         // Use WalletMultiButton for connected state display and disconnect
         // WalletMultiButton uses its own icon logic, likely referencing adapter.icon which might still point to external URL if not overridden
         <WalletMultiButton style={{ height: '40px', lineHeight: '40px', borderRadius: '0.5rem' }} />
         // Basic display if WalletMultiButton styling is not preferred:
        /*
        <div className="relative">
          <button
            onClick={() => setSolanaOpen(!solanaOpen)}
            className="btn-outline flex items-center space-x-2 group"
          >
             // Use local icon path if using custom button
             <img src="/icons/sol.png" alt="Solana" className="w-4 h-4" />
            <span>{solanaDisplayAddress}</span>
            <ChevronDown size={16} className={`transition-transform duration-200 ${solanaOpen ? 'rotate-180' : ''}`} />
          </button>
          {solanaOpen && (
             <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 z-50">
              <div className="px-4 py-3 border-b border-neutral-100">
                <div className="text-sm text-neutral-500">Solana Wallet ({solanaWallet.wallet?.adapter.name})</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="font-mono text-sm">{solanaWallet.publicKey.toBase58().slice(0, 10)}...{solanaWallet.publicKey.toBase58().slice(-8)}</div>
                  <button onClick={copySolanaAddress} className="p-2 hover:bg-neutral-50 rounded-lg transition-colors" title="Copy address">
                    {solanaCopied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-neutral-500" />}
                  </button>
                </div>
              </div>
              <button onClick={() => solanaWallet.disconnect()} className="w-full px-4 py-3 flex items-center space-x-2 text-left hover:bg-neutral-50 text-neutral-700 transition-colors">
                <LogOut size={16} />
                <span>Disconnect Solana</span>
              </button>
            </div>
          )}
        </div>
        */
      )}
    </div>
  );
}


const WalletConnector = () => {
  const suiWallet = useSuiWallet();
  const solanaWallet = useSolanaWallet();

  // Determine if any wallet is connected
  const isAnyWalletConnected = suiWallet.connected || solanaWallet.connected;

  return (
    <div className="flex items-center space-x-2">
      {isAnyWalletConnected ? (
        <ConnectedWalletDisplay />
      ) : (
        <>
          {/* Show Sui Connect Button if not connected */}
          {!suiWallet.connected && (
             <ConnectButton style={{ height: '40px', lineHeight: '40px', borderRadius: '0.5rem' }}>
                <Wallet size={16} className="mr-1" /> Connect Sui
             </ConnectButton>
          )}
           {/* Show Solana Connect Button if not connected */}
          {!solanaWallet.connected && (
            // WalletMultiButton might still try to load external icon from adapter
            <WalletMultiButton style={{ height: '40px', lineHeight: '40px', borderRadius: '0.5rem' }}>
               <Wallet size={16} className="mr-1" /> Connect Solana
            </WalletMultiButton>
          )}
        </>
      )}
    </div>
  );
};

export default WalletConnector;
