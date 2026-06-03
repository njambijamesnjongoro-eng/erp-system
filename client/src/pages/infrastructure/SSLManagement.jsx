import React, { useState, useEffect } from 'react';
import { infrastructureSecurityApi } from '../../api/infrastructureSecurity';

export function SSLManagement() {
  const [certs, setCerts] = useState({ rows: [], total: 0 });
  const [form, setForm] = useState({ domain: '', issuer: 'Let\'s Encrypt', algorithm: 'RSA', keySize: 2048, expiresAt: '', autoRenew: true });

  const load = () => { infrastructureSecurityApi.getCertificates({ limit: 100 }).then(r => setCerts(r.data.data)).catch(() => {}); };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    infrastructureSecurityApi.createCertificate({ ...form, expiresAt: new Date(form.expiresAt).toISOString() }).then(() => {
      setForm({ domain: '', issuer: 'Let\'s Encrypt', algorithm: 'RSA', keySize: 2048, expiresAt: '', autoRenew: true });
      load();
    }).catch(() => {});
  };

  const renew = (certId) => {
    infrastructureSecurityApi.renewCertificate(certId).then(load).catch(() => {});
  };

  const checkExpiry = () => {
    infrastructureSecurityApi.checkCertificateExpiry().then(load).catch(() => {});
  };

  const daysUntil = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SSL Certificate Management</h1>
        <button onClick={checkExpiry} className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-sm">Check Expiry</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Certificates ({certs.total})</h2>
          <div className="space-y-2">
            {certs.rows.map(c => {
              const days = daysUntil(c.expires_at);
              return (
                <div key={c.cert_id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{c.status}</span>
                      <span className="text-sm font-medium">{c.domain}</span>
                      <span className="text-xs text-gray-500">{c.issuer}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {c.algorithm} {c.key_size}bit • {c.tls_version} • Expires: {new Date(c.expires_at).toLocaleDateString()}
                      <span className={`ml-2 font-medium ${days < 30 ? 'text-red-400' : days < 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {days > 0 ? `${days} days` : 'EXPIRED'}
                      </span>
                    </div>
                    {c.cipher_suites?.length > 0 && <div className="text-xs text-gray-600 mt-0.5">{c.cipher_suites.slice(0, 2).join(', ')}{c.cipher_suites.length > 2 ? '...' : ''}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => renew(c.cert_id)} className="text-xs text-blue-400 hover:text-blue-300">Renew</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Add Certificate</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} placeholder="Domain (e.g., example.com)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <select value={form.issuer} onChange={e => setForm({...form, issuer: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="Let's Encrypt">Let's Encrypt</option><option value="DigiCert">DigiCert</option><option value="GlobalSign">GlobalSign</option><option value="Sectigo">Sectigo</option></select>
            <div className="flex gap-2">
              <select value={form.algorithm} onChange={e => setForm({...form, algorithm: e.target.value})} className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm"><option value="RSA">RSA</option><option value="ECDSA">ECDSA</option></select>
              <select value={form.keySize} onChange={e => setForm({...form, keySize: parseInt(e.target.value)})} className="bg-gray-700 rounded px-3 py-2 text-sm"><option value={2048}>2048</option><option value={4096}>4096</option><option value={256}>256 (ECDSA)</option></select>
            </div>
            <label className="block text-sm">
              <span className="text-gray-400">Expires At</span>
              <input value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})} type="date" className="w-full bg-gray-700 rounded px-3 py-2 text-sm mt-1" required />
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.autoRenew} onChange={e => setForm({...form, autoRenew: e.target.checked})} /> Auto-Renew</label>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm w-full">Add Certificate</button>
          </form>
        </div>
      </div>
    </div>
  );
}
