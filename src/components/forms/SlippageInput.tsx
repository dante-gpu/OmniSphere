import React from 'react';
import { Info } from 'lucide-react';

interface SlippageInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export const SlippageInput: React.FC<SlippageInputProps> = ({
  value,
  onChange,
  error,
  disabled
}) => {
  const presetValues = ['0.1', '0.5', '1.0'];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-neutral-600">
          Slippage Tolerance
        </label>
        <div className="group relative">
          <Info size={16} className="text-neutral-400" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2 bg-neutral-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            Your transaction will revert if the price changes unfavorably by more than this percentage.
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {presetValues.map((preset) => (
          <button
            key={preset}
            onClick={() => !disabled && onChange(preset)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-lg text-sm transition-colors
              ${value === preset
                ? 'bg-primary text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {preset}%
          </button>
        ))}
        <div className="relative flex-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`
              input w-full pr-8
              ${error ? 'border-red-500 focus:ring-red-200' : ''}
            `}
            placeholder="Custom"
            step="0.1"
            min="0.1"
            max="5"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
            %
          </span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};