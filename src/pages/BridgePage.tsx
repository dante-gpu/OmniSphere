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
import { Button } from '../components/ui/Button'; // Assuming named export
// import { Input } from '../components/ui/Input'; // Using standard input
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'; // Using standard select
import { LoadingSpinner } from '../components/ui/LoadingSpinner'; // Use named import

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

  const chainIcons: Record<SupportedChainOption, string> = {
    Sui: 'https://cryptologos.cc/logos/sui-sui-logo.png',
    Solana: 'https://cryptologos.cc/logos/solana-sol-logo.png'
  };

  const tokenIcons: Record<TokenSymbolOption, string> = {
    USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
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

    // Input Validation
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!recipientAddress) {
      toast.error("Please enter a recipient address.");
      return;
    }

    let sourceSigner: Signer | null = null; // Use imported Signer type
    let sourceWalletAdapter: any = null; // To hold the specific wallet adapter

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
                size="icon"
                onClick={handleSwapChains}
                className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10"
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

        {/* Transaction History */}
        {/* ... transaction history UI ... */}
      </div>
    </div>
  );
};

export default BridgePage;
