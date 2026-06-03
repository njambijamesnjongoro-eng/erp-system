import React, { useState, useEffect } from 'react';
import { fileSecurityApi } from '../../api/fileSecurity';

export function FileSecurityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fileSecurityApi.getDashboard().then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading file security dashboard...</div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">File Security Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Files" value={data.fileStats?.total ?? 0} />
        <StatCard label="Storage Used" value={formatBytes(data.fileStats?.total_bytes ?? 0)} />
        <StatCard label="DLP Alerts" value={data.dlp?.unresolvedCritical ?? 0} warning />
        <StatCard label="Malware Detected" value={data.scanStats?.infected ?? 0} danger />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Uploads</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.recentUploads?.length ? data.recentUploads.map(f => (
              <div key={f.id} className="flex justify-between text-sm py-1 border-b border-gray-700">
                <span className="truncate max-w-xs">{f.original_name}</span>
                <span className="text-gray-400 text-xs">{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
            )) : <p className="text-gray-500 text-sm">No recent uploads</p>}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Access</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.recentAccess?.length ? data.recentAccess.slice(0, 10).map(a => (
              <div key={a.id} className="flex justify-between text-sm py-1 border-b border-gray-700">
                <span><span className="text-blue-400">{a.action}</span> — {a.file_name || 'N/A'}</span>
                <span className="text-gray-400 text-xs">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            )) : <p className="text-gray-500 text-sm">No recent access</p>}
          </div>
        </div>
      </div>

      {data.dlp?.byType?.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">DLP Alerts by Type</h2>
          <div className="flex gap-4 text-sm">
            {data.dlp.byType.map(t => (
              <div key={t.alert_type} className="bg-gray-700 px-3 py-2 rounded">
                <span className="font-medium">{t.alert_type}</span>: {t.count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, warning, danger }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-4 text-center ${warning ? 'border border-yellow-500' : ''} ${danger ? 'border border-red-500' : ''}`}>
      <div className={`text-2xl font-bold ${danger ? 'text-red-400' : warning ? 'text-yellow-400' : ''}`}>{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
