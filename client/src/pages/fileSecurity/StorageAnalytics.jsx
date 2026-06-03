import React, { useState, useEffect } from 'react';
import { fileSecurityApi } from '../../api/fileSecurity';

export function StorageAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fileSecurityApi.getStorageAnalytics().then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading storage analytics...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Storage Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-2xl font-bold">{data?.totalFiles ?? 0}</div>
          <div className="text-sm text-gray-400">Total Files</div>
        </div>
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-2xl font-bold">{formatBytes(data?.totalBytes ?? 0)}</div>
          <div className="text-sm text-gray-400">Storage Used</div>
        </div>
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-2xl font-bold">{formatBytes(data?.diskUsage?.totalSize ?? 0)}</div>
          <div className="text-sm text-gray-400">Encrypted Storage</div>
        </div>
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-2xl font-bold">{data?.diskUsage?.fileCount ?? 0}</div>
          <div className="text-sm text-gray-400">Encrypted Files</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Files by Type</h2>
          {data?.filesByType?.length > 0 ? (
            <div className="space-y-2">
              {data.filesByType.map(t => (
                <div key={t.mime_type} className="flex justify-between text-sm py-1 border-b border-gray-700">
                  <span className="truncate max-w-xs">{t.mime_type}</span>
                  <span>{t.count} files ({formatBytes(t.total_bytes)})</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No data</p>}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Files by Classification</h2>
          {data?.filesByClassification?.length > 0 ? (
            <div className="space-y-2">
              {data.filesByClassification.map(c => (
                <div key={c.classification} className="flex justify-between text-sm py-1 border-b border-gray-700">
                  <span className="capitalize">{c.classification}</span>
                  <span>{c.count} files</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No data</p>}
        </div>
      </div>

      {data?.history?.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Storage History (30 days)</h2>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-gray-700 sticky top-0 bg-gray-800">
                <th className="text-left py-2">Date</th><th className="text-right py-2">Files</th><th className="text-right py-2">Total Size</th>
                <th className="text-right py-2">Uploads</th><th className="text-right py-2">Downloads</th>
              </tr></thead>
              <tbody>
                {data.history.map(h => (
                  <tr key={h.id} className="border-b border-gray-700">
                    <td className="py-1">{h.snapshot_date}</td>
                    <td className="text-right">{h.total_files}</td>
                    <td className="text-right">{formatBytes(h.total_storage_bytes)}</td>
                    <td className="text-right">{h.uploads_today}</td>
                    <td className="text-right">{h.downloads_today}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
