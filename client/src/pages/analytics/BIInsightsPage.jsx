import { useState, useEffect } from 'react';
import { Lightbulb, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, RefreshCw, ThumbsUp } from 'lucide-react';
import { biService } from '../../api/analytics';
import { formatDate } from '../../utils/helpers';

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, bg: 'bg-red-50', color: 'text-red-600', border: 'border-red-200' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600', border: 'border-amber-200' },
  info: { icon: Lightbulb, bg: 'bg-blue-50', color: 'text-blue-600', border: 'border-blue-200' },
  positive: { icon: CheckCircle, bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-200' },
};

export function BIInsightsPage() {
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [insRes, recRes] = await Promise.all([
        biService.getInsights({ limit: 50 }),
        biService.getRecommendations(),
      ]);
      setInsights(insRes.data?.data || insRes.data || []);
      setRecommendations(recRes.data?.data || recRes.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await biService.generateInsights();
      await load();
    } catch (err) { alert(err.message); } finally { setGenerating(false); }
  };

  const handleDismiss = async (id) => {
    try { await biService.dismissInsight(id); setInsights(prev => prev.filter(i => i.id !== id)); } catch (err) { console.error(err); }
  };

  const handleResolve = async (id) => {
    try { await biService.resolveInsight(id); setInsights(prev => prev.filter(i => i.id !== id)); } catch (err) { console.error(err); }
  };

  const summary = {
    total: insights.length,
    critical: insights.filter(i => i.severity === 'critical').length,
    warning: insights.filter(i => i.severity === 'warning').length,
    resolved: insights.filter(i => i.status === 'resolved').length,
  };

  const summaryCards = [
    { label: 'Total Insights', value: summary.total, icon: Lightbulb, bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Critical', value: summary.critical, icon: XCircle, bg: 'bg-red-50', color: 'text-red-600' },
    { label: 'Warnings', value: summary.warning, icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600' },
    { label: 'Resolved', value: summary.resolved, icon: CheckCircle, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BI Insights</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered business intelligence insights</p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary gap-2">
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate Insights'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card">
              <div className="card-body flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : insights.length === 0 ? (
        <div className="card">
          <div className="card-body flex flex-col items-center justify-center py-16 text-gray-400">
            <Lightbulb className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No insights yet</p>
            <p className="text-sm mt-1">Click Generate Insights to analyze data.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insights.map((insight) => {
            const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info;
            const Icon = config.icon;
            return (
              <div key={insight.id} className={`card border-l-4 ${config.border}`}>
                <div className="card-body">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{insight.title}</h3>
                        <span className={`badge ${insight.severity === 'critical' ? 'badge-red' : insight.severity === 'warning' ? 'badge-warning' : insight.severity === 'positive' ? 'badge-success' : 'badge-info'}`}>{insight.severity}</span>
                        {insight.category && <span className="badge badge-gray">{insight.category}</span>}
                      </div>
                      <p className="text-sm text-gray-600">{insight.description}</p>
                      {insight.recommendation && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Recommendation</p>
                          <p className="text-sm text-blue-600 dark:text-blue-300">{insight.recommendation}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400">{formatDate(insight.created_at)}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleDismiss(insight.id)} className="text-xs text-gray-500 hover:text-gray-700 underline">Dismiss</button>
                          <button onClick={() => handleResolve(insight.id)} className="text-xs text-emerald-600 hover:text-emerald-800 underline flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Resolve</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Recommendations</h3></div>
          <div className="card-body p-0">
            <div className="divide-y divide-gray-100">
              {recommendations.map((rec, i) => (
                <div key={rec.id || i} className="px-6 py-4 flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                    <p className="text-sm text-gray-500">{rec.description}</p>
                    {rec.impact && <p className="text-xs text-gray-400 mt-1">Impact: {rec.impact}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
