import React, { useState, useEffect } from 'react';
import { securityPhase3Api } from '../../api/securityPhase3';

const STATUS_ICONS = { healthy: '✅', warning: '⚠️', critical: '🔴' };

export function InfrastructureDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      securityPhase3Api.getDashboard(),
      securityPhase3Api.getHealth(),
      securityPhase3Api.getOverview(),
    ]).then(([d, h, o]) => {
      setDashboard(d.data.data);
      setHealth(h.data.data);
      setOverview(o.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading security dashboard...</div>;
  if (!dashboard) return <div className="p-6 text-red-500">Failed to load dashboard data</div>;

  const { gateway, threats, audit, system, database, performance, rateLimits } = dashboard;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Security Infrastructure Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={overview?.totalUsers ?? '-'} />
        <StatCard label="Active Sessions" value={overview?.activeSessions ?? '-'} />
        <StatCard label="Locked Accounts" value={overview?.lockedAccounts ?? '-'} />
        <StatCard label="MFA Enabled" value={overview?.mfaEnabled ?? '-'} />
      </div>

      {/* System Health */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">System Health {STATUS_ICONS[system?.status] || '❓'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">CPU:</span> {system?.cpu?.usagePercent?.toFixed(1) ?? '-'}%</div>
          <div><span className="text-gray-400">Memory:</span> {system?.memory?.usagePercent?.toFixed(1) ?? '-'}%</div>
          <div><span className="text-gray-400">Uptime:</span> {system?.uptime ? `${Math.floor(system.uptime / 3600)}h` : '-'}</div>
          <div><span className="text-gray-400">Status:</span> {system?.status ?? '-'}</div>
        </div>
      </div>

      {/* Database Health */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Database Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">Response:</span> {database?.responseTimeMs?.toFixed(0) ?? '-'}ms</div>
          <div><span className="text-gray-400">Connections:</span> {database?.activeConnections ?? '-'}</div>
          <div><span className="text-gray-400">Status:</span> {database?.status ?? '-'}</div>
        </div>
      </div>

      {/* Gateway */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">API Gateway (24h)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">Requests:</span> {gateway?.requests24h ?? '-'}</div>
          <div><span className="text-gray-400">Avg Response:</span> {gateway?.avgResponseTimeMs ?? '-'}ms</div>
          <div><span className="text-gray-400">Errors (4xx+):</span> {gateway?.errors24h ?? '-'}</div>
        </div>
      </div>

      {/* Threats */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Threat Detection</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">Total Threats:</span> {threats?.total ?? 0}</div>
          <div><span className="text-gray-400">Critical:</span> {threats?.severityCounts?.critical ?? 0}</div>
          <div><span className="text-gray-400">High:</span> {threats?.severityCounts?.high ?? 0}</div>
          <div><span className="text-gray-400">Medium:</span> {threats?.severityCounts?.medium ?? 0}</div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Most common: {threats?.mostCommon?.type ?? 'N/A'} ({threats?.mostCommon?.count ?? 0})
        </p>
      </div>

      {/* Performance */}
      <PerformanceTable performance={performance} />

      {/* Top Endpoints */}
      {gateway?.topEndpoints?.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Top Endpoints (24h)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">Path</th><th className="text-right py-2">Requests</th><th className="text-right py-2">Avg (ms)</th>
              </tr></thead>
              <tbody>
                {gateway.topEndpoints.map((ep, i) => (
                  <tr key={i} className="border-b border-gray-700">
                    <td className="py-1 truncate max-w-xs">{ep.path}</td>
                    <td className="text-right">{ep.count}</td>
                    <td className="text-right">{ep.avg_ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rate Limit Stats */}
      {rateLimits && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Rate Limiter Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-400">IPs Tracked:</span> {rateLimits.totalTracked ?? 0}</div>
            <div><span className="text-gray-400">Blacklisted IPs:</span> {rateLimits.blacklistedIPs ?? 0}</div>
            <div><span className="text-gray-400">Rate-Limited:</span> {rateLimits.currentlyLimited ?? 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, } ) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function PerformanceTable({ performance }) {
  if (!performance?.hourlyStats?.length) return null;
  const h = performance.hourlyStats;
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3">Hourly Performance (Last 24h)</h2>
      <div className="overflow-x-auto max-h-48 overflow-y-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700 sticky top-0 bg-gray-800">
            <th className="text-left py-2">Hour</th><th className="text-right py-2">Requests</th>
            <th className="text-right py-2">Avg (ms)</th><th className="text-right py-2">Errors</th>
          </tr></thead>
          <tbody>
            {h.map((row, i) => (
              <tr key={i} className="border-b border-gray-700">
                <td className="py-1">{new Date(row.hour).toLocaleTimeString()}</td>
                <td className="text-right">{row.count}</td>
                <td className="text-right">{row.avg_ms ?? '-'}</td>
                <td className="text-right">{row.error_count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
