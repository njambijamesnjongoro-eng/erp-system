import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, MapPin, User, Calendar, DollarSign, Wrench, Shield, FileText, Clock, ArrowLeft, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { assetService, assignmentService } from '../../api/assets';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function AssetDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Asset Manager');
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await assetService.getById(id);
        setAsset(data.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!asset) return <div className="text-center py-20 text-gray-400">Asset not found</div>;

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'insurance', label: 'Insurance' },
    { key: 'depreciation', label: 'Depreciation' },
    { key: 'documents', label: 'Documents' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/assets" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{asset.asset_name}</h1>
            <span className={`badge badge-${getStatusColor(asset.status)}`}>{asset.status}</span>
            <span className={`badge ${asset.lifecycle_status === 'active' ? 'badge-emerald' : 'badge-gray'}`}>{asset.lifecycle_status}</span>
          </div>
          <p className="text-sm text-gray-500">{asset.asset_code} · {asset.asset_tag} · {asset.category_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Current Value" value={formatCurrency(asset.current_value)} />
        <StatCard icon={DollarSign} label="Purchase Cost" value={formatCurrency(asset.purchase_cost)} />
        <StatCard icon={Clock} label="Depreciation" value={formatCurrency(asset.accumulated_depreciation)} sub="Total depreciated" />
        <StatCard icon={Calendar} label="Warranty" value={asset.warranty_expiry ? formatDate(asset.warranty_expiry) : 'N/A'} sub={asset.warranty_expiry && new Date(asset.warranty_expiry) < new Date() ? 'Expired' : 'Active'} />
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          {activeTab === 'details' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailField label="Serial Number" value={asset.serial_number} />
              <DetailField label="Model Number" value={asset.model_number} />
              <DetailField label="Manufacturer" value={asset.manufacturer} />
              <DetailField label="Category" value={asset.category_name} />
              <DetailField label="Department" value={asset.department_name} />
              <DetailField label="Location" value={`${asset.location || ''} ${asset.room ? `/ ${asset.room}` : ''} ${asset.floor ? `/ Floor ${asset.floor}` : ''}`} />
              <DetailField label="Assigned To" value={asset.assigned_name} />
              <DetailField label="Supplier" value={asset.supplier_name} />
              <DetailField label="Condition" value={asset.condition} />
              <DetailField label="Purchase Date" value={formatDate(asset.purchase_date)} />
              <DetailField label="Depreciation Method" value={asset.depreciation_method} />
              <DetailField label="Useful Life" value={`${asset.useful_life_years} years`} />
              <div className="col-span-full"><DetailField label="Notes" value={asset.notes} /></div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Assigned To</th><th>Department</th><th>Date</th><th>Return Date</th><th>Status</th></tr></thead>
                <tbody>
                  {asset.assignments?.map(aa => (
                    <tr key={aa.id}>
                      <td>{aa.assigned_to_name}</td>
                      <td>{aa.dept_name}</td>
                      <td>{formatDate(aa.assigned_date)}</td>
                      <td>{formatDate(aa.returned_date)}</td>
                      <td><span className={`badge badge-${getStatusColor(aa.status)}`}>{aa.status}</span></td>
                    </tr>
                  ))}
                  {(!asset.assignments || asset.assignments.length === 0) && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No assignment history</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Work Order</th><th>Title</th><th>Type</th><th>Status</th><th>Scheduled</th><th>Cost</th></tr></thead>
                <tbody>
                  {asset.maintenance?.map(m => (
                    <tr key={m.id}>
                      <td className="font-mono text-xs">{m.maintenance_number}</td>
                      <td>{m.title}</td>
                      <td><span className="badge badge-indigo">{m.maintenance_type}</span></td>
                      <td><span className={`badge badge-${getStatusColor(m.status)}`}>{m.status}</span></td>
                      <td>{formatDate(m.scheduled_date)}</td>
                      <td>{formatCurrency(m.cost)}</td>
                    </tr>
                  ))}
                  {(!asset.maintenance || asset.maintenance.length === 0) && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No maintenance records</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'insurance' && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Policy #</th><th>Provider</th><th>Type</th><th>Coverage</th><th>Premium</th><th>End Date</th><th>Status</th></tr></thead>
                <tbody>
                  {asset.insurance?.map(ins => (
                    <tr key={ins.id}>
                      <td className="font-mono text-xs">{ins.policy_number}</td>
                      <td>{ins.provider}</td>
                      <td>{ins.insurance_type}</td>
                      <td>{formatCurrency(ins.coverage_amount)}</td>
                      <td>{formatCurrency(ins.premium_amount)}</td>
                      <td className={new Date(ins.end_date) < new Date() ? 'text-red-500' : ''}>{formatDate(ins.end_date)}</td>
                      <td><span className={`badge badge-${getStatusColor(ins.status)}`}>{ins.status}</span></td>
                    </tr>
                  ))}
                  {(!asset.insurance || asset.insurance.length === 0) && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No insurance policies</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'depreciation' && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Period</th><th>Opening Value</th><th>Depreciation</th><th>Closing Value</th><th>Method</th></tr></thead>
                <tbody>
                  {asset.depreciation?.map(d => (
                    <tr key={d.id}>
                      <td>{d.period_year}-{String(d.period_month).padStart(2,'0')}</td>
                      <td>{formatCurrency(d.opening_value)}</td>
                      <td className="text-red-500">{formatCurrency(d.depreciation_amount)}</td>
                      <td className="font-medium">{formatCurrency(d.closing_value)}</td>
                      <td>{d.method}</td>
                    </tr>
                  ))}
                  {(!asset.depreciation || asset.depreciation.length === 0) && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No depreciation records</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              {asset.documents?.length > 0 ? (
                <div className="grid gap-3">
                  {asset.documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{doc.document_name}</p>
                          <p className="text-xs text-gray-500">{doc.document_type} · {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ''}</p>
                        </div>
                      </div>
                      <span className={`badge badge-${doc.is_verified ? 'emerald' : 'gray'}`}>{doc.is_verified ? 'Verified' : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-gray-400 py-8">No documents uploaded</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card"><div className="card-body">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center"><Icon className="w-5 h-5 text-primary-600" /></div>
        <div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
      </div>
    </div></div>
  );
}

function DetailField({ label, value }) {
  return <div><p className="text-xs text-gray-500">{label}</p><p className="text-sm font-medium">{value || '-'}</p></div>;
}
