import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Plus, Search, Loader2, X, AlertTriangle, DollarSign, Package, BarChart3,
} from 'lucide-react';
import { aiService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const TABS = ['Revenue', 'Expenses', 'Inventory Demand'];

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

export function ForecastsPage() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('Revenue');
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showActualModal, setShowActualModal] = useState(null);
  const [actualValue, setActualValue] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { type: activeTab.toLowerCase().replace(' ', '_') };
      if (search) params.search = search;
      const res = await aiService.getAnalyses(params);
      setForecasts(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const typeMap = { Revenue: 'generate-insights', Expenses: 'generate-insights', 'Inventory Demand': 'predict-maintenance' };
      const method = aiService[typeMap[activeTab] === 'predict-maintenance' ? 'predictMaintenance' : 'generateInsights'];
      const res = await method({ forecast_type: activeTab.toLowerCase().replace(' ', '_') });
      if (res.data?.data) {
        setForecasts((prev) => [res.data.data, ...prev]);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordActual = async () => {
    if (!actualValue) return;
    try {
      await aiService.createAnalysis({
        type: 'forecast_actual',
        title: `Actual ${activeTab} Value`,
        value: actualValue,
        module: activeTab.toLowerCase().replace(' ', '_'),
      });
      setShowActualModal(null);
      setActualValue('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const chartData = forecasts.filter(f => f.predicted_value != null || f.value != null).slice(0, 12);

  if (loading && forecasts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forecasts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Predictive forecasting for business metrics</p>
          </div>
        </div>
        <div className="card"><div className="card-body p-0">
          <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
        </div></div>
      </div>
    );
  }

  if (error && forecasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load forecasts</p>
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
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forecasts</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{forecasts.length} forecasts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowActualModal(true)} className="btn-secondary gap-2"><BarChart3 className="w-4 h-4" /> Record Actual</button>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary gap-2 disabled:opacity-50">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Generate Forecast'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Forecasts" value={forecasts.length} icon={TrendingUp} color="bg-primary-600" />
        <StatCard label="Avg Accuracy" value={forecasts.length > 0 ? `${Math.round(forecasts.reduce((s, f) => s + (f.accuracy || f.confidence || 0), 0) / forecasts.length * 100)}%` : '-'} icon={BarChart3} color="bg-blue-500" />
        <StatCard label="Revenue Forecasts" value={forecasts.filter(f => f.module === 'revenue' || activeTab === 'Revenue').length} icon={DollarSign} color="bg-emerald-500" />
        <StatCard label="Demand Forecasts" value={forecasts.filter(f => f.module === 'inventory_demand' || activeTab === 'Inventory Demand').length} icon={Package} color="bg-orange-500" />
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
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

      {chartData.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{activeTab} Forecast vs Actual</h3>
            <div className="relative h-48 bg-gray-50 dark:bg-gray-800/30 rounded-lg overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {chartData.map((d, i) => {
                  const x = (i / Math.max(chartData.length - 1, 1)) * 580 + 10;
                  const predicted = d.predicted_value || d.value || 0;
                  const actual = d.actual_value || 0;
                  const maxVal = Math.max(...chartData.map(c => Math.max(c.predicted_value || c.value || 0, c.actual_value || 0)), 1);
                  const yPred = 160 - (predicted / maxVal) * 140;
                  const yAct = 160 - (actual / maxVal) * 140;
                  return (
                    <g key={i}>
                      {i > 0 && (() => {
                        const prevX = ((i - 1) / Math.max(chartData.length - 1, 1)) * 580 + 10;
                        const prevPred = (chartData[i - 1].predicted_value || chartData[i - 1].value || 0);
                        const prevAct = (chartData[i - 1].actual_value || 0);
                        const prevYPred = 160 - (prevPred / maxVal) * 140;
                        const prevYAct = 160 - (prevAct / maxVal) * 140;
                        return (
                          <>
                            <line x1={prevX} y1={prevYPred} x2={x} y2={yPred} stroke="#6366f1" strokeWidth="2" strokeDasharray="4,2" />
                            <polygon points={`${prevX},${prevYPred} ${x},${yPred} ${x},160 ${prevX},160`} fill="url(#predictedGrad)" />
                            {actual > 0 && <line x1={prevX} y1={prevYAct} x2={x} y2={yAct} stroke="#10b981" strokeWidth="2" />}
                          </>
                        );
                      })()}
                      <circle cx={x} cy={yPred} r="3" fill="#6366f1" />
                      {actual > 0 && <circle cx={x} cy={yAct} r="3" fill="#10b981" />}
                    </g>
                  );
                })}
              </svg>
              <div className="absolute bottom-2 left-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" /> Predicted</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Actual</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search forecasts..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 w-full" />
            </div>
          </div>
          {forecasts.length === 0 ? (
            <EmptyState icon={TrendingUp} message="No forecasts" sub="Generate your first forecast" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Predicted</th>
                    <th>Actual</th>
                    <th>Variance</th>
                    <th>Confidence</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f) => {
                    const predicted = f.predicted_value || f.value || 0;
                    const actual = f.actual_value || 0;
                    const variance = actual ? ((actual - predicted) / predicted * 100).toFixed(1) : '-';
                    return (
                      <tr key={f.id}>
                        <td className="text-sm font-medium text-gray-900 dark:text-white">{f.period || f.title || formatDate(f.created_at)}</td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">${Number(predicted).toLocaleString()}</td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{actual ? `$${Number(actual).toLocaleString()}` : '-'}</td>
                        <td className={`text-sm ${actual ? (variance > 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
                          {actual ? `${variance}%` : '-'}
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{f.confidence ? `${Math.round(f.confidence * 100)}%` : '-'}</td>
                        <td className="text-sm text-gray-500">{formatDate(f.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showActualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowActualModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Record Actual - {activeTab}</h3>
              <button onClick={() => setShowActualModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Value</label>
              <input type="number" placeholder="Enter actual value" value={actualValue} onChange={(e) => setActualValue(e.target.value)} className="input-field w-full" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowActualModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleRecordActual} disabled={!actualValue} className="btn-primary disabled:opacity-50">Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
