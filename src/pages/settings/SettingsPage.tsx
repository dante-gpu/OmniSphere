import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Settings, 
  Bell, 
  Shield, 
  User, 
  Globe, 
  Moon,
  Sun,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '@suiet/wallet-kit';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useUserSettings } from '../../hooks/useUserSettings';

const SettingsPage = () => {
  const location = useLocation();
  const { connected } = useWallet();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { settings, updateSettings } = useUserSettings();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'tr', name: 'Türkçe' },
  ];

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert
          type="warning"
          title="Wallet Not Connected"
          message="Please connect your wallet to access settings."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="grid gap-8">
          {/* Quick Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Quick Settings</h2>
            
            <div className="space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="text-primary" size={24} />
                  ) : (
                    <Sun className="text-primary" size={24} />
                  )}
                  <div>
                    <h3 className="font-medium">Theme</h3>
                    <p className="text-sm text-neutral-500">
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  Toggle Theme
                </Button>
              </div>

              {/* Language Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="text-primary" size={24} />
                  <div>
                    <h3 className="font-medium">Language</h3>
                    <p className="text-sm text-neutral-500">
                      {languages.find(l => l.code === language)?.name}
                    </p>
                  </div>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input w-40"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Navigation Cards */}
          <div className="grid gap-4">
            <Link to="/settings/notifications">
              <Card className="p-6 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="text-primary" size={24} />
                    <div>
                      <h3 className="font-medium">Notifications</h3>
                      <p className="text-sm text-neutral-500">
                        Manage your notification preferences
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="text-neutral-400" size={24} />
                </div>
              </Card>
            </Link>

            <Link to="/settings/security">
              <Card className="p-6 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="text-primary" size={24} />
                    <div>
                      <h3 className="font-medium">Security</h3>
                      <p className="text-sm text-neutral-500">
                        Configure your security settings
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="text-neutral-400" size={24} />
                </div>
              </Card>
            </Link>
          </div>

          {/* Advanced Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Advanced Settings</h2>
            
            <div className="space-y-6">
              {/* Transaction Settings */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="text-primary" size={24} />
                  <div>
                    <h3 className="font-medium">Default Slippage Tolerance</h3>
                    <p className="text-sm text-neutral-500">
                      Set your default slippage for transactions
                    </p>
                  </div>
                </div>
                <input
                  type="number"
                  value={settings.defaultSlippage}
                  onChange={(e) => updateSettings({ defaultSlippage: parseFloat(e.target.value) })}
                  className="input w-24"
                  step="0.1"
                  min="0.1"
                  max="5"
                />
              </div>

              {/* Gas Settings */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="text-primary" size={24} />
                  <div>
                    <h3 className="font-medium">Gas Price Preference</h3>
                    <p className="text-sm text-neutral-500">
                      Choose your preferred gas price setting
                    </p>
                  </div>
                </div>
                <select
                  value={settings.gasPreference}
                  onChange={(e) => updateSettings({ gasPreference: e.target.value })}
                  className="input w-40"
                >
                  <option value="fast">Fast</option>
                  <option value="standard">Standard</option>
                  <option value="slow">Slow</option>
                </select>
              </div>
            </div>
          </Card>

          {/* External Links */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Resources</h2>
            
            <div className="grid gap-4">
              <a
                href="https://docs.example.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span className="font-medium">Documentation</span>
                <ExternalLink size={20} className="text-neutral-400" />
              </a>
              
              <a
                href="https://github.com/example/repo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span className="font-medium">GitHub Repository</span>
                <ExternalLink size={20} className="text-neutral-400" />
              </a>
              
              <a
                href="https://discord.gg/example"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span className="font-medium">Discord Community</span>
                <ExternalLink size={20} className="text-neutral-400" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;