import React, { useState, useCallback, useMemo } from 'react';
import {
  ConnectButton as SuiConnectButton,
  useWallet as useSuiWallet,
} from '@suiet/wallet-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import {
  useWallet as useSolanaWallet,
  useConnection as useSolanaConnection,
} from '@solana/wallet-adapter-react';
import { WalletMultiButton as SolanaWalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  CHAIN_ID_SUI,
  ChainId,
  getSignedVAAWithRetry,
  parseSequenceFromLogSui,
  uint8ArrayToHex,
} from '@certusone/wormhole-sdk';
import idl from '../../programs/liquidity_pool/target/idl/liquidity_pool_program.json';
import './App.css';
import { getVerifiedHashFromWormholescanLink } from '../../lib/wormholeUtils';

// --- Configuration (Constants) ---
const SOLANA_PROGRAM_ID = new PublicKey('3f7R6ADZw5t7NWUYLWYE6pMPdo8F4tmsM1mRTUu4CeB9');
const suiNetwork: 'testnet' | 'mainnet' | 'devnet' = 'testnet';
const SUI_WORMHOLE_PACKAGE_ID = "0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790";
const SUI_WORMHOLE_STATE_ID = "0x1e37e704537f173f706f5516f41d7c9f45471326876769c458f11f8f5448a2a4";
const SUI_WORMHOLE_EMITTER_CAP_ID = "0x6149927031d73769b74970f75f8f019a8fd8cb9f16f8884763699f704a576f2f";
const SUI_CLOCK_ID = "0x6";
const WORMHOLE_RPC_HOSTS = ["https://api.testnet.wormholescan.io"];
const SOLANA_WORMHOLE_BRIDGE_ADDRESS = new PublicKey('3u8hJSAhzqusyd577N6U6K9w9W0Y57VhYrn2M4MMbWS2');
const SOLANA_ACTION_RECORD_SEED = Buffer.from("action_record");

// Helper function to get Solana Provider
const getSolanaProvider = (connection: Connection, wallet: any) => {
  if (!wallet || !wallet.publicKey) return null;
  const provider = new AnchorProvider(connection, wallet, { preflightCommitment: "processed" });
  return provider;
}

// --- Types ---
type WormholeInfo = {
  sequence: string;
  emitterAddress: string;
  chainId: ChainId;
};
type ActionRecordData = {
  counter: string;
  totalAmount: string;
  lastTimestamp: string;
};

// --- Components (Ensure these are defined BEFORE App uses them) ---

const Header = () => (
  <div className="header">
    <h1>OmniSphere MVP</h1>
    <p>Cross-Chain Liquidity Protocol (Sui ↔ Solana)</p>
  </div>
);

const Footer = () => (
  <div className="footer">
    <p>OmniSphere Protocol MVP - Hackathon Demo</p>
  </div>
);

const WalletConnect = () => (
  <div className="wallet-section">
    <div className="wallet-buttons">
      <SuiConnectButton />
      <SolanaWalletMultiButton />
    </div>
  </div>
);

interface SuiInitiatorProps {
  onInitiate: (amount: string) => Promise<WormholeInfo | null>;
  suiTxDigest: string | null;
  isLoading: boolean;
  error: string | null;
}

const SuiInitiator: React.FC<SuiInitiatorProps> = ({ onInitiate, suiTxDigest, isLoading, error }) => {
  const [amount, setAmount] = useState<string>('10');
  const suiWallet = useSuiWallet();

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value);
  };

  const handleInitiateClick = () => {
    onInitiate(amount);
  };

  return (
    <div className="action-panel sui-panel">
      <h3>1. Initiate Action on Sui</h3>
      <div className="input-group">
        <label htmlFor="amountInput">Amount (u64):</label>
        <input
          id="amountInput"
          type="number"
          value={amount}
          onChange={handleAmountChange}
          min="1"
          disabled={isLoading || !suiWallet.connected}
        />
      </div>
      <button
        className="action-button"
        onClick={handleInitiateClick}
        disabled={isLoading || !suiWallet.connected || !!suiTxDigest}
      >
        {isLoading ? 'Processing Sui Tx...' : 'Initiate Cross-Chain Action'}
      </button>
      {suiTxDigest && (
        <div className="result-panel">
          <p>
            Sui Tx ID: {' '}
            <a
              href={`https://suiscan.xyz/${suiNetwork}/tx/${suiTxDigest}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {suiTxDigest.substring(0, 6)}...{suiTxDigest.substring(suiTxDigest.length - 4)}
            </a>
          </p>
        </div>
      )}
      {error && <div className="error-panel"><p>Sui Error: {error}</p></div>}
    </div>
  );
};

interface WormholeBridgeWatcherProps {
  wormholeInfo: WormholeInfo | null;
  onFetchVaa: () => Promise<Uint8Array | null>;
  vaaBytes: Uint8Array | null;
  isLoading: boolean;
  error: string | null;
}

const WormholeBridgeWatcher: React.FC<WormholeBridgeWatcherProps> = ({ wormholeInfo, onFetchVaa, vaaBytes, isLoading, error }) => {
  if (!wormholeInfo) return null;

  return (
    <div className="action-panel wormhole-panel">
      <h3>2. Wait for Wormhole VAA</h3>
      <div className="info-panel">
        <p>Wormhole Sequence: {wormholeInfo.sequence}</p>
        <p>Emitter Chain ID: {wormholeInfo.chainId}</p>
        <p>Emitter Address: {wormholeInfo.emitterAddress}</p>
        <p><i>Waiting for Wormhole Guardians to sign the message...</i></p>
      </div>
      <button
        className="action-button"
        onClick={onFetchVaa}
        disabled={isLoading || !!vaaBytes}
      >
        {isLoading ? 'Fetching VAA...' : (vaaBytes ? 'VAA Fetched' : 'Fetch Signed VAA')}
      </button>
      {vaaBytes && (
         <div className="result-panel">
           <p>Signed VAA Fetched! ({vaaBytes.length} bytes)</p>
         </div>
      )}
       {error && <div className="error-panel"><p>Wormhole Error: {error}</p></div>}
    </div>
  );
};

interface SolanaProcessorProps {
  vaaBytes: Uint8Array | null;
  onProcess: () => Promise<string | null>; // Returns Solana tx signature
  solanaTxSignature: string | null;
  actionRecord: ActionRecordData | null;
  isLoading: boolean;
  error: string | null;
}

const SolanaProcessor: React.FC<SolanaProcessorProps> = ({ vaaBytes, onProcess, solanaTxSignature, actionRecord, isLoading, error }) => {
  const solanaWallet = useSolanaWallet();
  if (!vaaBytes) return null;

  return (
    <div className="action-panel solana-panel">
      <h3>3. Process VAA on Solana</h3>
      <button
        className="action-button"
        onClick={onProcess}
        disabled={isLoading || !solanaWallet.connected || !!solanaTxSignature}
      >
        {isLoading ? 'Processing Solana Tx...' : 'Process VAA on Solana'}
      </button>
      {solanaTxSignature && (
        <div className="result-panel">
           <p>
             Solana Tx ID: {' '}
             <a
               href={`https://explorer.solana.com/tx/${solanaTxSignature}?cluster=devnet`}
               target="_blank"
               rel="noopener noreferrer"
             >
               {solanaTxSignature.substring(0, 6)}...{solanaTxSignature.substring(solanaTxSignature.length - 4)}
             </a>
           </p>
        </div>
      )}
       {actionRecord && (
         <div className="info-panel status-panel">
           <h4>Solana Action Record State</h4>
           <p>Processed Actions Count: {actionRecord.counter}</p>
           <p>Total Amount Processed: {actionRecord.totalAmount}</p>
           <p>Last Timestamp: {new Date(parseInt(actionRecord.lastTimestamp) * 1000).toLocaleString()}</p>
         </div>
       )}
       {error && <div className="error-panel"><p>Solana Error: {error}</p></div>}
    </div>
  );
};

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
  // State Management
  const [suiTxDigest, setSuiTxDigest] = useState<string | null>(null);
  const [wormholeInfo, setWormholeInfo] = useState<WormholeInfo | null>(null);
  const [vaaBytes, setVaaBytes] = useState<Uint8Array | null>(null);
  const [solanaTxSignature, setSolanaTxSignature] = useState<string | null>(null);
  const [actionRecord, setActionRecord] = useState<ActionRecordData | null>(null);

  const [isLoadingSui, setIsLoadingSui] = useState<boolean>(false);
  const [isLoadingWormhole, setIsLoadingWormhole] = useState<boolean>(false);
  const [isLoadingSolana, setIsLoadingSolana] = useState<boolean>(false);
  const [isLoadingVaaHash, setIsLoadingVaaHash] = useState<boolean>(false);

  const [errorSui, setErrorSui] = useState<string | null>(null);
  const [errorWormhole, setErrorWormhole] = useState<string | null>(null);
  const [errorSolana, setErrorSolana] = useState<string | null>(null);
  const [errorVaaHash, setErrorVaaHash] = useState<string | null>(null);
  const [retrievedVaaHash, setRetrievedVaaHash] = useState<string | null>(null);

  // Wallet Hooks
  const suiWallet = useSuiWallet();
  const solanaWallet = useSolanaWallet();
  const { connection: solanaConnection } = useSolanaConnection();

  // Solana Program Instance
  const solanaProgram = useMemo(() => {
    const provider = getSolanaProvider(solanaConnection, solanaWallet);
    if (!provider) return null;
    // Use 'as any' for IDL to bypass strict type checking if necessary
    return new Program(idl as any, SOLANA_PROGRAM_ID, provider);
  }, [solanaConnection, solanaWallet]);

  // --- Handlers ---
  const handleInitiateSui = useCallback(async (amount: string): Promise<WormholeInfo | null> => {
    if (!suiWallet.connected || !suiWallet.address) {
      setErrorSui('Please connect your Sui wallet first.');
      return null;
    }

    setIsLoadingSui(true);
    setErrorSui(null);
    setSuiTxDigest(null);
    setWormholeInfo(null);
    setVaaBytes(null);
    setSolanaTxSignature(null);
    setActionRecord(null);
    setErrorWormhole(null);
    setErrorSolana(null);
    setErrorVaaHash(null);
    setRetrievedVaaHash(null);

    try {
      const amountU64 = BigInt(amount);
      const txb = new TransactionBlock();

      // 1. Construct the payload
      const operationCode = 0x01;
      const payloadBuffer = Buffer.alloc(9);
      payloadBuffer.writeUInt8(operationCode, 0);
      payloadBuffer.writeBigUInt64BE(amountU64, 1);
      const payloadVector = Array.from(payloadBuffer);

      // 2. Generate a random nonce
      const nonce = Math.floor(Math.random() * (2**32));

      // 3. Call Wormhole Core Bridge
      const [messageTicket] = txb.moveCall({
        target: `${SUI_WORMHOLE_PACKAGE_ID}::publish_message::prepare_message`,
        arguments: [
          txb.object(SUI_WORMHOLE_EMITTER_CAP_ID),
          txb.pure.u32(nonce),
          txb.pure(payloadVector, 'vector<u8>'),
        ],
      });

      txb.moveCall({
        target: `${SUI_WORMHOLE_PACKAGE_ID}::publish_message::publish_message`,
        arguments: [
          txb.object(SUI_WORMHOLE_STATE_ID),
          messageTicket,
          txb.object(SUI_CLOCK_ID),
        ],
      });

      // 4. Sign and Execute
      console.log("Submitting Sui transaction to Wormhole Core Bridge...");
      const result = await suiWallet.signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: { showEvents: true },
      });

      console.log('Sui Transaction Result:', result);
      setSuiTxDigest(result.digest);

      // 5. Parse sequence and emitter
      const sequence = parseSequenceFromLogSui(result.digest, (result.events || []) as any);
      const emitterAddressHex = SUI_WORMHOLE_PACKAGE_ID.startsWith('0x')
                                ? SUI_WORMHOLE_PACKAGE_ID.substring(2)
                                : SUI_WORMHOLE_PACKAGE_ID;
      const emitterAddress = Buffer.from(emitterAddressHex.padStart(64, '0'), 'hex').toString('hex');

      if (!sequence) {
        throw new Error('Could not find Wormhole sequence number in Sui transaction logs/events.');
      }

      const whInfo: WormholeInfo = {
        sequence,
        emitterAddress,
        chainId: CHAIN_ID_SUI,
      };
      setWormholeInfo(whInfo);
      console.log('Wormhole Info:', whInfo);
      return whInfo;

    } catch (err: any) {
      console.error('Sui Transaction failed:', err);
      setErrorSui(err.message || 'An unknown error occurred during the Sui transaction.');
      return null;
    } finally {
      setIsLoadingSui(false);
    }
  }, [suiWallet]);

  const handleFetchVaa = useCallback(async (): Promise<Uint8Array | null> => {
    if (!wormholeInfo) {
      setErrorWormhole('Cannot fetch VAA without Wormhole info from Sui transaction.');
      return null;
    }

    setIsLoadingWormhole(true);
    setErrorWormhole(null);
    setVaaBytes(null);
    setSolanaTxSignature(null);
    setActionRecord(null);
    setErrorSolana(null);
    setErrorVaaHash(null);
    setRetrievedVaaHash(null);

    console.log(`Fetching VAA for Sequence: ${wormholeInfo.sequence}, Emitter: ${wormholeInfo.emitterAddress}`);

    try {
      const { vaaBytes: fetchedVaaBytes } = await getSignedVAAWithRetry(
        WORMHOLE_RPC_HOSTS,
        wormholeInfo.chainId,
        wormholeInfo.emitterAddress,
        wormholeInfo.sequence,
        { retryAttempts: 5, retryDelay: 1000 }
      );
      setVaaBytes(fetchedVaaBytes);
      console.log('Fetched VAA Bytes:', uint8ArrayToHex(fetchedVaaBytes));
      return fetchedVaaBytes;
    } catch (err: any) {
      console.error('Failed to fetch VAA:', err);
      setErrorWormhole(err.message || 'Could not fetch Signed VAA. Guardians may not have signed yet.');
      return null;
    } finally {
      setIsLoadingWormhole(false);
    }
  }, [wormholeInfo]);

  const handleProcessSolana = useCallback(async (): Promise<string | null> => {
    if (!vaaBytes) {
      setErrorSolana('No VAA available to process on Solana.');
      return null;
    }
    if (!solanaWallet.connected || !solanaWallet.publicKey || !solanaProgram) {
      setErrorSolana('Please connect Solana wallet and ensure program is initialized.');
      return null;
    }

    setIsLoadingSolana(true);
    setErrorSolana(null);
    setSolanaTxSignature(null);
    setActionRecord(null);

    try {
      // 1. Parse VAA
      const { parseVaa } = await import("@certusone/wormhole-sdk");
      const parsedVaa = parseVaa(vaaBytes);
      const payload = parsedVaa.payload;

      // 2. Extract data from payload
      if (payload.length < 9) {
        throw new Error("Invalid VAA payload length.");
      }
      const operationCode = payload[0];
      const amountBuffer = Buffer.from(payload.slice(1, 9));
      const amount = amountBuffer.readBigUInt64BE();
      console.log(`Parsed from VAA - Operation: ${operationCode}, Amount: ${amount.toString()}`);

      // 3. Derive PDA
      const [actionRecordPda] = await PublicKey.findProgramAddress(
        [SOLANA_ACTION_RECORD_SEED],
        solanaProgram.programId
      );
      console.log('Action Record PDA:', actionRecordPda.toBase58());

      // 4. Call processAction
      console.log('Executing processAction on Solana...');
      const txSignature = await solanaProgram.methods
        .processAction(operationCode, new BN(amount.toString()))
        .accounts({
          payer: solanaWallet.publicKey,
          actionRecord: actionRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log('Solana Transaction Signature:', txSignature);
      setSolanaTxSignature(txSignature);

      // 5. Confirm transaction
      const confirmation = await solanaConnection.confirmTransaction(txSignature, 'processed');
      if (confirmation.value.err) {
        throw new Error(`Solana transaction confirmation failed: ${confirmation.value.err}`);
      }
      console.log("Solana transaction confirmed.");

      // 6. Fetch updated ActionRecord data
      const recordData = await (solanaProgram.account as any).actionRecord.fetch(actionRecordPda);
      console.log("Fetched Action Record Data:", recordData);
      setActionRecord(recordData as ActionRecordData);
      return txSignature;

    } catch (err: any) {
      console.error('Solana Transaction failed:', err);
      setErrorSolana(err.message || 'An unknown error occurred during the Solana transaction.');
      return null;
    } finally {
      setIsLoadingSolana(false);
    }
  }, [vaaBytes, solanaWallet, solanaProgram, solanaConnection]);

  const handleFetchVaaHashFromLink = useCallback(async (url: string) => {
    setIsLoadingVaaHash(true);
    setErrorVaaHash(null);
    setRetrievedVaaHash(null);
    console.log("Attempting to fetch VAA hash for URL:", url);
    try {
      const hash = await getVerifiedHashFromWormholescanLink(url, WORMHOLE_RPC_HOSTS);
      if (hash) {
        setRetrievedVaaHash(hash);
        console.log("Successfully retrieved VAA hash:", hash);
      } else {
        throw new Error('VAA Hash could not be retrieved. The VAA might not exist or is not yet finalized.');
      }
    } catch (err: any) {
      console.error('handleFetchVaaHashFromLink failed:', err);
      setErrorVaaHash(err.message || 'An unknown error occurred while fetching VAA hash.');
    } finally {
      setIsLoadingVaaHash(false);
    }
  }, []); // WORMHOLE_RPC_HOSTS is constant, no need in dep array


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