import { useState, useEffect, useCallback } from 'react';
import {
  Brain, Plus, Search, Loader2, X, AlertTriangle, CheckCircle, BarChart3, Activity, Cpu, Trash2,
} from 'lucide-react';
import { aiService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const TABS = ['Analyses', 'AI Models', 'Anomaly Detection'];

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  info: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const DETECTION_TYPES = [
  { key: 'anomalies', label: 'Anomaly Detection', icon: Activity, color: 'bg-red-500' },
  { key: 'maintenance', label: 'Predictive Maintenance', icon: Cpu, color: 'bg-blue-500' },
  { key: 'procurement', label: 'Procurement Anomalies', icon: BarChart3, color: 'bg-orange-500' },
  { key: 'payroll', label: 'Payroll Anomalies', icon: AlertTriangle, color: 'bg-purple-500' },
  { key: 'insights', label: 'Generate Insights', icon: Brain, color: 'bg-emerald-500' },
];

const DETECTION_METHODS = {
  anomalies: aiService.detectAnomalies,
  maintenance: aiService.predictMaintenance,
  procurement: aiService.procurementAnomalies,
  payroll: aiService.payrollAnomalies,
  insights: aiService.generateInsights,
};

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-14 h-14 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '-'}</p>
        </div>
      </div>
    </div>
  );
}

const initialModelForm = { name: '', model_type: 'classification', target_entity: '', description: '' };

export function AIAnalyticsPage() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('Analyses');
  const [analyses, setAnalyses] = useState([]);
  const [models, setModels] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModelModal, setShowModelModal] = useState(false);
  const [modelForm, setModelForm] = useState(initialModelForm);
  const [saving, setSaving] = useState(false);
  const [runningDetection, setRunningDetection] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      const promises = [aiService.getAnalyses(params), aiService.getStats()];
      if (activeTab === 'AI Models') promises.push(aiService.getModels());
      const [analysesRes, statsRes, modelsRes] = await Promise.all(promises);
      setAnalyses(analysesRes.data?.data || analysesRes.data || []);
      setStats(statsRes.data?.data || statsRes.data || null);
      if (modelsRes) setModels(modelsRes.data?.data || modelsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterType, activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRunDetection = async (type) => {
    setRunningDetection(type);
    try {
      const method = DETECTION_METHODS[type];
      if (method) {
        const res = await method({});
        if (res.data?.data) {
          setAnalyses((prev) => [...res.data.data, ...prev]);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setRunningDetection(null);
    }
  };

  const handleActionAnalysis = async (id) => {
    try {
      await aiService.actionAnalysis(id);
      setAnalyses((prev) => prev.map((a) => (a.id === id ? { ...a, actioned: true, actioned_at: new Date().toISOString() } : a)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleCreateModel = async () => {
    if (!modelForm.name.trim()) return;
    setSaving(true);
    try {
      await aiService.createModel(modelForm);
      setShowModelModal(false);
      setModelForm(initialModelForm);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTrainModel = async (id) => {
    try {
      await aiService.trainModel(id);
      setModels((prev) => prev.map((m) => (m.id === id ? { ...m, training_status: 'training' } : m)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteModel = async (id) => {
    if (!window.confirm('Delete this model?')) return;
    try {
      await aiService.deleteModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (loading && analyses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Analyses, models, and anomaly detection</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card"><div className="card-body space-y-3">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div></div>
          ))}
        </div>
        <div className="card"><div className="card-body p-0">
          <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
        </div></div>
      </div>
    );
  }

  if (error && analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load AI data</p>
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
            <Brain className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Analytics</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{analyses.length} analyses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Analyses" value={stats?.total_analyses ?? analyses.length} icon={Brain} color="bg-primary-600" />
        <StatCard label="Anomalies Found" value={stats?.anomalies_found ?? analyses.filter(a => a.severity === 'critical' || a.severity === 'high').length} icon={AlertTriangle} color="bg-red-500" />
        <StatCard label="Avg Confidence" value={stats?.avg_confidence != null ? `${Math.round(stats.avg_confidence * 100)}%` : '-'} icon={BarChart3} color="bg-blue-500" />
        <StatCard label="AI Models" value={stats?.total_models ?? models.length} icon={Cpu} color="bg-purple-500" />
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

      {activeTab === 'Analyses' && (
        <>
          <div className="card">
            <div className="card-body p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search analyses..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 w-full" />
                </div>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field w-auto min-w-[140px]">
                  <option value="">All Types</option>
                  <option value="anomaly">Anomaly</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="procurement">Procurement</option>
                  <option value="payroll">Payroll</option>
                  <option value="insight">Insight</option>
                </select>
              </div>
            </div>
            {analyses.length === 0 ? (
              <EmptyState icon={Brain} message="No analyses found" sub="Run a detection to generate analyses" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Module</th>
                      <th>Title</th>
                      <th>Severity</th>
                      <th>Confidence</th>
                      <th>Actioned</th>
                      <th>Created</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a) => (
                      <tr key={a.id}>
                        <td><span className="text-xs font-medium text-gray-600 dark:text-gray-400">{a.analysis_type || a.type || '-'}</span></td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{a.module || '-'}</td>
                        <td className="text-sm font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{a.title}</td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info}`}>
                            {a.severity || 'info'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{a.confidence != null ? `${Math.round(a.confidence * 100)}%` : '-'}</td>
                        <td>
                          {a.actioned ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="text-sm text-gray-500">{formatDate(a.created_at)}</td>
                        <td className="text-right">
                          {!a.actioned && (
                            <button onClick={() => handleActionAnalysis(a.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-emerald-500" title="Mark Actioned">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'Anomaly Detection' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DETECTION_TYPES.map((dt) => (
            <div key={dt.key} className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dt.color}`}>
                    <dt.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{dt.label}</h3>
                </div>
                <button
                  onClick={() => handleRunDetection(dt.key)}
                  disabled={runningDetection === dt.key}
                  className="btn-primary w-full gap-2 disabled:opacity-50"
                >
                  {runningDetection === dt.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  {runningDetection === dt.key ? 'Running...' : 'Run Detection'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'AI Models' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setModelForm(initialModelForm); setShowModelModal(true); }} className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> Create Model
            </button>
          </div>
          <div className="card">
            {models.length === 0 ? (
              <div className="card-body"><EmptyState icon={Cpu} message="No AI models" sub="Create your first AI model" /></div>
            ) : (
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Accuracy</th>
                        <th>Training Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map((m) => (
                        <tr key={m.id}>
                          <td className="font-medium text-gray-900 dark:text-white">{m.name}</td>
                          <td className="text-sm text-gray-600 dark:text-gray-400">{m.model_type || '-'}</td>
                          <td className="text-sm text-gray-600 dark:text-gray-400">{m.target_entity || '-'}</td>
                          <td className="text-sm text-gray-600 dark:text-gray-400">{m.accuracy != null ? `${Math.round(m.accuracy * 100)}%` : '-'}</td>
                          <td>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.training_status === 'trained' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : m.training_status === 'training' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {m.training_status || 'untrained'}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleTrainModel(m.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-500" title="Train">
                                <BarChart3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteModel(m.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showModelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModelModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create AI Model</h3>
              <button onClick={() => setShowModelModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" placeholder="Model name" value={modelForm.name} onChange={(e) => setModelForm((p) => ({ ...p, name: e.target.value }))} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={modelForm.model_type} onChange={(e) => setModelForm((p) => ({ ...p, model_type: e.target.value }))} className="input-field w-full">
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                  <option value="clustering">Clustering</option>
                  <option value="anomaly">Anomaly Detection</option>
                  <option value="forecasting">Forecasting</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Entity</label>
                <input type="text" placeholder="e.g. maintenance, procurement" value={modelForm.target_entity} onChange={(e) => setModelForm((p) => ({ ...p, target_entity: e.target.value }))} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea placeholder="Model description" value={modelForm.description} onChange={(e) => setModelForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="input-field w-full resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModelModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateModel} disabled={saving || !modelForm.name.trim()} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? ' Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
