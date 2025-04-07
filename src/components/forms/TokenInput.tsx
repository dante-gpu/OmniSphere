import React from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface TokenInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  balance?: string;
  symbol?: string;
  error?: string;
  isLoading?: boolean;
  onMaxClick?: () => void;
  tokenIcon?: string;
  disabled?: boolean;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  label,
  value,
  onChange,
  balance,
  symbol,
  error,
  isLoading,
  onMaxClick,
  tokenIcon,
  disabled
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-neutral-600">
          {label}
        </label>
        {balance && (
          <div className="text-sm text-neutral-500">
            Balance: {balance} {symbol}
          </div>
        )}
      </div>
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {tokenIcon && (
              <img
                src={tokenIcon}
                alt={symbol}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              />
            )}
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="0.00"
              disabled={disabled || isLoading}
              className={`
                input w-full
                ${tokenIcon ? 'pl-12' : ''}
                ${error ? 'border-red-500 focus:ring-red-200' : ''}
              `}
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <LoadingSpinner className="w-5 h-5" />
              </div>
            )}
          </div>
          {onMaxClick && (
            <button
              onClick={onMaxClick}
              disabled={disabled || isLoading}
              className="btn-outline px-4 py-2"
            >
              MAX
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};