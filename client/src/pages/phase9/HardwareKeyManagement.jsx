import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function HardwareKeyManagement() {
  const [keys, setKeys] = useState({ rows: [], total: 0 });
  const [form, setForm] = useState({ userId: '', keyType: 'yubikey', keySerial: '', keyLabel: '' });

  const load = () => { phase9Api.getHardwareKeys({ limit: 100 }).then(r => setKeys(r.data.data)).catch(() => {}); };

  useEffect(() => { load(); }, []);

  const register = (e) => {
    e.preventDefault();
    phase9Api.registerHardwareKey(form).then(() => { setForm({ userId: '', keyType: 'yubikey', keySerial: '', keyLabel: '' }); load(); }).catch(() => {});
  };

  const revoke = (serial) => {
    phase9Api.revokeHardwareKey(serial).then(load).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Hardware Security Key Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Registered Keys ({keys.total})</h2>
          {keys.rows.map(k => (
            <div key={k.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${k.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{k.is_active ? 'Active' : 'Revoked'}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-900 text-purple-300">{k.key_type}</span>
                  <span className="text-sm font-medium">{k.key_label || k.key_serial}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Serial: {k.key_serial} • {k.is_backup ? 'Backup' : 'Primary'} • Last: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</div>
              </div>
              {k.is_active && <button onClick={() => revoke(k.key_serial)} className="text-xs text-red-400 hover:text-red-300">Revoke</button>}
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Register Key</h2>
          <form onSubmit={register} className="space-y-3">
            <input value={form.userId} onChange={e => setForm({...form, userId: e.target.value})} placeholder="User ID" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <select value={form.keyType} onChange={e => setForm({...form, keyType: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="yubikey">YubiKey</option><option value="fido2">FIDO2</option><option value="smart_card">Smart Card</option><option value="security_token">Security Token</option></select>
            <input value={form.keySerial} onChange={e => setForm({...form, keySerial: e.target.value})} placeholder="Key Serial Number" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <input value={form.keyLabel} onChange={e => setForm({...form, keyLabel: e.target.value})} placeholder="Label (e.g., Work YubiKey)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm w-full">Register Key</button>
          </form>
        </div>
      </div>
    </div>
  );
}
