import { useState, useMemo, useCallback } from 'react'; 
import { Link } from 'react-router-dom'; 
import { ArrowLeft, Settings, ChevronDown, Plus } from 'lucide-react'; 
import { useWallet } from '@suiet/wallet-kit'; 
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card'; 
import { TokenSelect } from '../components/forms/TokenSelect';
import { TokenInput } from '../components/forms/TokenInput';
import { Dropdown } from '../components/ui/Dropdown';
// Import the chain-specific hooks
import { useCreateSuiPool } from '../hooks/useCreateSuiPool';
import { useCreateSolanaPool } from '../hooks/useCreateSolanaPool';
import { Alert } from '../components/ui/Alert'; 
import toast from 'react-hot-toast'; 
import { usePools, Token as PoolToken, NewPoolInput } from '../context/PoolContext'; // Import NewPoolInput type
import { parseUnits } from 'ethers/lib/utils'; 
import { SUI_TOKEN_MAP } from '../lib/constants'; 
// Removed unused imports: useCreatePool, CrossChainPoolConfig, PoolCreationReceipt, SupportedChain, WormholeTransactionVerifier

// Import all icons
import suiIcon from '../icons/sui.webp';
import solIcon from '../icons/sol.svg';
import usdcIcon from '../icons/usdc.png';
import usdtIcon from '../icons/tether.png';
import ethIcon from '../icons/eth.png';
import btcIcon from '../icons/btc.png';
import avaxIcon from '../icons/avax.png';
import bonkIcon from '../icons/bonk.png';
import wmaticIcon from '../icons/wmatic.png';
import aptIcon from '../icons/apt.png';
import rayIcon from '../icons/ray.png';
import srmIcon from '../icons/srm.png';
import orcaIcon from '../icons/orca.png';
const placeholderIcon = '/placeholder-icon.png'; 

// Define types needed for the form
type ChainOption = 'sui' | 'solana';

// Define Token interface matching TokenSelect component
interface Token {
  symbol: string;
  name: string;
  icon: string;
}

// Mock token data using imported icons
const MOCK_TOKENS: { [key: string]: Token } = {
  SUI: { symbol: 'SUI', name: 'Sui', icon: suiIcon },
  USDC: { symbol: 'USDC', name: 'USD Coin', icon: usdcIcon },
  USDT: { symbol: 'USDT', name: 'Tether', icon: usdtIcon },
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', icon: ethIcon },
  SOL: { symbol: 'SOL', name: 'Solana', icon: solIcon },
  RAY: { symbol: 'RAY', name: 'Raydium', icon: rayIcon },
  SRM: { symbol: 'SRM', name: 'Serum', icon: srmIcon },
  BTC: { symbol: 'BTC', name: 'Bitcoin', icon: btcIcon },
  APT: { symbol: 'APT', name: 'Aptos', icon: aptIcon },
  WMATIC: { symbol: 'WMATIC', name: 'Wrapped Matic', icon: wmaticIcon },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', icon: avaxIcon },
  BONK: { symbol: 'BONK', name: 'Bonk', icon: bonkIcon },
  ORCA: { symbol: 'ORCA', name: 'Orca', icon: orcaIcon },
};

const CreatePoolPage = () => {
  const [selectedChain, setSelectedChain] = useState<ChainOption>('sui');
  const [token1, setToken1] = useState<Token | null>(null);
  const [token2, setToken2] = useState<Token | null>(null);
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuiCreating, setIsSuiCreating] = useState(false); 
  const { addPool } = usePools(); 
  const wallet = useWallet(); 
  // Removed unused state/hooks: useCreatePool, receipt, setReceipt

  // Conditionally use the correct hook based on the selected chain
  const { createPool: createSuiPool } = useCreateSuiPool(); 
  const createSolanaPoolMutation = useCreateSolanaPool(); 

  // Determine the active mutation *state* (isLoading) based on the selected chain
  const isSolanaLoading = createSolanaPoolMutation.isLoading;
  const isLoading = selectedChain === 'sui' ? isSuiCreating : isSolanaLoading;

  // Define available tokens based on selected chain
  const availableTokens: Token[] = useMemo(() => {
    const symbols = selectedChain === 'sui'
      ? ['SUI', 'USDC', 'USDT', 'WETH', 'BTC', 'APT', 'WMATIC', 'AVAX', 'BONK'] 
      : ['SOL', 'USDC', 'USDT', 'RAY', 'SRM', 'BTC', 'ETH', 'BONK', 'ORCA']; 
    return symbols.map(symbol => MOCK_TOKENS[symbol]).filter(Boolean);
  }, [selectedChain]);

  // Calculate initial price ratio
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

  // Removed unused handleSubmit function

  const handleCreatePoolSubmit = async () => { 
    setFormError(null); 

    // Basic form validation
    if (!token1 || !token2) {
      setFormError('Please select both tokens.');
      return;
    }
    if (!token1Amount || parseFloat(token1Amount) <= 0 || !token2Amount || parseFloat(token2Amount) <= 0) {
      setFormError('Please enter valid amounts for both tokens.');
      return;
    }
    if (token1.symbol === token2.symbol) {
      setFormError('Please select two different tokens.');
      return;
    }
    if (!selectedChain) {
        setFormError('Please select a chain.');
        return;
    }

    // Chain-specific logic
    if (selectedChain === 'sui') {
        // --- Sui Specific Logic ---
        if (!wallet.connected || !wallet.address) {
            setFormError('Please connect your Sui wallet.');
            return;
        }

        const token1Info = SUI_TOKEN_MAP[token1.symbol];
        const token2Info = SUI_TOKEN_MAP[token2.symbol];

        if (!token1Info || !token2Info) {
            setFormError(`Token details not found for ${!token1Info ? token1.symbol : ''} ${!token2Info ? token2.symbol : ''} on Sui. Check constants.`);
            return;
        }

        setIsSuiCreating(true); 
        setFormError(null); 

        try {
            const amount1BN = parseUnits(token1Amount, token1Info.decimals);
            const amount2BN = parseUnits(token2Amount, token2Info.decimals);
            const amount1BigInt = amount1BN.toBigInt(); 
            const amount2BigInt = amount2BN.toBigInt(); 

            console.log(`Creating Sui Pool: ${token1.symbol}/${token2.symbol}`);
            console.log(`  Token A: ${token1Info.type}, Amount: ${amount1BigInt.toString()}`);
            console.log(`  Token B: ${token2Info.type}, Amount: ${amount2BigInt.toString()}`);

            await createSuiPool({
                wallet: wallet, 
                tokenAAddress: token1Info.type, 
                tokenBAddress: token2Info.type, 
                initialLiquidityA: amount1BigInt,
                initialLiquidityB: amount2BigInt,
            });

            // If createSuiPool succeeds, add to context
            // Ensure the object matches the NewPoolInput type from PoolContext
            const newPoolData: NewPoolInput = {
               name: `${token1.symbol}-${token2.symbol}`, 
               chain: 'sui',
               token1: token1.symbol as PoolToken, 
               token2: token2.symbol as PoolToken,
               fee: '0.3%', // Example fee display string
               token1Amount: token1Amount, 
               token2Amount: token2Amount,
               volume24h: '$0', // Ensure volume24h is a string
               apr: '0.0%', // Ensure apr is a string (if needed)
               rewards: [], 
            };
            addPool(newPoolData);

            setToken1(null);
            setToken2(null);
            setToken1Amount('');
            setToken2Amount('');
            setFormError(null);

        } catch (error: any) {
            console.error("Error during Sui pool creation submission:", error);
            const displayError = error?.message?.includes('Invalid struct type')
                ? 'Invalid token address configuration. Please check token details.'
                : error?.message || 'Unknown error';
            setFormError(`Sui Pool Creation Failed: ${displayError}`);
        } finally {
            setIsSuiCreating(false); 
        }

    } else { // selectedChain === 'solana'
        // --- Solana Specific Logic (using react-query mutation) ---
        setFormError(null); 
        const feeBasisPoints = 30; 
        const dataToSubmit = {
            token1Symbol: token1.symbol,
            token2Symbol: token2.symbol,
            feeBasisPoints: feeBasisPoints,
            token1Amount: token1Amount,
            token2Amount: token2Amount,
        };

        console.log('Submitting Solana Create Pool Data:', dataToSubmit);

        toast.promise(
           createSolanaPoolMutation.mutateAsync(dataToSubmit),
           {
             loading: `Initiating Solana pool creation...`,
             success: (result: any) => {
               if (result?.success && token1 && token2) {
                 // Ensure the object matches the NewPoolInput type from PoolContext
                 const newPoolData: NewPoolInput = {
                   name: `${token1.symbol}-${token2.symbol}`,
                   chain: 'solana',
                   token1: token1.symbol as PoolToken,
                   token2: token2.symbol as PoolToken,
                   fee: `${(feeBasisPoints / 100).toFixed(2)}%`, // Example fee display string
                   token1Amount: token1Amount,
                   token2Amount: token2Amount,
                   volume24h: '$0', // Ensure volume24h is a string
                   apr: '0.0%', // Ensure apr is a string (if needed)
                   rewards: []
                 };
                 addPool(newPoolData);

                 setToken1(null);
                 setToken2(null);
                 setToken1Amount('');
                 setToken2Amount('');
                 setFormError(null);
                 return 'Solana Pool created successfully!';
               }
               // Handle cases where mutation resolves but indicates failure internally
               console.warn('Solana pool creation mutation resolved but might not be fully successful:', result);
               setFormError(result?.message || 'Solana pool creation simulation complete, but state update failed.');
               return result?.message || 'Solana pool creation simulation complete.'; // Return message from result if available
             },
             error: (err: any) => {
                const errMsg = err?.message || 'Unknown error';
                setFormError(`Solana Pool creation failed: ${errMsg}`); // Set form error on failure
                return `Solana Pool creation failed: ${errMsg}`;
             },
           }
        );
    }
  };

  const renderSettings = () => (
     <div className="p-4 bg-neutral-50 rounded-xl mb-4 mt-4 border border-neutral-200 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-neutral-700">Transaction Settings</h3>
        <button onClick={() => setShowSettings(false)} className="text-neutral-500 hover:text-neutral-800">
          <ChevronDown size={20} />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-600 mb-2">
            Slippage Tolerance (%)
          </label>
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
              className="input w-20 text-sm px-2 py-1"
              placeholder="Custom"
              step="0.1"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Multichain havuz oluşturma komponenti ekleyin
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create Pool</h1>
      
      {/* Mevcut single-chain havuz oluşturma arayüzü */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Create Single-Chain Pool</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8"> 
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
                    items={[
                      { label: 'Sui', value: 'sui' },
                      { label: 'Solana', value: 'solana' },
                    ]}
                    value={selectedChain}
                    onChange={(value: string) => { 
                      setSelectedChain(value as ChainOption);
                      setToken1(null); 
                      setToken2(null);
                      setToken1Amount('');
                      setToken2Amount('');
                    }}
                    className="w-full"
                  />
                </div>

                {/* Token 1 Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Token 1
                  </label>
                  <TokenSelect
                    tokens={availableTokens.filter(t => t.symbol !== token2?.symbol)}
                    value={token1 ?? { symbol: 'Select', name: 'Select Token 1', icon: placeholderIcon }}
                    onChange={setToken1}
                    disabled={!selectedChain}
                  />
                </div>

                {/* Token 2 Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Token 2
                  </label>
                  <TokenSelect
                    tokens={availableTokens.filter(t => t.symbol !== token1?.symbol)}
                    value={token2 ?? { symbol: 'Select', name: 'Select Token 2', icon: placeholderIcon }}
                    onChange={setToken2}
                    disabled={!selectedChain}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="p-6 shadow-sm">
              <CardHeader className="p-0 mb-4">
                <h2 className="text-xl font-semibold">Set Initial Liquidity</h2>
                <p className="text-sm text-neutral-500">Enter the amounts for each token.</p>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <TokenInput
                  label={token1 ? `${token1.symbol} Amount` : 'Token 1 Amount'}
                  value={token1Amount}
                  onChange={setToken1Amount}
                  symbol={token1?.symbol}
                  balance="-" 
                  tokenIcon={token1?.icon ?? placeholderIcon}
                  disabled={!token1}
                />
                <div className="flex justify-center my-2">
                   <Plus size={20} className="text-neutral-400" />
                </div>
                <TokenInput
                  label={token2 ? `${token2.symbol} Amount` : 'Token 2 Amount'}
                  value={token2Amount}
                  onChange={setToken2Amount}
                  symbol={token2?.symbol}
                  balance="-" 
                  tokenIcon={token2?.icon ?? placeholderIcon}
                  disabled={!token2}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Overview & Settings */}
          <div className="space-y-6">
            <Card className="p-6 shadow-sm sticky top-20"> 
              <CardHeader className="p-0 mb-4">
                <h2 className="text-xl font-semibold">Pool Overview</h2>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                {priceRatio ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Initial Price</span>
                      <span className="font-medium text-right">{priceRatio.t1PerT2}<br/>{priceRatio.t2PerT1}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Your Pool Share</span>
                      <span className="font-medium">~0.00%</span> {/* Placeholder */}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    Enter amounts to see the initial price ratio.
                  </p>
                )}

                <div className="pt-4 border-t border-neutral-100">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center justify-between w-full text-neutral-600 hover:text-neutral-900 transition-colors text-sm font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Settings size={16} />
                      Transaction Settings
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                  </button>
                  {showSettings && renderSettings()}
                </div>

                {formError && (
                  <Alert type="error" message={formError} /> 
                )}

                <Button
                  variant="primary"
                  className="w-full mt-4"
                  onClick={handleCreatePoolSubmit} // This is the active handler
                  isLoading={isLoading} 
                  disabled={isLoading || !token1 || !token2 || !token1Amount || !token2Amount || parseFloat(token1Amount) <= 0 || parseFloat(token2Amount) <= 0 || (selectedChain === 'sui' && !wallet.connected)} 
                >
                  {isLoading ? 'Creating Pool...' : 'Create Pool'}
                </Button>
              </CardContent>
            </Card>

            {/* Info Box */}
            <Alert
               type="info"
               title="Pool Creation Tips"
               message="The initial ratio of tokens you deposit determines the starting price. Ensure you have sufficient balance for both tokens and transaction fees."
            />
          </div>
        </div>
      </div>
      
      {/* Yeni multichain havuz oluşturma arayüzü */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Create Multi-Chain Pool</h2>
        <MultiChainPoolCreation />
      </div>
    </div>
  );
};

// Yeni multichain havuz komponenti
function MultiChainPoolCreation() {
  // Zincir ve token seçimleri için state
  const [chainA, setChainA] = useState('Solana');
  const [chainB, setChainB] = useState('Sui');
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [feeBps, setFeeBps] = useState(30); // %0.3
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const solanaWallet = useWallet();
  const suiWallet = useWallet();
  const { connection } = useConnection();
  
  // Token seçenekleri (gerçek implementasyonda API'den veya configden gelebilir)
  const tokenOptions = {
    'Solana': [
      { value: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', label: 'USDC' },
      { value: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', label: 'USDT' },
    ],
    'Sui': [
      { value: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC', label: 'USDC' },
      { value: '0x06d8af9e6afd27262db436f0d37b304a041f710c3ea1fa4c3a9bab36b3569ad3::coin::COIN', label: 'USDT' },
    ]
  };
  
  // Form state geçerliliğini kontrol et
  const isValidForm = chainA && chainB && tokenA && tokenB && feeBps > 0 && chainA !== chainB;
  
  const handleCreateMultiChainPool = useCallback(async () => {
    try {
      setIsCreating(true);
      setError(null);
      
      // 1. Cüzdan bağlantısını kontrol edin
      if (chainA === 'Solana' && !solanaWallet.connected) {
        throw new Error("Please connect your Solana wallet");
      }
      if (chainB === 'Solana' && !solanaWallet.connected) {
        throw new Error("Please connect your Solana wallet");
      }
      if (chainA === 'Sui' && !suiWallet.connected) {
        throw new Error("Please connect your Sui wallet");
      }
      if (chainB === 'Sui' && !suiWallet.connected) {
        throw new Error("Please connect your Sui wallet");
      }
      
      // 2. Token seçimlerini kontrol edin
      if (!tokenA || !tokenB) {
        throw new Error("Please select both tokens");
      }
      
      // 3. Signer adaptörlerini oluşturun
      const signers: Record<string, any> = {};
      
      if (solanaWallet.connected && (chainA === 'Solana' || chainB === 'Solana')) {
        signers['Solana'] = new SolanaSignerAdapter(solanaWallet, connection);
      }
      
      if (suiWallet.connected && (chainA === 'Sui' || chainB === 'Sui')) {
        signers['Sui'] = new SuiSignerAdapter({
          account: suiWallet.account!,
          signAndExecuteTransactionBlock: suiWallet.signAndExecuteTransactionBlock! as any
        });
      }
      
      // 4. CrossChainPoolConfig objesi oluşturun
      const config = {
        chainA,
        chainB,
        tokenA: {
          chain: chainA,
          address: tokenA
        },
        tokenB: {
          chain: chainB,
          address: tokenB
        },
        feeBps,
        poolType: 'volatile' // veya 'stable' parametreyle alınabilir
      };
      
      // 5. createCrossChainPool fonksiyonunu çağırın
      const wormhole = new Wormhole('Testnet', [SolanaPlatform, SuiPlatform]);
      const receipt = await createCrossChainPool(config, signers);
      
      // 6. Sonucu gösterin
      setResult(receipt);
      console.log("Cross-chain pool created:", receipt);
      
    } catch (error: any) {
      console.error("Failed to create cross-chain pool:", error);
      setError(error.message || "An unknown error occurred");
    } finally {
      setIsCreating(false);
    }
  }, [chainA, chainB, tokenA, tokenB, feeBps, solanaWallet, suiWallet, connection]);
  
  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <FormGroup label="Chain A">
            <Select 
              value={chainA}
              onChange={e => {
                setChainA(e.target.value as string);
                setTokenA(''); // Chain değiştiğinde token sıfırla
              }}
              options={[
                { value: 'Solana', label: 'Solana' },
                { value: 'Sui', label: 'Sui' },
              ]}
              disabled={isCreating}
            />
          </FormGroup>
          
          <FormGroup label="Token A" className="mt-4">
            <Select 
              value={tokenA}
              onChange={e => setTokenA(e.target.value as string)}
              options={tokenOptions[chainA as keyof typeof tokenOptions] || []}
              disabled={isCreating || !chainA}
              placeholder="Select Token A"
            />
          </FormGroup>
        </div>
        
        <div>
          <FormGroup label="Chain B">
            <Select 
              value={chainB}
              onChange={e => {
                setChainB(e.target.value as string);
                setTokenB(''); // Chain değiştiğinde token sıfırla
              }}
              options={[
                { value: 'Solana', label: 'Solana' },
                { value: 'Sui', label: 'Sui' },
              ]}
              disabled={isCreating || chainA === ''}
              placeholder="Select Chain B"
            />
          </FormGroup>
          
          <FormGroup label="Token B" className="mt-4">
            <Select 
              value={tokenB}
              onChange={e => setTokenB(e.target.value as string)}
              options={tokenOptions[chainB as keyof typeof tokenOptions] || []}
              disabled={isCreating || !chainB || chainA === chainB}
              placeholder="Select Token B"
            />
          </FormGroup>
        </div>
      </div>
      
      <FormGroup label="Fee (basis points)">
        <Input 
          type="number"
          value={feeBps}
          onChange={e => setFeeBps(parseInt(e.target.value))}
          min={1}
          max={1000}
          disabled={isCreating}
        />
        <small className="text-neutral-500">30 bps = 0.3%</small>
      </FormGroup>
      
      {error && (
        <Alert variant="error" className="my-4">
          {error}
        </Alert>
      )}
      
      <Button 
        onClick={handleCreateMultiChainPool}
        disabled={isCreating || !isValidForm}
        loading={isCreating}
        className="w-full mt-6"
      >
        Create Cross-Chain Pool
      </Button>
      
      {result && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-900">Pool Created Successfully!</h3>
          <div className="mt-2 text-sm">
            <div><strong>Chain A Pool:</strong> {result.chainAReceipt?.poolAddress}</div>
            <div><strong>Chain A Transaction:</strong> {result.chainAReceipt?.txid}</div>
            <div className="mt-2"><strong>Chain B Pool:</strong> {result.chainBReceipt?.poolAddress}</div>
            <div><strong>Chain B Transaction:</strong> {result.chainBReceipt?.txid}</div>
            <div className="mt-2"><strong>Status:</strong> {result.linkingStarted ? "Pool linking in progress" : "Pools created"}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default CreatePoolPage;