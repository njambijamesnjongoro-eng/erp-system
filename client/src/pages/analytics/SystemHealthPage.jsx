import { useState, useEffect } from 'react';
import { Activity, Users, Clock, AlertTriangle, Server, Cpu, HardDrive, Globe, Database, CheckCircle } from 'lucide-react';
import { systemMonitorService } from '../../api/analytics';
import { formatDate } from '../../utils/helpers';

export function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [errors, setErrors] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hRes, pRes, eRes, uRes] = await Promise.all([
          systemMonitorService.getHealth(),
          systemMonitorService.getPerformance(),
          systemMonitorService.getErrors({ limit: 20 }),
          systemMonitorService.getActiveUsers(),
        ]);
        setHealth(hRes.data?.data || hRes.data);
        const perf = pRes.data?.data || pRes.data;
        setPerformance(Array.isArray(perf) ? perf : (perf?.byEndpoint || []));
        setErrors(eRes.data?.data || eRes.data || []);
        const au = uRes.data?.data || uRes.data;
        setActiveUsers(Array.isArray(au) ? au : (au?.users || []));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const healthCards = [
    { label: 'Database', value: health?.database === 'connected' ? 'Connected' : 'Disconnected', icon: Database, color: health?.database === 'connected' ? 'text-emerald-600' : 'text-red-600', bg: health?.database === 'connected' ? 'bg-emerald-50' : 'bg-red-50' },
    { label: 'Active Users', value: health?.activeUsers ?? 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Response (24h)', value: health?.avgResponseTime24h != null ? `${health.avgResponseTime24h}ms` : '-', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Error Rate (24h)', value: health?.errorRate?.error_rate != null ? `${health.errorRate.error_rate}%` : '-', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor system performance, errors, and user activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card">
              <div className="card-body flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  {card.sub && <span className="text-xs text-gray-400 mt-1">{card.sub}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Performance</h3></div>
          <div className="card-body p-0">
            {performance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Activity className="w-8 h-8 mb-2" />
                <p className="text-sm">No performance data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Endpoint</th><th>Method</th><th>Avg Response</th><th>Requests</th><th>Errors</th></tr>
                  </thead>
                  <tbody>
                    {performance.map((p, i) => (
                      <tr key={p.id || i}>
                        <td className="font-mono text-sm max-w-[200px] truncate">{p.endpoint || p.path}</td>
                        <td><span className="badge badge-info">{p.method || 'GET'}</span></td>
                        <td className="text-sm">{p.avg_response_time != null ? `${p.avg_response_time}ms` : '-'}</td>
                        <td className="text-sm">{p.request_count ?? 0}</td>
                        <td className="text-sm text-red-500">{p.error_count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Recent Errors</h3></div>
          <div className="card-body p-0">
            {errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CheckCircle className="w-8 h-8 mb-2 text-emerald-400" />
                <p className="text-sm">No recent errors</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Level</th><th>Message</th><th>Source</th><th>Timestamp</th></tr>
                  </thead>
                  <tbody>
                    {errors.map((err, i) => (
                      <tr key={err.id || i}>
                        <td>
                          <span className={`badge ${err.level === 'error' ? 'badge-red' : err.level === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                            {err.level || 'error'}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate font-medium">{err.message}</td>
                        <td className="text-sm text-gray-500">{err.source || err.service || '-'}</td>
                        <td className="text-sm text-gray-500">{formatDate(err.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">Active Users</h3>
          <span className="text-sm text-gray-400">{activeUsers.length} online</span>
        </div>
        <div className="card-body p-0">
          {activeUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">No active users</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {activeUsers.map((u, i) => (
                <div key={u.id || i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.user_name || u.name || u.email || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">Last active: {u.last_activity ? formatDate(u.last_activity) : 'Just now'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
