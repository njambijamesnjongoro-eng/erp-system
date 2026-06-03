import { useState, useEffect } from 'react';
import { Plus, Wrench, AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react';
import { maintenanceService } from '../../api/assets';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function MaintenancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Asset Manager', 'Procurement Officer');
  const canApprove = hasRole('System Admin', 'CEO', 'Asset Manager');
  const [records, setRecords] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const [rRes, oRes] = await Promise.all([
        maintenanceService.list({ status: statusFilter || undefined }),
        maintenanceService.getOverdue(),
      ]);
      setRecords(rRes.data.data || []);
      setOverdue(oRes.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const handleCreate = async () => {
    try { await maintenanceService.create(form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleStatus = async (id, status, data = {}) => {
    try { await maintenanceService.updateStatus(id, { status, ...data }); fetch(); } catch (err) { alert(err.message); }
  };

  const handleApprove = async (id) => {
    try { await maintenanceService.approve(id); fetch(); } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {overdue.length > 0 && <span className="text-red-500 font-medium">{overdue.length} overdue • </span>}
            {records.length} total work orders
          </p>
        </div>
        {canManage && <button onClick={() => setShowModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> New Work Order</button>}
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2"><AlertTriangle className="w-5 h-5 text-red-500" /><span className="font-medium text-red-700 dark:text-red-300">Overdue Maintenance ({overdue.length})</span></div>
          <div className="space-y-1">{overdue.slice(0, 5).map(m => (
            <p key={m.id} className="text-sm text-red-600 dark:text-red-400">• {m.title} — {m.asset_name || m.registration_number} (due {formatDate(m.scheduled_date)})</p>
          ))}</div>
        </div>
      )}

      <div className="flex gap-2">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card"><div className="card-body overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>WO #</th><th>Title</th><th>Asset/Vehicle</th><th>Type</th><th>Priority</th><th>Scheduled</th><th>Cost</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {records.map(m => (
              <tr key={m.id}>
                <td className="font-mono text-xs">{m.maintenance_number}</td>
                <td className="font-medium max-w-[200px] truncate">{m.title}</td>
                <td className="text-sm">{m.asset_name || m.registration_number || 'N/A'}</td>
                <td><span className="badge badge-indigo text-xs">{m.maintenance_type}</span></td>
                <td><span className={`badge ${m.priority === 'high' ? 'badge-red' : m.priority === 'medium' ? 'badge-amber' : 'badge-blue'}`}>{m.priority}</span></td>
                <td className={new Date(m.scheduled_date) < new Date() && m.status !== 'completed' ? 'text-red-500' : ''}>{formatDate(m.scheduled_date)}</td>
                <td>{formatCurrency(m.cost)}</td>
                <td><span className={`badge badge-${getStatusColor(m.status)}`}>{m.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {canApprove && m.approval_status === 'pending' && <button onClick={() => handleApprove(m.id)} className="btn-primary btn-sm"><CheckCircle className="w-3 h-3" /></button>}
                    {m.status === 'pending' && <button onClick={() => handleStatus(m.id, 'in_progress')} className="btn-secondary btn-sm">Start</button>}
                    {m.status === 'in_progress' && <button onClick={() => handleStatus(m.id, 'completed', { completion_date: new Date().toISOString().split('T')[0] })} className="btn-primary btn-sm"><CheckCircle className="w-3 h-3" /> Complete</button>}
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={9} className="text-center text-gray-400 py-8">No maintenance records</td></tr>}
          </tbody>
        </table>
      </div></div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">New Work Order</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select value={form.maintenance_type||''} onChange={e => setForm({...form, maintenance_type: e.target.value})} className="input-field" required>
                  <option value="">Type *</option><option value="preventive">Preventive</option><option value="corrective">Corrective</option><option value="emergency">Emergency</option><option value="inspection">Inspection</option>
                </select>
                <select value={form.priority||'medium'} onChange={e => setForm({...form, priority: e.target.value})} className="input-field">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <input placeholder="Title *" value={form.title||''} onChange={e => setForm({...form, title: e.target.value})} className="input-field w-full" required />
              <textarea placeholder="Description" value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} className="input-field w-full" rows={2} />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs mb-1">Scheduled Date</label><input type="date" value={form.scheduled_date||''} onChange={e => setForm({...form, scheduled_date: e.target.value})} className="input-field w-full" /></div>
                <div><label className="block text-xs mb-1">Asset ID</label><input placeholder="Asset UUID" value={form.asset_id||''} onChange={e => setForm({...form, asset_id: e.target.value})} className="input-field w-full" /></div>
                <div><label className="block text-xs mb-1">Vehicle ID</label><input placeholder="Vehicle UUID" value={form.vehicle_id||''} onChange={e => setForm({...form, vehicle_id: e.target.value})} className="input-field w-full" /></div>
                <input placeholder="Technician Name" value={form.technician_name||''} onChange={e => setForm({...form, technician_name: e.target.value})} className="input-field" />
                <input type="number" step="0.01" placeholder="Cost" value={form.cost||''} onChange={e => setForm({...form, cost: parseFloat(e.target.value)})} className="input-field" />
                <input type="number" step="0.01" placeholder="Parts Cost" value={form.parts_cost||''} onChange={e => setForm({...form, parts_cost: parseFloat(e.target.value)})} className="input-field" />
              </div>
              <input type="number" placeholder="Service Interval (km)" value={form.service_interval_km||''} onChange={e => setForm({...form, service_interval_km: parseInt(e.target.value)})} className="input-field w-full" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create Work Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
