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
import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
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
// import { EvmPlatform } from "@wormhole-foundation/sdk-evm"; // Not needed if only bridging Sui/Solana
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
// import { bridgeTokenWithHelper } from '../lib/wormholeService'; // Replace with initiateWLLTransfer
import { initiateWLLTransfer, WLLTransferRequest, getWormholeMessageId } from '../lib/wormholePoolBridge'; // Import WLL function
import { SolanaSignerAdapter, SuiSignerAdapter } from '../lib/wormholeSignerAdapters';
import { PublicKey } from '@solana/web3.js'; // Solana adres doğrulaması için
import { Button } from '../components/ui/Button'; // Assuming named export
import {
  amount as sdkAmount,
  // TokenId, // Remove duplicate import
  SignAndSendSigner,
  // Network, // Remove duplicate import
  TransactionId, // Add missing import
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
  // Get connection from the correct hook
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

    const network: Network = "Testnet"; // Assuming Testnet

    // Check wallet connections first
    if (fromChain === 'Solana' && (!solanaWallet.connected || !solanaWallet.publicKey || !connection)) {
      toast.error("Please connect your Solana wallet and ensure connection is available.");
      return;
    }
    if (fromChain === 'Sui' && (!suiWallet.connected || !suiWallet.account)) {
      toast.error("Please connect your Sui wallet.");
      return;
    }


    setIsBridging(true);
    const toastId = toast.loading(`Bridging ${amount} ${selectedToken} from ${fromChain} to ${toChain}...`);

    try {
      // Initialize Wormhole SDK
      const wh = new Wormhole(network, [SolanaPlatform, SuiPlatform]);

      // Assign RPC connection to the Solana context if needed by the SDK internally
      // This might vary depending on SDK version and how it discovers RPCs
      // Set RPC connection for Solana if needed
      if (fromChain === 'Solana' && connection) {
        const solanaChain = wh.getChain('Solana');
        // @ts-ignore - We need to set this even if the type doesn't expose it
        solanaChain.rpc = connection;
      }
      
      // Get the appropriate signer based on the chain
      const chain = wh.getChain(fromChain);
      // @ts-ignore - TypeScript doesn't recognize getSigner but it exists at runtime
      const sourceSigner = await chain.getSigner();

      // Double-check if signer address matches connected wallet address
      const connectedAddress = fromChain === 'Solana' ? solanaWallet.publicKey?.toBase58() : suiWallet.account?.address;
      if (!connectedAddress || sourceSigner.address() !== connectedAddress) {
          throw new Error(`SDK Signer address (${sourceSigner.address()}) does not match connected wallet (${connectedAddress}). Ensure the correct wallet is active.`);
      }


      // Get Token Info
      const tokenInfo = TESTNET_TOKEN_MAP[fromChain]?.[selectedToken];
      if (!tokenInfo) {
        throw new Error(`Token ${selectedToken} not configured for ${fromChain} on Testnet.`);
      }

      // Prepare Transfer Request
      const amountInAtomicUnits = ethersUtils.parseUnits(amount, tokenInfo.decimals).toBigInt();
      const tokenId: TokenId = Wormhole.tokenId(fromChain, tokenInfo.address);

      const transferRequest: WLLTransferRequest = {
        fromChain: fromChain,
        toChain: toChain,
        fromAddress: sourceSigner.address(), // Get address from signer
        toAddress: recipientAddress,
        token: tokenId,
        amount: amountInAtomicUnits,
      };

      // Call the WLL transfer function
      const result = await initiateWLLTransfer(wh, transferRequest, sourceSigner);

      if (result.error) {
        throw new Error(result.error); // Throw error to be caught below
      }

      // Handle success
      const messageId = result.attestation ? getWormholeMessageId(result.attestation) : undefined;
      const successMessage = `Bridge initiated! TxIDs: ${result.originTxIds?.map(tx => tx.txid.substring(0, 6)).join(', ')}... ${messageId ? `Msg Seq: ${messageId.sequence}` : ''}`;
      setBridgeResult({ message: successMessage, txIds: result.originTxIds, messageId });
      toast.success(successMessage, { id: toastId, duration: 8000 });

      // Optionally clear form
      setAmount('');
      // Keep recipient address for potential subsequent transfers? Or clear it?
      // setRecipientAddress('');

    } catch (error) {
      console.error("Bridging failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Add specific check for user rejection
      if (errorMessage.includes('Transaction rejected') || errorMessage.includes('User rejected')) {
          setBridgeResult({ error: 'Transaction rejected by user.' });
          toast.error('Transaction rejected by user.', { id: toastId });
      } else {
          setBridgeResult({ error: errorMessage });
          toast.error(`Bridging failed: ${errorMessage}`, { id: toastId });
      }
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
            <div className={`mt-4 p-4 rounded-lg ${bridgeResult.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              <h4 className="font-medium mb-2">{bridgeResult.error ? 'Error:' : 'Bridge Initiated:'}</h4>
              <p className="text-sm break-words">
                {bridgeResult.error ? bridgeResult.error : bridgeResult.message}
                {/* Display Origin Tx IDs */}
                {bridgeResult.txIds && bridgeResult.txIds.length > 0 && (
                  <span className="block mt-1">
                    Origin Tx: {bridgeResult.txIds[0].txid.substring(0, 10)}...
                    {/* Optionally add link to explorer */}
                  </span>
                )}
                {/* Display Wormhole Message ID if available */}
                {bridgeResult.messageId && (
                   <span className="block mt-1">
                     Wormhole Msg: Chain {bridgeResult.messageId.chain}, Seq {bridgeResult.messageId.sequence.toString()} {/* Convert bigint to string */}
                     {/* Optionally add link to wormholescan */}
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
