import React, { useState, useEffect } from 'react';
import { infrastructureSecurityApi } from '../../api/infrastructureSecurity';

export function BackupCenter() {
  const [backups, setBackups] = useState({ rows: [], total: 0 });
  const [recoveries, setRecoveries] = useState({ rows: [], total: 0 });
  const [tab, setTab] = useState('backups');

  const load = () => {
    infrastructureSecurityApi.getBackups({ limit: 100 }).then(r => setBackups(r.data.data)).catch(() => {});
    infrastructureSecurityApi.getRecoveryRecords({ limit: 100 }).then(r => setRecoveries(r.data.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const createBackup = () => {
    infrastructureSecurityApi.createBackup({ backupType: 'full', source: '/data/erp', encryptionEnabled: true }).then(load).catch(() => {});
  };

  const verify = (backupId) => {
    infrastructureSecurityApi.verifyBackup(backupId).then(load).catch(() => {});
  };

  const restore = (backupId) => {
    if (window.confirm('Restore from this backup?')) infrastructureSecurityApi.restoreBackup(backupId).then(load).catch(() => {});
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Backup & Recovery Center</h1>
        <button onClick={createBackup} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">Create Backup</button>
      </div>

      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {['backups', 'recovery'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-t text-sm ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'backups' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Backups ({backups.total})</h2>
          <div className="space-y-2">
            {backups.rows.map(b => (
              <div key={b.backup_id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${b.status === 'success' ? 'bg-green-900 text-green-300' : b.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{b.status}</span>
                    <span className="text-sm font-medium capitalize">{b.backup_type}</span>
                    <span className="text-xs text-gray-500">{b.backup_id}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatBytes(b.size_bytes)} ({formatBytes(b.compressed_size)} compressed) • {b.duration_seconds ? `${Math.floor(b.duration_seconds / 60)}m ${b.duration_seconds % 60}s` : '-'} • {b.encryption_enabled ? 'Encrypted' : 'Unencrypted'}
                  </div>
                  <div className="text-xs text-gray-500">{b.source} → {b.target || 'default'}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => verify(b.backup_id)} className="text-xs text-blue-400 hover:text-blue-300">Verify</button>
                  <button onClick={() => restore(b.backup_id)} className="text-xs text-green-400 hover:text-green-300">Restore</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'recovery' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Recovery Records ({recoveries.total})</h2>
          <div className="space-y-2">
            {recoveries.rows.map(r => (
              <div key={r.recovery_id} className="p-3 bg-gray-750 rounded border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'completed' ? 'bg-green-900 text-green-300' : r.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{r.status}</span>
                      <span className="text-sm font-medium">{r.title}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {r.incident_type} • {r.actual_downtime_seconds ? `${Math.floor(r.actual_downtime_seconds / 60)}m downtime` : 'N/A'} • RTO: {r.rto_seconds ? `${r.rto_seconds / 60}m` : 'N/A'}
                    </div>
                    {r.lessons_learned && <div className="text-xs text-gray-400 mt-1">Lessons: {r.lessons_learned}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
