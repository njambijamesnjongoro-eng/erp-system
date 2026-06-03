import { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { insuranceService } from '../../api/hr';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function InsurancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'HR Officer');
  const [records, setRecords] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: '', insuranceType: '', provider: '', policyNumber: '',
    coverageStartDate: '', coverageEndDate: '', coverageDetails: '',
    dependentCount: 0, monthlyPremium: 0, notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRecords(); fetchExpiring(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await insuranceService.list({ limit: 50 });
      setRecords(data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchExpiring = async () => {
    try {
      const { data } = await insuranceService.getExpiring({ days: 30 });
      setExpiring(data.data);
    } catch (err) { /* ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await insuranceService.create(form);
      setShowForm(false);
      setForm({ employeeId: '', insuranceType: '', provider: '', policyNumber: '',
        coverageStartDate: '', coverageEndDate: '', coverageDetails: '',
        dependentCount: 0, monthlyPremium: 0, notes: '' });
      fetchRecords();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insurance Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Employee insurance and coverage tracking</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> Add Insurance
          </button>
        )}
      </div>

      {expiring.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">{expiring.length} insurance policies expiring soon</p>
            <div className="mt-2 space-y-1">
              {expiring.slice(0, 3).map(e => (
                <p key={e.id} className="text-sm text-amber-700 dark:text-amber-400">
                  {e.full_name} — {e.insurance_type} expires {formatDate(e.coverage_end_date)}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">Insurance Records</h3>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p>No insurance records found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Provider</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Policy #</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Coverage Start</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Coverage End</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Premium</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {records.map(r => (
                    <tr key={r.id}>
                      <td className="px-6 py-3 text-sm font-medium">{r.full_name}</td>
                      <td className="px-6 py-3 text-sm">{r.insurance_type}</td>
                      <td className="px-6 py-3 text-sm">{r.provider}</td>
                      <td className="px-6 py-3 text-sm font-mono">{r.policy_number}</td>
                      <td className="px-6 py-3 text-sm">{formatDate(r.coverage_start_date)}</td>
                      <td className="px-6 py-3 text-sm">{formatDate(r.coverage_end_date)}</td>
                      <td className="px-6 py-3 text-sm">${r.monthly_premium}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add Insurance Record</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="input-label">Employee ID</label>
                  <input value={form.employeeId} onChange={(e) => setForm({...form, employeeId: e.target.value})}
                    className="input-field" required />
                </div>
                <div><label className="input-label">Insurance Type</label>
                  <select value={form.insuranceType} onChange={(e) => setForm({...form, insuranceType: e.target.value})}
                    className="input-field" required>
                    <option value="">Select</option>
                    <option value="Medical">Medical</option>
                    <option value="SHA">SHA</option>
                    <option value="Group Life">Group Life</option>
                    <option value="Dental">Dental</option>
                    <option value="Vision">Vision</option>
                  </select>
                </div>
                <div><label className="input-label">Provider</label>
                  <input value={form.provider} onChange={(e) => setForm({...form, provider: e.target.value})}
                    className="input-field" required />
                </div>
                <div><label className="input-label">Policy Number</label>
                  <input value={form.policyNumber} onChange={(e) => setForm({...form, policyNumber: e.target.value})}
                    className="input-field" required />
                </div>
                <div><label className="input-label">Dependents</label>
                  <input type="number" value={form.dependentCount} onChange={(e) => setForm({...form, dependentCount: e.target.value})}
                    className="input-field" />
                </div>
                <div><label className="input-label">Coverage Start</label>
                  <input type="date" value={form.coverageStartDate} onChange={(e) => setForm({...form, coverageStartDate: e.target.value})}
                    className="input-field" required />
                </div>
                <div><label className="input-label">Coverage End</label>
                  <input type="date" value={form.coverageEndDate} onChange={(e) => setForm({...form, coverageEndDate: e.target.value})}
                    className="input-field" required />
                </div>
                <div><label className="input-label">Monthly Premium ($)</label>
                  <input type="number" step="0.01" value={form.monthlyPremium} onChange={(e) => setForm({...form, monthlyPremium: e.target.value})}
                    className="input-field" />
                </div>
                <div className="col-span-2"><label className="input-label">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})}
                    className="input-field" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
