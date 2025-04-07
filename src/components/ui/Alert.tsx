import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
}

const alertStyles: Record<AlertType, { bg: string; icon: JSX.Element }> = {
  success: {
    bg: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircle className="text-green-500" size={20} />
  },
  error: {
    bg: 'bg-red-50 border-red-200 text-red-800',
    icon: <XCircle className="text-red-500" size={20} />
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: <AlertCircle className="text-yellow-500" size={20} />
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info className="text-blue-500" size={20} />
  }
};

export const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  onClose
}) => {
  const { bg, icon } = alertStyles[type];

  return (
    <div className={`rounded-lg border p-4 ${bg} animate-fade-in`}>
      <div className="flex">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-3 flex-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={`text-sm ${title ? 'mt-1' : ''}`}>{message}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 focus:ring-2 focus:ring-offset-2 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};