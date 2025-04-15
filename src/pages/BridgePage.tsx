import * as React from 'react'; // Use * as import
import { useState, useCallback, useMemo } from 'react';
import {
  ArrowRightLeft,
  Clock,
  Shield,
  Zap,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import * as dayjs from 'dayjs'; // Use * as import
import * as relativeTime from 'dayjs/plugin/relativeTime'; // Use namespace import for plugin
import toast from 'react-hot-toast';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit'; // Keep hook import
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import {
  Wormhole,
  Chain,
  Network,
  // chainToChainId, // Removed unused import
  ChainContext,
  TokenId,
  // chainToPlatform, // Removed unused import
  Signer, // Import Signer type
} from '@wormhole-foundation/sdk';
import { EvmPlatform } from "@wormhole-foundation/sdk-evm"; // Needed for Sepolia origin
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
import { bridgeTokenWithHelper } from '../lib/wormholeService';
import { SolanaSignerAdapter, SuiSignerAdapter } from '../lib/wormholeSignerAdapters';
import { PublicKey } from '@solana/web3.js'; // Solana adres doğrulaması için
import { Button } from '../components/ui/Button'; // Assuming named export
// import { Input } from '../components/ui/Input'; // Using standard input
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'; // Using standard select
import { LoadingSpinner } from '../components/ui/LoadingSpinner'; // Use named import

// Import the new icons
import suiIcon from '../icons/sui.webp';
import solIcon from '../icons/sol.svg';
import usdcIcon from '../icons/usdc.png';
import usdtIcon from '../icons/tether.png';
// Note: Other icons like btc, eth, avax, bonk are not used on this page currently

dayjs.extend(relativeTime); // Extend dayjs with the plugin

// Use Wormhole SDK Chain type
type SupportedChainOption = "Solana" | "Sui";
const supportedChains: SupportedChainOption[] = ["Solana", "Sui"];

// Use TokenSymbol from wormholeService
type TokenSymbolOption = "USDC" | "USDT";
const supportedTokens: TokenSymbolOption[] = ["USDC", "USDT"];

// Removed unused interface
// interface BridgeTransaction { ... }

// Removed unused helper function
// const getPlatform = (chain: Chain) => { ... }

const BridgePage = () => {
  const [fromChain, setFromChain] = useState<SupportedChainOption>('Solana');
  const [toChain, setToChain] = useState<SupportedChainOption>('Sui');
  const [selectedToken, setSelectedToken] = useState<TokenSymbolOption>('USDC');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeResult, setBridgeResult] = useState<any>(null); // To store success/error info

  const suiWallet = useSuiWallet(); // Rely on type inference
  const solanaWallet = useSolanaWallet();

  // Removed unused mock data
  // const transactions: BridgeTransaction[] = [ ... ];

  // Removed unused fees object
  // const fees = { ... };

  // Use imported icons
  const chainIcons: Record<SupportedChainOption, string> = {
    Sui: suiIcon, // Use imported icon
    Solana: solIcon // Use imported icon
  };

  // Use imported icons
  const tokenIcons: Record<TokenSymbolOption, string> = {
    USDC: usdcIcon, // Use imported icon
    USDT: usdtIcon // Use imported icon
  };

  const handleSwapChains = () => {
    const currentFrom = fromChain;
    setFromChain(toChain);
    setToChain(currentFrom);
  };

  // Removed unused function
  // const getStatusColor = (status: string) => { ... };

  const handleBridge = useCallback(async () => {
    setBridgeResult(null); // Clear previous result

    // Address validation section
    // Validate recipient address based on destination chain
    let isValidAddress = false;
    if (toChain === 'Solana') {
      try {
        // Try to create a PublicKey and check if it's on the ed25519 curve
        const publicKey = new PublicKey(recipientAddress);
        isValidAddress = PublicKey.isOnCurve(publicKey.toBytes());
      } catch (error) {
        isValidAddress = false; // PublicKey creation error means invalid address
      }
      if (!isValidAddress) {
        toast.error("Invalid Solana recipient address.");
        return;
      }
    } else if (toChain === 'Sui') {
      // Simple regex: starts with '0x' followed by 64 hex characters
      const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;
      isValidAddress = suiAddressRegex.test(recipientAddress);
      if (!isValidAddress) {
        toast.error("Invalid Sui recipient address. Must be a 66-character hex string starting with 0x.");
        return;
      }
    }

    // Input validation
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!recipientAddress) {
      toast.error("Please enter a recipient address.");
      return;
    }

    let sourceSigner: Signer | null = null;
    let sourceWalletAdapter: any = null;

    if (fromChain === 'Solana') {
      if (!solanaWallet.connected || !solanaWallet.wallet || !solanaWallet.publicKey) {
        toast.error("Please connect your Solana wallet.");
        return;
      }
      sourceWalletAdapter = solanaWallet; // Pass the whole context state
    } else if (fromChain === 'Sui') {
      if (!suiWallet.connected || !suiWallet.account) {
        toast.error("Please connect your Sui wallet.");
        return;
      }
       sourceWalletAdapter = suiWallet; // Pass the whole context state
    } else {
       toast.error("Invalid source chain selected."); // Should not happen with dropdown
       return;
    }

    setIsBridging(true);
    const toastId = toast.loading(`Bridging ${amount} ${selectedToken} from ${fromChain} to ${toChain}...`);

    try {
      // Initialize Wormhole context (could potentially be initialized outside useCallback if static)
      // const wh = new Wormhole("Testnet", [EvmPlatform, SolanaPlatform, SuiPlatform]);
      // const sourceChainContext = wh.getChain(fromChain); // Removed as chainCtx is no longer passed to adapters

      // Create the signer adapter instance
      if (fromChain === 'Solana') {
        // Pass only the wallet adapter
        sourceSigner = new SolanaSignerAdapter(sourceWalletAdapter as any);
      } else if (fromChain === 'Sui') {
         // Pass only the wallet adapter
        sourceSigner = new SuiSignerAdapter(sourceWalletAdapter as any);
      }

      if (!sourceSigner) {
         throw new Error("Could not create signer adapter for the source chain.");
      }

      const result = await bridgeTokenWithHelper(
        fromChain,
        toChain,
        selectedToken,
        amount,
        sourceSigner, // Pass the adapted signer
        recipientAddress
      );

      setBridgeResult(result);
      toast.success(`Bridge successful! ${result.message}`, { id: toastId });
      // Optionally clear form or update transaction history
      setAmount('');
      setRecipientAddress('');

    } catch (error) {
      console.error("Bridging failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setBridgeResult({ error: errorMessage });
      toast.error(`Bridging failed: ${errorMessage}`, { id: toastId });
    } finally {
      setIsBridging(false);
    }
  }, [fromChain, toChain, selectedToken, amount, recipientAddress, solanaWallet, suiWallet]);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Bridge Assets</h1>

        {/* Main Bridge Card */}
        <div className="bg-white rounded-xl shadow-card p-6 mb-8">
          {/* Chain Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 items-end">
            {/* From Chain */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">From</label>
              {/* Using standard select as placeholder */}
              <div className="relative">
                <select
                  value={fromChain}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFromChain(e.target.value as SupportedChainOption)}
                  className="input pl-12 appearance-none w-full" // Added w-full
                  disabled={isBridging}
                >
                  {supportedChains.map(chain => (
                    <option key={chain} value={chain} disabled={chain === toChain}>
                      {chain === 'Sui' ? 'Sui Network' : chain}
                    </option>
                  ))}
                </select>
                 <img
                    src={chainIcons[fromChain]}
                    alt={fromChain}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" // Added pointer-events-none
                  />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center items-center pb-2 md:pb-0 md:relative">
              <Button
                variant="outline"
                // Removed invalid size="icon" prop
                onClick={handleSwapChains}
                className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10 p-2" // Added padding for icon button look
                disabled={isBridging}
              >
                <ArrowRightLeft className="text-primary" size={20} />
              </Button>
            </div>


            {/* To Chain */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">To</label>
              {/* Using standard select as placeholder */}
               <div className="relative">
                <select
                  value={toChain}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setToChain(e.target.value as SupportedChainOption)}
                  className="input pl-12 appearance-none w-full" // Added w-full
                  disabled={isBridging}
                >
                   {supportedChains.map(chain => (
                    <option key={chain} value={chain} disabled={chain === fromChain}>
                       {chain === 'Sui' ? 'Sui Network' : chain}
                    </option>
                  ))}
                </select>
                 <img
                    src={chainIcons[toChain]}
                    alt={toChain}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" // Added pointer-events-none
                  />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={20} />
              </div>
            </div>
          </div>

          {/* Token Selection and Amount */}
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">Token</label>
              {/* Using standard select as placeholder */}
               <div className="relative">
                 <select
                  value={selectedToken}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedToken(e.target.value as TokenSymbolOption)}
                  className="input pl-12 appearance-none w-full" // Added w-full
                  disabled={isBridging}
                >
                   {supportedTokens.map(token => (
                    <option key={token} value={token}>
                       {token}
                    </option>
                  ))}
                </select>
                 <img
                    src={tokenIcons[selectedToken]}
                    alt={selectedToken}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" // Added pointer-events-none
                  />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">Amount</label>
              <div className="relative">
                {/* Using standard input as placeholder */}
                <input
                  type="number"
                  value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input pr-24 w-full" // Added w-full
                  disabled={isBridging}
                />
                {/* Add MAX button logic if needed */}
                {/* <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1 text-sm text-primary hover:bg-neutral-50 rounded-lg transition-colors">
                  MAX
                </button> */}
              </div>
            </div>

             <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">Recipient Address ({toChain})</label>
              {/* Using standard input as placeholder */}
              <input
                type="text"
                value={recipientAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientAddress(e.target.value)}
                placeholder={`Enter ${toChain} address`}
                className="input w-full" // Added w-full
                disabled={isBridging}
              />
            </div>
          </div>

          {/* Fee Breakdown (Keep placeholders or implement dynamic quoting later) */}
          <div className="bg-neutral-50 rounded-xl p-4 mb-6">
            {/* ... fee breakdown UI ... */}
             <div className="flex justify-between text-sm text-neutral-600">
                <span>Estimated Fees</span>
                <span>~0.01 {fromChain === 'Sui' ? 'SUI' : 'SOL'} + Wormhole Fee</span>
             </div>
             <div className="flex justify-between text-sm text-neutral-600 mt-1">
                <span>Estimated Time</span>
                <span>2-5 minutes</span>
             </div>
          </div>

          <Button onClick={handleBridge} disabled={isBridging} className="w-full">
            {isBridging ? <LoadingSpinner className="mr-2" /> : null}
            {isBridging ? 'Bridging...' : 'Bridge Assets'}
          </Button>

           {/* Display Bridge Result */}
           {bridgeResult && (
            <div className={`mt-4 p-4 rounded-lg ${bridgeResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              <h4 className="font-medium mb-2">{bridgeResult.error ? 'Error:' : 'Success:'}</h4>
              <p className="text-sm break-words">
                {bridgeResult.error ? bridgeResult.error : bridgeResult.message}
                {bridgeResult.sourceTxids && (
                  <span className="block mt-1">Source Tx: {JSON.stringify(bridgeResult.sourceTxids)}</span>
                )}
                 {bridgeResult.destinationTxids && (
                  <span className="block mt-1">Dest Tx: {JSON.stringify(bridgeResult.destinationTxids)}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Info Cards */}
        {/* ... info cards UI ... */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-xl shadow-card p-6 flex items-start gap-4">
                <Clock className="text-primary w-8 h-8 mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold mb-1">Fast Transfers</h3>
                    <p className="text-sm text-neutral-600">Leverage Wormhole for quick cross-chain asset bridging.</p>
                </div>
            </div>
             <div className="bg-white rounded-xl shadow-card p-6 flex items-start gap-4">
                <Shield className="text-primary w-8 h-8 mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold mb-1">Secure Bridge</h3>
                    <p className="text-sm text-neutral-600">Utilizes Wormhole's guardian network for secure VAA verification.</p>
                </div>
            </div>
             <div className="bg-white rounded-xl shadow-card p-6 flex items-start gap-4">
                <Zap className="text-primary w-8 h-8 mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold mb-1">Low Fees</h3>
                    <p className="text-sm text-neutral-600">Benefit from competitive bridging fees.</p>
                </div>
            </div>
        </div>

        {/* Transaction History */}
        {/* ... transaction history UI ... */}
         <div className="bg-white rounded-xl shadow-card p-6 mt-8">
             <h3 className="text-xl font-bold mb-4">Bridge History</h3>
             <p className="text-neutral-500 text-center py-4">No recent bridge transactions.</p>
             {/* TODO: Implement transaction history display */}
         </div>
      </div>
    </div>
  );
};

export default BridgePage;
