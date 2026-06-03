import { useState, useEffect } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { budgetService } from '../../api/finance';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function BudgetPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Finance Officer');
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await budgetService.list({ fiscal_year: new Date().getFullYear() });
      setBudgets(data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try {
      await budgetService.create(form);
      setShowModal(false);
      setForm({});
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleApprove = async (id) => {
    try { await budgetService.approve(id); fetch(); } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const chartData = budgets.map(b => ({
    name: b.budget_name?.slice(0, 15) || 'Budget',
    allocated: parseFloat(b.allocated_amount) || 0,
    spent: parseFloat(b.spent_amount) || 0,
    remaining: parseFloat(b.remaining_amount) || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Plan and track departmental budgets</p>
        </div>
        {canManage && <button onClick={() => setShowModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> New Budget</button>}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Budget Utilization</h3></div>
        <div className="card-body h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `KSh ${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="allocated" name="Allocated" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="spent" name="Spent" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="remaining" name="Remaining" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4">
        {budgets.map(b => {
          const pct = b.allocated_amount > 0 ? ((b.spent_amount / b.allocated_amount) * 100).toFixed(1) : 0;
          return (
            <div key={b.id} className="card">
              <div className="card-body">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{b.budget_name}</h4>
                    <p className="text-sm text-gray-500">{b.department_name || 'General'} · FY {b.fiscal_year}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge badge-${getStatusColor(b.status)}`}>{b.status}</span>
                    {canManage && b.status === 'draft' && (
                      <button onClick={() => handleApprove(b.id)} className="btn-primary btn-sm"><CheckCircle className="w-3 h-3" /> Approve</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div><p className="text-xs text-gray-500">Allocated</p><p className="font-bold">{formatCurrency(b.allocated_amount)}</p></div>
                  <div><p className="text-xs text-gray-500">Spent</p><p className="font-bold text-red-500">{formatCurrency(b.spent_amount)}</p></div>
                  <div><p className="text-xs text-gray-500">Remaining</p><p className="font-bold text-green-500">{formatCurrency(b.remaining_amount)}</p></div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-primary-600 h-2.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{pct}% utilized</p>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && <div className="text-center py-12 text-gray-400">No budgets found for this fiscal year</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">New Budget</h3>
            <div className="space-y-4">
              <input placeholder="Budget Name" value={form.budget_name||''} onChange={e => setForm({...form, budget_name: e.target.value})} className="input-field w-full" required />
              <input type="number" placeholder="Fiscal Year" value={form.fiscal_year||new Date().getFullYear()} onChange={e => setForm({...form, fiscal_year: parseInt(e.target.value)})} className="input-field w-full" />
              <input type="number" step="0.01" placeholder="Total Amount" value={form.total_amount||''} onChange={e => setForm({...form, total_amount: parseFloat(e.target.value)})} className="input-field w-full" required />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create Budget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
