import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function BiometricManagement() {
  const [profiles, setProfiles] = useState({ rows: [], total: 0 });
  const [form, setForm] = useState({ userId: '', biometricType: 'fingerprint', biometricData: '' });

  const load = () => { phase9Api.getBiometricProfiles({ limit: 100 }).then(r => setProfiles(r.data.data)).catch(() => {}); };

  useEffect(() => { load(); }, []);

  const enroll = (e) => {
    e.preventDefault();
    phase9Api.enrollBiometric(form).then(() => { setForm({ userId: '', biometricType: 'fingerprint', biometricData: '' }); load(); }).catch(() => {});
  };

  const revoke = (userId) => {
    phase9Api.revokeBiometric(userId).then(load).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Biometric Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Enrolled Profiles ({profiles.total})</h2>
          {profiles.rows.map(p => (
            <div key={p.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.enrollment_status === 'enrolled' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{p.enrollment_status}</span>
                  <span className="text-sm font-medium">{p.biometric_type}</span>
                  <span className="text-xs text-gray-500">User: {p.user_id}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Verified: {p.verification_count || 0} times • Last: {p.last_verified_at ? new Date(p.last_verified_at).toLocaleString() : 'Never'}</div>
              </div>
              {p.enrollment_status === 'enrolled' && <button onClick={() => revoke(p.user_id)} className="text-xs text-red-400 hover:text-red-300">Revoke</button>}
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Enroll Biometric</h2>
          <form onSubmit={enroll} className="space-y-3">
            <input value={form.userId} onChange={e => setForm({...form, userId: e.target.value})} placeholder="User ID" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <select value={form.biometricType} onChange={e => setForm({...form, biometricType: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm">
              <option value="fingerprint">Fingerprint</option>
              <option value="facial">Facial Recognition</option>
              <option value="voice">Voice</option>
              <option value="behavioral">Behavioral</option>
            </select>
            <textarea value={form.biometricData} onChange={e => setForm({...form, biometricData: e.target.value})} placeholder="Biometric data (hashed)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" rows={2} required />
            <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm w-full">Enroll</button>
          </form>
        </div>
      </div>
    </div>
  );
}
