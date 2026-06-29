import { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Eye, Ban, CheckCircle, LogOut, X, Users, UserX, Trash2 } from 'lucide-react';
import { userManagementService } from '../../api/admin';
import { formatDate, formatDateTime } from '../../utils/helpers';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsUserId, setSessionsUserId] = useState(null);
  const [error, setError] = useState(null);

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await userManagementService.list(params);
      setUsers(data.data || []);
      const total = data.total ?? data.pagination?.total ?? 0;
      const limit = data.limit ?? data.pagination?.limit ?? 20;
      const currentPage = data.page ?? data.pagination?.page ?? page;
      setPagination({
        page: currentPage,
        limit,
        total,
        totalPages: data.totalPages ?? data.pagination?.totalPages ?? Math.ceil(total / limit),
        hasNext: data.pagination?.hasNext ?? currentPage * limit < total,
        hasPrev: data.pagination?.hasPrev ?? currentPage > 1,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetch(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ email: '', password: '', full_name: '', role_name: 'Employee' });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({ email: user.email, full_name: user.full_name, role_name: user.role_name || user.role, is_active: user.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await userManagementService.update(editing.id, form);
      else await userManagementService.create(form);
      setShowModal(false);
      setEditing(null);
      setForm({});
      fetch(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleActivate = async (id) => {
    try { await userManagementService.activate(id); fetch(pagination.page); } catch (err) { alert(err.message); }
  };

  const handleDeactivate = async (id) => {
    try { await userManagementService.deactivate(id); fetch(pagination.page); } catch (err) { alert(err.message); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete ${user.full_name || user.email}? If the user has no company records, the account will be permanently removed. Otherwise it will be deactivated and sessions ended.`)) return;
    try {
      const { data } = await userManagementService.delete(user.id, { hard: true });
      if (data?.message) alert(data.message);
      fetch(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleLock = async (id) => {
    try { await userManagementService.lock(id); fetch(pagination.page); } catch (err) { alert(err.message); }
  };

  const handleUnlock = async (id) => {
    try { await userManagementService.unlock(id); fetch(pagination.page); } catch (err) { alert(err.message); }
  };

  const handleForceLogout = async (id) => {
    if (!confirm('Force logout this user?')) return;
    try { await userManagementService.forceLogout(id); alert('User logged out'); } catch (err) { alert(err.message); }
  };

  const viewSessions = async (id) => {
    setSessionsUserId(id);
    try {
      const { data } = await userManagementService.getSessions(id);
      setSessions(data.data || data || []);
      setShowSessionsModal(true);
    } catch (err) { alert(err.message); }
  };

  const terminateSession = async (sessionId) => {
    try {
      await userManagementService.terminateSession(sessionsUserId, sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) { alert(err.message); }
  };

  const getStatusBadge = (status) => {
    const colors = { active: 'badge-success', inactive: 'badge-gray', locked: 'badge-red', suspended: 'badge-warning' };
    return <span className={`badge ${colors[status] || 'badge-gray'}`}>{status}</span>;
  };

  if (loading && users.length === 0) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{pagination.total} users</p>
        </div>
        <button onClick={openAdd} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add User</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 w-full" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
              <option value="">All Roles</option>
              <option value="System Admin">System Admin</option>
              <option value="CEO">CEO</option>
              <option value="Manager">Manager</option>
              <option value="HR Officer">HR Officer</option>
              <option value="Finance Officer">Finance Officer</option>
              <option value="Employee">Employee</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="locked">Locked</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.full_name || u.name || '-'}</td>
                      <td className="text-sm">{u.email}</td>
                      <td><span className="badge badge-info">{u.role_name || u.role}</span></td>
                      <td>{getStatusBadge(u.status || (u.is_active ? 'active' : 'inactive'))}</td>
                      <td className="text-sm text-gray-500">{u.last_login ? formatDateTime(u.last_login) : 'Never'}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Edit"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => viewSessions(u.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Sessions"><Eye className="w-4 h-4" /></button>
                          {u.status === 'active' || u.is_active ? (
                            <button onClick={() => handleDeactivate(u.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-amber-500" title="Deactivate"><UserX className="w-4 h-4" /></button>
                          ) : (
                            <button onClick={() => handleActivate(u.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-emerald-500" title="Activate"><CheckCircle className="w-4 h-4" /></button>
                          )}
                          {u.status === 'locked' ? (
                            <button onClick={() => handleUnlock(u.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-green-500" title="Unlock"><CheckCircle className="w-4 h-4" /></button>
                          ) : (
                            <button onClick={() => handleLock(u.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Lock"><Ban className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => handleForceLogout(u.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Force Logout"><LogOut className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(u)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-600" title="Remove User"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button disabled={!pagination.hasPrev} onClick={() => fetch(pagination.page - 1)} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
                <button disabled={!pagination.hasNext} onClick={() => fetch(pagination.page + 1)} className="btn-secondary text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <input placeholder="Full Name *" value={form.full_name || ''} onChange={(e) => setForm({...form, full_name: e.target.value})} className="input-field w-full" />
              <input placeholder="Email *" type="email" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field w-full" />
              {!editing && (
                <input placeholder="Password *" type="password" value={form.password || ''} onChange={(e) => setForm({...form, password: e.target.value})} className="input-field w-full" />
              )}
              <select value={form.role_name || 'Employee'} onChange={(e) => setForm({...form, role_name: e.target.value})} className="input-field w-full">
                <option value="System Admin">System Admin</option>
                <option value="CEO">CEO</option>
                <option value="Manager">Manager</option>
                <option value="HR Officer">HR Officer</option>
                <option value="Finance Officer">Finance Officer</option>
                <option value="Asset Manager">Asset Manager</option>
                <option value="Procurement Officer">Procurement Officer</option>
                <option value="Employee">Employee</option>
                <option value="Auditor">Auditor</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Update User' : 'Create User'}</button>
            </div>
          </div>
        </div>
      )}

      {showSessionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSessionsModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Active Sessions</h3>
              <button onClick={() => setShowSessionsModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No active sessions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>IP Address</th><th>Device</th><th>Browser</th><th>Logged In</th><th>Last Activity</th><th></th></tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono text-sm">{s.ip_address || s.ip}</td>
                        <td className="text-sm">{s.device || '-'}</td>
                        <td className="text-sm">{s.browser || '-'}</td>
                        <td className="text-sm">{formatDateTime(s.login_at || s.created_at)}</td>
                        <td className="text-sm">{formatDateTime(s.last_activity)}</td>
                        <td>
                          <button onClick={() => terminateSession(s.id)} className="text-red-500 hover:underline text-sm">Terminate</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowSessionsModal(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
