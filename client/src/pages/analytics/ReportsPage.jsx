import { useState, useEffect } from 'react';
import { FileText, BarChart3, Download, Trash2, Clock, Plus, Calendar, Mail, Edit, Eye } from 'lucide-react';
import { reportService } from '../../api/analytics';
import { formatDate } from '../../utils/helpers';

const REPORT_TYPES = [
  { key: 'hr_analytics', name: 'HR Analytics', icon: FileText, description: 'Employee metrics, turnover, headcount trends' },
  { key: 'payroll', name: 'Payroll', icon: FileText, description: 'Payroll summaries, deductions, tax reports' },
  { key: 'financial', name: 'Financial', icon: BarChart3, description: 'Revenue, expenses, profit & loss' },
  { key: 'asset', name: 'Asset', icon: FileText, description: 'Asset register, depreciation, utilization' },
  { key: 'inventory', name: 'Inventory', icon: FileText, description: 'Stock levels, movements, valuations' },
  { key: 'procurement', name: 'Procurement', icon: FileText, description: 'Purchase orders, supplier performance' },
  { key: 'compliance', name: 'Compliance', icon: FileText, description: 'Regulatory compliance, audit findings' },
  { key: 'audit', name: 'Audit', icon: FileText, description: 'Audit trail, system activity logs' },
  { key: 'insurance', name: 'Insurance', icon: FileText, description: 'Coverage, claims, premiums' },
];

const FORMATS = ['json', 'pdf', 'xlsx', 'csv'];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('generate');
  const [history, setHistory] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genForm, setGenForm] = useState({ type: 'hr_analytics', date_from: '', date_to: '', department: '', format: 'pdf' });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', category: '' });

  useEffect(() => { loadHistory(); }, [page]);
  useEffect(() => { if (activeTab === 'email-templates') loadTemplates(); }, [activeTab]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data } = await reportService.getReports({ page, limit: 20 });
      setHistory(data.data || data || []);
      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadTemplates = async () => {
    try {
      const { data } = await reportService.getTemplates({ limit: 50 });
      setTemplates(data.data || data || []);
    } catch (err) { console.error(err); }
  };

  const handleGenerate = async () => {
    try {
      await reportService.generateReport(genForm);
      setShowGenerateModal(false);
      setGenForm({ type: 'hr_analytics', date_from: '', date_to: '', department: '', format: 'pdf' });
      loadHistory();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return;
    try { await reportService.deleteReport(id); loadHistory(); } catch (err) { alert(err.message); }
  };

  const openTemplate = async (t) => {
    if (t && t.id) {
      try {
        const { data } = await reportService.getTemplateById(t.id);
        setEditingTemplate(data.data || data);
        setTemplateForm({ name: data.data?.name || data.name, subject: data.data?.subject || data.subject, body: data.data?.body || data.body, category: data.data?.category || data.category });
      } catch (err) { console.error(err); }
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', subject: '', body: '', category: '' });
    }
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate?.id) await reportService.updateTemplate(editingTemplate.id, templateForm);
      else await reportService.createTemplate(templateForm);
      setShowTemplateModal(false);
      loadTemplates();
    } catch (err) { alert(err.message); }
  };

  const tabs = [
    { key: 'generate', label: 'Generate' },
    { key: 'history', label: 'History' },
    { key: 'email-templates', label: 'Email Templates' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and manage reports</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORT_TYPES.map((rt) => {
                const Icon = rt.icon;
                return (
                  <div key={rt.key} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Icon className="w-5 h-5 text-blue-600" /></div>
                      <div>
                        <p className="font-medium text-sm">{rt.name}</p>
                        <p className="text-xs text-gray-400">{rt.description}</p>
                      </div>
                    </div>
                    <button onClick={() => { setGenForm({...genForm, type: rt.key}); setShowGenerateModal(true); }} className="btn-primary btn-sm w-full gap-1"><Plus className="w-3 h-3" /> Generate</button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'history' && (
            <>
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <FileText className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No reports generated yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Type</th><th>Format</th><th>Created</th><th>Generated By</th><th className="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {history.map((r) => (
                        <tr key={r.id}>
                          <td className="font-medium max-w-[200px] truncate">{r.name || r.title || `${r.type} Report`}</td>
                          <td><span className="badge badge-info">{r.type || '-'}</span></td>
                          <td><span className="badge badge-gray">{r.format?.toUpperCase() || '-'}</span></td>
                          <td className="text-sm text-gray-500">{formatDate(r.created_at)}</td>
                          <td className="text-sm">{r.generated_by_name || r.generated_by || '-'}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Download"><Download className="w-4 h-4 text-blue-500" /></button>
                              <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm disabled:opacity-50">Previous</button>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'email-templates' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
                <button onClick={() => openTemplate(null)} className="btn-primary btn-sm gap-1"><Plus className="w-3 h-3" /> Create Template</button>
              </div>
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Mail className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No email templates</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Subject</th><th>Category</th><th>Active</th><th className="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {templates.map((t) => (
                        <tr key={t.id}>
                          <td className="font-medium">{t.name}</td>
                          <td className="text-sm max-w-[250px] truncate">{t.subject}</td>
                          <td><span className="badge badge-info">{t.category || '-'}</span></td>
                          <td>{t.is_active !== false ? <span className="badge badge-success">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                          <td className="text-right">
                            <button onClick={() => openTemplate(t)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowGenerateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Generate Report</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Report Type</label>
                <select value={genForm.type} onChange={(e) => setGenForm({...genForm, type: e.target.value})} className="input-field w-full">
                  {REPORT_TYPES.map(rt => <option key={rt.key} value={rt.key}>{rt.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Date From</label>
                  <input type="date" value={genForm.date_from} onChange={(e) => setGenForm({...genForm, date_from: e.target.value})} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Date To</label>
                  <input type="date" value={genForm.date_to} onChange={(e) => setGenForm({...genForm, date_to: e.target.value})} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Department</label>
                <input type="text" placeholder="All departments" value={genForm.department} onChange={(e) => setGenForm({...genForm, department: e.target.value})} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Format</label>
                <select value={genForm.format} onChange={(e) => setGenForm({...genForm, format: e.target.value})} className="input-field w-full">
                  {FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowGenerateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleGenerate} className="btn-primary">Generate</button>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editingTemplate ? 'Edit Template' : 'Create Template'}</h3>
            <div className="space-y-4">
              <input placeholder="Template Name *" value={templateForm.name} onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})} className="input-field w-full" />
              <input placeholder="Subject *" value={templateForm.subject} onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})} className="input-field w-full" />
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select value={templateForm.category} onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})} className="input-field w-full">
                  <option value="">General</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                  <option value="procurement">Procurement</option>
                  <option value="assets">Assets</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
              <textarea placeholder="Email body (HTML supported) *" value={templateForm.body} onChange={(e) => setTemplateForm({...templateForm, body: e.target.value})} className="input-field w-full" rows={6} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowTemplateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveTemplate} className="btn-primary">{editingTemplate ? 'Update Template' : 'Create Template'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
