import React, { useState, useEffect } from 'react';
import { socApi } from '../../api/soc';

export function ThreatIntelligenceCenter() {
  const [iocs, setIocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ iocType: 'ip', value: '', threatType: 'malware', severity: 'medium', description: '' });

  useEffect(() => { fetchIocs(); }, []);

  const fetchIocs = () => {
    setLoading(true);
    socApi.getIOCs().then(r => setIocs(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    await socApi.createIOC(form);
    setShowForm(false);
    setForm({ iocType: 'ip', value: '', threatType: 'malware', severity: 'medium', description: '' });
    fetchIocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this IOC?')) return;
    await socApi.deleteIOC(id);
    fetchIocs();
  };

  const toggleActive = async (ioc) => {
    await socApi.updateIOC(ioc.id, { isActive: !ioc.is_active });
    fetchIocs();
  };

  const severityColor = (s) => {
    const map = { critical: 'bg-red-900 text-red-300', high: 'bg-orange-900 text-orange-300', medium: 'bg-yellow-900 text-yellow-300', low: 'bg-blue-900 text-blue-300' };
    return map[s] || 'bg-gray-700';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Threat Intelligence Center</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">{showForm ? 'Cancel' : 'Add IOC'}</button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.iocType} onChange={e => setForm(p => ({ ...p, iocType: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              <option value="ip">IP Address</option><option value="domain">Domain</option><option value="url">URL</option><option value="hash">File Hash</option><option value="email">Email</option>
              <option value="pattern">Behavioral Pattern</option>
            </select>
            <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="IOC value (IP, domain, hash...)" className="bg-gray-700 px-3 py-2 rounded text-sm" />
            <select value={form.threatType} onChange={e => setForm(p => ({ ...p, threatType: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              <option value="malware">Malware</option><option value="phishing">Phishing</option><option value="brute-force">Brute Force</option>
              <option value="credential-stuffing">Credential Stuffing</option><option value="data-exfiltration">Data Exfiltration</option>
              <option value="suspicious-behavior">Suspicious Behavior</option>
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description & context" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" rows={3} />
          <button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">Add IOC</button>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4">
        {loading ? <p className="text-gray-500 text-center py-4">Loading...</p> : iocs.length === 0 ? <p className="text-gray-500 text-center py-4">No threat intelligence indicators</p> : (
          <div className="space-y-2">
            {iocs.map(ioc => (
              <div key={ioc.id} className="bg-gray-700 rounded p-3 text-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${severityColor(ioc.severity)}`}>{ioc.severity}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-600">{ioc.ioc_type}</span>
                  <span className="font-mono">{ioc.value}</span>
                  <span className="text-xs text-gray-400">{ioc.threat_type}</span>
                  <span className={`text-xs ${ioc.is_active ? 'text-green-400' : 'text-red-400'}`}>{ioc.is_active ? 'Active' : 'Inactive'}</span>
                  {ioc.source && <span className="text-xs text-gray-500">{ioc.source}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(ioc)} className={`text-xs px-2 py-1 rounded ${ioc.is_active ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-green-700 hover:bg-green-600'}`}>{ioc.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => handleDelete(ioc.id)} className="text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
