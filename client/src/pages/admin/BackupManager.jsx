import { useState, useEffect } from 'react';
import { Database, Download, RefreshCw, Trash2, Plus, X, CheckCircle, AlertTriangle, Clock, HardDrive, FileText } from 'lucide-react';
import { backupService } from '../../api/admin';
import { formatDate, formatDateTime } from '../../utils/helpers';

export function BackupManager() {
  const [backups, setBackups] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('backups');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ type: 'full', description: '' });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [bkRes, stRes] = await Promise.all([
        backupService.list({ limit: 50 }),
        backupService.getStats(),
      ]);
      setBackups(bkRes.data?.data || bkRes.data || []);
      setStats(stRes.data?.data || stRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const { data } = await backupService.getSchedules();
      setSchedules(data.data || data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeTab === 'schedules') loadSchedules();
  }, [activeTab]);

  const handleCreateBackup = async () => {
    try {
      await backupService.create(createForm);
      setShowCreateModal(false);
      setCreateForm({ type: 'full', description: '' });
      load();
    } catch (err) { alert(err.message); }
  };

  const handleVerify = async (id) => {
    try {
      await backupService.verify(id);
      load();
    } catch (err) { alert(err.message); }
  };

  const handleRestore = async (id) => {
    if (!confirm('Restore this backup? This may affect current data.')) return;
    try {
      await backupService.restore(id);
      alert('Restore initiated');
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this backup permanently?')) return;
    try {
      await backupService.delete(id);
      load();
    } catch (err) { alert(err.message); }
  };

  const openAddSchedule = () => {
    setEditingSchedule(null);
    setScheduleForm({ name: '', frequency: 'daily', time: '02:00', retention_days: 30, is_active: true });
    setShowScheduleModal(true);
  };

  const openEditSchedule = (s) => {
    setEditingSchedule(s);
    setScheduleForm({ name: s.name, frequency: s.frequency, time: s.time, retention_days: s.retention_days, is_active: s.is_active });
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    try {
      if (editingSchedule) await backupService.updateSchedule(editingSchedule.id, scheduleForm);
      else await backupService.createSchedule(scheduleForm);
      setShowScheduleModal(false);
      setEditingSchedule(null);
      setScheduleForm({});
      loadSchedules();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try { await backupService.deleteSchedule(id); loadSchedules(); } catch (err) { alert(err.message); }
  };

  const handleRunSchedule = async (id) => {
    try { await backupService.runSchedule(id); alert('Backup triggered'); } catch (err) { alert(err.message); }
  };

  const getStatusBadge = (status) => {
    const map = { completed: 'badge-success', failed: 'badge-red', in_progress: 'badge-info', running: 'badge-info' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  const getTypeBadge = (type) => {
    const map = { full: 'badge-indigo', incremental: 'badge-info', differential: 'badge-warning' };
    return <span className={`badge ${map[type] || 'badge-gray'}`}>{type}</span>;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const tabs = [
    { key: 'backups', label: 'Backups' },
    { key: 'schedules', label: 'Schedules' },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (error) return <div className="text-red-500 p-4">Error loading backups: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Backup Manager</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Database backup and restore</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Create Backup</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center"><Database className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Backups</p><p className="text-xl font-bold text-blue-600">{stats?.total_backups ?? backups.length}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center"><HardDrive className="w-6 h-6 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Total Size</p><p className="text-xl font-bold text-emerald-600">{formatSize(stats?.total_size)}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-6 h-6 text-amber-600" /></div>
            <div><p className="text-sm text-gray-500">Last Backup</p><p className="text-xl font-bold text-amber-600">{stats?.last_backup ? formatDate(stats.last_backup) : 'Never'}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center"><CheckCircle className="w-6 h-6 text-violet-600" /></div>
            <div><p className="text-sm text-gray-500">Last Verified</p><p className="text-xl font-bold text-violet-600">{stats?.last_verified ? formatDate(stats.last_verified) : 'Never'}</p></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body p-0">
          {activeTab === 'backups' && (
            <>
              {backups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Database className="w-8 h-8 mb-2" />
                  <p className="text-sm">No backups found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Type</th><th>Status</th><th>File Size</th><th>Created</th><th>Description</th><th className="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {backups.map((b) => (
                        <tr key={b.id}>
                          <td>{getTypeBadge(b.type || b.backup_type)}</td>
                          <td>{b.status === 'in_progress' || b.status === 'running' ? <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> : getStatusBadge(b.status)}</td>
                          <td className="text-sm font-mono">{formatSize(b.file_size || b.size)}</td>
                          <td className="text-sm text-gray-500">{formatDateTime(b.created_at)}</td>
                          <td className="text-sm max-w-[200px] truncate">{b.description || '-'}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleVerify(b.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Verify"><CheckCircle className="w-4 h-4 text-emerald-500" /></button>
                              <button onClick={() => handleRestore(b.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Restore"><Download className="w-4 h-4 text-blue-500" /></button>
                              <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'schedules' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Backup Schedules</h3>
                <button onClick={openAddSchedule} className="btn-primary btn-sm gap-1"><Plus className="w-3 h-3" /> Add Schedule</button>
              </div>
              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Clock className="w-8 h-8 mb-2" />
                  <p className="text-sm">No schedules defined</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Frequency</th><th>Time</th><th>Retention (days)</th><th>Active</th><th className="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {schedules.map((s) => (
                        <tr key={s.id}>
                          <td className="font-medium">{s.name}</td>
                          <td><span className="badge badge-info">{s.frequency}</span></td>
                          <td className="text-sm">{s.time}</td>
                          <td className="text-sm">{s.retention_days}</td>
                          <td>{s.is_active ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-400" />}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleRunSchedule(s.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Run Now"><RefreshCw className="w-4 h-4" /></button>
                              <button onClick={() => openEditSchedule(s)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit"><FileText className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteSchedule(s.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Create Backup</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Type</label>
                <select value={createForm.type} onChange={(e) => setCreateForm({...createForm, type: e.target.value})} className="input-field w-full">
                  <option value="full">Full</option>
                  <option value="incremental">Incremental</option>
                  <option value="differential">Differential</option>
                </select>
              </div>
              <textarea placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm({...createForm, description: e.target.value})} className="input-field w-full" rows={3} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateBackup} className="btn-primary">Start Backup</button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</h3>
            <div className="space-y-4">
              <input placeholder="Schedule Name *" value={scheduleForm.name || ''} onChange={(e) => setScheduleForm({...scheduleForm, name: e.target.value})} className="input-field w-full" />
              <div>
                <label className="block text-sm mb-1">Frequency</label>
                <select value={scheduleForm.frequency || 'daily'} onChange={(e) => setScheduleForm({...scheduleForm, frequency: e.target.value})} className="input-field w-full">
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Time</label>
                <input type="time" value={scheduleForm.time || '02:00'} onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Retention (days)</label>
                <input type="number" value={scheduleForm.retention_days || 30} onChange={(e) => setScheduleForm({...scheduleForm, retention_days: parseInt(e.target.value)})} className="input-field w-full" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={scheduleForm.is_active !== false} onChange={(e) => setScheduleForm({...scheduleForm, is_active: e.target.checked})} className="rounded" />
                <label htmlFor="is_active" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowScheduleModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveSchedule} className="btn-primary">{editingSchedule ? 'Update Schedule' : 'Create Schedule'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
