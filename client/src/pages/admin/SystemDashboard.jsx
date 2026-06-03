import { useState, useEffect } from 'react';
import { Activity, Users, Shield, Database, HardDrive, Clock, AlertTriangle, CheckCircle, Server, Cpu, Globe, Download } from 'lucide-react';
import { systemDashboardService, deploymentService, securityService, backupService } from '../../api/admin';
import { formatDate } from '../../utils/helpers';

export function SystemDashboard() {
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [env, setEnv] = useState(null);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [backupInfo, setBackupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [ovRes, stRes, hRes, eRes, secRes, bkRes] = await Promise.all([
          systemDashboardService.getOverview(),
          systemDashboardService.getStats(),
          deploymentService.getHealth(),
          deploymentService.getEnvironment(),
          securityService.getEvents({ limit: 5 }),
          backupService.getStats(),
        ]);
        setOverview(ovRes.data?.data || ovRes.data);
        setStats(stRes.data?.data || stRes.data);
        setHealth(hRes.data?.data || hRes.data);
        setEnv(eRes.data?.data || eRes.data);
        setSecurityEvents(secRes.data?.data || secRes.data || []);
        setBackupInfo(bkRes.data?.data || bkRes.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (error) return <div className="text-red-500 p-4">Error loading system dashboard: {error}</div>;

  const statCards = [
    { label: 'Active Users', value: overview?.active_users ?? stats?.active_users ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Online Now', value: overview?.online_users ?? stats?.online_users ?? 0, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'System Uptime', value: health?.uptime ? `${Math.floor(health.uptime / 3600)}h` : '-', icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Total Sessions', value: stats?.total_sessions ?? 0, icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending Security Events', value: securityEvents.filter(e => e.status !== 'resolved').length, icon: Shield, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const getSeverityBadge = (severity) => {
    const colors = { critical: 'badge-red', high: 'badge-orange', medium: 'badge-amber', low: 'badge-blue', info: 'badge-gray' };
    return <span className={`badge ${colors[severity] || 'badge-gray'}`}>{severity}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Admin control center &amp; system overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card">
              <div className="card-body flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold">Performance</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-600">{health?.avg_response_time ? `${health.avg_response_time}ms` : '-'}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500">Requests / min</p>
                <p className="text-2xl font-bold text-emerald-600">{health?.requests_per_minute ?? stats?.requests_per_min ?? '-'}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">{health?.error_rate != null ? `${(health.error_rate * 100).toFixed(1)}%` : '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">System Info</h3></div>
          <div className="card-body space-y-3 text-sm">
            <div className="flex items-center gap-2"><Server className="w-4 h-4 text-gray-400" /><span>Node: {env?.node_version || '-'}</span></div>
            <div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-gray-400" /><span>Platform: {env?.platform || '-'}</span></div>
            <div className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-gray-400" /><span>Memory: {env?.memory_usage ? `${(env.memory_usage / 1024 / 1024).toFixed(1)} MB` : '-'}</span></div>
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-gray-400" /><span>Arch: {env?.architecture || '-'}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Recent Security Events</h3></div>
          <div className="card-body p-0">
            {securityEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Shield className="w-8 h-8 mb-2" />
                <p className="text-sm">No security events</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Severity</th><th>Title</th><th>Type</th><th>Date</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {securityEvents.map((evt) => (
                      <tr key={evt.id}>
                        <td>{getSeverityBadge(evt.severity)}</td>
                        <td className="max-w-[200px] truncate">{evt.title}</td>
                        <td className="text-sm">{evt.event_type || evt.type}</td>
                        <td className="text-sm text-gray-500">{formatDate(evt.created_at)}</td>
                        <td>{evt.status === 'resolved' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Backup Overview</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Database className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                <p className="text-sm text-gray-500">Last Backup</p>
                <p className="font-semibold">{backupInfo?.last_backup ? formatDate(backupInfo.last_backup) : 'Never'}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Activity className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                <p className="text-sm text-gray-500">Status</p>
                <p className={`font-semibold ${backupInfo?.status === 'healthy' ? 'text-emerald-600' : 'text-red-600'}`}>{backupInfo?.status || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Backups</span>
              <span className="font-semibold">{backupInfo?.total_backups ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
