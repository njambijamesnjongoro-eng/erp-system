import React, { useState, useEffect, useCallback } from 'react';
import { securityPhase3Api } from '../../api/securityPhase3';

export function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ table: '', operation: '', userId: '', search: '', limit: 100, offset: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchLogs = useCallback(async (append = false) => {
    try {
      const params = {};
      if (filters.table) params.table = filters.table;
      if (filters.operation) params.operation = filters.operation;
      if (filters.userId) params.userId = filters.userId;
      if (filters.search) params.search = filters.search;
      params.limit = filters.limit;
      params.offset = append ? filters.offset : 0;
      const res = await securityPhase3Api.getAuditLogs(params);
      const data = res.data.data;
      setLogs(append ? prev => [...prev, ...(data.rows || [])] : (data.rows || []));
      setTotalCount(data.total || 0);
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    setLogs([]);
    fetchLogs();
    securityPhase3Api.getAuditSummary().then(r => setSummary(r.data.data)).catch(() => {});
  }, [fetchLogs]);

  const loadMore = () => {
    const newOffset = filters.offset + filters.limit;
    setFilters(prev => ({ ...prev, offset: newOffset }));
    fetchLogs(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Audit Log Viewer</h1>

      {/* Summary */}
      {summary && (
        <div className="bg-gray-800 rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><span className="text-gray-400">Total Events (7d):</span> {summary.totalEvents}</div>
          <div><span className="text-gray-400">Unique Users:</span> {summary.uniqueUsers}</div>
          <div><span className="text-gray-400">Tables:</span> {summary.uniqueTables}</div>
          <div><span className="text-gray-400">Create:</span> {summary.operationBreakdown?.CREATE || 0}</div>
          <div><span className="text-gray-400">Delete:</span> {summary.operationBreakdown?.DELETE || 0}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap gap-3">
          <input placeholder="Search..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)}
            className="bg-gray-700 px-3 py-1.5 rounded text-sm w-48" />
          <input placeholder="User ID" value={filters.userId} onChange={e => handleFilterChange('userId', e.target.value)}
            className="bg-gray-700 px-3 py-1.5 rounded text-sm w-32" />
          <select value={filters.table} onChange={e => handleFilterChange('table', e.target.value)}
            className="bg-gray-700 px-3 py-1.5 rounded text-sm w-44">
            <option value="">All Tables</option>
            <option value="users">users</option>
            <option value="employee_profiles">employee_profiles</option>
            <option value="payroll">payroll</option>
            <option value="expenses">expenses</option>
            <option value="budgets">budgets</option>
            <option value="procurement">procurement</option>
            <option value="purchase_orders">purchase_orders</option>
          </select>
          <select value={filters.operation} onChange={e => handleFilterChange('operation', e.target.value)}
            className="bg-gray-700 px-3 py-1.5 rounded text-sm w-32">
            <option value="">All Ops</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <span className="text-sm text-gray-400 self-center">{totalCount} results</span>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No audit logs found</div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-3">Time</th>
              <th className="text-left py-2 px-3">User</th>
              <th className="text-left py-2 px-3">Action</th>
              <th className="text-left py-2 px-3">Table</th>
              <th className="text-right py-2 px-3">Record ID</th>
              <th className="text-center py-2 px-3">Details</th>
            </tr></thead>
            <tbody>
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="border-b border-gray-700 hover:bg-gray-750 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                    <td className="py-2 px-3 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3">{log.user_name || log.user_id || '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        log.operation === 'CREATE' ? 'bg-green-900 text-green-300' :
                        log.operation === 'UPDATE' ? 'bg-blue-900 text-blue-300' :
                        log.operation === 'DELETE' ? 'bg-red-900 text-red-300' : 'bg-gray-700'
                      }`}>{log.operation}</span>
                    </td>
                    <td className="py-2 px-3 text-gray-300">{log.table_name}</td>
                    <td className="py-2 px-3 text-right">{log.record_id || '-'}</td>
                    <td className="py-2 px-3 text-center text-gray-500">{expandedRow === log.id ? '▲' : '▼'}</td>
                  </tr>
                  {expandedRow === log.id && (
                    <tr className="bg-gray-750">
                      <td colSpan={6} className="p-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.ip_address && <div><span className="text-gray-400">IP:</span> {log.ip_address}</div>}
                          {log.user_agent && <div><span className="text-gray-400">UA:</span> <span className="truncate block max-w-xs">{log.user_agent}</span></div>}
                          {log.query && <div className="col-span-2"><span className="text-gray-400">Query:</span> <code className="block bg-gray-900 p-2 mt-1 rounded overflow-x-auto">{log.query}</code></div>}
                          {log.old_values && <div className="col-span-2"><span className="text-gray-400">Old Values:</span> <pre className="bg-gray-900 p-2 mt-1 rounded overflow-x-auto text-xs">{JSON.stringify(log.old_values, null, 2)}</pre></div>}
                          {log.new_values && <div className="col-span-2"><span className="text-gray-400">New Values:</span> <pre className="bg-gray-900 p-2 mt-1 rounded overflow-x-auto text-xs">{JSON.stringify(log.new_values, null, 2)}</pre></div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load More */}
      {logs.length < totalCount && (
        <div className="text-center">
          <button onClick={loadMore} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-sm transition-colors">
            Load More ({totalCount - logs.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
