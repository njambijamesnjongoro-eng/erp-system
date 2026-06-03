import React, { useState, useEffect } from 'react';
import { fileSecurityApi } from '../../api/fileSecurity';

export function FileActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    fileSecurityApi.getAccessLogs({ action: actionFilter || undefined, limit: 100 })
      .then(r => setLogs(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [actionFilter]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">File Activity Logs</h1>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex gap-3">
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="bg-gray-700 px-3 py-1.5 rounded text-sm">
            <option value="">All Actions</option>
            <option value="upload">Upload</option>
            <option value="download">Download</option>
            <option value="preview">Preview</option>
            <option value="view">View</option>
            <option value="share">Share</option>
            <option value="delete">Delete</option>
            <option value="update">Update</option>
            <option value="signed_download">Signed Download</option>
            <option value="shared_access">Shared Access</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No activity logs found</div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-3">Time</th>
              <th className="text-left py-2 px-3">User</th>
              <th className="text-left py-2 px-3">Action</th>
              <th className="text-left py-2 px-3">File</th>
              <th className="text-left py-2 px-3">IP</th>
              <th className="text-left py-2 px-3">Suspicious</th>
            </tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className={`border-b border-gray-700 ${log.is_suspicious ? 'bg-red-900/10' : ''}`}>
                  <td className="py-2 px-3 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-2 px-3">{log.user_name || log.user_id || '-'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      log.action === 'upload' ? 'bg-green-900 text-green-300' :
                      log.action === 'download' || log.action === 'signed_download' ? 'bg-blue-900 text-blue-300' :
                      log.action === 'delete' ? 'bg-red-900 text-red-300' :
                      log.action === 'share' || log.action === 'shared_access' ? 'bg-purple-900 text-purple-300' :
                      'bg-gray-700'
                    }`}>{log.action}</span>
                  </td>
                  <td className="py-2 px-3 truncate max-w-xs">{log.file_name || '-'}</td>
                  <td className="py-2 px-3 text-xs">{log.ip_address || '-'}</td>
                  <td className="py-2 px-3">{log.is_suspicious ? '⚠️' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
