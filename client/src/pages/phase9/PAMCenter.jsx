import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function PAMCenter() {
  const [sessions, setSessions] = useState({ rows: [], total: 0 });
  const [approvals, setApprovals] = useState({ rows: [], total: 0 });
  const [jit, setJit] = useState({ rows: [], total: 0 });
  const [tab, setTab] = useState('sessions');
  const [form, setForm] = useState({ privilegedRole: 'sysadmin', targetSystem: '', targetType: 'server', accessLevel: 'admin', justification: '' });

  const load = () => {
    phase9Api.getPamSessions({ limit: 100 }).then(r => setSessions(r.data.data)).catch(() => {});
    phase9Api.getPamApprovals({ limit: 100 }).then(r => setApprovals(r.data.data)).catch(() => {});
    phase9Api.getJitRequests({ limit: 100 }).then(r => setJit(r.data.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const createSession = (e) => {
    e.preventDefault();
    phase9Api.createPamSession(form).then(() => { setForm({ privilegedRole: 'sysadmin', targetSystem: '', targetType: 'server', accessLevel: 'admin', justification: '' }); load(); }).catch(() => {});
  };

  const terminate = (sessionId) => {
    phase9Api.terminatePamSession(sessionId).then(load).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Privileged Access Management</h1>
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {['sessions', 'approvals', 'jit'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-t text-sm ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Sessions ({sessions.total})</h2>
            {sessions.rows.map(s => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'}`}>{s.status}</span>
                    <span className="text-sm font-medium">{s.user_name}</span>
                    <span className="text-xs text-gray-500">{s.privileged_role}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{s.target_system} ({s.target_type}) • {s.access_level} access</div>
                  {s.justification && <div className="text-xs text-gray-400 mt-1">{s.justification}</div>}
                </div>
                {s.status === 'active' && <button onClick={() => terminate(s.session_id)} className="text-xs text-red-400 hover:text-red-300">Terminate</button>}
              </div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">New Session</h2>
            <form onSubmit={createSession} className="space-y-3">
              <select value={form.privilegedRole} onChange={e => setForm({...form, privilegedRole: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="sysadmin">System Admin</option><option value="security_admin">Security Admin</option><option value="db_admin">Database Admin</option><option value="network_admin">Network Admin</option></select>
              <input value={form.targetSystem} onChange={e => setForm({...form, targetSystem: e.target.value})} placeholder="Target System" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
              <select value={form.targetType} onChange={e => setForm({...form, targetType: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="server">Server</option><option value="database">Database</option><option value="application">Application</option><option value="api">API</option></select>
              <select value={form.accessLevel} onChange={e => setForm({...form, accessLevel: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="read">Read</option><option value="write">Write</option><option value="admin">Admin</option><option value="sysadmin">System Admin</option></select>
              <textarea value={form.justification} onChange={e => setForm({...form, justification: e.target.value})} placeholder="Justification" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" rows={2} required />
              <button type="submit" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm w-full">Start Session</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Access Approvals ({approvals.total})</h2>
          {approvals.rows.map(a => (
            <div key={a.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : a.status === 'approved' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{a.status}</span>
                  <span className="text-sm font-medium">{a.user_name}</span>
                  <span className="text-xs text-gray-500">{a.access_type}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{a.target_system} • {a.urgency} • {a.duration_minutes}m</div>
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => phase9Api.approvePamRequest(a.request_id, { status: 'approved' }).then(load)} className="text-xs text-green-400">Approve</button>
                  <button onClick={() => phase9Api.approvePamRequest(a.request_id, { status: 'denied' }).then(load)} className="text-xs text-red-400">Deny</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'jit' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">JIT Access Requests ({jit.total})</h2>
          <button onClick={() => phase9Api.checkExpiredJit().then(load)} className="mb-3 bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-xs">Check Expired</button>
          {jit.rows.map(j => (
            <div key={j.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${j.status === 'active' ? 'bg-green-900 text-green-300' : j.status === 'expired' ? 'bg-gray-600 text-gray-300' : j.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>{j.status}</span>
                  <span className="text-sm font-medium">{j.user_name}</span>
                  <span className="text-xs text-gray-500">{j.resource_type}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{j.resource_name} • {j.permission_level} • {j.duration_minutes}m</div>
              </div>
              {j.status === 'pending' && <button onClick={() => phase9Api.approveJitRequest(j.request_id).then(load)} className="text-xs text-green-400 hover:text-green-300">Approve</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
