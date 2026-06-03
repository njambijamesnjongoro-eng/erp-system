import React, { useState, useEffect } from 'react';
import { securityPhase3Api } from '../../api/securityPhase3';

export function ApiSecurityMonitoring() {
  const [threats, setThreats] = useState([]);
  const [threatStats, setThreatStats] = useState(null);
  const [gateway, setGateway] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [activeTab, setActiveTab] = useState('threats');

  useEffect(() => {
    Promise.all([
      securityPhase3Api.getThreats(),
      securityPhase3Api.getGatewayStats(),
      securityPhase3Api.getBackupLogs(),
    ]).then(([t, g, b]) => {
      setThreats(t.data.data || []);
      setGateway(g.data.data);
      setBackups(b.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const resolveThreat = async (id) => {
    try {
      await securityPhase3Api.resolveThreat(id);
      setThreats(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await securityPhase3Api.createBackup();
      setBackups(prev => [res.data.data, ...prev]);
    } catch (e) { console.error(e); }
    setCreatingBackup(false);
  };

  const handleVerifyBackup = async (id) => {
    try {
      const res = await securityPhase3Api.verifyBackup(id);
      alert(`Backup verification: ${res.data.data.valid ? 'PASSED ✓' : 'FAILED ✗'}`);
    } catch (e) { alert('Verification failed'); }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const tabs = ['threats', 'gateway', 'backups'];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">API Security Monitoring</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm capitalize transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'threats' && <ThreatsPanel threats={threats} onResolve={resolveThreat} stats={null} />}
      {activeTab === 'gateway' && <GatewayPanel gateway={gateway} />}
      {activeTab === 'backups' && (
        <BackupsPanel backups={backups} onCreateBackup={handleCreateBackup}
          onVerify={handleVerifyBackup} creating={creatingBackup} />
      )}
    </div>
  );
}

function ThreatsPanel({ threats, onResolve }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3">Threat Detections</h2>
      {threats.length === 0 ? (
        <p className="text-gray-500 text-sm">No threats detected</p>
      ) : (
        <div className="space-y-2">
          {threats.map(t => (
            <div key={t.id} className={`border-l-4 p-3 rounded text-sm ${
              t.severity === 'critical' ? 'border-red-500 bg-red-900/20' :
              t.severity === 'high' ? 'border-orange-500 bg-orange-900/20' :
              t.severity === 'medium' ? 'border-yellow-500 bg-yellow-900/20' :
              'border-blue-500 bg-blue-900/20'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{t.threat_type}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    t.severity === 'critical' ? 'bg-red-700' :
                    t.severity === 'high' ? 'bg-orange-700' :
                    t.severity === 'medium' ? 'bg-yellow-700' : 'bg-blue-700'
                  }`}>{t.severity}</span>
                  <span className="ml-2 text-gray-400">from {t.ip_address}</span>
                </div>
                {!t.resolved && (
                  <button onClick={() => onResolve(t.id)}
                    className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1 rounded transition-colors">Resolve</button>
                )}
              </div>
              {t.payload_snippet && (
                <pre className="mt-1 text-xs text-gray-400 truncate">{t.payload_snippet}</pre>
              )}
              <div className="mt-1 text-xs text-gray-500">
                {t.endpoint} · {new Date(t.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GatewayPanel({ gateway }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3">API Gateway Stats (24h)</h2>
      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
        <div className="bg-gray-700 rounded p-3 text-center">
          <div className="text-2xl font-bold">{gateway?.requests24h ?? 0}</div>
          <div className="text-gray-400 text-xs">Total Requests</div>
        </div>
        <div className="bg-gray-700 rounded p-3 text-center">
          <div className="text-2xl font-bold">{gateway?.avgResponseTimeMs ?? 0}ms</div>
          <div className="text-gray-400 text-xs">Avg Response Time</div>
        </div>
        <div className="bg-gray-700 rounded p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{gateway?.errors24h ?? 0}</div>
          <div className="text-gray-400 text-xs">Errors (4xx+)</div>
        </div>
      </div>

      {gateway?.topEndpoints?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-300">Top Endpoints</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Path</th><th className="text-right py-2">Requests</th>
              <th className="text-right py-2">Avg (ms)</th>
            </tr></thead>
            <tbody>
              {gateway.topEndpoints.slice(0, 10).map((ep, i) => (
                <tr key={i} className="border-b border-gray-700">
                  <td className="py-1 truncate max-w-md">{ep.path}</td>
                  <td className="text-right">{ep.count}</td>
                  <td className="text-right">{ep.avg_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BackupsPanel({ backups, onCreateBackup, onVerify, creating }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'verifying': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Encrypted Backups</h2>
        <button onClick={onCreateBackup} disabled={creating}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 px-4 py-2 rounded text-sm transition-colors">
          {creating ? 'Creating...' : 'Create Backup'}
        </button>
      </div>

      {backups.length === 0 ? (
        <p className="text-gray-500 text-sm">No backups created yet</p>
      ) : (
        <div className="space-y-2">
          {backups.map(b => (
            <div key={b.id} className="bg-gray-700 rounded p-3 flex justify-between items-center">
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <span>{getStatusIcon(b.status)}</span>
                  <span className="font-medium">{b.backup_type || 'full'}</span>
                  {b.file_size && <span className="text-gray-400">({(b.file_size / 1024 / 1024).toFixed(2)} MB)</span>}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {b.created_at ? new Date(b.created_at).toLocaleString() : ''}
                  {b.created_by_name && ` by ${b.created_by_name}`}
                </div>
              </div>
              <button onClick={() => onVerify(b.id)}
                className="text-xs bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded transition-colors">
                Verify
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
