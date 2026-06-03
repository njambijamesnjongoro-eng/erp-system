import React, { useState, useEffect } from 'react';
import { infrastructureSecurityApi } from '../../api/infrastructureSecurity';

export function FirewallCenter() {
  const [rules, setRules] = useState({ rows: [], total: 0 });
  const [logs, setLogs] = useState({ rows: [], total: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [tab, setTab] = useState('rules');
  const [form, setForm] = useState({ serverId: '', direction: 'inbound', action: 'allow', protocol: 'tcp', sourceIp: '', sourcePort: '', destinationIp: '', destinationPort: '', description: '', priority: 100 });
  const [editing, setEditing] = useState(null);

  const load = () => {
    infrastructureSecurityApi.getFirewallRules({ limit: 100 }).then(r => setRules(r.data.data)).catch(() => {});
    infrastructureSecurityApi.getFirewallLogs({ limit: 50 }).then(r => setLogs(r.data.data)).catch(() => {});
    infrastructureSecurityApi.getFirewallAnalytics().then(r => setAnalytics(r.data.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const apiCall = editing
      ? infrastructureSecurityApi.updateFirewallRule(editing, form)
      : infrastructureSecurityApi.createFirewallRule(form);
    apiCall.then(() => { setForm({ serverId: '', direction: 'inbound', action: 'allow', protocol: 'tcp', sourceIp: '', sourcePort: '', destinationIp: '', destinationPort: '', description: '', priority: 100 }); setEditing(null); load(); }).catch(() => {});
  };

  const edit = (rule) => {
    setEditing(rule.rule_id);
    setForm({ serverId: rule.server_id || '', direction: rule.direction, action: rule.action, protocol: rule.protocol, sourceIp: rule.source_ip || '', sourcePort: rule.source_port || '', destinationIp: rule.destination_ip || '', destinationPort: rule.destination_port || '', description: rule.description || '', priority: rule.priority });
  };

  const remove = (ruleId) => {
    infrastructureSecurityApi.deleteFirewallRule(ruleId).then(load).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Firewall Center</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {['rules', 'logs', 'analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-t text-sm ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Rules ({rules.total})</h2>
            <div className="space-y-2">
              {rules.rows.map(r => (
                <div key={r.rule_id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.action === 'allow' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{r.action}</span>
                      <span className="text-sm font-medium">{r.protocol?.toUpperCase()} {r.destination_port || 'any'}</span>
                      <span className="text-xs text-gray-500">{r.direction}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {r.source_ip || 'any'} → {r.destination_ip || 'any'}
                      {r.description && <span className="ml-2">— {r.description}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => edit(r)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => remove(r.rule_id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">{editing ? 'Edit Rule' : 'New Rule'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select value={form.direction} onChange={e => setForm({...form, direction: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select>
              <select value={form.action} onChange={e => setForm({...form, action: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required><option value="allow">Allow</option><option value="deny">Deny</option><option value="reject">Reject</option></select>
              <select value={form.protocol} onChange={e => setForm({...form, protocol: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="tcp">TCP</option><option value="udp">UDP</option><option value="icmp">ICMP</option><option value="any">Any</option></select>
              <input value={form.sourceIp} onChange={e => setForm({...form, sourceIp: e.target.value})} placeholder="Source IP (optional)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
              <input value={form.destinationPort} onChange={e => setForm({...form, destinationPort: e.target.value})} placeholder="Destination Port" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm flex-1">{editing ? 'Update' : 'Add Rule'}</button>
                {editing && <button type="button" onClick={() => { setEditing(null); setForm({ serverId: '', direction: 'inbound', action: 'allow', protocol: 'tcp', sourceIp: '', sourcePort: '', destinationIp: '', destinationPort: '', description: '', priority: 100 }); }} className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded text-sm">Cancel</button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Traffic Logs</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.rows.map(l => (
              <div key={l.id} className="flex justify-between items-center p-2 bg-gray-750 rounded text-xs">
                <span className={`px-1.5 py-0.5 rounded font-medium ${l.action === 'blocked' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{l.action}</span>
                <span className="text-gray-300">{l.source_ip}:{l.source_port}</span>
                <span className="text-gray-500">→</span>
                <span className="text-gray-300">{l.destination_ip}:{l.destination_port}</span>
                <span className="text-gray-500">{l.protocol}</span>
                {l.is_threat && <span className="text-red-400 font-medium">THREAT</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center"><div className="text-2xl font-bold text-red-400">{analytics.totalBlocks}</div><div className="text-xs text-gray-400">Blocked</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-orange-400">{analytics.totalThreats}</div><div className="text-xs text-gray-400">Threats</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-gray-300">{logs.total}</div><div className="text-xs text-gray-400">Total Events</div></div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Top Blocked Sources</h2>
            {analytics.topSources?.map((s, i) => (
              <div key={i} className="flex justify-between py-1 text-sm"><span className="text-gray-300">{s.source_ip}</span><span className="text-gray-500">{s.count}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
