import { useState, useEffect } from 'react';
import { Search, Download, Shield, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { auditService } from '../../api/admin';
import { formatDateTime, classNames } from '../../utils/helpers';

export function AuditViewer() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filters, setFilters] = useState({ user: '', action: '', entity_type: '', date_from: '', date_to: '' });

  const load = async (p = page) => {
    setLoading(true);
    try {
      const [logRes, sumRes] = await Promise.all([
        auditService.getLogs({ page: p, limit: 20, ...filters }),
        auditService.getSummary(),
      ]);
      setLogs(logRes.data?.data || logRes.data || []);
      setTotalPages(logRes.data?.pagination?.totalPages || logRes.data?.totalPages || 1);
      setSummary(sumRes.data?.data || sumRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const handleExport = async () => {
    try {
      await auditService.exportLogs(filters);
    } catch (err) { alert(err.message); }
  };

  const handleVerify = async () => {
    try {
      const { data } = await auditService.verifyIntegrity();
      alert(data?.message || 'Integrity verified successfully');
    } catch (err) { alert(err.message); }
  };

  const summaryCards = [
    { label: 'Total Entries', value: summary?.total_entries ?? logs.length, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Created', value: summary?.create_count ?? logs.filter(l => l.action === 'create').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Updated', value: summary?.update_count ?? logs.filter(l => l.action === 'update').length, icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Deleted', value: summary?.delete_count ?? logs.filter(l => l.action === 'delete').length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Viewer</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">System audit trail with integrity verification</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary btn-sm gap-1"><Download className="w-4 h-4" /> Export</button>
          <button onClick={handleVerify} className="btn-primary btn-sm gap-1"><Shield className="w-4 h-4" /> Verify Integrity</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
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

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="User..." value={filters.user} onChange={(e) => setFilters({...filters, user: e.target.value})} className="input-field pl-10 w-full text-sm" />
            </div>
            <select value={filters.action} onChange={(e) => setFilters({...filters, action: e.target.value})} className="input-field text-sm">
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
            <select value={filters.entity_type} onChange={(e) => setFilters({...filters, entity_type: e.target.value})} className="input-field text-sm">
              <option value="">All Entities</option>
              <option value="employee">Employee</option>
              <option value="user">User</option>
              <option value="asset">Asset</option>
              <option value="procurement">Procurement</option>
              <option value="finance">Finance</option>
            </select>
            <input type="date" value={filters.date_from} onChange={(e) => setFilters({...filters, date_from: e.target.value})} className="input-field text-sm" />
            <input type="date" value={filters.date_to} onChange={(e) => setFilters({...filters, date_to: e.target.value})} className="input-field text-sm" />
            <button onClick={() => load(1)} className="btn-primary btn-sm">Search</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity Type</th><th>Entity ID</th><th>Description</th><th>IP Address</th><th></th></tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <>
                      <tr key={log.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                        <td className="text-sm text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                        <td className="font-medium text-sm">{log.user_name || log.user || '-'}</td>
                        <td><span className={`badge ${log.action === 'create' ? 'badge-success' : log.action === 'update' ? 'badge-warning' : log.action === 'delete' ? 'badge-red' : 'badge-info'}`}>{log.action}</span></td>
                        <td className="text-sm">{log.entity_type || '-'}</td>
                        <td className="font-mono text-sm">{log.entity_id ? String(log.entity_id).slice(0, 8) : '-'}</td>
                        <td className="text-sm max-w-[200px] truncate">{log.description || '-'}</td>
                        <td className="font-mono text-sm text-gray-400">{log.ip_address || '-'}</td>
                        <td>{expandedRow === log.id ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}</td>
                      </tr>
                      {expandedRow === log.id && (
                        <tr key={`${log.id}-expanded`}>
                          <td colSpan={8} className="bg-gray-50 dark:bg-gray-800 p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Old Values</p>
                                <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(log.old_values || log.old_data || {}, null, 2)}</pre>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">New Values</p>
                                <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(log.new_values || log.new_data || {}, null, 2)}</pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm disabled:opacity-50">Previous</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
