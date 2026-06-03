import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Search, Plus } from 'lucide-react';
import { leaveService } from '../../api/hr';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function LeavePage() {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const canApprove = hasRole('System Admin', 'CEO', 'HR Officer', 'Manager');

  const tabs = ['requests', 'balances', 'types'];

  useEffect(() => {
    fetchRequests();
    fetchBalances();
    leaveService.getTypes().then(r => setLeaveTypes(r.data.data)).catch(() => {});
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (!canApprove && user?.id) params.employeeId = user.id;
      if (filter) params.status = filter;
      const { data } = await leaveService.listRequests(params);
      setRequests(data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchBalances = async () => {
    try {
      const params = {};
      if (!canApprove && user?.id) params.employeeId = user.id;
      const { data } = await leaveService.getBalances(params);
      setBalances(data.data);
    } catch (err) { console.error(err); }
  };

  const handleApprove = async (id, status) => {
    try {
      await leaveService.approveRequest(id, { approverId: user.id, status });
      fetchRequests();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leaveService.createRequest({ ...form, employeeId: user.id });
      setShowForm(false);
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      fetchRequests();
      fetchBalances();
    } catch (err) { alert(err.response?.data?.message || 'Failed to submit leave request'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage leave requests and balances</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-400">Total Requests</p>
          <p className="text-2xl font-bold">{requests.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{requests.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400">Approved</p>
          <p className="text-2xl font-bold text-emerald-600">{requests.filter(r => r.status === 'approved').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{requests.filter(r => r.status === 'rejected').length}</p>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 capitalize ${
                  activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
                }`}>{tab}</button>
            ))}
          </nav>
        </div>

        <div className="card-body p-0">
          {activeTab === 'requests' && (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex gap-2">
                  {['', 'pending', 'approved', 'rejected'].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        filter === s ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>{s || 'All'}</button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No leave requests</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Start</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">End</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Days</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {requests.map(r => (
                        <tr key={r.id}>
                          <td className="px-6 py-3 text-sm font-medium">{r.full_name}</td>
                          <td className="px-6 py-3 text-sm">{r.leave_type_name}</td>
                          <td className="px-6 py-3 text-sm">{formatDate(r.start_date)}</td>
                          <td className="px-6 py-3 text-sm">{formatDate(r.end_date)}</td>
                          <td className="px-6 py-3 text-sm">{r.total_days}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-6 py-3">
                            {r.status === 'pending' && canApprove && (
                              <div className="flex gap-1">
                                <button onClick={() => handleApprove(r.id, 'approved')}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleApprove(r.id, 'rejected')}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'balances' && (
            <div className="p-6">
              {balances.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No leave balances found</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {balances.map(b => (
                    <div key={b.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                      <p className="text-sm font-medium">{b.leave_type_name}</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{b.remaining_days}</span>
                        <span className="text-xs text-gray-400">/ {b.total_days} days</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-600 rounded-full"
                          style={{ width: `${b.total_days ? (b.used_days / b.total_days) * 100 : 0}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{b.used_days} used · {b.pending_days} pending</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'types' && (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveTypes.map(lt => (
                  <div key={lt.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                    <p className="text-sm font-medium">{lt.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{lt.code}</p>
                    <p className="text-xs text-gray-400">{lt.days_per_year} days/year · {lt.is_paid ? 'Paid' : 'Unpaid'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Request Leave</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">Leave Type</label>
                <select value={form.leaveTypeId} onChange={(e) => setForm({...form, leaveTypeId: e.target.value})}
                  className="input-field" required>
                  <option value="">Select type</option>
                  {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})}
                    className="input-field" required />
                </div>
                <div>
                  <label className="input-label">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})}
                    className="input-field" required />
                </div>
              </div>
              <div>
                <label className="input-label">Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})}
                  className="input-field" rows={3} required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
