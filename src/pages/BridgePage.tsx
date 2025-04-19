import * as React from 'react'; // Use * as import
import { useState, useCallback } from 'react'; // Removed unused useMemo
import {
  ArrowRightLeft,
  Clock,
  Shield,
  Zap,
  ChevronDown,
  // RefreshCw // Removed unused import
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
  // ChainContext, // Removed unused import
  TokenId,
  // Signer, // Removed unused import
  UniversalAddress, // Keep for SDK type definitions if needed implicitly
} from '@wormhole-foundation/sdk';
// import { EvmPlatform } from "@wormhole-foundation/sdk-evm"; // Not needed
// import { SolanaPlatform } from "@wormhole-foundation/sdk-solana"; // Platforms loaded dynamically or in bridge function
// import { SuiPlatform } from "@wormhole-foundation/sdk-sui"; // Platforms loaded dynamically or in bridge function
import {
  initiateWLLTransfer,
  WLLTransferRequest,
  getWormholeMessageId,
  WormholeMessageId as LocalWormholeMessageId // Import local MessageId type
} from '../lib/wormholePoolBridge'; // Import WLL function and local message id type
import { SolanaSignerAdapter, SuiSignerAdapter } from '../lib/wormholeSignerAdapters';
import { PublicKey } from '@solana/web3.js';
import { Button } from '../components/ui/Button';
import {
  // amount as sdkAmount, // Removed unused import
  // SignAndSendSigner, // Removed unused import
  TransactionId, // Keep - used conceptually for tx ids even if they are strings now
  WormholeMessageId, // Keep SDK's type for reference, but use local one for state
} from '@wormhole-foundation/sdk';
import { utils as ethersUtils } from 'ethers';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// Import the new icons
import suiIcon from '../icons/sui.webp';
import solIcon from '../icons/sol.svg';
import usdcIcon from '../icons/usdc.png';
import usdtIcon from '../icons/tether.png';

dayjs.extend(relativeTime);

// Use Wormhole SDK Chain type
type SupportedChainOption = Extract<Chain, "Solana" | "Sui">;
const supportedChains: SupportedChainOption[] = ["Solana", "Sui"];

// Define Token Symbols
type TokenSymbolOption = "USDC" | "USDT";
const supportedTokens: TokenSymbolOption[] = ["USDC", "USDT"];

// Define Testnet Token Addresses (REPLACE WITH ACTUAL ADDRESSES if needed)
// Note: Sui USDT address is a placeholder as it's not officially on testnet
const TESTNET_TOKEN_MAP: Record<SupportedChainOption, Record<TokenSymbolOption, { address: string; decimals: number }>> = {
  Solana: {
    USDC: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 }, // Using Mainnet USDC for broader testing/devnet compatibility
    USDT: { address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 }, // Devnet USDT
  },
  Sui: {
    USDC: {
      address: "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC", // Example Testnet USDC - VERIFY ADDRESS
      decimals: 6
    },
    USDT: {
      // Placeholder address as USDT isn't officially on Sui Testnet
      address: "0x06d8af9e6afd27262db436f0d37b304a041f710c3ea1fa4c3a9bab36b3569ad3::coin::COIN", // Example placeholder COIN type - VERIFY/REPLACE
      decimals: 6 // Assuming 6 decimals for placeholder
    },
  }
};


const BridgePage = () => {
  const [fromChain, setFromChain] = useState<SupportedChainOption>('Solana');
  const [toChain, setToChain] = useState<SupportedChainOption>('Sui');
  const [selectedToken, setSelectedToken] = useState<TokenSymbolOption>('USDC');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isBridging, setIsBridging] = useState(false);
  // Update state type to use string[] for txIds and local WormholeMessageId
  const [bridgeResult, setBridgeResult] = useState<{ message?: string; error?: string; txIds?: string[]; messageId?: LocalWormholeMessageId } | null>(null);

  const suiWallet = useSuiWallet();
  const solanaWallet = useSolanaWallet();
  const { connection } = useConnection();

  const chainIcons: Record<SupportedChainOption, string> = {
    Sui: suiIcon,
    Solana: solIcon
  };

  const tokenIcons: Record<TokenSymbolOption, string> = {
    USDC: usdcIcon,
    USDT: usdtIcon
  };

  const handleSwapChains = () => {
    const currentFrom = fromChain;
    setFromChain(toChain);
    setToChain(currentFrom);
  };

  const handleBridge = useCallback(async () => {
    setBridgeResult(null);

    // Address validation section
    let isValidAddress = false;
    if (toChain === 'Solana') {
      try {
        const publicKey = new PublicKey(recipientAddress);
        isValidAddress = PublicKey.isOnCurve(publicKey.toBytes());
      } catch (error) {
        isValidAddress = false;
      }
      if (!isValidAddress) {
        toast.error("Invalid Solana recipient address.");
        return;
      }
    } else if (toChain === 'Sui') {
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
      // Initialize Wormhole SDK - Platforms needed by initiateWLLTransfer are loaded there implicitly or passed
      // We don't need to explicitly pass SolanaPlatform/SuiPlatform here if initiateWLLTransfer handles it
      const wh = new Wormhole(network, []); // Pass empty array, platforms loaded as needed by SDK/bridge function

      // Note: Setting RPC on chain context might not be needed if SDK handles it via signer or discovery
      // if (fromChain === 'Solana' && connection) {
      //   const solanaChain = wh.getChain('Solana');
      //   if (solanaChain) solanaChain.rpc = connection; // Check if context exists
      // }

      // Get the appropriate signer based on the chain
      let sourceSigner;
      if (fromChain === 'Solana') {
        if (typeof solanaWallet.signTransaction === 'function' && typeof solanaWallet.sendTransaction === 'function') {
          sourceSigner = new SolanaSignerAdapter(solanaWallet);
        } else {
          throw new Error('Solana wallet does not support required signing methods');
        }
      } else if (fromChain === 'Sui') {
        sourceSigner = new SuiSignerAdapter(suiWallet);
      } else {
        throw new Error(`Unsupported chain or wallet configuration: ${fromChain}`);
      }

      // Double-check signer address
      const connectedAddress = fromChain === 'Solana' ? solanaWallet.publicKey?.toBase58() : suiWallet.account?.address;
      const signerAddress = sourceSigner.address(); // Get address from adapter

      if (!connectedAddress || signerAddress !== connectedAddress) {
          // Attempt to normalize or compare differently if needed (e.g., case sensitivity)
          console.warn(`Signer address (${signerAddress}) vs Connected address (${connectedAddress}) mismatch detected.`);
          // Decide whether to throw error or proceed cautiously
          throw new Error(`SDK Signer address does not match connected wallet. Ensure the correct wallet is active.`);
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
        fromAddress: signerAddress, // Use address confirmed from signer
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
      // Ensure result.originTxIds is treated as string[]
      const txIdSnippet = result.originTxIds && result.originTxIds.length > 0
        ? result.originTxIds[0].substring(0, 6) // Access string directly
        : 'N/A';
      const successMessage = `Bridge initiated! TxID: ${txIdSnippet}... ${messageId ? `Msg Seq: ${messageId.sequence}` : ''}`;

      // Update state with correct types
      setBridgeResult({
          message: successMessage,
          txIds: result.originTxIds, // Already string[]
          messageId: messageId        // Already LocalWormholeMessageId | undefined
      });
      toast.success(successMessage, { id: toastId, duration: 8000 });

      setAmount('');

    } catch (error) {
      console.error("Bridging failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Transaction rejected') || errorMessage.includes('User rejected')) {
          setBridgeResult({ error: 'Transaction rejected by user.', txIds: [] }); // Include empty txIds
          toast.error('Transaction rejected by user.', { id: toastId });
      } else {
          setBridgeResult({ error: errorMessage, txIds: [] }); // Include empty txIds
          toast.error(`Bridging failed: ${errorMessage}`, { id: toastId });
      }
    } finally {
      setIsBridging(false);
    }
  }, [fromChain, toChain, selectedToken, amount, recipientAddress, solanaWallet, suiWallet, connection]); // Added connection dependency


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
              <div className="relative">
                <select
                  value={fromChain}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFromChain(e.target.value as SupportedChainOption)}
                  className="input pl-12 appearance-none w-full"
                  disabled={isBridging}
                >
                  {supportedChains.map(chain => (
                    <option key={chain} value={chain} disabled={chain === toChain}>
                      {chain} {/* Display chain name directly */}
                    </option>
                  ))}
                </select>
                 <img
                    src={chainIcons[fromChain]}
                    alt={fromChain}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                  />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center items-center pb-2 md:pb-0 md:relative">
              <Button
                variant="outline"
                onClick={handleSwapChains}
                className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10 p-2"
                disabled={isBridging}
                aria-label="Swap chains" // Added aria-label
              >
                <ArrowRightLeft className="text-primary" size={20} />
              </Button>
            </div>


            {/* To Chain */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">To</label>
               <div className="relative">
                <select
                  value={toChain}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setToChain(e.target.value as SupportedChainOption)}
                  className="input pl-12 appearance-none w-full"
                  disabled={isBridging}
                >
                   {supportedChains.map(chain => (
                    <option key={chain} value={chain} disabled={chain === fromChain}>
                       {chain} {/* Display chain name directly */}
                    </option>
                  ))}
                </select>
                 <img
                    src={chainIcons[toChain]}
                    alt={toChain}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                  />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={20} />
              </div>
            </div>
          </div>

          {/* Token Selection and Amount */}
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-600">Token</label>
               <div className="relative">
                 <select
                  value={selectedToken}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedToken(e.target.value as TokenSymbolOption)}
                  className="input pl-12 appearance-none w-full"
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                  />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bridgeAmount" className="block text-sm font-medium text-neutral-600">Amount</label> {/* Added htmlFor */}
              <div className="relative">
                <input
                  id="bridgeAmount" // Added id
                  type="number"
                  value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input pr-24 w-full"
                  disabled={isBridging}
                  min="0" // Added min attribute
                />
                {/* Placeholder for MAX button logic */}
              </div>
            </div>

             <div className="space-y-2">
              <label htmlFor="recipientAddress" className="block text-sm font-medium text-neutral-600">Recipient Address ({toChain})</label> {/* Added htmlFor */}
              <input
                id="recipientAddress" // Added id
                type="text"
                value={recipientAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientAddress(e.target.value)}
                placeholder={`Enter ${toChain} address`}
                className="input w-full"
                disabled={isBridging}
              />
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="bg-neutral-50 rounded-xl p-4 mb-6">
             <div className="flex justify-between text-sm text-neutral-600">
                <span>Estimated Fees</span>
                <span>~0.01 {fromChain === 'Sui' ? 'SUI' : 'SOL'} + Relayer Fee</span> {/* Updated text */}
             </div>
             <div className="flex justify-between text-sm text-neutral-600 mt-1">
                <span>Estimated Time</span>
                <span>~ 1-5 minutes</span> {/* Updated text */}
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
                    {/* Correctly access the string tx id */}
                    Origin Tx: {bridgeResult.txIds[0].substring(0, 10)}...
                  </span>
                )}
                {/* Display Wormhole Message ID if available */}
                {bridgeResult.messageId && (
                   <span className="block mt-1">
                     Wormhole Msg: Chain {bridgeResult.messageId.chain}, Seq {bridgeResult.messageId.sequence.toString()}
                   </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Info Cards */}
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
                    <p className="text-sm text-neutral-600">Benefit from competitive bridging fees via relayers.</p> {/* Updated text */}
                </div>
            </div>
        </div>

        {/* Transaction History */}
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