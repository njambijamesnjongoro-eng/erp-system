import { useState, useEffect } from 'react';
import { Plus, DollarSign, Users } from 'lucide-react';
import { loanService } from '../../api/finance';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function LoanPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Finance Officer');
  const [loans, setLoans] = useState([]);
  const [empLoans, setEmpLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loans');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const [lRes, eRes] = await Promise.all([loanService.list(), loanService.listEmployee()]);
      setLoans(lRes.data.data || []);
      setEmpLoans(eRes.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try {
      if (modalType === 'loan') await loanService.create(form);
      else await loanService.createEmployee(form);
      setShowModal(false);
      setForm({});
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loan & Debt Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage organizational loans and employee salary advances</p>
        </div>
        <div className="flex gap-2">
          {canManage && <button onClick={() => { setModalType('loan'); setShowModal(true); }} className="btn-primary gap-2"><Plus className="w-4 h-4" /> New Loan</button>}
          {canManage && <button onClick={() => { setModalType('employee'); setShowModal(true); }} className="btn-secondary gap-2"><Users className="w-4 h-4" /> Employee Advance</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <button onClick={() => setActiveTab('loans')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'loans' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Organization Loans</button>
        <button onClick={() => setActiveTab('employee')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'employee' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Employee Advances</button>
      </div>

      {activeTab === 'loans' && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Loan #</th><th>Type</th><th>Principal</th><th>Interest</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>
                  {loans.map(l => (
                    <tr key={l.id}>
                      <td className="font-mono text-sm">{l.loan_number}</td>
                      <td>{l.loan_type}</td>
                      <td>{formatCurrency(l.principal_amount)}</td>
                      <td>{l.interest_rate}%</td>
                      <td className="font-medium">{formatCurrency(l.total_amount)}</td>
                      <td>{formatCurrency(l.amount_paid)}</td>
                      <td className={parseFloat(l.balance) > 0 ? 'text-red-500 font-bold' : 'text-green-500'}>{formatCurrency(l.balance)}</td>
                      <td><span className={`badge badge-${getStatusColor(l.status)}`}>{l.status}</span></td>
                    </tr>
                  ))}
                  {loans.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No loans found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employee' && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Loan #</th><th>Employee</th><th>Principal</th><th>Installment</th><th>Paid</th><th>Balance</th><th>Progress</th><th>Status</th></tr></thead>
                <tbody>
                  {empLoans.map(el => (
                    <tr key={el.id}>
                      <td className="font-mono text-sm">{el.loan_number}</td>
                      <td>{el.employee_name}</td>
                      <td>{formatCurrency(el.principal_amount)}</td>
                      <td>{formatCurrency(el.installment_amount)}</td>
                      <td>{formatCurrency(el.amount_paid)}</td>
                      <td className={parseFloat(el.balance) > 0 ? 'text-red-500 font-bold' : 'text-green-500'}>{formatCurrency(el.balance)}</td>
                      <td>{el.installments_paid}/{el.total_installments}</td>
                      <td><span className={`badge badge-${getStatusColor(el.status)}`}>{el.status}</span></td>
                    </tr>
                  ))}
                  {empLoans.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No employee loans found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{modalType === 'loan' ? 'New Organization Loan' : 'Employee Salary Advance'}</h3>
            <div className="space-y-4">
              {modalType === 'employee' && <input placeholder="Employee ID" value={form.employee_id||''} onChange={e => setForm({...form, employee_id: e.target.value})} className="input-field w-full" required />}
              {modalType === 'loan' && (
                <select value={form.loan_type||''} onChange={e => setForm({...form, loan_type: e.target.value})} className="input-field w-full">
                  <option value="">Select Type</option>
                  <option value="Bank Loan">Bank Loan</option>
                  <option value="Equipment Financing">Equipment Financing</option>
                  <option value="Mortgage">Mortgage</option>
                  <option value="Overdraft">Overdraft</option>
                  <option value="Other">Other</option>
                </select>
              )}
              <input type="number" step="0.01" placeholder="Principal Amount" value={form.principal_amount||''} onChange={e => setForm({...form, principal_amount: parseFloat(e.target.value)})} className="input-field w-full" required />
              <input type="number" step="0.01" placeholder="Interest Rate (%)" value={form.interest_rate||''} onChange={e => setForm({...form, interest_rate: parseFloat(e.target.value)})} className="input-field w-full" />
              <input type="number" step="0.01" placeholder="Installment Amount" value={form.installment_amount||''} onChange={e => setForm({...form, installment_amount: parseFloat(e.target.value)})} className="input-field w-full" />
              {modalType === 'employee' && <input type="number" placeholder="Total Installments" value={form.total_installments||''} onChange={e => setForm({...form, total_installments: parseInt(e.target.value)})} className="input-field w-full" />}
              <div><label className="block text-sm mb-1">Start Date</label><input type="date" value={form.start_date||''} onChange={e => setForm({...form, start_date: e.target.value})} className="input-field w-full" required /></div>
              {modalType === 'loan' && <input placeholder="Lender" value={form.lender||''} onChange={e => setForm({...form, lender: e.target.value})} className="input-field w-full" />}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
