import { useState, useEffect } from 'react';
import { Activity, Server, Cpu, HardDrive, Globe, Database, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { deploymentService } from '../../api/admin';
import { formatDate } from '../../utils/helpers';

export function DeploymentStatus() {
  const [health, setHealth] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [env, setEnv] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hRes, pRes, eRes, sRes] = await Promise.all([
          deploymentService.getHealth(),
          deploymentService.getPerformance(),
          deploymentService.getEnvironment(),
          deploymentService.getStorage(),
        ]);
        setHealth(hRes.data?.data || hRes.data);
        const perf = pRes.data?.data || pRes.data || {};
        setPerformance(Array.isArray(perf) ? perf : (perf.by_endpoint || perf.hourly || []));
        setEnv(eRes.data?.data || eRes.data);
        setStorage(sRes.data?.data || sRes.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const formatUptime = (seconds) => {
    if (!seconds) return '-';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes == null) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const healthCards = [
    {
      label: 'Server Status', value: health?.status || (health?.uptime ? 'Running' : 'Unknown'),
      icon: Server, color: health?.status === 'healthy' || health?.status === 'running' || health?.server_uptime_seconds ? 'text-emerald-600' : 'text-red-600',
      bg: health?.status === 'healthy' || health?.status === 'running' || health?.server_uptime_seconds ? 'bg-emerald-50' : 'bg-red-50',
      dot: health?.status === 'healthy' || health?.status === 'running' || health?.server_uptime_seconds ? 'bg-emerald-500' : 'bg-red-500',
    },
    {
      label: 'Database Connection', value: health?.database === 'connected' || health?.database_status === 'connected' ? 'Connected' : 'Disconnected',
      icon: Database, color: health?.database === 'connected' || health?.database_status === 'connected' ? 'text-emerald-600' : 'text-red-600',
      bg: health?.database === 'connected' || health?.database_status === 'connected' ? 'bg-emerald-50' : 'bg-red-50',
    },
    { label: 'Uptime', value: formatUptime(health?.server_uptime_seconds || health?.uptime), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    {
      label: 'Memory Usage', value: health?.memory?.heap_used_mb != null ? `${health.memory.heap_used_mb} MB` : (health?.memory_usage != null ? `${(health.memory_usage).toFixed(1)}%` : '-'),
      icon: Cpu, color: (health?.memory_usage || 0) > 80 ? 'text-red-600' : 'text-amber-600',
      bg: (health?.memory_usage || 0) > 80 ? 'bg-red-50' : 'bg-amber-50',
      bar: health?.memory_usage != null ? health.memory_usage : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deployment Status</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">System health, performance metrics, and environment info</p>
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
                  <div className="flex items-center gap-2">
                    {card.dot && <span className={`w-2 h-2 rounded-full ${card.dot}`} />}
                    <p className="text-sm text-gray-500">{card.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  {card.bar != null && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(card.bar, 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Performance Metrics</h3></div>
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
                        <td className="font-mono text-sm max-w-[200px] truncate">{p.endpoint || p.path || '-'}</td>
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
          <div className="card-header"><h3 className="font-semibold">Environment</h3></div>
          <div className="card-body">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Server className="w-5 h-5 text-gray-400" />
                <div><p className="font-medium">Node Version</p><p className="text-gray-500">{env?.node_version || '-'}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Globe className="w-5 h-5 text-gray-400" />
                <div><p className="font-medium">Platform</p><p className="text-gray-500">{env?.platform || '-'}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Cpu className="w-5 h-5 text-gray-400" />
                <div><p className="font-medium">Architecture</p><p className="text-gray-500">{env?.architecture || env?.arch || '-'}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Cpu className="w-5 h-5 text-gray-400" />
                <div><p className="font-medium">CPU Cores</p><p className="text-gray-500">{env?.cpu_cores ?? (env?.cpus ?? '-')}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <HardDrive className="w-5 h-5 text-gray-400" />
                <div><p className="font-medium">Total Memory</p><p className="text-gray-500">{env?.total_memory ? formatBytes(env.total_memory) : env?.total_memory_mb ? `${env.total_memory_mb} MB` : '-'}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Storage</h3></div>
        <div className="card-body">
          {!storage ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <HardDrive className="w-8 h-8 mb-2" />
              <p className="text-sm">Storage information not available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <HardDrive className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-blue-600">{formatBytes(storage.total)}</p>
              </div>
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Database className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <p className="text-sm text-gray-500">Used</p>
                <p className="text-xl font-bold text-amber-600">{formatBytes(storage.used ?? storage.disk_size_bytes ?? storage.db_size_bytes)}</p>
              </div>
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm text-gray-500">Free</p>
                <p className="text-xl font-bold text-emerald-600">{formatBytes(storage.free)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
