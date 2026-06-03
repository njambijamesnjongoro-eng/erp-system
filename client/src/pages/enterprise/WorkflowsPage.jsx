import { useState, useEffect, useCallback } from 'react';
import {
  Workflow, Plus, Search, Loader2, X, AlertTriangle, CheckCircle, XCircle, Clock, Play,
} from 'lucide-react';
import { workflowService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const TABS = ['Definitions', 'Instances'];

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const CATEGORY_OPTIONS = ['Approval', 'Notification', 'Onboarding', 'Offboarding', 'Review', 'Custom'];

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-14 h-14 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

const initialDefForm = { name: '', description: '', category: 'Approval', trigger_type: 'manual' };

export function WorkflowsPage() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('Definitions');
  const [definitions, setDefinitions] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defForm, setDefForm] = useState(initialDefForm);
  const [saving, setSaving] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [comment, setComment] = useState('');
  const [actioning, setActioning] = useState(null);
  const [triggerId, setTriggerId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      const promises = [workflowService.getAll(params)];
      if (activeTab === 'Instances') promises.push(workflowService.getInstances(params));
      const [defRes, instRes] = await Promise.all(promises);
      setDefinitions(defRes.data?.data || defRes.data || []);
      if (instRes) setInstances(instRes.data?.data || instRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateDefinition = async () => {
    if (!defForm.name.trim()) return;
    setSaving(true);
    try {
      await workflowService.create(defForm);
      setShowCreateModal(false);
      setDefForm(initialDefForm);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await workflowService.update(id, { status: currentStatus === 'active' ? 'inactive' : 'active' });
      setDefinitions((prev) => prev.map((d) => (d.id === id ? { ...d, status: currentStatus === 'active' ? 'inactive' : 'active' } : d)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleTrigger = async (id) => {
    try {
      await workflowService.trigger(id, {});
      setTriggerId(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleApprove = async (id) => {
    setActioning(id);
    try {
      await workflowService.approveStep(id, { comment: comment || undefined });
      setShowCommentModal(null);
      setComment('');
      setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'approved' } : i)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (id) => {
    setActioning(id);
    try {
      await workflowService.rejectStep(id, { comment: comment || undefined });
      setShowCommentModal(null);
      setComment('');
      setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'rejected' } : i)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setActioning(null);
    }
  };

  if (loading && definitions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automate business processes</p>
          </div>
        </div>
        <div className="card"><div className="card-body p-0">
          <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
        </div></div>
      </div>
    );
  }

  if (error && definitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load workflows</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{definitions.length} definitions</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'Instances' && triggerId && (
            <div className="flex items-center gap-1">
              <select value={triggerId} onChange={(e) => setTriggerId(e.target.value)} className="input-field text-xs w-auto py-1">
                <option value="">Select...</option>
                {definitions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button onClick={() => handleTrigger(triggerId)} className="btn-primary text-xs py-1 gap-1"><Play className="w-3 h-3" /> Run</button>
            </div>
          )}
          <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Create</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Definitions' && (
        <div className="card">
          <div className="card-body p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search definitions..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 w-full" />
            </div>
          </div>
          {definitions.length === 0 ? (
            <EmptyState icon={Workflow} message="No definitions" sub="Create your first workflow definition" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Trigger</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {definitions.map((d) => (
                    <tr key={d.id}>
                      <td className="font-medium text-gray-900 dark:text-white">{d.name}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{d.category || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{d.trigger_type || d.trigger || 'manual'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">v{d.version || '1'}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${d.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {d.status || 'active'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{formatDate(d.created_at)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleToggle(d.id, d.status)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title={d.status === 'active' ? 'Deactivate' : 'Activate'}>
                            {d.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setTriggerId(d.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-primary-600" title="Trigger">
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Instances' && (
        <div className="card">
          {instances.length === 0 ? (
            <div className="card-body"><EmptyState icon={Clock} message="No workflow instances" sub="Trigger a workflow to create instances" /></div>
          ) : (
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Workflow</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Current Step</th>
                      <th>Initiated By</th>
                      <th>Created</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map((inst) => (
                      <tr key={inst.id}>
                        <td className="font-medium text-gray-900 dark:text-white">{inst.workflow_name || inst.workflow?.name || '-'}</td>
                        <td className="text-sm font-mono text-gray-600 dark:text-gray-400">{inst.reference_id || inst.reference || '-'}</td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inst.status] || ''}`}>
                            {inst.status || '-'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{inst.current_step || inst.step || '-'}</td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{inst.initiated_by || inst.initiator || '-'}</td>
                        <td className="text-sm text-gray-500">{formatDate(inst.created_at)}</td>
                        <td className="text-right">
                          {inst.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setShowCommentModal({ id: inst.id, action: 'approve' })} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-emerald-500" title="Approve">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => setShowCommentModal({ id: inst.id, action: 'reject' })} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Workflow Definition</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" placeholder="Workflow name" value={defForm.name} onChange={(e) => setDefForm((p) => ({ ...p, name: e.target.value }))} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea placeholder="Workflow description" value={defForm.description} onChange={(e) => setDefForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="input-field w-full resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select value={defForm.category} onChange={(e) => setDefForm((p) => ({ ...p, category: e.target.value }))} className="input-field w-full">
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trigger Type</label>
                  <select value={defForm.trigger_type} onChange={(e) => setDefForm((p) => ({ ...p, trigger_type: e.target.value }))} className="input-field w-full">
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="event">Event</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateDefinition} disabled={saving || !defForm.name.trim()} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? ' Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCommentModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{showCommentModal.action} Instance</h3>
              <button onClick={() => setShowCommentModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment (optional)</label>
              <textarea placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="input-field w-full resize-none" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCommentModal(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => showCommentModal.action === 'approve' ? handleApprove(showCommentModal.id) : handleReject(showCommentModal.id)}
                disabled={actioning === showCommentModal.id}
                className={`${showCommentModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50`}
              >
                {actioning === showCommentModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {actioning === showCommentModal.id ? 'Submitting...' : showCommentModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
