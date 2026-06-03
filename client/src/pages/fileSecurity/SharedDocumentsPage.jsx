import React, { useState, useEffect } from 'react';
import { fileSecurityApi } from '../../api/fileSecurity';

export function SharedDocumentsPage() {
  const [shares, setShares] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fileSecurityApi.getMyShares().then(r => setShares(r.data.data)).catch(() => {});
    fileSecurityApi.getShareAnalytics().then(r => setAnalytics(r.data.data)).catch(() => {});
  }, []);

  const handleRevoke = async (shareId) => {
    await fileSecurityApi.revokeShare(shareId);
    setShares(prev => prev.map(s => s.id === shareId ? { ...s, is_revoked: true } : s));
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Shared Documents</h1>
      {analytics && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold">{analytics.stats?.total_shares || 0}</div><div className="text-xs text-gray-400">Total Shares</div></div>
          <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold">{analytics.stats?.total_accesses || 0}</div><div className="text-xs text-gray-400">Total Accesses</div></div>
          <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold text-yellow-400">{analytics.stats?.expired || 0}</div><div className="text-xs text-gray-400">Expired</div></div>
          <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold text-red-400">{analytics.stats?.revoked || 0}</div><div className="text-xs text-gray-400">Revoked</div></div>
        </div>
      )}
      <div className="bg-gray-800 rounded-lg p-4">
        {shares.length === 0 ? (
          <p className="text-gray-500 text-sm">No shared documents</p>
        ) : (
          <div className="space-y-2">
            {shares.map(s => (
              <div key={s.id} className="bg-gray-700 rounded p-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium">{s.file_name || 'Unknown file'}</p>
                  <p className="text-xs text-gray-400">Shared {s.shared_with_user ? 'with user' : 'via email'} · {s.access_level} · Expires {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : 'Never'} · {s.access_count} accesses</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${s.is_revoked ? 'bg-red-900 text-red-300' : s.expires_at && new Date(s.expires_at) < new Date() ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{s.is_revoked ? 'Revoked' : 'Active'}</span>
                  {!s.is_revoked && <button onClick={() => handleRevoke(s.id)} className="text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded">Revoke</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
