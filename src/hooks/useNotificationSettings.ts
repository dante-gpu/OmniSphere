import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';

interface NotificationSettings {
  emailTransactions: boolean;
  emailPoolUpdates: boolean;
  emailSecurity: boolean;
  pushTransactions: boolean;
  pushPriceAlerts: boolean;
  pushRewards: boolean;
  browserNotifications: boolean;
}

export function useNotificationSettings() {
  const { account } = useWallet();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailTransactions: true,
    emailPoolUpdates: true,
    emailSecurity: true,
    pushTransactions: true,
    pushPriceAlerts: false,
    pushRewards: true,
    browserNotifications: true
  });

  useEffect(() => {
    if (account) {
      // Load settings from local storage or backend
      const savedSettings = localStorage.getItem(`notifications_${account.address}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    }
  }, [account]);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const saveSettings = async () => {
    if (account) {
      // Save to local storage and/or backend
      localStorage.setItem(`notifications_${account.address}`, JSON.stringify(settings));
      // Implement API call here if needed
    }
  };

  return { settings, updateSettings, saveSettings };
}