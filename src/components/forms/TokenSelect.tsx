import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  icon: string;
}

interface TokenSelectProps {
  value: Token;
  onChange: (token: Token) => void;
  tokens: Token[];
  disabled?: boolean;
}

export const TokenSelect: React.FC<TokenSelectProps> = ({
  value,
  onChange,
  tokens,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between p-4 rounded-xl border
          ${disabled 
            ? 'bg-neutral-50 cursor-not-allowed' 
            : 'hover:border-primary transition-colors cursor-pointer'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <img src={value.icon} alt={value.symbol} className="w-6 h-6" />
          <div className="text-left">
            <div className="font-medium">{value.symbol}</div>
            <div className="text-sm text-neutral-500">{value.name}</div>
          </div>
        </div>
        <ChevronDown className={`
          transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}
          ${disabled ? 'text-neutral-400' : 'text-neutral-600'}
        `} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border shadow-lg max-h-60 overflow-auto">
          {tokens.map((token) => (
            <button
              key={token.symbol}
              onClick={() => {
                onChange(token);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img src={token.icon} alt={token.symbol} className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">{token.symbol}</div>
                  <div className="text-sm text-neutral-500">{token.name}</div>
                </div>
              </div>
              {token.symbol === value.symbol && (
                <Check className="text-primary" size={20} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};