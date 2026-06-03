import React, { useState, useEffect } from 'react';
import { socApi } from '../../api/soc';

export function SOCDashboard() {
  const [data, setData] = useState(null);
  const [score, setScore] = useState(null);
  const [feed, setFeed] = useState([]);
  const [feedFilter, setFeedFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      socApi.getDashboard().then(r => setData(r.data.data)).catch(() => {}),
      socApi.getSecurityScore().then(r => setScore(r.data.data)).catch(() => {}),
    ]);
    const iv = setInterval(() => {
      socApi.getLiveFeed().then(r => setFeed(r.data.data)).catch(() => {});
    }, 10000);
    socApi.getLiveFeed().then(r => setFeed(r.data.data)).catch(() => {});
    return () => clearInterval(iv);
  }, []);

  const filteredFeed = feedFilter === 'all' ? feed : feed.filter(e => e.type === feedFilter);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Security Operations Center</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Security Score:</span>
          <div className={`text-xl font-bold ${score?.score >= 70 ? 'text-green-400' : score?.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {score?.score ?? '-'}/100
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Active Users" value={data?.activeUsers} color="blue" />
        <KPI label="Active Sessions" value={data?.activeSessions} color="green" />
        <KPI label="Failed Logins (24h)" value={data?.failedLogins24h} color={data?.failedLogins24h > 10 ? 'red' : 'yellow'} />
        <KPI label="Locked Accounts" value={data?.lockedAccounts} color="red" />
        <KPI label="File Violations" value={data?.fileViolations} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Alerts</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-red-400">Critical: {data?.alerts?.bySeverity?.find(s => s.severity === 'critical')?.count || 0}</span>
            <span className="text-orange-400">High: {data?.alerts?.bySeverity?.find(s => s.severity === 'high')?.count || 0}</span>
            <span className="text-yellow-400">Medium: {data?.alerts?.bySeverity?.find(s => s.severity === 'medium')?.count || 0}</span>
            <span className="text-blue-400">Low: {data?.alerts?.bySeverity?.find(s => s.severity === 'low')?.count || 0}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">{data?.alerts?.last24h || 0} alerts in last 24h · {data?.alerts?.total || 0} total</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Incidents</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-gray-400">Total:</span> {data?.incidents?.total || 0}</div>
            <div><span className="text-gray-400">Open:</span> {data?.incidents?.byStatus?.find(s => s.status === 'open')?.count || 0}</div>
            <div><span className="text-gray-400">Closed:</span> {data?.incidents?.byStatus?.find(s => s.status === 'closed')?.count || 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Attack Events</h2>
          <div className="flex gap-4 text-sm">
            <span>Total: {data?.attacks?.total || 0}</span>
            <span className="text-red-400">Critical: {data?.attacks?.bySeverity?.find(s => s.severity === 'critical')?.count || 0}</span>
            <span className="text-yellow-400">High: {data?.attacks?.bySeverity?.find(s => s.severity === 'high')?.count || 0}</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">User Risk</h2>
          <div className="flex gap-4 text-sm">
            <span>Avg Risk: {data?.riskOverview?.avgRisk ?? '-'}</span>
            <span className="text-red-400">Critical: {data?.riskOverview?.distribution?.find(d => d.risk_level === 'critical')?.count || 0}</span>
            <span className="text-yellow-400">High: {data?.riskOverview?.distribution?.find(d => d.risk_level === 'high')?.count || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Live Security Feed</h2>
          <div className="flex gap-2">
            {['all', 'login', 'alert', 'file_access', 'admin_action'].map(t => (
              <button key={t} onClick={() => setFeedFilter(t)}
                className={`text-xs px-2 py-1 rounded ${feedFilter === t ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{t.replace('_', ' ')}</button>
            ))}
          </div>
        </div>
        <div className="h-64 overflow-y-auto space-y-1 text-sm font-mono">
          {filteredFeed.length === 0 ? <p className="text-gray-500">No recent events</p> :
            filteredFeed.map((e, i) => (
              <div key={i} className="flex gap-2 py-1 border-b border-gray-700">
                <span className="text-xs text-gray-500 w-16">{new Date(e.created_at).toLocaleTimeString()}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  e.type === 'alert' ? 'bg-red-900 text-red-300' :
                  e.type === 'login' ? 'bg-blue-900 text-blue-300' :
                  e.type === 'file_access' ? 'bg-green-900 text-green-300' : 'bg-gray-700'
                }`}>{e.type}</span>
                <span className="truncate">{e.title || e.resource || e.user_info || e.action || e.original_name || e.operation}</span>
                {e.severity && <span className={`ml-auto text-xs ${e.severity === 'critical' ? 'text-red-400' : e.severity === 'high' ? 'text-orange-400' : ''}`}>{e.severity}</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color }) {
  const colors = { blue: 'text-blue-400', green: 'text-green-400', red: 'text-red-400', yellow: 'text-yellow-400', orange: 'text-orange-400' };
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${colors[color] || 'text-white'}`}>{value ?? '-'}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
