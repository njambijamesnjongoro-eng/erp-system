import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Building2, GitBranch, Shield, Workflow, Brain, AlertTriangle, FileText,
  TrendingUp, Plus, Loader2, AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import {
  companiesService, branchesService, complianceService, workflowService, aiService, riskService, policyService,
} from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

function StatCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
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

export function EnterpriseDashboard() {
  const { dark } = useTheme();
  const [data, setData] = useState({
    companies: 0, branches: 0, complianceScore: null, workflows: 0,
    analyses: 0, risks: 0, policies: 0,
  });
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [complianceDeadlines, setComplianceDeadlines] = useState([]);
  const [activeInstances, setActiveInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        companiesRes, branchesRes, complianceRes, workflowsRes,
        aiRes, risksRes, policiesRes, instancesRes,
      ] = await Promise.allSettled([
        companiesService.getStats(),
        branchesService.getAll({ per_page: 1 }),
        complianceService.getDashboard(),
        workflowService.getStats(),
        aiService.getStats(),
        riskService.getStats(),
        policyService.getStats(),
        workflowService.getInstances({ status: 'pending', per_page: 5 }),
      ]);

      const companies = companiesRes.value?.data?.data || companiesRes.value?.data || {};
      const branchesData = branchesRes.value?.data?.data || branchesRes.value?.data || [];
      const compliance = complianceRes.value?.data?.data || complianceRes.value?.data || {};
      const workflows = workflowsRes.value?.data?.data || workflowsRes.value?.data || {};
      const ai = aiRes.value?.data?.data || aiRes.value?.data || {};
      const risks = risksRes.value?.data?.data || risksRes.value?.data || {};
      const policies = policiesRes.value?.data?.data || policiesRes.value?.data || {};
      const instances = instancesRes.value?.data?.data || instancesRes.value?.data || [];

      setData({
        companies: companies.total ?? companies.active ?? 0,
        branches: Array.isArray(branchesData) ? branchesData.length : (branchesData.total ?? 0),
        complianceScore: compliance.avg_score ?? null,
        workflows: workflows.total ?? workflows.active ?? 0,
        analyses: ai.total_analyses ?? ai.total ?? 0,
        risks: risks.total ?? risks.open ?? 0,
        policies: policies.total ?? policies.published ?? 0,
      });

      if (aiRes.value) {
        const analysesData = aiRes.value.data?.data || aiRes.value.data || [];
        setRecentAnalyses(Array.isArray(analysesData) ? analysesData.slice(0, 5) : []);
      }

      if (complianceRes.value) {
        setComplianceDeadlines(compliance.upcoming_audits || compliance.upcoming_deadlines || []);
      }

      setActiveInstances(Array.isArray(instances) ? instances : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of enterprise features</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="card"><div className="card-body space-y-3">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load dashboard</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Retry</button>
      </div>
    );
  }

  const quickActions = [
    { label: 'Run AI Analysis', icon: Brain, color: 'bg-purple-500', onClick: () => window.location.hash = '/enterprise/ai' },
    { label: 'Generate Forecast', icon: TrendingUp, color: 'bg-blue-500', onClick: () => window.location.hash = '/enterprise/forecasts' },
    { label: 'New Policy', icon: FileText, color: 'bg-emerald-500', onClick: () => window.location.hash = '/enterprise/policies' },
    { label: 'New Workflow', icon: Workflow, color: 'bg-amber-500', onClick: () => window.location.hash = '/enterprise/workflows' },
    { label: 'New Company', icon: Building2, color: 'bg-primary-600', onClick: () => window.location.hash = '/enterprise/companies' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of enterprise features</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Companies" value={data.companies} icon={Building2} color="bg-primary-600" />
        <StatCard label="Branches" value={data.branches} icon={GitBranch} color="bg-cyan-500" />
        <StatCard label="Compliance Score" value={data.complianceScore != null ? `${data.complianceScore}%` : '-'} icon={Shield} color="bg-emerald-500" />
        <StatCard label="Active Workflows" value={data.workflows} icon={Workflow} color="bg-amber-500" />
        <StatCard label="AI Analyses" value={data.analyses} icon={Brain} color="bg-purple-500" />
        <StatCard label="Risk Assessments" value={data.risks} icon={AlertTriangle} color="bg-red-500" />
        <StatCard label="Policies" value={data.policies} icon={FileText} color="bg-blue-500" />
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <button key={action.label} onClick={action.onClick} className="btn-secondary gap-2 text-sm">
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-body">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent AI Insights</h3>
            {recentAnalyses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Brain className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">No analyses yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnalyses.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.severity === 'critical' || a.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      <Brain className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.module || a.analysis_type} - {formatDate(a.created_at)}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${a.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : a.severity === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {a.severity || 'info'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Upcoming Compliance Deadlines
              </h3>
              {complianceDeadlines.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No upcoming deadlines</p>
              ) : (
                <div className="space-y-2">
                  {complianceDeadlines.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{d.title || d.name || '-'}</p>
                        <p className="text-xs text-gray-500">{formatDate(d.due_date || d.date)}</p>
                      </div>
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Workflow className="w-4 h-4 text-primary-600" />
                Active Workflow Instances
              </h3>
              {activeInstances.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No active instances</p>
              ) : (
                <div className="space-y-2">
                  {activeInstances.map((inst) => (
                    <div key={inst.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{inst.workflow_name || inst.workflow?.name || '-'}</p>
                        <p className="text-xs text-gray-500">Step: {inst.current_step || inst.step || '-'}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {inst.status || 'pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
