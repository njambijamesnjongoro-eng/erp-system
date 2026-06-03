import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import { settingsService } from '../../api/admin';

const TAB_GROUPS = [
  {
    key: 'general', label: 'General', fields: [
      { key: 'company_name', label: 'Company Name', type: 'text' },
      { key: 'company_address', label: 'Company Address', type: 'textarea' },
      { key: 'company_phone', label: 'Company Phone', type: 'text' },
      { key: 'company_email', label: 'Company Email', type: 'text' },
      { key: 'company_currency', label: 'Currency', type: 'select', options: ['KES', 'USD', 'EUR'] },
      { key: 'company_timezone', label: 'Timezone', type: 'select', options: ['Africa/Nairobi', 'UTC', 'America/New_York', 'Europe/London'] },
      { key: 'company_date_format', label: 'Date Format', type: 'select', options: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'] },
    ],
  },
  {
    key: 'email', label: 'Email', fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text' },
      { key: 'smtp_port', label: 'SMTP Port', type: 'number' },
      { key: 'smtp_user', label: 'SMTP Username', type: 'text' },
      { key: 'smtp_pass', label: 'SMTP Password', type: 'password' },
      { key: 'smtp_from_email', label: 'From Email', type: 'text' },
      { key: 'smtp_from_name', label: 'From Name', type: 'text' },
    ],
  },
  {
    key: 'security', label: 'Security', fields: [
      { key: 'password_min_length', label: 'Min Password Length', type: 'number' },
      { key: 'password_require_uppercase', label: 'Require Uppercase', type: 'toggle' },
      { key: 'password_require_numbers', label: 'Require Numbers', type: 'toggle' },
      { key: 'password_require_symbols', label: 'Require Symbols', type: 'toggle' },
      { key: 'password_expiry_days', label: 'Password Expiry (days)', type: 'number' },
      { key: 'max_login_attempts', label: 'Max Login Attempts', type: 'number' },
      { key: 'lockout_duration_minutes', label: 'Lockout Duration (min)', type: 'number' },
      { key: 'session_timeout_minutes', label: 'Session Timeout (min)', type: 'number' },
      { key: 'mfa_required', label: 'Require MFA', type: 'toggle' },
    ],
  },
  {
    key: 'backup', label: 'Backup', fields: [
      { key: 'backup_enabled', label: 'Enable Backups', type: 'toggle' },
      { key: 'backup_retention_days', label: 'Retention (days)', type: 'number' },
      { key: 'backup_encryption', label: 'Encrypt Backups', type: 'toggle' },
      { key: 'backup_storage_path', label: 'Storage Path', type: 'text' },
    ],
  },
  {
    key: 'api', label: 'API', fields: [
      { key: 'rate_limit_api', label: 'Rate Limit (req/min)', type: 'number' },
      { key: 'enable_api_logging', label: 'Enable API Logging', type: 'toggle' },
    ],
  },
  {
    key: 'theme', label: 'Theme', fields: [
      { key: 'theme_primary_color', label: 'Primary Color', type: 'color' },
      { key: 'theme_sidebar_color', label: 'Sidebar Color', type: 'color' },
      { key: 'theme_mode', label: 'Theme Mode', type: 'select', options: ['light', 'dark'] },
    ],
  },
];

export function SystemSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const category = activeTab === 'theme' ? 'theme' : activeTab;
      const { data } = await settingsService.getSettings({ category });
      setSettings(data?.data || data || {});
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateSettings({ category: activeTab, settings });
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const currentGroup = TAB_GROUPS.find(g => g.key === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage system-wide configuration</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-1 flex-wrap">
            {TAB_GROUPS.map(group => (
              <button key={group.key} onClick={() => setActiveTab(group.key)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === group.key ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                {group.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : (
            <div className="space-y-5 max-w-2xl">
              {currentGroup?.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1">{field.label}</label>
                  <p className="text-xs text-gray-400 mb-1.5">{field.key}</p>
                  {field.type === 'toggle' ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={!!settings[field.key]} onChange={(e) => updateSetting(field.key, e.target.checked)} />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  ) : field.type === 'select' ? (
                    <select value={settings[field.key] || (field.options && field.options[0]) || ''} onChange={(e) => updateSetting(field.key, e.target.value)} className="input-field w-full">
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea value={settings[field.key] || ''} onChange={(e) => updateSetting(field.key, e.target.value)} className="input-field w-full" rows={3} />
                  ) : field.type === 'color' ? (
                    <div className="flex items-center gap-3">
                      <input type="color" value={settings[field.key] || '#3B82F6'} onChange={(e) => updateSetting(field.key, e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
                      <input type="text" value={settings[field.key] || '#3B82F6'} onChange={(e) => updateSetting(field.key, e.target.value)} className="input-field flex-1 font-mono text-sm" />
                    </div>
                  ) : field.type === 'password' ? (
                    <div className="relative">
                      <input type={showPasswords[field.key] ? 'text' : 'password'} value={settings[field.key] || ''} onChange={(e) => updateSetting(field.key, e.target.value)} className="input-field w-full pr-10" />
                      <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <input type={field.type || 'text'} value={settings[field.key] || ''} onChange={(e) => updateSetting(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)} className="input-field w-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card-footer flex justify-end">
          <button onClick={handleSave} disabled={saving || loading} className="btn-primary gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
