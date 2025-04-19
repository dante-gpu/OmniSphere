import * as React from 'react'; // Use * as import
import { useState, useCallback, useMemo } from 'react';
import {
  ArrowRightLeft,
  Clock,
  Shield,
  Zap,
  ChevronDown,
  RefreshCw,
  ArrowDown,
  ArrowRight,
  Settings
} from 'lucide-react';
import * as dayjs from 'dayjs'; // Use * as import
import * as relativeTime from 'dayjs/plugin/relativeTime'; // Use namespace import for plugin
import toast from 'react-hot-toast';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit'; // Keep hook import
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Wormhole,
  Chain,
  Network,
  // chainToChainId, // Removed unused import
  ChainContext,
  TokenId,
  // chainToPlatform, // Removed unused import
  Signer, // Import Signer type
  NetworkKind,
  amount,
  TokenTransfer,
  TransactionId, // Add missing import
  WormholeMessageId, // Add missing import
} from '@wormhole-foundation/sdk';
// import { EvmPlatform } from "@wormhole-foundation/sdk-evm"; // Not needed if only bridging Sui/Solana
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
// import { bridgeTokenWithHelper } from '../lib/wormholeService'; // Replace with initiateWLLTransfer
import { initiateWLLTransfer, WLLTransferRequest, getWormholeMessageId } from '../lib/wormholePoolBridge'; // Import WLL function
import { SolanaSignerAdapter, SuiSignerAdapter } from '../lib/wormholeSignerAdapters';
import { PublicKey } from '@solana/web3.js'; // Solana adres doğrulaması için
import { Button } from '../components/ui/Button'; // Assuming named export
import {
  SignAndSendSigner,
  // Network, // Remove duplicate import
  WormholeMessageId, // Add missing import
} from '@wormhole-foundation/sdk'; // Import amount helper and types
import { utils as ethersUtils } from 'ethers'; // For parsing amounts consistently
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
type SupportedChainOption = Extract<Chain, "Solana" | "Sui">; // Use SDK Chain type
const supportedChains: SupportedChainOption[] = ["Solana", "Sui"];

// Define Token Symbols
type TokenSymbolOption = "USDC" | "USDT";
const supportedTokens: TokenSymbolOption[] = ["USDC", "USDT"];

// Define Testnet Token Addresses (REPLACE WITH ACTUAL ADDRESSES)
const TESTNET_TOKEN_MAP: Record<SupportedChainOption, Record<TokenSymbolOption, { address: string; decimals: number }>> = {
  Solana: {
    USDC: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 }, // Devnet USDC
    USDT: { address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 }, // Devnet USDT
  },
  Sui: {
    USDC: { address: "0xYOUR_SUI_TESTNET_USDC_PACKAGE::coin::COIN", decimals: 6 }, // Replace with actual Sui Testnet USDC address/type
    USDT: { address: "0xYOUR_SUI_TESTNET_USDT_PACKAGE::coin::COIN", decimals: 6 }, // Replace with actual Sui Testnet USDT address/type
  }
};


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
  const [bridgeResult, setBridgeResult] = useState<{ message?: string; error?: string; txIds?: TransactionId[]; messageId?: WormholeMessageId } | null>(null); // More specific result type

  const suiWallet = useSuiWallet(); // Rely on type inference
  const solanaWallet = useSolanaWallet();
  const { connection } = useConnection();

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

  // Create Wormhole SDK instance
  const wh = useMemo(() => {
    return new Wormhole("Testnet", [SolanaPlatform, SuiPlatform]);
  }, []);
  
  const handleBridge = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    const toastId = toast.loading('Preparing bridge transaction...');
    
    try {
      setIsBridging(true);
      
      // Determine which wallet to use based on source chain
      if (fromChain === "Solana" && !solanaWallet.connected) {
        toast.error("Please connect your Solana wallet");
        setIsBridging(false);
        return;
      }
      
      if (fromChain === "Sui" && !suiWallet.connected) {
        toast.error("Please connect your Sui wallet");
        setIsBridging(false);
        return;
      }
      
      // Get proper token address for selected token
      const tokenAddress = TESTNET_TOKEN_MAP[fromChain][selectedToken].address;
      
      // Create TokenId for the source token
      const tokenId = Wormhole.tokenId(fromChain, tokenAddress);
      
      // Get a signer for the source chain using the SDK's getSigner method
      const chainContext = wh.getChain(fromChain);
      const signer = await chainContext.getSigner();
      
      if (!signer) {
        throw new Error(`No signer available for ${fromChain}`);
      }
      
      // The receiving address should be the user's wallet on the target chain or the manually entered address
      let destinationAddress = recipientAddress;
      
      // If recipient address is empty, use connected wallet address
      if (!destinationAddress || destinationAddress.trim() === '') {
        destinationAddress = toChain === "Solana" 
          ? solanaWallet.publicKey?.toString() 
          : suiWallet.address;
          
        if (!destinationAddress) {
          throw new Error(`No destination address available for ${toChain}`);
        }
      }
      
      // Parse amount with proper decimal handling
      const decimals = TESTNET_TOKEN_MAP[fromChain][selectedToken].decimals;
      const amountBigInt = ethersUtils.parseUnits(amount, decimals).toBigInt();
      
      toast.loading('Creating bridge transfer...', { id: toastId });
      
      // Create source and destination addresses
      const sourceAddr = Wormhole.chainAddress(fromChain, signer.address());
      const targetAddr = Wormhole.chainAddress(toChain, destinationAddress);
      
      console.log(`Initiating transfer from ${fromChain} to ${toChain}:`);
      console.log(`- Token: ${selectedToken} (${tokenAddress})`);
      console.log(`- Amount: ${amount} (${amountBigInt.toString()} base units)`);
      console.log(`- Recipient: ${destinationAddress}`);
      
      // Create a TokenTransfer using the SDK's helper
      const transfer = await wh.tokenTransfer(
        tokenId,
        amountBigInt,
        sourceAddr,
        targetAddr,
        true, // automatic delivery
        undefined // no payload
      );
      
      toast.loading('Please approve the transaction in your wallet...', { id: toastId });
      
      // Execute the transfer
      const txids = await transfer.initiateTransfer(signer);
      console.log("Transfer initiated:", txids);
      
      // Set the transaction hash for display and verification
      setBridgeResult({ message: `Bridge initiated! TxIDs: ${txids.map(tx => tx.toString().substring(0, 6)).join(', ')}`, txIds: txids });
      
      // For WormholeMessageId, we'll create a simpler structure for display
      const messageId = {
        chain: fromChain,
        sequence: transfer.id?.sequence?.toString() || "Unknown"
      };
      setBridgeResult({ ...bridgeResult, messageId });
      
      toast.success("Transfer initiated successfully!", { id: toastId });
      
      // Provide the Wormholescan link for tracking
      const wormholeScanUrl = `https://testnet.wormholescan.io/tx/${txids[0].toString()}`;
      console.log("Track on Wormholescan:", wormholeScanUrl);
      
    } catch (error) {
      console.error("Bridge error:", error);
      toast.error(`Bridge failed: ${error instanceof Error ? error.message : String(error)}`, { id: toastId });
      setBridgeResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsBridging(false);
    }
  };

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
            <div className={`mt-4 p-4 rounded-lg ${bridgeResult.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              <h4 className="font-medium mb-2">{bridgeResult.error ? 'Error:' : 'Bridge Initiated:'}</h4>
              <p className="text-sm break-words">
                {bridgeResult.error ? bridgeResult.error : bridgeResult.message}
                {/* Display Origin Tx IDs */}
                {bridgeResult.txIds && bridgeResult.txIds.length > 0 && (
                  <span className="block mt-1">
                    Origin Tx: {bridgeResult.txIds[0].toString().substring(0, 10)}...
                    <a 
                      href={`https://testnet.wormholescan.io/tx/${bridgeResult.txIds[0].toString()}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center ml-1"
                    >
                      View on Wormholescan <ArrowRight size={14} className="ml-1" />
                    </a>
                  </span>
                )}
                {/* Display Wormhole Message ID if available */}
                {bridgeResult.messageId && (
                   <span className="block mt-1">
                     Wormhole Msg: Chain {bridgeResult.messageId.chain}, Seq {bridgeResult.messageId.sequence}
                   </span>
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
