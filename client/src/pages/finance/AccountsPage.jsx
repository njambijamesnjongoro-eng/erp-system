import { useState, useEffect } from 'react';
import { Plus, ArrowUpCircle, ArrowDownCircle, Receipt, FileText } from 'lucide-react';
import { accountService } from '../../api/finance';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function AccountsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Finance Officer');
  const [activeTab, setActiveTab] = useState('chart');
  const [chart, setChart] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const [cRes, tRes, iRes] = await Promise.all([
        accountService.getChart(), accountService.listTransactions({ limit: 50 }), accountService.listInvoices()
      ]);
      setChart(cRes.data.data || []);
      setTransactions(tRes.data.data || []);
      setInvoices(iRes.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try {
      if (modalType === 'account') await accountService.createAccount(form);
      else if (modalType === 'transaction') await accountService.createTransaction(form);
      else if (modalType === 'invoice') await accountService.createInvoice(form);
      setShowModal(false);
      setForm({});
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const accountTypes = [...new Set(chart.map(c => c.account_type))];
  const groupedAccounts = accountTypes.map(type => ({
    type,
    accounts: chart.filter(c => c.account_type === type),
    total: chart.filter(c => c.account_type === type).length,
  }));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts & Transactions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Chart of accounts, transactions, and invoices</p>
        </div>
        <div className="flex gap-2">
          {canManage && <button onClick={() => { setModalType('transaction'); setShowModal(true); }} className="btn-primary gap-2"><Plus className="w-4 h-4" /> New Transaction</button>}
          {canManage && <button onClick={() => { setModalType('invoice'); setShowModal(true); }} className="btn-secondary gap-2"><Receipt className="w-4 h-4" /> New Invoice</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <button onClick={() => setActiveTab('chart')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chart' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Chart of Accounts</button>
        <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Transactions</button>
        <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Invoices</button>
      </div>

      {activeTab === 'chart' && (
        <div className="space-y-4">
          {groupedAccounts.map(g => (
            <div key={g.type} className="card">
              <div className="card-header"><h3 className="font-semibold capitalize">{g.type} Accounts ({g.total})</h3></div>
              <div className="card-body">
                {g.accounts.map(a => (
                  <div key={a.id} className="flex justify-between py-2 border-b last:border-0">
                    <div><span className="font-mono text-sm text-gray-500">{a.account_code}</span> <span className="font-medium">{a.account_name}</span></div>
                    <span className="text-sm text-gray-400">{a.category}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th><th>Type</th></tr></thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.transaction_date)}</td>
                      <td className="text-sm">{tx.account_code} - {tx.account_name}</td>
                      <td className="max-w-[200px] truncate">{tx.description}</td>
                      <td className={tx.debit > 0 ? 'text-red-500 font-medium' : ''}>{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                      <td className={tx.credit > 0 ? 'text-green-500 font-medium' : ''}>{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                      <td><span className="badge badge-indigo">{tx.transaction_type}</span></td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No transactions found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Invoice #</th><th>Client</th><th>Type</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="font-mono text-sm">{inv.invoice_number}</td>
                      <td>{inv.client_name || 'N/A'}</td>
                      <td><span className="badge badge-indigo">{inv.invoice_type}</span></td>
                      <td className="font-medium">{formatCurrency(inv.amount)}</td>
                      <td>{formatCurrency(inv.amount_paid)}</td>
                      <td className={parseFloat(inv.balance) > 0 ? 'text-red-500 font-medium' : 'text-green-500'}>{formatCurrency(inv.balance)}</td>
                      <td>{formatDate(inv.due_date)}</td>
                      <td><span className={`badge badge-${getStatusColor(inv.status)}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No invoices found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 capitalize">New {modalType}</h3>
            <div className="space-y-4">
              {modalType === 'account' && (
                <>
                  <input placeholder="Account Code (e.g. 1600)" value={form.account_code||''} onChange={e => setForm({...form, account_code: e.target.value})} className="input-field w-full" required />
                  <input placeholder="Account Name" value={form.account_name||''} onChange={e => setForm({...form, account_name: e.target.value})} className="input-field w-full" required />
                  <select value={form.account_type||''} onChange={e => setForm({...form, account_type: e.target.value})} className="input-field w-full" required>
                    <option value="">Select Type</option>
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <input placeholder="Category (e.g. Current Assets)" value={form.category||''} onChange={e => setForm({...form, category: e.target.value})} className="input-field w-full" />
                </>
              )}
              {modalType === 'transaction' && (
                <>
                  <input placeholder="Description" value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} className="input-field w-full" required />
                  <div><label className="block text-sm mb-1">Date</label><input type="date" value={form.transaction_date||''} onChange={e => setForm({...form, transaction_date: e.target.value})} className="input-field w-full" /></div>
                  <input placeholder="Account ID" value={form.account_id||''} onChange={e => setForm({...form, account_id: e.target.value})} className="input-field w-full" required />
                  <div className="grid grid-cols-2 gap-4">
                    <div><input type="number" step="0.01" placeholder="Debit Amount" value={form.debit||''} onChange={e => setForm({...form, debit: parseFloat(e.target.value)})} className="input-field w-full" /></div>
                    <div><input type="number" step="0.01" placeholder="Credit Amount" value={form.credit||''} onChange={e => setForm({...form, credit: parseFloat(e.target.value)})} className="input-field w-full" /></div>
                  </div>
                  <select value={form.transaction_type||''} onChange={e => setForm({...form, transaction_type: e.target.value})} className="input-field w-full">
                    <option value="">Transaction Type</option>
                    <option value="payment">Payment</option>
                    <option value="receipt">Receipt</option>
                    <option value="transfer">Transfer</option>
                    <option value="journal">Journal Entry</option>
                  </select>
                </>
              )}
              {modalType === 'invoice' && (
                <>
                  <select value={form.invoice_type||''} onChange={e => setForm({...form, invoice_type: e.target.value})} className="input-field w-full" required>
                    <option value="">Invoice Type</option>
                    <option value="sales">Sales Invoice</option>
                    <option value="purchase">Purchase Invoice</option>
                    <option value="expense">Expense Invoice</option>
                  </select>
                  <input placeholder="Client Name" value={form.client_name||''} onChange={e => setForm({...form, client_name: e.target.value})} className="input-field w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm mb-1">Issue Date</label><input type="date" value={form.issue_date||''} onChange={e => setForm({...form, issue_date: e.target.value})} className="input-field w-full" required /></div>
                    <div><label className="block text-sm mb-1">Due Date</label><input type="date" value={form.due_date||''} onChange={e => setForm({...form, due_date: e.target.value})} className="input-field w-full" required /></div>
                  </div>
                  <input type="number" step="0.01" placeholder="Amount" value={form.amount||''} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} className="input-field w-full" required />
                </>
              )}
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
