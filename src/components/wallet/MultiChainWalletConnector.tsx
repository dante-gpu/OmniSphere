import { useState, useMemo } from 'react'; // Removed React import
import { Wallet, LogOut, ChevronDown, Copy, CheckCircle, X as IconX } from 'lucide-react'; // Added IconX
import { ConnectButton, useWallet as useSuiWallet } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css'; // Keep Sui styles
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css'; // Keep Solana styles
import { Button } from '../ui/Button'; // Use our Button component
import { Modal } from '../ui/Modal'; // Use our Modal component

// Helper to shorten addresses
const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

// Combined component to display connected wallet status and disconnect options
const ConnectedDisplay: React.FC = () => {
  const suiWallet = useSuiWallet();
  const solanaWallet = useSolanaWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null); // Track which address was copied

  const copyAddress = async (address: string, type: 'sui' | 'solana') => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const connectedWallets = useMemo(() => {
    const wallets = [];
    if (suiWallet.connected && suiWallet.account) {
      wallets.push({
        type: 'sui' as const,
        name: suiWallet.adapter?.name || 'Sui Wallet', // Changed wallet?.name to adapter?.name
        address: suiWallet.account.address,
        displayAddress: shortenAddress(suiWallet.account.address, 6),
        icon: 'https://cryptologos.cc/logos/sui-sui-logo.png',
        disconnect: () => suiWallet.disconnect(),
      });
    }
    if (solanaWallet.connected && solanaWallet.publicKey) {
      wallets.push({
        type: 'solana' as const,
        name: solanaWallet.wallet?.adapter.name || 'Solana Wallet',
        address: solanaWallet.publicKey.toBase58(),
        displayAddress: shortenAddress(solanaWallet.publicKey.toBase58(), 4),
        icon: solanaWallet.wallet?.adapter.icon || 'https://cryptologos.cc/logos/solana-sol-logo.png',
        disconnect: () => solanaWallet.disconnect(),
      });
    }
    return wallets;
  }, [suiWallet, solanaWallet]);

  if (connectedWallets.length === 0) {
    return null; // Should not happen if this component is rendered correctly
  }

  // If only one wallet is connected, show a simpler button
  if (connectedWallets.length === 1) {
    const wallet = connectedWallets[0];
    // Use WalletMultiButton for Solana's connected state as it handles its own dropdown/modal
    if (wallet.type === 'solana') {
       return <WalletMultiButton style={{ height: '40px', lineHeight: '40px', borderRadius: '0.5rem' }} />;
    }
    // Use custom display for Sui
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="btn-outline flex items-center space-x-2 group"
        >
          <img src={wallet.icon} alt={wallet.name} className="w-4 h-4" />
          <span>{wallet.displayAddress}</span>
          <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 z-50 animate-fade-in">
            <div className="px-4 py-3 border-b border-neutral-100">
              <div className="text-sm text-neutral-500">{wallet.name}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="font-mono text-sm break-all">{wallet.address}</div>
                <button onClick={() => copyAddress(wallet.address, wallet.type)} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors ml-2 flex-shrink-0" title="Copy address">
                  {copiedAddress === wallet.type ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-neutral-500" />}
                </button>
              </div>
            </div>
            <button onClick={wallet.disconnect} className="w-full px-4 py-3 flex items-center space-x-2 text-left hover:bg-neutral-50 text-red-600 transition-colors">
              <LogOut size={16} />
              <span>Disconnect</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // If multiple wallets are connected, show a combined dropdown
  return (
     <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="btn-outline flex items-center space-x-2 group"
        >
          <Wallet size={16} />
          <span>Wallets Connected</span>
          <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 z-50 animate-fade-in">
            <div className="px-4 py-2 text-sm font-medium text-neutral-700 border-b border-neutral-100">Connected Wallets</div>
            {connectedWallets.map((wallet) => (
              <div key={wallet.type} className="px-4 py-3 border-b border-neutral-100 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center space-x-2">
                      <img src={wallet.icon} alt={wallet.name} className="w-5 h-5" />
                      <span className="text-sm font-medium text-neutral-800">{wallet.name}</span>
                   </div>
                   <button onClick={wallet.disconnect} className="p-1 hover:bg-red-50 rounded-lg transition-colors text-red-500 hover:text-red-700" title={`Disconnect ${wallet.name}`}>
                      <LogOut size={16} />
                   </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="font-mono text-xs text-neutral-600">{wallet.displayAddress}</div>
                  <button onClick={() => copyAddress(wallet.address, wallet.type)} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors ml-2 flex-shrink-0" title="Copy address">
                    {copiedAddress === wallet.type ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} className="text-neutral-500" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
};


// Main Connector Component
const MultiChainWalletConnector: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const suiWallet = useSuiWallet();
  const solanaWallet = useSolanaWallet();

  const isAnyWalletConnected = suiWallet.connected || solanaWallet.connected;

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="flex items-center">
      {isAnyWalletConnected ? (
        <ConnectedDisplay />
      ) : (
        // Show single connect button if no wallet is connected
        <Button onClick={openModal} variant="outline">
          <Wallet size={16} className="mr-2" />
          Connect Wallet
        </Button>
      )}

      {/* Connection Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Connect Wallet">
         <div className="p-6">
            <p className="text-center text-neutral-600 mb-6">Select a wallet type to connect.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {/* Solana Connection */}
               <div className="flex flex-col items-center p-4 border border-neutral-200 rounded-lg">
                  <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="Solana" className="w-10 h-10 mb-3" />
                  <h3 className="font-medium mb-3">Solana</h3>
                  {/* WalletMultiButton handles its own modal/selection */}
                  <WalletMultiButton style={{ width: '100%', height: '40px', lineHeight: '40px', borderRadius: '0.5rem' }} />
               </div>

               {/* Sui Connection */}
               <div className="flex flex-col items-center p-4 border border-neutral-200 rounded-lg">
                  <img src="https://cryptologos.cc/logos/sui-sui-logo.png" alt="Sui" className="w-10 h-10 mb-3" />
                  <h3 className="font-medium mb-3">Sui</h3>
                  {/* ConnectButton handles its own modal/selection - Added className for alignment */}
                  <ConnectButton
                    style={{ width: '100%', height: '40px', borderRadius: '0.5rem' }}
                    className="flex items-center justify-center" // Attempt to center content
                  >
                     Connect Sui Wallet
                  </ConnectButton>
               </div>
            </div>
            {/* Close modal after connection attempt (optional, libraries might handle this) */}
            {/* Consider adding logic here if the modal should close automatically after connection */}
         </div>
      </Modal>
    </div>
  );
};

export default MultiChainWalletConnector;
