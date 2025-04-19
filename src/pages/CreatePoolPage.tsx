import * as React from 'react';
import { useState, useMemo, useCallback } from 'react'; // useMemo eklendi (kullanılıyor)
import { Link } from 'react-router-dom'; // Kullanılıyor
import { ArrowLeft, Settings, ChevronDown, Plus } from 'lucide-react'; // Kullanılıyor
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { TokenSelect } from '../components/forms/TokenSelect';
import { TokenInput } from '../components/forms/TokenInput';
import {
  Wormhole,
  Chain,
  TokenId, 
  isChain, 
} from '@wormhole-foundation/sdk';
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
import { createCrossChainPool } from '../lib/crossChainPoolManager';
import { CrossChainPoolConfig, PoolCreationReceipt } from '../types/wormhole';
import { SolanaSignerAdapter, SuiSignerAdapter } from '../lib/wormholeSignerAdapters';
import { PublicKey } from '@solana/web3.js';
import { Dropdown } from '../components/ui/Dropdown';

import { useCreateSuiPool } from '../hooks/useCreateSuiPool';
import { useCreateSolanaPool } from '../hooks/useCreateSolanaPool';
import toast from 'react-hot-toast';
import { usePools, Token as PoolToken, NewPoolInput } from '../context/PoolContext';
import { parseUnits } from 'ethers/lib/utils';
import { SUI_TOKEN_MAP, SOL_TOKEN_MAP } from '../lib/constants';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { WormholeTransactionVerifier } from '../components/WormholeTransactionVerifier';


// --- Icon Imports ---
import suiIcon from '../icons/sui.webp';
import solIcon from '../icons/sol.svg';
import usdcIcon from '../icons/usdc.png';
import usdtIcon from '../icons/tether.png';
// Kullanılmayan diğer icon importları kaldırılabilir
// import ethIcon from '../icons/eth.png';
// import btcIcon from '../icons/btc.png';
// ... other icons ...
const placeholderIcon = '/placeholder-icon.png';

// --- dayjs setup ---
import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

// --- Component Types ---
type SupportedChainOption = Extract<Chain, "Solana" | "Sui">; // SDK Chain türünü kullan
const supportedChains: SupportedChainOption[] = ["Solana", "Sui"];

interface Token {
  symbol: string;
  name: string;
  icon: string;
}

// Mock token data (Sadece kullanılanları bırakabiliriz)
const MOCK_TOKENS: { [key: string]: Token } = {
  SUI: { symbol: 'SUI', name: 'Sui', icon: suiIcon },
  USDC: { symbol: 'USDC', name: 'USD Coin', icon: usdcIcon },
  USDT: { symbol: 'USDT', name: 'Tether', icon: usdtIcon },
  // WETH: { symbol: 'WETH', name: 'Wrapped Ether', icon: ethIcon },
  SOL: { symbol: 'SOL', name: 'Solana', icon: solIcon },
  // RAY: { symbol: 'RAY', name: 'Raydium', icon: rayIcon }, // Removed due to missing rayIcon
  // ... diğerleri ...
};

// Add proper ChainOption type definition
type ChainOption = 'sui' | 'solana';

const CreatePoolPage = () => {
    // --- State ---
    // Single-chain state
    const [selectedChain, setSelectedChain] = useState<ChainOption>('sui'); // Yerel 'sui' | 'solana'
    const [token1, setToken1] = useState<Token | null>(null);
    const [token2, setToken2] = useState<Token | null>(null);
    const [token1Amount, setToken1Amount] = useState('');
    const [token2Amount, setToken2Amount] = useState('');

    // Multi-chain state
    const [chainA, setChainA] = useState<SupportedChainOption>('Solana');
    const [chainB, setChainB] = useState<SupportedChainOption>('Sui');
    const [selectedTokenA, setSelectedTokenA] = useState<string>(''); // Token adresini sakla
    const [selectedTokenB, setSelectedTokenB] = useState<string>(''); // Token adresini sakla
    const [poolType, setPoolType] = useState<'stable' | 'volatile'>('volatile');
    const [feeBps, setFeeBps] = useState<number>(30);

    // Common state
    const [slippageTolerance, setSlippageTolerance] = useState('0.5');
    const [showSettings, setShowSettings] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false); // Genel yüklenme durumu
    const [receipt, setReceipt] = useState<PoolCreationReceipt | null>(null); // Cross-chain sonucu için

    // Add isSuiCreating state
    const [isSuiCreating, setIsSuiCreating] = useState(false);

    // --- Hooks ---
    const { addPool } = usePools();
    const suiWallet = useSuiWallet();
    const solanaWallet = useSolanaWallet();
    const { connection } = useConnection();
    const { createPool: createSuiPool } = useCreateSuiPool();
    const createSolanaPoolMutation = useCreateSolanaPool();
    const isSolanaLoading = createSolanaPoolMutation.isLoading;

    // --- Memos ---
    // Single-chain için token listesi
    const availableTokensSingleChain: Token[] = useMemo(() => {
      const symbols = selectedChain === 'sui'
        ? ['SUI', 'USDC', 'USDT'] // Örnek
        : ['SOL', 'USDC', 'USDT', 'RAY']; // Örnek
      return symbols.map(symbol => MOCK_TOKENS[symbol]).filter(Boolean);
    }, [selectedChain]);

    // Multi-chain için token listeleri
    const getTokenOptions = (chain: SupportedChainOption | null): { value: string; label: string }[] => {
        if (!chain) return [];
        const map = chain === 'Solana' ? SOL_TOKEN_MAP : SUI_TOKEN_MAP;
        return Object.entries(map).map(([symbol, info]) => ({
            value: (info as any).address,
            label: symbol
        }));
    };
    const tokenOptionsA = useMemo(() => getTokenOptions(chainA), [chainA]);
    const tokenOptionsB = useMemo(() => getTokenOptions(chainB), [chainB]);


    // Single-chain fiyat oranı
    const priceRatio = useMemo(() => {
      const amount1 = parseFloat(token1Amount);
      const amount2 = parseFloat(token2Amount);
      if (amount1 > 0 && amount2 > 0 && token1 && token2) {
        const ratio1 = (amount2 / amount1).toFixed(6);
        const ratio2 = (amount1 / amount2).toFixed(6);
        return {
          t1PerT2: `1 ${token1.symbol} ≈ ${ratio1} ${token2.symbol}`,
          t2PerT1: `1 ${token2.symbol} ≈ ${ratio2} ${token1.symbol}`,
        };
      }
      return null;
    }, [token1, token2, token1Amount, token2Amount]);

    // Multi-chain form geçerliliği
    const isMultiChainFormValid = chainA && chainB && selectedTokenA && selectedTokenB && feeBps >= 0 && chainA !== chainB;

    // --- Callbacks ---

    // Single-chain havuz oluşturma (Mevcut Haliyle Korunuyor)
    const handleCreateSingleChainPoolSubmit = useCallback(async () => {
      setFormError(null);
      if (!token1 || !token2 || !token1Amount || !token2Amount || parseFloat(token1Amount) <= 0 || parseFloat(token2Amount) <= 0 || token1.symbol === token2.symbol || !selectedChain) {
        setFormError('Please select different tokens, enter valid amounts, and choose a chain.');
        return;
      }

      // Yüklenme durumunu seçilen zincire göre ayarla
      const currentIsLoading = selectedChain === 'sui' ? isSuiCreating : isSolanaLoading;
      if (currentIsLoading) return; // Zaten işlemde ise tekrar başlatma

      if (selectedChain === 'sui') {
          if (!suiWallet.connected || !suiWallet.address) {
              setFormError('Please connect your Sui wallet.');
              return;
          }
          const token1Info = SUI_TOKEN_MAP[token1.symbol] as any;
          const token2Info = SUI_TOKEN_MAP[token2.symbol] as any;
          if (!token1Info || !token2Info) {
              setFormError(`Token details not found for ${!token1Info ? token1.symbol : ''} ${!token2Info ? token2.symbol : ''} on Sui.`);
              return;
          }
          // setIsSuiCreating hook içinde yönetildiği için burada tekrar set etmeye gerek yok
          try {
              const amount1BigInt = parseUnits(token1Amount, token1Info.decimals).toBigInt();
              const amount2BigInt = parseUnits(token2Amount, token2Info.decimals).toBigInt();
              await createSuiPool({
                  wallet: suiWallet,
                  tokenAAddress: token1Info.address,
                  tokenBAddress: token2Info.address,
                  initialLiquidityA: amount1BigInt,
                  initialLiquidityB: amount2BigInt,
              });
              // Başarı durumunda hook kendi toast'ını gösterir
               addPool({
                   name: `${token1.symbol}-${token2.symbol}`,
                   chain: 'sui',
                   token1: token1.symbol as PoolToken,
                   token2: token2.symbol as PoolToken,
                   fee: '0.3%',
                   token1Amount: token1Amount,
                   token2Amount: token2Amount,
                   volume24h: '$0',
                   apr: '0.0%',
                   rewards: [],
               });
               // Formu temizle
               setToken1(null); setToken2(null); setToken1Amount(''); setToken2Amount(''); setFormError(null);
          } catch (error: any) {
              setFormError(`Sui Pool Creation Failed: ${error.message || 'Unknown error'}`);
          }
      } else { // selectedChain === 'solana'
          const feeBasisPoints = 30;
          const dataToSubmit = {
              token1Symbol: token1.symbol,
              token2Symbol: token2.symbol,
              feeBasisPoints: feeBasisPoints,
              token1Amount: token1Amount,
              token2Amount: token2Amount,
          };
          toast.promise(
             createSolanaPoolMutation.mutateAsync(dataToSubmit),
             { 
                 loading: 'Creating pool...',
                 success: 'Pool created successfully!',
                 error: (err) => `Failed: ${err.message}`
             }
          ).then(() => {
              // Başarı durumunda formu temizle vb.
              setToken1(null); setToken2(null); setToken1Amount(''); setToken2Amount(''); setFormError(null);
          }).catch(err => {
              setFormError(`Solana Pool creation failed: ${err?.message || 'Unknown error'}`);
          });
      }
  }, [selectedChain, token1, token2, token1Amount, token2Amount, suiWallet, addPool, createSuiPool, createSolanaPoolMutation, isSuiCreating, isSolanaLoading]);


    // Multi-chain havuz oluşturma
    const handleCreateCrossChainPool = useCallback(async () => {
        setIsLoading(true);
        setFormError(null);
        setReceipt(null);

        // --- Validation ---
         if (!isChain(chainA) || !isChain(chainB)) {
             toast.error("Invalid chain selection.");
             setIsLoading(false);
             return;
         }
         if (!selectedTokenA || !selectedTokenB) {
             toast.error("Please select Token A and Token B.");
             setIsLoading(false);
             return;
         }
         if (chainA === chainB) {
              toast.error("Please select two different chains.");
              setIsLoading(false);
              return;
         }
         if (isNaN(feeBps) || feeBps < 0 || feeBps > 10000) {
              toast.error("Invalid Fee BPS (must be 0-10000).");
              setIsLoading(false);
              return;
          }
          // Wallet connection checks
          if ((chainA === 'Solana' || chainB === 'Solana') && (!solanaWallet.connected || !solanaWallet.publicKey || !connection)) {
              toast.error("Please connect Solana wallet."); setIsLoading(false); return;
          }
          if ((chainA === 'Sui' || chainB === 'Sui') && (!suiWallet.connected || !suiWallet.account || !suiWallet.signAndExecuteTransactionBlock)) {
              toast.error("Please connect Sui wallet and ensure it supports signing."); setIsLoading(false); return;
          }

        // --- Prepare Config and Signers ---
        try {
             // Düzeltme: parseTokenAddress yerine Wormhole.tokenId kullan
             const tokenIdA: TokenId = Wormhole.tokenId(chainA, selectedTokenA);
             const tokenIdB: TokenId = Wormhole.tokenId(chainB, selectedTokenB);

             // Düzeltme: Config nesnesine açık tür ver
             const config: CrossChainPoolConfig = {
                 chainA: chainA,
                 chainB: chainB,
                 tokenA: tokenIdA,
                 tokenB: tokenIdB,
                 feeBps: feeBps,
                 poolType: poolType, // poolType state'inden al
             };

             const signers: Partial<Record<SupportedChainOption, any>> = {};
             if (chainA === 'Solana' || chainB === 'Solana') {
                 signers['Solana'] = new SolanaSignerAdapter(solanaWallet, connection);
             }
             if (chainA === 'Sui' || chainB === 'Sui') {
                 signers['Sui'] = new SuiSignerAdapter({
                     account: suiWallet.account!,
                     signAndExecuteTransactionBlock: suiWallet.signAndExecuteTransactionBlock! as any
                 });
             }

             // Düzeltme: Lokal wormhole instance oluşturmaya gerek yok
             // const wormhole = new Wormhole('Testnet', [SolanaPlatform, SuiPlatform]);

             console.log("Calling createCrossChainPool with config:", config);
             const creationReceipt = await createCrossChainPool(config, signers);
             console.log("createCrossChainPool receipt:", creationReceipt);

             setReceipt(creationReceipt);
             toast.success(`Cross-chain pool creation process initiated! Pool ID: ${creationReceipt.poolId.substring(0,10)}...`);

        } catch (error) {
            console.error("Cross-chain pool creation failed:", error);
            const message = error instanceof Error ? error.message : String(error);
            setFormError(`Creation Failed: ${message}`);
            toast.error(`Creation Failed: ${message}`);
        } finally {
            setIsLoading(false);
        }

    }, [chainA, chainB, selectedTokenA, selectedTokenB, poolType, feeBps, solanaWallet, suiWallet, connection]); // Bağımlılıkları ekle

    // --- Render ---
    const renderSettings = () => (
      <div className="p-4 bg-neutral-50 rounded-xl mb-4 mt-4 border border-neutral-200 animate-fade-in">
        {/* ... (settings içeriği aynı) ... */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-neutral-700">Transaction Settings</h3>
          <button onClick={() => setShowSettings(false)} className="text-neutral-500 hover:text-neutral-800">
            <ChevronDown size={20} />
          </button>
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-2">
            Slippage Tolerance (%)
          </label>
          {/* ... (slippage butonları ve input) */}
           <div className="flex gap-2 items-center">
             {['0.1', '0.5', '1.0'].map((value) => (
               <button
                 key={value}
                 onClick={() => setSlippageTolerance(value)}
                 className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                   slippageTolerance === value
                     ? 'bg-primary text-white shadow-sm'
                     : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                 }`}
               >
                 {value}%
               </button>
             ))}
             <input
               type="number"
               value={slippageTolerance}
               onChange={(e) => setSlippageTolerance(e.target.value)}
               className="input w-20 text-sm px-2 py-1 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary" // Basic styling
               placeholder="Custom"
               step="0.1"
               min="0"
             />
           </div>
        </div>
      </div>
    );


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
       <Link to="/pools" className="flex items-center gap-2 text-neutral-600 hover:text-primary mb-6 transition-colors">
         <ArrowLeft size={20} />
         Back to Pools
       </Link>

       <h1 className="text-3xl font-bold mb-8 text-center md:text-left">Create New Pool</h1>

       {/* --- Single Chain Pool Section (Mevcut UI) --- */}
       <div className="mb-10 border-b pb-10 border-neutral-200">
          <h2 className="text-xl font-semibold mb-6 text-center md:text-left">Create Single-Chain Pool</h2>
          {/* ... (Mevcut single-chain JSX yapısı buraya gelecek) ... */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Left Column: Inputs */}
               <div className="space-y-6">
                 <Card className="p-6 shadow-sm">
                   <CardHeader className="p-0 mb-4">
                     <h2 className="text-xl font-semibold">Select Tokens & Chain</h2>
                   </CardHeader>
                   <CardContent className="p-0 space-y-4">
                     {/* Chain Selection */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Chain
                       </label>
                       <Dropdown
                         items={supportedChains.map(c => ({ label: c, value: c }))}
                         value={selectedChain}
                         onChange={(value: string) => {
                           setSelectedChain(value as ChainOption);
                           setToken1(null); setToken2(null); setToken1Amount(''); setToken2Amount('');
                         }}
                         className="w-full"
                         disabled={isLoading} // Genel isLoading kullan
                       />
                     </div>
                     {/* Token 1 Selection */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">Token 1</label>
                       <TokenSelect
                         tokens={availableTokensSingleChain.filter(t => t.symbol !== token2?.symbol)}
                         value={token1 ?? { symbol: 'Select', name: 'Select Token 1', icon: placeholderIcon }}
                         onChange={setToken1}
                         disabled={!selectedChain || isLoading}
                       />
                     </div>
                     {/* Token 2 Selection */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">Token 2</label>
                       <TokenSelect
                         tokens={availableTokensSingleChain.filter(t => t.symbol !== token1?.symbol)}
                         value={token2 ?? { symbol: 'Select', name: 'Select Token 2', icon: placeholderIcon }}
                         onChange={setToken2}
                         disabled={!selectedChain || isLoading}
                       />
                     </div>
                   </CardContent>
                 </Card>
                 <Card className="p-6 shadow-sm">
                    <CardHeader className="p-0 mb-4">
                        <h2 className="text-xl font-semibold">Set Initial Liquidity</h2>
                    </CardHeader>
                     <CardContent className="p-0 space-y-4">
                        <TokenInput
                            label={token1 ? `${token1.symbol} Amount` : 'Token 1 Amount'}
                            value={token1Amount} onChange={setToken1Amount} symbol={token1?.symbol}
                            balance="-" tokenIcon={token1?.icon ?? placeholderIcon} disabled={!token1 || isLoading}
                        />
                        <div className="flex justify-center my-2"><Plus size={20} className="text-neutral-400" /></div>
                        <TokenInput
                            label={token2 ? `${token2.symbol} Amount` : 'Token 2 Amount'}
                            value={token2Amount} onChange={setToken2Amount} symbol={token2?.symbol}
                            balance="-" tokenIcon={token2?.icon ?? placeholderIcon} disabled={!token2 || isLoading}
                        />
                     </CardContent>
                 </Card>
               </div>
               {/* Right Column: Overview & Action */}
                <div className="space-y-6">
                    <Card className="p-6 shadow-sm sticky top-20">
                        <CardHeader className="p-0 mb-4"><h2 className="text-xl font-semibold">Pool Overview</h2></CardHeader>
                        <CardContent className="p-0 space-y-3">
                           {priceRatio ? ( /* ... price ratio display ... */
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-neutral-600">Initial Price</span>
                                  <span className="font-medium text-right">{priceRatio.t1PerT2}<br/>{priceRatio.t2PerT1}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-neutral-600">Your Pool Share</span>
                                  <span className="font-medium">~0.00%</span>
                                </div>
                              </>
                           ) : (
                              <p className="text-sm text-neutral-500 text-center py-4">Enter amounts to see the initial price ratio.</p>
                           )}
                           {/* Settings Button */}
                           <div className="pt-4 border-t border-neutral-100">
                             <button onClick={() => setShowSettings(!showSettings)} className="flex items-center justify-between w-full text-neutral-600 hover:text-neutral-900 transition-colors text-sm font-medium">
                               <span className="flex items-center gap-2"><Settings size={16} /> Transaction Settings</span>
                               <ChevronDown size={16} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                             </button>
                             {showSettings && renderSettings()}
                           </div>
                           {formError && (
                             <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                               {formError}
                             </div>
                           )}
                           <Button
                               variant="primary" className="w-full mt-4"
                               onClick={handleCreateSingleChainPoolSubmit} // Tek zincir butonu
                               isLoading={selectedChain === 'sui' ? isSuiCreating : isSolanaLoading} // Zincire özel yüklenme
                               disabled={isLoading || !token1 || !token2 || !token1Amount || !token2Amount || parseFloat(token1Amount) <= 0 || parseFloat(token2Amount) <= 0 || (selectedChain === 'sui' && !suiWallet.connected)}
                            >
                               {isLoading ? 'Creating Pool...' : `Create ${selectedChain} Pool`}
                           </Button>
                        </CardContent>
                    </Card>
                </div>
           </div>
       </div>

       {/* --- Multi Chain Pool Section --- */}
       <div>
          <h2 className="text-xl font-semibold mb-6 text-center md:text-left">Create Multi-Chain Pool</h2>
           <Card className="p-6 shadow-sm">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               {/* Chain A Setup */}
               <div className="space-y-4">
                 <label className="block text-sm font-medium text-neutral-700">Chain A</label>
                 <Dropdown
                     items={supportedChains.map(c => ({ label: c, value: c }))}
                     value={chainA}
                     onChange={(v) => { setChainA(v as SupportedChainOption); setSelectedTokenA(''); }}
                     disabled={isLoading || chainB === 'Solana'}
                 />
                  <label className="block text-sm font-medium text-neutral-700 mt-4">Token A</label>
                  <Dropdown
                     items={tokenOptionsA}
                     value={selectedTokenA}
                     onChange={(v) => setSelectedTokenA(v as string)}
                     disabled={isLoading || !chainA}
                     placeholder="Select Token A"
                 />
               </div>
               {/* Chain B Setup */}
               <div className="space-y-4">
                 <label className="block text-sm font-medium text-neutral-700">Chain B</label>
                 <Dropdown
                     items={supportedChains.map(c => ({ label: c, value: c }))}
                     value={chainB}
                     onChange={(v) => { setChainB(v as SupportedChainOption); setSelectedTokenB(''); }}
                     disabled={isLoading || chainA === 'Sui'}
                 />
                  <label className="block text-sm font-medium text-neutral-700 mt-4">Token B</label>
                  <Dropdown
                     items={tokenOptionsB}
                     value={selectedTokenB}
                     onChange={(v) => setSelectedTokenB(v as string)}
                     disabled={isLoading || !chainB || chainA === chainB}
                     placeholder="Select Token B"
                 />
               </div>
             </div>

             {/* Pool Type and Fee */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                   <label className="block text-sm font-medium text-neutral-700">Pool Type</label>
                   <Dropdown
                      items={[{ label: 'Volatile', value: 'volatile' }, { label: 'Stable', value: 'stable' }]}
                      value={poolType}
                      onChange={(v) => setPoolType(v as 'stable' | 'volatile')}
                      disabled={isLoading}
                  />
                 </div>
                  <div>
                    <label htmlFor="feeBpsInput" className="block text-sm font-medium text-neutral-700">Fee (BPS: 0-10000)</label>
                    <input
                        id="feeBpsInput"
                        type="number"
                        value={feeBps}
                        onChange={(e) => setFeeBps(parseInt(e.target.value || '0'))}
                        className="input w-full mt-1 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary p-2" // Basic styling
                        min="0" max="10000" step="1"
                        disabled={isLoading}
                    />
                    <p className="text-xs text-neutral-500 mt-1">{feeBps / 100}%</p>
                  </div>
             </div>

             {formError && (
                 <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                   {formError}
                 </div>
             )}

             <Button
               onClick={handleCreateCrossChainPool}
               disabled={isLoading || !isMultiChainFormValid}
               isLoading={isLoading}
               className="w-full"
             >
               {isLoading ? 'Creating Cross-Chain Pool...' : 'Create Cross-Chain Pool'}
             </Button>

             {/* Receipt and Verifier Display */}
             {receipt && (
                 <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                   <h3 className="font-semibold text-green-900 mb-2">Pool Creation Initiated!</h3>
                   <p className="text-sm mb-2">Composite Pool ID: <code className="break-all bg-green-100 px-1 rounded">{receipt.poolId}</code></p>
                   <p className="text-sm mb-4">Monitor the Wormhole messages below to track the linking process across chains. Linking confirmation may take a few minutes.</p>
                   {/* Assuming WormholeTransactionVerifier can handle SDKMessageId */}
                   <WormholeTransactionVerifier messages={receipt.wormholeMessages} />
                    <div className="mt-4 text-xs text-neutral-600">
                       <p className="font-medium">Transaction IDs:</p>
                       <ul className="list-disc pl-5">
                         {receipt.txIds.map((txid, index) => (
                           <li key={index} className="break-all font-mono">{txid}</li>
                         ))}
                       </ul>
                     </div>
                 </div>
             )}
           </Card>
       </div>
    </div>
  );
};

export default CreatePoolPage;