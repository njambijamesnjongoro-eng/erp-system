import { useState, useEffect } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { taxService } from '../../api/finance';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function TaxPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Finance Officer');
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [form, setForm] = useState({});
  const [payForm, setPayForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await taxService.list();
      setTaxes(data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try { await taxService.create(form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handlePay = async (id) => {
    try { await taxService.pay(id, payForm); setPayModal(null); setPayForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage tax obligations and payments</p>
        </div>
        {canManage && <button onClick={() => setShowModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Record Tax</button>}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Tax Type</th><th>Period</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {taxes.map(t => (
                  <tr key={t.id}>
                    <td><span className="badge badge-indigo">{t.tax_type}</span></td>
                    <td>{t.tax_period}</td>
                    <td className="font-medium">{formatCurrency(t.amount)}</td>
                    <td>{formatCurrency(t.paid_amount)}</td>
                    <td className={parseFloat(t.balance) > 0 ? 'text-red-500 font-medium' : 'text-green-500'}>{formatCurrency(t.balance)}</td>
                    <td>{formatDate(t.due_date)}</td>
                    <td><span className={`badge badge-${getStatusColor(t.status)}`}>{t.status}</span></td>
                    <td>
                      {canManage && parseFloat(t.balance) > 0 && (
                        <button onClick={() => setPayModal(t)} className="btn-primary btn-sm"><DollarSign className="w-3 h-3" /> Pay</button>
                      )}
                    </td>
                  </tr>
                ))}
                {taxes.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No tax records found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Record Tax</h3>
            <div className="space-y-4">
              <select value={form.tax_type||''} onChange={e => setForm({...form, tax_type: e.target.value})} className="input-field w-full" required>
                <option value="">Select Type</option>
                <option value="PAYE">PAYE</option>
                <option value="VAT">VAT</option>
                <option value="Corporate Tax">Corporate Tax</option>
                <option value="Withholding Tax">Withholding Tax</option>
                <option value="Excise Duty">Excise Duty</option>
              </select>
              <input placeholder="Tax Period (e.g. 2026-Q1)" value={form.tax_period||''} onChange={e => setForm({...form, tax_period: e.target.value})} className="input-field w-full" required />
              <input type="number" step="0.01" placeholder="Amount" value={form.amount||''} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} className="input-field w-full" required />
              <div><label className="block text-sm mb-1">Due Date</label><input type="date" value={form.due_date||''} onChange={e => setForm({...form, due_date: e.target.value})} className="input-field w-full" /></div>
              <textarea placeholder="Notes" value={form.notes||''} onChange={e => setForm({...form, notes: e.target.value})} className="input-field w-full" rows={2} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Record</button>
            </div>
          </div>
        </div>
      )}

      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPayModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Pay Tax: {payModal.tax_type}</h3>
            <p className="text-sm text-gray-500 mb-4">Balance: {formatCurrency(payModal.balance)}</p>
            <div className="space-y-4">
              <input type="number" step="0.01" placeholder="Payment Amount" max={payModal.balance} value={payForm.paid_amount||''} onChange={e => setPayForm({...payForm, paid_amount: parseFloat(e.target.value)})} className="input-field w-full" required />
              <input placeholder="Reference Number" value={payForm.reference_number||''} onChange={e => setPayForm({...payForm, reference_number: e.target.value})} className="input-field w-full" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPayModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handlePay(payModal.id)} className="btn-primary">Make Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
