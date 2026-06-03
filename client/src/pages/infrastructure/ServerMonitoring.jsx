import React, { useState, useEffect } from 'react';
import { infrastructureSecurityApi } from '../../api/infrastructureSecurity';

export function ServerMonitoring() {
  const [servers, setServers] = useState({ rows: [], total: 0 });
  const [selectedServer, setSelectedServer] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [securityScore, setSecurityScore] = useState(null);

  useEffect(() => { infrastructureSecurityApi.getServers({ limit: 100 }).then(r => setServers(r.data.data)).catch(() => {}); }, []);

  const viewDetails = (serverId) => {
    setSelectedServer(serverId);
    infrastructureSecurityApi.getServerHealth(serverId).then(r => setHealthData(r.data.data)).catch(() => {});
    infrastructureSecurityApi.getServerSecurityScore(serverId).then(r => setSecurityScore(r.data.data)).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Server Monitoring</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Server List */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Servers ({servers.total})</h2>
          <div className="space-y-2">
            {servers.rows.map(s => (
              <div key={s.server_id} onClick={() => viewDetails(s.server_id)} className={`p-3 rounded cursor-pointer transition ${selectedServer === s.server_id ? 'bg-blue-900/50 border border-blue-700' : 'bg-gray-750 hover:bg-gray-700 border border-gray-700'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{s.hostname}</span>
                    <span className="text-xs text-gray-500 ml-2">{s.server_id}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === 'online' ? 'bg-green-900 text-green-300' : s.status === 'offline' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{s.status}</span>
                    <span className="text-xs text-gray-400">{s.environment}</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>CPU: {s.cpu_usage}%</span>
                  <span>MEM: {s.memory_usage}%</span>
                  <span>DISK: {s.disk_usage}%</span>
                  <span>{s.ip_address}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Details</h2>
          {!selectedServer && <p className="text-gray-500 text-sm">Select a server</p>}
          {healthData?.server && (
            <div className="space-y-3">
              <div className="text-sm"><span className="text-gray-400">Type:</span> {healthData.server.server_type}</div>
              <div className="text-sm"><span className="text-gray-400">OS:</span> {healthData.server.os}</div>
              <div className="text-sm"><span className="text-gray-400">Provider:</span> {healthData.server.provider}</div>
              <div className="text-sm"><span className="text-gray-400">Region:</span> {healthData.server.region}</div>
              <div className="text-sm"><span className="text-gray-400">CPU:</span> {healthData.server.cpu_cores} cores</div>
              <div className="text-sm"><span className="text-gray-400">RAM:</span> {healthData.server.ram_gb} GB</div>
              <div className="text-sm"><span className="text-gray-400">Disk:</span> {healthData.server.disk_gb} GB</div>
              
              {securityScore && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h3 className="font-medium mb-2">Security Score: <span className="text-blue-400">{securityScore.securityScore}</span></h3>
                  {Object.entries(securityScore.checks).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-sm py-1">
                      <span className="text-gray-400">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={val ? 'text-green-400' : 'text-red-400'}>{val ? 'PASS' : 'FAIL'}</span>
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 mt-2">{securityScore.passedCount}/{securityScore.totalChecks} checks passed</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
