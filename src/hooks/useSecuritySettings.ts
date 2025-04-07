import { useState, useCallback } from 'react';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  requirePasswordForTx: boolean;
  highValueProtection: boolean;
  autoLockTimer: string;
  twoFactorQRCode: string;
  recentActivity: Array<{
    type: 'success' | 'error';
    action: string;
    timestamp: string;
    location: string;
  }>;
}

export const useSecuritySettings = () => {
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    requirePasswordForTx: true,
    highValueProtection: true,
    autoLockTimer: '15',
    twoFactorQRCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example',
    recentActivity: [
      {
        type: 'success',
        action: 'Login from new device',
        timestamp: '2024-01-20 15:30',
        location: 'Los Angeles, US'
      },
      {
        type: 'error',
        action: 'Failed login attempt',
        timestamp: '2024-01-19 10:15',
        location: 'Unknown'
      }
    ]
  });

  const updateSettings = useCallback((newSettings: Partial<SecuritySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const enable2FA = useCallback(async (verificationCode: string) => {
    // Simulate API call
    return new Promise<{ success: boolean }>((resolve) => {
      setTimeout(() => {
        if (verificationCode.length === 6) {
          setSettings(prev => ({ ...prev, twoFactorEnabled: true }));
          resolve({ success: true });
        } else {
          resolve({ success: false });
        }
      }, 1000);
    });
  }, []);

  const disable2FA = useCallback(() => {
    setSettings(prev => ({ ...prev, twoFactorEnabled: false }));
  }, []);

  const generateBackupCodes = useCallback(async () => {
    // Simulate API call to generate backup codes
    return new Promise<string[]>((resolve) => {
      setTimeout(() => {
        const codes = Array.from({ length: 8 }, () => 
          Math.random().toString(36).substring(2, 8).toUpperCase()
        );
        resolve(codes);
      }, 1000);
    });
  }, []);

  return {
    settings,
    updateSettings,
    enable2FA,
    disable2FA,
    generateBackupCodes
  };
};