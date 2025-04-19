import React, { useState, useEffect } from 'react';
import { WormholeMessageId } from '../types/wormhole';

interface VerifierProps {
  messages: WormholeMessageId[];
}

export const WormholeTransactionVerifier = ({ messages }: VerifierProps) => {
  const [statuses, setStatuses] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const checkStatuses = async () => {
      const newStatuses: { [key: string]: string } = {};
      
      await Promise.all(messages.map(async (msg) => {
        const response = await fetch(
          `https://api.wormholescan.io/api/v1/messages/${msg.chain}/${msg.emitter}/${msg.sequence}`
        );
        
        if (response.ok) {
          const data = await response.json();
          newStatuses[`${msg.chain}-${msg.sequence}`] = data.status;
        }
      }));

      setStatuses(newStatuses);
    };

    const interval = setInterval(checkStatuses, 10000);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <div key={`${msg.chain}-${msg.sequence}`} className="p-4 border rounded-lg">
          <div className="flex justify-between">
            <span>Chain: {msg.chain}</span>
            <span>Sequence: {msg.sequence.toString()}</span>
          </div>
          <div className="mt-2">
            Status: {statuses[`${msg.chain}-${msg.sequence}`] || 'Pending'}
          </div>
          <a
            href={`https://wormholescan.io/#/tx/${msg.chain}/${msg.emitter}/${msg.sequence}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline mt-2 inline-block"
          >
            View on Wormholescan
          </a>
        </div>
      ))}
    </div>
  );
}; 