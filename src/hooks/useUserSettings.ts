import { useState, useCallback } from 'react';

interface UserSettings {
  defaultSlippage: number;
  gasPreference: 'fast' | 'standard' | 'slow';
}

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>({
    defaultSlippage: 0.5,
    gasPreference: 'standard'
  });

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return { settings, updateSettings };
};