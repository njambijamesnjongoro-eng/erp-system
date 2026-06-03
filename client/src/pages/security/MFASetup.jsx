import { useState, useEffect } from 'react';
import { Shield, Smartphone, Mail, Key, CheckCircle, AlertTriangle, Copy, Download, RefreshCw, QrCode } from 'lucide-react';
import { securityPhase2Api } from '../../api/securityPhase2';
import { formatDateTime } from '../../utils/helpers';

export function MFASetup() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('status');

  // TOTP setup
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpToken, setTotpToken] = useState('');
  const [totpVerifyMsg, setTotpVerifyMsg] = useState('');

  // Email OTP
  const [emailOtpMsg, setEmailOtpMsg] = useState('');

  // Backup codes
  const [backupCodes, setBackupCodes] = useState([]);
  const [codesCopied, setCodesCopied] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await securityPhase2Api.getMFAStatus();
      setStatus(data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSetupTOTP = async () => {
    try {
      const { data } = await securityPhase2Api.setupTOTP();
      setTotpSetup(data.data);
      setTab('totp-setup');
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleVerifyTOTP = async () => {
    try {
      const { data } = await securityPhase2Api.verifyAndEnableTOTP(totpToken);
      setTotpVerifyMsg('TOTP enabled successfully!');
      setBackupCodes(data.data?.backupCodes || []);
      setTab('backup-codes');
      loadStatus();
    } catch (err) { setTotpVerifyMsg('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const handleEnableEmailOTP = async () => {
    try {
      await securityPhase2Api.enableEmailOTP();
      setEmailOtpMsg('Email OTP enabled!');
      loadStatus();
    } catch (err) { setEmailOtpMsg('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const handleDisableMFA = async () => {
    if (!confirm('Disable MFA? This reduces your account security.')) return;
    try {
      await securityPhase2Api.disableMFA(null);
      loadStatus();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleGenerateCodes = async () => {
    try {
      const { data } = await securityPhase2Api.generateBackupCodes();
      setBackupCodes(data.data?.codes || []);
      setTab('backup-codes');
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
  };

  const downloadCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'erp-backup-codes.txt';
    a.click();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Multi-Factor Authentication</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your MFA settings</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {[
          { key: 'status', label: 'Status', icon: Shield },
          { key: 'totp-setup', label: 'Authenticator', icon: QrCode },
          { key: 'email-otp', label: 'Email OTP', icon: Mail },
          { key: 'backup-codes', label: 'Backup Codes', icon: Key },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'status' && (
        <div className="card max-w-2xl">
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className={`w-6 h-6 ${status?.enabled ? 'text-emerald-500' : 'text-gray-400'}`} />
                <div>
                  <p className="font-medium">MFA Status</p>
                  <p className="text-sm text-gray-500">{status?.enabled ? `Enabled (${status.method})` : 'Not enabled'}</p>
                </div>
              </div>
              {status?.enabled && (
                <button onClick={handleDisableMFA} className="btn-danger btn-sm">Disable</button>
              )}
            </div>

            {status?.recovery && (
              <div className="text-sm text-gray-500">
                Recovery codes: {status.recovery.total - status.recovery.used_count} remaining / {status.recovery.total} total
              </div>
            )}

            {!status?.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <button onClick={handleSetupTOTP} className="card hover:ring-2 hover:ring-primary-500 cursor-pointer transition-all">
                  <div className="card-body flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><Smartphone className="w-5 h-5 text-primary-600" /></div>
                    <div><p className="font-medium">Authenticator App</p><p className="text-sm text-gray-500">Google Authenticator, Authy</p></div>
                  </div>
                </button>
                <button onClick={handleEnableEmailOTP} className="card hover:ring-2 hover:ring-primary-500 cursor-pointer transition-all">
                  <div className="card-body flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><Mail className="w-5 h-5 text-primary-600" /></div>
                    <div><p className="font-medium">Email OTP</p><p className="text-sm text-gray-500">Receive codes via email</p></div>
                  </div>
                </button>
              </div>
            )}

            {emailOtpMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${emailOtpMsg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {emailOtpMsg.includes('Error') ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                {emailOtpMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'totp-setup' && (
        <div className="card max-w-lg">
          <div className="card-body space-y-4">
            <h3 className="font-semibold">Set Up Authenticator App</h3>
            <p className="text-sm text-gray-500">Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>

            {!totpSetup ? (
              <button onClick={handleSetupTOTP} className="btn-primary gap-2"><RefreshCw className="w-4 h-4" /> Generate QR Code</button>
            ) : (
              <>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={totpSetup.qrCode} alt="TOTP QR Code" className="w-48 h-48" />
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Or enter this key manually:</p>
                  <code className="text-sm font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded select-all">{totpSetup.secret}</code>
                </div>
                <div className="flex gap-2">
                  <input value={totpToken} onChange={e => setTotpToken(e.target.value)} placeholder="Enter 6-digit code" className="input-field flex-1" maxLength={6} />
                  <button onClick={handleVerifyTOTP} disabled={totpToken.length !== 6} className="btn-primary">Verify & Enable</button>
                </div>
                {totpVerifyMsg && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${totpVerifyMsg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {totpVerifyMsg.includes('Error') ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    {totpVerifyMsg}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'email-otp' && (
        <div className="card max-w-lg">
          <div className="card-body space-y-4">
            <h3 className="font-semibold">Email OTP</h3>
            <p className="text-sm text-gray-500">Receive one-time passwords via email for login verification.</p>
            {status?.emailOtpEnabled ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4" /> Email OTP is enabled
              </div>
            ) : (
              <button onClick={handleEnableEmailOTP} className="btn-primary gap-2"><Mail className="w-4 h-4" /> Enable Email OTP</button>
            )}
          </div>
        </div>
      )}

      {tab === 'backup-codes' && (
        <div className="card max-w-lg">
          <div className="card-body space-y-4">
            <h3 className="font-semibold">Backup Recovery Codes</h3>
            <p className="text-sm text-gray-500">Store these codes in a safe place. Each code can only be used once to recover access to your account.</p>

            {backupCodes.length > 0 ? (
              <>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm space-y-1">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="tracking-wider">{code}</div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={copyCodes} className="btn-secondary btn-sm gap-1"><Copy className="w-3 h-3" /> {codesCopied ? 'Copied!' : 'Copy'}</button>
                  <button onClick={downloadCodes} className="btn-secondary btn-sm gap-1"><Download className="w-3 h-3" /> Download</button>
                  <button onClick={handleGenerateCodes} className="btn-secondary btn-sm gap-1"><RefreshCw className="w-3 h-3" /> Regenerate</button>
                </div>
              </>
            ) : (
              <button onClick={handleGenerateCodes} className="btn-primary gap-2"><Key className="w-4 h-4" /> Generate Backup Codes</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
