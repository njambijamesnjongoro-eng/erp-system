import React, { useState, useEffect } from 'react';
import { infrastructureSecurityApi } from '../../api/infrastructureSecurity';

export function InfrastructureDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { infrastructureSecurityApi.getDashboard().then(r => setData(r.data.data)).catch(() => {}); }, []);

  if (!data) return <div className="p-6 text-gray-400">Loading Infrastructure Dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Infrastructure Security Dashboard</h1>

      {/* Infra Score */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg p-6 text-center">
        <div className="text-5xl font-bold text-white">{data.infraScore || 0}</div>
        <div className="text-sm text-blue-300 mt-1">Infrastructure Security Score</div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{data.servers?.online || 0}</div>
          <div className="text-sm text-gray-400">{data.servers?.total || 0} Servers</div>
          <div className="text-xs text-gray-500">{data.servers?.offline || 0} offline</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-cyan-400">{data.containers?.running || 0}</div>
          <div className="text-sm text-gray-400">{data.containers?.total || 0} Containers</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-400">{data.alerts?.critical || 0}</div>
          <div className="text-sm text-gray-400">{data.alerts?.total || 0} Open Alerts</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{data.vulnerabilities?.critical || 0}</div>
          <div className="text-sm text-gray-400">{data.vulnerabilities?.total || 0} Vulnerabilities</div>
        </div>
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{data.ssl?.expiring || 0}</div>
          <div className="text-sm text-gray-400">{data.ssl?.total || 0} SSL Expiring</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{data.backups?.successful || 0}</div>
          <div className="text-sm text-gray-400">{data.backups?.total || 0} Backups</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{data.incidents?.active || 0}</div>
          <div className="text-sm text-gray-400">{data.incidents?.total || 0} Incidents</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{data.avgHealthScore || 0}</div>
          <div className="text-sm text-gray-400">Avg Health Score</div>
        </div>
      </div>

      {/* Recent Alerts + Deployments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Alerts</h2>
          {data.recentAlerts?.length === 0 && <p className="text-gray-500 text-sm">No alerts</p>}
          {data.recentAlerts?.map(a => (
            <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
              <div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.severity === 'critical' ? 'bg-red-900 text-red-300' : a.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{a.severity}</span>
                <span className="ml-2 text-sm">{a.title}</span>
              </div>
              <span className={`text-xs ${a.status === 'open' ? 'text-green-400' : 'text-gray-500'}`}>{a.status}</span>
            </div>
          ))}
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Deployments</h2>
          {data.recentDeployments?.length === 0 && <p className="text-gray-500 text-sm">No deployments</p>}
          {data.recentDeployments?.map(d => (
            <div key={d.id} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
              <div>
                <span className="text-sm font-medium">{d.application}</span>
                <span className="text-xs text-gray-500 ml-2">v{d.version}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.status === 'success' ? 'bg-green-900 text-green-300' : d.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{d.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
