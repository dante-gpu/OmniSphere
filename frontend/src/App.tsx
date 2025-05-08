import React, { useState, useCallback, useMemo } from 'react';
// ... other imports ...
import { Buffer } from 'buffer';
import {
  CHAIN_ID_SUI,
  ChainId,
  getSignedVAAWithRetry,
  parseSequenceFromLogSui,
  uint8ArrayToHex,
} from '@certusone/wormhole-sdk';
import idl from '../solana/target/idl/mvp_processor.json';
import './App.css';

// Import the new utility function
import { getVerifiedHashFromWormholescanLink } from '../lib/wormholeUtils';

// --- Configuration (Constants) ---
// ... existing constants ...
const WORMHOLE_RPC_HOSTS = ["https://api.testnet.wormholescan.io"]; // Testnet RPC
// ... existing constants ...

// --- Types ---
// ... existing types ...

// --- Components ---
// ... existing components: Header, Footer, WalletConnect, SuiInitiator, WormholeBridgeWatcher, SolanaProcessor ...

interface VaaHashFetcherProps {
  isLoading: boolean;
  error: string | null;
  vaaHash: string | null;
  onFetchVaaHash: (url: string) => void;
}

const VaaHashFetcher: React.FC<VaaHashFetcherProps> = ({ isLoading, error, vaaHash, onFetchVaaHash }) => {
  const [url, setUrl] = useState<string>('');

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  const handleSubmit = () => {
    if (url) {
      onFetchVaaHash(url);
    }
  };

  return (
    <div className="action-panel misc-panel">
      <h3>4. Fetch VAA Hash from Wormholescan Link</h3>
      <div className="input-group">
        <label htmlFor="wormholescanUrlInput">Wormholescan URL:</label>
        <input
          id="wormholescanUrlInput"
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://wormholescan.io/#/vaa/..."
          disabled={isLoading}
          style={{ width: '100%', marginBottom: '10px' }} // Added basic styling
        />
      </div>
      <button
        className="action-button"
        onClick={handleSubmit}
        disabled={isLoading || !url}
      >
        {isLoading ? 'Fetching Hash...' : 'Get VAA Hash'}
      </button>
      {vaaHash && (
        <div className="result-panel" style={{ marginTop: '10px' }}>
          <p>Verified VAA Hash: <br /><code style={{ wordBreak: 'break-all' }}>{vaaHash}</code></p>
        </div>
      )}
      {error && <div className="error-panel" style={{ marginTop: '10px' }}><p>Error: {error}</p></div>}
    </div>
  );
};


// --- Main App Component ---
function App() {
  // ... existing state variables ...
  const [isLoadingSui, setIsLoadingSui] = useState<boolean>(false);
  const [isLoadingWormhole, setIsLoadingWormhole] = useState<boolean>(false);
  const [isLoadingSolana, setIsLoadingSolana] = useState<boolean>(false);
  const [isLoadingVaaHash, setIsLoadingVaaHash] = useState<boolean>(false); // New loading state

  const [errorSui, setErrorSui] = useState<string | null>(null);
  const [errorWormhole, setErrorWormhole] = useState<string | null>(null);
  const [errorSolana, setErrorSolana] = useState<string | null>(null);
  const [errorVaaHash, setErrorVaaHash] = useState<string | null>(null); // New error state
  const [retrievedVaaHash, setRetrievedVaaHash] = useState<string | null>(null); // New state for the hash

  // Wallet Hooks
  // ... existing hooks ...

  // Solana Program Instance
  // ... existing useMemo for solanaProgram ...

  // --- Handlers ---
  // ... existing handleInitiateSui, handleFetchVaa, handleProcessSolana ...

  const handleFetchVaaHashFromLink = useCallback(async (url: string) => {
    setIsLoadingVaaHash(true);
    setErrorVaaHash(null);
    setRetrievedVaaHash(null);
    console.log("Attempting to fetch VAA hash for URL:", url);
    try {
      // Ensure WORMHOLE_RPC_HOSTS is passed from the App component's scope
      const hash = await getVerifiedHashFromWormholescanLink(url, WORMHOLE_RPC_HOSTS);
      if (hash) {
        setRetrievedVaaHash(hash);
        console.log("Successfully retrieved VAA hash:", hash);
      } else {
        // This case might be redundant if getVerifiedHashFromWormholescanLink always throws on failure
        throw new Error('VAA Hash could not be retrieved. The VAA might not exist or is not yet finalized.');
      }
    } catch (err: any) {
      console.error('handleFetchVaaHashFromLink failed:', err);
      setErrorVaaHash(err.message || 'An unknown error occurred while fetching VAA hash.');
    } finally {
      setIsLoadingVaaHash(false);
    }
  }, []); // WORMHOLE_RPC_HOSTS is a constant, so not needed in dep array if defined outside


  // --- Render ---
  return (
    <div className="app-container">
      <Header />
      <WalletConnect />
      <div className="main-content card">
        <SuiInitiator
          onInitiate={handleInitiateSui}
          suiTxDigest={suiTxDigest}
          isLoading={isLoadingSui}
          error={errorSui}
        />
        <WormholeBridgeWatcher
          wormholeInfo={wormholeInfo}
          onFetchVaa={handleFetchVaa}
          vaaBytes={vaaBytes}
          isLoading={isLoadingWormhole}
          error={errorWormhole}
        />
        <SolanaProcessor
          vaaBytes={vaaBytes}
          onProcess={handleProcessSolana}
          solanaTxSignature={solanaTxSignature}
          actionRecord={actionRecord}
          isLoading={isLoadingSolana}
          error={errorSolana}
        />
        {/* New VAA Hash Fetcher Component */}
        <VaaHashFetcher
          isLoading={isLoadingVaaHash}
          error={errorVaaHash}
          vaaHash={retrievedVaaHash}
          onFetchVaaHash={handleFetchVaaHashFromLink}
        />
      </div>
      <Footer />
      </div>
  );
}

export default App; 