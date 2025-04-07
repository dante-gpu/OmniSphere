import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield,
  ArrowLeft,
  Key,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '@suiet/wallet-kit';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useSecuritySettings } from '../../hooks/useSecuritySettings';

const SecurityPage = () => {
  const { connected } = useWallet();
  const { settings, updateSettings, enable2FA, disable2FA, generateBackupCodes } = useSecuritySettings();
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert
          type="warning"
          title="Wallet Not Connected"
          message="Please connect your wallet to access security settings."
        />
      </div>
    );
  }

  const handleEnable2FA = async () => {
    try {
      const result = await enable2FA(verificationCode);
      if (result.success) {
        setIs2FAModalOpen(false);
        setVerificationCode('');
        // Show success toast
      }
    } catch (error) {
      // Show error toast
    }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      const codes = await generateBackupCodes();
      setBackupCodes(codes);
      setShowBackupCodes(true);
    } catch (error) {
      // Show error toast
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/settings"
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold">Security Settings</h1>
        </div>

        <div className="grid gap-8">
          {/* Two-Factor Authentication */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="text-primary" size={24} />
              <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">2FA Status</h3>
                  <p className="text-sm text-neutral-500">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button
                  variant={settings.twoFactorEnabled ? 'outline' : 'primary'}
                  onClick={() => {
                    if (settings.twoFactorEnabled) {
                      disable2FA();
                    } else {
                      setIs2FAModalOpen(true);
                    }
                  }}
                >
                  {settings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>

              {settings.twoFactorEnabled && (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Backup Codes</h3>
                    <p className="text-sm text-neutral-500">
                      Generate new backup codes for account recovery
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleGenerateBackupCodes}
                  >
                    Generate New Codes
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Transaction Security */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-primary" size={24} />
              <h2 className="text-xl font-bold">Transaction Security</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Transaction Signing</h3>
                  <p className="text-sm text-neutral-500">
                    Require password for all transactions
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requirePasswordForTx}
                    onChange={(e) => updateSettings({ requirePasswordForTx: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">High Value Transaction Protection</h3>
                  <p className="text-sm text-neutral-500">
                    Additional confirmation for transactions over $1,000
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.highValueProtection}
                    onChange={(e) => updateSettings({ highValueProtection: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </Card>

          {/* Session Security */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="text-primary" size={24} />
              <h2 className="text-xl font-bold">Session Security</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Auto-lock Timer</h3>
                  <p className="text-sm text-neutral-500">
                    Automatically lock after period of inactivity
                  </p>
                </div>
                <select
                  value={settings.autoLockTimer}
                  onChange={(e) => updateSettings({ autoLockTimer: e.target.value })}
                  className="input w-40"
                >
                  <option value="5">5 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Device Management</h3>
                  <p className="text-sm text-neutral-500">
                    Manage trusted devices
                  </p>
                </div>
                <Button variant="outline">
                  Manage Devices
                </Button>
              </div>
            </div>
          </Card>

          {/* Activity Log */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="text-primary" size={24} />
              <h2 className="text-xl font-bold">Security Activity</h2>
            </div>

            <div className="space-y-4">
              {settings.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-neutral-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    {activity.type === 'success' ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <XCircle className="text-red-500" size={20} />
                    )}
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-neutral-500">{activity.timestamp}</p>
                    </div>
                  </div>
                  <span className="text-sm text-neutral-500">{activity.location}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        title="Set Up Two-Factor Authentication"
      >
        <div className="space-y-6">
          <div className="text-center">
            <img
              src={settings.twoFactorQRCode}
              alt="2FA QR Code"
              className="mx-auto mb-4"
            />
            <p className="text-sm text-neutral-500">
              Scan this QR code with your authenticator app
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="input w-full"
              placeholder="Enter 6-digit code"
            />
          </div>

          <Button
            onClick={handleEnable2FA}
            className="w-full"
          >
            Enable 2FA
          </Button>
        </div>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        isOpen={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        title="Backup Codes"
      >
        <div className="space-y-6">
          <Alert
            type="warning"
            message="Save these backup codes in a secure location. They can be used to recover your account if you lose access to your authenticator app."
          />

          <div className="grid grid-cols-2 gap-4">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="p-3 bg-neutral-50 rounded-lg font-mono text-center"
              >
                {code}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(backupCodes.join('\n'));
                // Show success toast
              }}
            >
              Copy Codes
            </Button>
            <Button onClick={() => setShowBackupCodes(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SecurityPage;