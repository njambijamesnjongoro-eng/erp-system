import { useState, useEffect } from 'react';
import { Plus, Calendar, CheckCircle, XCircle, Clock, DollarSign, Download, Eye } from 'lucide-react';
import { payrollService } from '../../api/finance';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function PayrollPage() {
  const { hasRole } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [activeTab, setActiveTab] = useState('periods');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [form, setForm] = useState({});
  const canManage = hasRole('System Admin', 'CEO', 'Finance Officer');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, psRes, ssRes] = await Promise.all([
        payrollService.listPeriods(),
        payrollService.getPayslips(),
        payrollService.getSalaryStructures(),
      ]);
      setPeriods(pRes.data.data || []);
      setPayslips(psRes.data.data || []);
      setSalaryStructures(ssRes.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (action, id) => {
    try {
      if (action === 'process') await payrollService.processPayroll(id);
      else if (action === 'approve') await payrollService.approvePayroll(id);
      else if (action === 'close') await payrollService.closePeriod(id);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleCreate = async () => {
    try {
      await payrollService.createPeriod(form);
      setShowModal(false);
      setForm({});
      fetchData();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleCreateSalary = async () => {
    try {
      await payrollService.createSalaryStructure(form);
      setShowModal(false);
      setForm({});
      fetchData();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const tabs = [
    { key: 'periods', label: 'Payroll Periods' },
    { key: 'payslips', label: 'Payslips' },
    { key: 'structures', label: 'Salary Structures' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage payroll periods, payslips, and salary structures</p>
        </div>
        <div className="flex gap-2">
          {canManage && activeTab === 'periods' && (
            <button onClick={() => { setModalType('period'); setShowModal(true); }} className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> New Period
            </button>
          )}
          {canManage && activeTab === 'structures' && (
            <button onClick={() => { setModalType('salary'); setShowModal(true); }} className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> New Structure
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'periods' && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Period</th><th>Year/Month</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {periods.map(p => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.period_name}</td>
                      <td>{p.period_year}/{String(p.period_month).padStart(2,'0')}</td>
                      <td>{formatDate(p.start_date)}</td>
                      <td>{formatDate(p.end_date)}</td>
                      <td><span className={`badge badge-${getStatusColor(p.status)}`}>{p.status}</span></td>
                      <td>
                        <div className="flex gap-2">
                          {canManage && p.status === 'draft' && <button onClick={() => handleAction('process', p.id)} className="btn-secondary btn-sm"><Clock className="w-3 h-3" /> Process</button>}
                          {canManage && p.status === 'processing' && <button onClick={() => handleAction('approve', p.id)} className="btn-primary btn-sm"><CheckCircle className="w-3 h-3" /> Approve</button>}
                          {canManage && p.status === 'approved' && <button onClick={() => handleAction('close', p.id)} className="btn-secondary btn-sm"><XCircle className="w-3 h-3" /> Close</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {periods.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No payroll periods found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payslips' && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Payslip #</th><th>Employee</th><th>Period</th><th>Gross Pay</th><th>Deductions</th><th>Net Pay</th><th>Generated</th></tr></thead>
                <tbody>
                  {payslips.map(ps => (
                    <tr key={ps.id}>
                      <td className="font-mono text-sm">{ps.payslip_number}</td>
                      <td>{ps.employee_name}</td>
                      <td>{ps.period_name}</td>
                      <td>{formatCurrency(ps.gross_pay)}</td>
                      <td>{formatCurrency(ps.total_deductions)}</td>
                      <td className="font-bold text-green-600">{formatCurrency(ps.net_pay)}</td>
                      <td>{formatDate(ps.generated_at)}</td>
                    </tr>
                  ))}
                  {payslips.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No payslips generated yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'structures' && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Employee</th><th>Basic</th><th>Housing</th><th>Transport</th><th>Gross</th><th>PAYE</th><th>Net</th><th>Effective</th><th>Status</th></tr></thead>
                <tbody>
                  {salaryStructures.map(ss => (
                    <tr key={ss.id}>
                      <td className="font-medium">{ss.employee_name}</td>
                      <td>{formatCurrency(ss.basic_salary)}</td>
                      <td>{formatCurrency(ss.housing_allowance)}</td>
                      <td>{formatCurrency(ss.transport_allowance)}</td>
                      <td className="font-medium">{formatCurrency(parseFloat(ss.basic_salary) + parseFloat(ss.housing_allowance||0) + parseFloat(ss.transport_allowance||0) + parseFloat(ss.medical_allowance||0) + parseFloat(ss.leave_allowance||0))}</td>
                      <td>{formatCurrency(ss.paye_tax)}</td>
                      <td className="font-bold text-green-600">{formatCurrency(ss.net_salary)}</td>
                      <td>{formatDate(ss.effective_from)}</td>
                      <td><span className={`badge badge-${getStatusColor(ss.status)}`}>{ss.status}</span></td>
                    </tr>
                  ))}
                  {salaryStructures.length === 0 && <tr><td colSpan={9} className="text-center text-gray-400 py-8">No salary structures defined</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{modalType === 'period' ? 'New Payroll Period' : 'New Salary Structure'}</h3>
            <div className="space-y-4">
              {modalType === 'period' ? (
                <>
                  <input name="period_name" placeholder="Period Name (e.g. January 2026)" value={form.period_name||''} onChange={e => setForm({...form, period_name: e.target.value})} className="input-field w-full" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Year" value={form.period_year||''} onChange={e => setForm({...form, period_year: parseInt(e.target.value)})} className="input-field" required />
                    <input type="number" placeholder="Month (1-12)" min="1" max="12" value={form.period_month||''} onChange={e => setForm({...form, period_month: parseInt(e.target.value)})} className="input-field" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm mb-1">Start Date</label><input type="date" value={form.start_date||''} onChange={e => setForm({...form, start_date: e.target.value})} className="input-field w-full" required /></div>
                    <div><label className="block text-sm mb-1">End Date</label><input type="date" value={form.end_date||''} onChange={e => setForm({...form, end_date: e.target.value})} className="input-field w-full" required /></div>
                  </div>
                  <div><label className="block text-sm mb-1">Payment Date</label><input type="date" value={form.payment_date||''} onChange={e => setForm({...form, payment_date: e.target.value})} className="input-field w-full" /></div>
                </>
              ) : (
                <>
                  <input name="employee_id" placeholder="Employee ID (UUID)" value={form.employee_id||''} onChange={e => setForm({...form, employee_id: e.target.value})} className="input-field w-full" required />
                  <input type="number" step="0.01" placeholder="Basic Salary" value={form.basic_salary||''} onChange={e => setForm({...form, basic_salary: parseFloat(e.target.value)})} className="input-field w-full" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="0.01" placeholder="Housing Allowance" value={form.housing_allowance||''} onChange={e => setForm({...form, housing_allowance: parseFloat(e.target.value)})} className="input-field" />
                    <input type="number" step="0.01" placeholder="Transport Allowance" value={form.transport_allowance||''} onChange={e => setForm({...form, transport_allowance: parseFloat(e.target.value)})} className="input-field" />
                    <input type="number" step="0.01" placeholder="Medical Allowance" value={form.medical_allowance||''} onChange={e => setForm({...form, medical_allowance: parseFloat(e.target.value)})} className="input-field" />
                    <input type="number" step="0.01" placeholder="Leave Allowance" value={form.leave_allowance||''} onChange={e => setForm({...form, leave_allowance: parseFloat(e.target.value)})} className="input-field" />
                  </div>
                  <div><label className="block text-sm mb-1">Effective From</label><input type="date" value={form.effective_from||''} onChange={e => setForm({...form, effective_from: e.target.value})} className="input-field w-full" required /></div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={modalType === 'period' ? handleCreate : handleCreateSalary} className="btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
