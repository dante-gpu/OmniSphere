import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ArrowUpRight } from 'lucide-react';

interface VerifierProps {
  transactionId: string;
  sourceChain: string;
  targetChain: string;
}

export const WormholeTransactionVerifier: React.FC<VerifierProps> = ({
  transactionId,
  sourceChain,
  targetChain
}) => {
  const [status, setStatus] = useState<'pending'|'complete'|'failed'>('pending');
  const [messageId, setMessageId] = useState<string | null>(null);
  const [verificationTime, setVerificationTime] = useState<Date | null>(null);
  
  useEffect(() => {
    // Poll Wormholescan API to check status
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `https://api.testnet.wormholescan.io/api/v1/transactions/${transactionId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch transaction status');
        }
        
        const data = await response.json();
        
        if (data.status === 'COMPLETED') {
          setStatus('complete');
          setMessageId(data.messageId);
          setVerificationTime(new Date());
        } else if (data.status === 'FAILED') {
          setStatus('failed');
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }
    };
    
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [transactionId]);
  
  return (
    <Card className="p-4 mt-4">
      <h3 className="text-lg font-medium mb-2">Wormhole Transaction Verification</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-neutral-600">Source Chain:</span>
          <span className="font-medium">{sourceChain}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-600">Target Chain:</span>
          <span className="font-medium">{targetChain}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-600">Transaction ID:</span>
          <span className="font-mono text-sm">{transactionId.substring(0, 8)}...{transactionId.substring(transactionId.length - 8)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-600">Status:</span>
          <span className={`font-medium ${
            status === 'complete' ? 'text-green-600' : 
            status === 'failed' ? 'text-red-600' : 'text-yellow-600'
          }`}>
            {status === 'complete' ? 'Completed' : 
            status === 'failed' ? 'Failed' : 'Pending'}
          </span>
        </div>
        
        {messageId && (
          <div className="flex justify-between">
            <span className="text-neutral-600">Message ID:</span>
            <span className="font-mono text-sm">{messageId}</span>
          </div>
        )}
        
        {verificationTime && (
          <div className="flex justify-between">
            <span className="text-neutral-600">Verified At:</span>
            <span>{verificationTime.toLocaleString()}</span>
          </div>
        )}
        
        <a 
          href={`https://testnet.wormholescan.io/tx/${transactionId}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full bg-purple-100 text-purple-800 p-2 rounded-lg mt-2 hover:bg-purple-200 transition-colors"
        >
          View on Wormholescan <ArrowUpRight size={16} className="ml-1" />
        </a>
      </div>
    </Card>
  );
}; 