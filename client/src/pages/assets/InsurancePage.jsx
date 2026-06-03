import { useState, useEffect } from 'react';
import { Plus, Shield, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { insuranceService } from '../../api/assets';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function InsurancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Asset Manager');
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('policies');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, eRes] = await Promise.all([
        insuranceService.list(), insuranceService.getClaims({}), insuranceService.getExpiring(),
      ]);
      setPolicies(pRes.data.data || []);
      setClaims(cRes.data.data || []);
      setExpiring(eRes.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try { await insuranceService.create(form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleCreateClaim = async () => {
    try { await insuranceService.createClaim(form.policy_id, form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Insurance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {expiring.length > 0 && <span className="text-red-500 font-medium">{expiring.length} expiring soon • </span>}
            {policies.length} policies
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && <button onClick={() => { setModalType('policy'); setShowModal(true); }} className="btn-primary gap-2"><Plus className="w-4 h-4" /> New Policy</button>}
          {canManage && <button onClick={() => { setModalType('claim'); setShowModal(true); }} className="btn-secondary gap-2"><FileText className="w-4 h-4" /> New Claim</button>}
        </div>
      </div>

      {expiring.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2"><AlertTriangle className="w-5 h-5 text-amber-500" /><span className="font-medium text-amber-700 dark:text-amber-300">Policies Expiring Soon</span></div>
          {expiring.map(e => (
            <p key={e.id} className="text-sm text-amber-600 dark:text-amber-400">• {e.provider} — {e.asset_name || e.registration_number} (expires {formatDate(e.end_date)})</p>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b">
        {['policies', 'claims'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>{t}</button>
        ))}
      </div>

      {activeTab === 'policies' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {policies.map(p => (
            <div key={p.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{p.provider}</p>
                    <p className="font-mono text-xs text-gray-500">{p.policy_number}</p>
                  </div>
                  <span className={`badge badge-${getStatusColor(p.status)}`}>{p.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div><span className="text-gray-500">Type:</span> {p.insurance_type}</div>
                  <div><span className="text-gray-500">Coverage:</span> {formatCurrency(p.coverage_amount)}</div>
                  <div><span className="text-gray-500">Premium:</span> {formatCurrency(p.premium_amount)} / {p.premium_frequency}</div>
                  <div><span className="text-gray-500">Asset:</span> {p.asset_name || p.registration_number}</div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Period: </span>
                    <span className={new Date(p.end_date) < new Date() ? 'text-red-500' : ''}>{formatDate(p.start_date)} — {formatDate(p.end_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {policies.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">No insurance policies</div>}
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="card"><div className="card-body overflow-x-auto">
          <table className="data-table"><thead><tr><th>Claim #</th><th>Policy</th><th>Provider</th><th>Date</th><th>Amount</th><th>Approved</th><th>Status</th></tr></thead>
            <tbody>{claims.map(c => (
              <tr key={c.id}>
                <td className="font-mono text-xs">{c.claim_number}</td>
                <td>{c.policy_number}</td>
                <td>{c.provider}</td>
                <td>{formatDate(c.claim_date)}</td>
                <td>{formatCurrency(c.claim_amount)}</td>
                <td>{c.approved_amount ? formatCurrency(c.approved_amount) : '-'}</td>
                <td><span className={`badge badge-${getStatusColor(c.status)}`}>{c.status}</span></td>
              </tr>
            ))}{claims.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No claims filed</td></tr>}</tbody>
          </table>
        </div></div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 capitalize">{modalType === 'policy' ? 'New Insurance Policy' : 'New Claim'}</h3>
            <div className="space-y-4">
              {modalType === 'policy' ? (
                <>
                  <select value={form.insurance_type||''} onChange={e => setForm({...form, insurance_type: e.target.value})} className="input-field w-full" required>
                    <option value="">Insurance Type</option><option value="comprehensive">Comprehensive</option><option value="third_party">Third Party</option><option value="fire">Fire</option><option value="theft">Theft</option><option value="all_risk">All Risk</option>
                  </select>
                  <input placeholder="Provider *" value={form.provider||''} onChange={e => setForm({...form, provider: e.target.value})} className="input-field w-full" required />
                  <input placeholder="Provider Phone" value={form.provider_phone||''} onChange={e => setForm({...form, provider_phone: e.target.value})} className="input-field w-full" />
                  <input placeholder="Provider Email" value={form.provider_email||''} onChange={e => setForm({...form, provider_email: e.target.value})} className="input-field w-full" />
                  <input type="number" step="0.01" placeholder="Coverage Amount" value={form.coverage_amount||''} onChange={e => setForm({...form, coverage_amount: parseFloat(e.target.value)})} className="input-field w-full" />
                  <input type="number" step="0.01" placeholder="Premium Amount" value={form.premium_amount||''} onChange={e => setForm({...form, premium_amount: parseFloat(e.target.value)})} className="input-field w-full" />
                  <select value={form.premium_frequency||'annual'} onChange={e => setForm({...form, premium_frequency: e.target.value})} className="input-field w-full">
                    <option value="annual">Annual</option><option value="semi_annual">Semi-Annual</option><option value="quarterly">Quarterly</option><option value="monthly">Monthly</option>
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs mb-1">Start Date</label><input type="date" value={form.start_date||''} onChange={e => setForm({...form, start_date: e.target.value})} className="input-field w-full" required /></div>
                    <div><label className="block text-xs mb-1">End Date</label><input type="date" value={form.end_date||''} onChange={e => setForm({...form, end_date: e.target.value})} className="input-field w-full" required /></div>
                  </div>
                </>
              ) : (
                <>
                  <input placeholder="Policy ID" value={form.policy_id||''} onChange={e => setForm({...form, policy_id: e.target.value})} className="input-field w-full" required />
                  <input type="number" step="0.01" placeholder="Claim Amount" value={form.claim_amount||''} onChange={e => setForm({...form, claim_amount: parseFloat(e.target.value)})} className="input-field w-full" required />
                  <textarea placeholder="Description" value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} className="input-field w-full" rows={2} />
                  <div><label className="block text-xs mb-1">Incident Date</label><input type="date" value={form.incident_date||''} onChange={e => setForm({...form, incident_date: e.target.value})} className="input-field w-full" /></div>
                  <input placeholder="Incident Type" value={form.incident_type||''} onChange={e => setForm({...form, incident_type: e.target.value})} className="input-field w-full" />
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={modalType === 'policy' ? handleCreate : handleCreateClaim} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
