import { useState, useEffect } from 'react';
import { Activity, Shield, AlertTriangle, Search, Download, Filter, Eye, User, Clock } from 'lucide-react';
import { auditLogService } from '../../api/analytics';
import { formatDate } from '../../utils/helpers';

const LEVEL_BADGES = { info: 'badge-info', warn: 'badge-warning', error: 'badge-red', debug: 'badge-gray' };
const COMPLIANCE_STATUS = { compliant: 'badge-success', non_compliant: 'badge-red', pending: 'badge-warning', expired: 'badge-gray' };

export function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState('activity');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [activityFeed, setActivityFeed] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [complianceRecords, setComplianceRecords] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);

  const [filters, setFilters] = useState({ user: '', action_type: '', date_from: '', date_to: '', level: '', source: '', type: '', status: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'activity') {
        const { data } = await auditLogService.getActivityFeed({ page, limit: 20, ...filters });
        setActivityFeed(data.data || data || []);
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
      } else if (activeTab === 'system') {
        const { data } = await auditLogService.getSystemLogs({ page, limit: 20, ...filters });
        setSystemLogs(data.data || data || []);
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
      } else if (activeTab === 'compliance') {
        const { data } = await auditLogService.getComplianceRecords({ page, limit: 20, ...filters });
        setComplianceRecords(data.data || data || []);
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
      } else if (activeTab === 'login') {
        const { data } = await auditLogService.getLoginHistory({ page, limit: 20, ...filters });
        setLoginHistory(data.data || data || []);
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [activeTab]);
  useEffect(() => { loadData(); }, [activeTab, page]);

  const tabs = [
    { key: 'activity', label: 'Activity Feed', icon: Activity },
    { key: 'system', label: 'System Logs', icon: Shield },
    { key: 'compliance', label: 'Compliance', icon: AlertTriangle },
    { key: 'login', label: 'Login History', icon: User },
  ];

  const renderFilterRow = (children) => (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <Filter className="w-4 h-4 text-gray-400" />
      {children}
    </div>
  );

  const complianceScore = complianceRecords.length > 0
    ? Math.round((complianceRecords.filter(r => r.status === 'compliant').length / complianceRecords.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor system activity, compliance, and login history</p>
        </div>
        <button onClick={() => auditLogService.exportAuditLogs(filters).then(() => {})} className="btn-secondary btn-sm gap-1"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-body p-0">
          {activeTab === 'activity' && (
            <>
              {renderFilterRow(
                <>
                  <div className="relative flex-1 min-w-[150px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search user..." value={filters.user} onChange={(e) => setFilters({...filters, user: e.target.value})} className="input-field pl-10 w-full text-sm" />
                  </div>
                  <select value={filters.action_type} onChange={(e) => setFilters({...filters, action_type: e.target.value})} className="input-field text-sm">
                    <option value="">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                  </select>
                  <input type="date" value={filters.date_from} onChange={(e) => setFilters({...filters, date_from: e.target.value})} className="input-field text-sm" />
                  <input type="date" value={filters.date_to} onChange={(e) => setFilters({...filters, date_to: e.target.value})} className="input-field text-sm" />
                  <button onClick={loadData} className="btn-primary btn-sm">Filter</button>
                </>
              )}
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : activityFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400"><Activity className="w-12 h-12 mb-3 opacity-50" /><p className="text-lg font-medium">No activity found</p></div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activityFeed.map((act, i) => (
                    <div key={act.id || i} className="flex items-start gap-4 px-6 py-4">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{act.action || act.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{act.user_name || 'System'} &middot; {act.description && <span className="text-gray-400">{act.description} &middot; </span>}{formatDate(act.created_at)}</p>
                      </div>
                      <Eye className="w-4 h-4 text-gray-300 cursor-pointer hover:text-gray-500" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'system' && (
            <>
              {renderFilterRow(
                <>
                  <select value={filters.level} onChange={(e) => setFilters({...filters, level: e.target.value})} className="input-field text-sm">
                    <option value="">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                    <option value="debug">Debug</option>
                  </select>
                  <div className="relative flex-1 min-w-[150px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search source..." value={filters.source} onChange={(e) => setFilters({...filters, source: e.target.value})} className="input-field pl-10 w-full text-sm" />
                  </div>
                  <input type="date" value={filters.date_from} onChange={(e) => setFilters({...filters, date_from: e.target.value})} className="input-field text-sm" />
                  <input type="date" value={filters.date_to} onChange={(e) => setFilters({...filters, date_to: e.target.value})} className="input-field text-sm" />
                  <button onClick={loadData} className="btn-primary btn-sm">Filter</button>
                </>
              )}
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : systemLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400"><Shield className="w-12 h-12 mb-3 opacity-50" /><p className="text-lg font-medium">No system logs</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Level</th><th>Message</th><th>Source</th><th>Timestamp</th></tr></thead>
                    <tbody>
                      {systemLogs.map((log, i) => (
                        <tr key={log.id || i}>
                          <td><span className={`badge ${LEVEL_BADGES[log.level] || 'badge-gray'}`}>{log.level || 'info'}</span></td>
                          <td className="max-w-[300px] truncate font-medium">{log.message}</td>
                          <td className="text-sm text-gray-500">{log.source || log.service || '-'}</td>
                          <td className="text-sm text-gray-500">{formatDate(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'compliance' && (
            <>
              {renderFilterRow(
                <>
                  <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} className="input-field text-sm">
                    <option value="">All Types</option>
                    <option value="data_protection">Data Protection</option>
                    <option value="financial">Financial</option>
                    <option value="operational">Operational</option>
                    <option value="regulatory">Regulatory</option>
                    <option value="security">Security</option>
                  </select>
                  <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="input-field text-sm">
                    <option value="">All Status</option>
                    <option value="compliant">Compliant</option>
                    <option value="non_compliant">Non-Compliant</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                  <button onClick={loadData} className="btn-primary btn-sm">Filter</button>
                </>
              )}
              {complianceRecords.length > 0 && (
                <div className="px-6 py-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke={complianceScore >= 80 ? '#10B981' : complianceScore >= 50 ? '#F59E0B' : '#EF4444'} strokeWidth="3" strokeDasharray={`${complianceScore}, 100`} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{complianceScore}%</span>
                    </div>
                    <div><p className="font-semibold">Compliance Score</p><p className="text-sm text-gray-500">Based on {complianceRecords.length} record{complianceRecords.length !== 1 ? 's' : ''}</p></div>
                  </div>
                </div>
              )}
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : complianceRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400"><AlertTriangle className="w-12 h-12 mb-3 opacity-50" /><p className="text-lg font-medium">No compliance records</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Type</th><th>Entity</th><th>Status</th><th>Score</th><th>Due Date</th></tr></thead>
                    <tbody>
                      {complianceRecords.map((r, i) => (
                        <tr key={r.id || i}>
                          <td><span className="badge badge-info">{r.type || '-'}</span></td>
                          <td className="font-medium">{r.entity || r.entity_name || '-'}</td>
                          <td><span className={`badge ${COMPLIANCE_STATUS[r.status] || 'badge-gray'}`}>{r.status || '-'}</span></td>
                          <td className="text-sm">{r.score != null ? `${r.score}%` : '-'}</td>
                          <td className="text-sm text-gray-500">{r.due_date ? formatDate(r.due_date) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'login' && (
            <>
              {renderFilterRow(
                <>
                  <div className="relative flex-1 min-w-[150px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search user..." value={filters.user} onChange={(e) => setFilters({...filters, user: e.target.value})} className="input-field pl-10 w-full text-sm" />
                  </div>
                  <input type="date" value={filters.date_from} onChange={(e) => setFilters({...filters, date_from: e.target.value})} className="input-field text-sm" />
                  <input type="date" value={filters.date_to} onChange={(e) => setFilters({...filters, date_to: e.target.value})} className="input-field text-sm" />
                  <button onClick={loadData} className="btn-primary btn-sm">Filter</button>
                </>
              )}
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : loginHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400"><User className="w-12 h-12 mb-3 opacity-50" /><p className="text-lg font-medium">No login history</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>User</th><th>Email</th><th>IP Address</th><th>Status</th><th>Timestamp</th></tr></thead>
                    <tbody>
                      {loginHistory.map((h, i) => (
                        <tr key={h.id || i}>
                          <td className="font-medium">{h.user_name || h.user || '-'}</td>
                          <td className="text-sm">{h.email || '-'}</td>
                          <td className="font-mono text-sm">{h.ip_address || '-'}</td>
                          <td>{h.success || h.status === 'success' ? <span className="badge badge-success">Success</span> : <span className="badge badge-red">Failed</span>}</td>
                          <td className="text-sm text-gray-500">{formatDate(h.created_at || h.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="card-footer flex items-center justify-between">
            <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm disabled:opacity-50">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
