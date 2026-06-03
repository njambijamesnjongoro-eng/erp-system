import { useState, useEffect } from 'react';
import { Plus, Search, Filter, CheckCircle, XCircle, Upload } from 'lucide-react';
import { expenseService } from '../../api/finance';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function ExpensePage() {
  const { hasRole } = useAuth();
  const canApprove = hasRole('System Admin', 'CEO', 'Finance Officer');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await expenseService.list();
      setExpenses(data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try {
      await expenseService.create(form);
      setShowModal(false);
      setForm({});
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleAction = async (action, id) => {
    try {
      if (action === 'approve') await expenseService.approve(id);
      else if (action === 'reject') await expenseService.reject(id, { notes: '' });
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and approve company expenses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> New Expense</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Expense #</th><th>Category</th><th>Description</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td className="font-mono text-sm">{e.expense_number}</td>
                    <td><span className="badge badge-indigo">{e.expense_category}</span></td>
                    <td className="max-w-[200px] truncate">{e.description}</td>
                    <td className="font-medium">{formatCurrency(e.amount)}</td>
                    <td>{formatDate(e.expense_date)}</td>
                    <td><span className={`badge badge-${getStatusColor(e.status)}`}>{e.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        {canApprove && e.status === 'pending' && (
                          <>
                            <button onClick={() => handleAction('approve', e.id)} className="btn-primary btn-sm"><CheckCircle className="w-3 h-3" /> Approve</button>
                            <button onClick={() => handleAction('reject', e.id)} className="btn-danger btn-sm"><XCircle className="w-3 h-3" /> Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No expenses found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">New Expense</h3>
            <div className="space-y-4">
              <select value={form.expense_category||''} onChange={e => setForm({...form, expense_category: e.target.value})} className="input-field w-full" required>
                <option value="">Select Category</option>
                <option value="Travel">Travel</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Training">Training</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Transport">Transport</option>
                <option value="Other">Other</option>
              </select>
              <input type="number" step="0.01" placeholder="Amount" value={form.amount||''} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} className="input-field w-full" required />
              <textarea placeholder="Description" value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} className="input-field w-full" rows={2} />
              <div><label className="block text-sm mb-1">Expense Date</label><input type="date" value={form.expense_date||''} onChange={e => setForm({...form, expense_date: e.target.value})} className="input-field w-full" /></div>
              <input placeholder="Paid To" value={form.paid_to||''} onChange={e => setForm({...form, paid_to: e.target.value})} className="input-field w-full" />
              <select value={form.payment_method||''} onChange={e => setForm({...form, payment_method: e.target.value})} className="input-field w-full">
                <option value="">Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Submit Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
