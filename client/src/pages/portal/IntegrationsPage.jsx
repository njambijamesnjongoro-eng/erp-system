import { useState, useEffect, useCallback } from 'react';
import {
  Plug, Globe, Webhook, Activity, Plus, Power, Trash2, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Loader2, X, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { integrationService } from '../../api/portal';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatDateTime } from '../../utils/helpers';

const PROVIDER_OPTIONS = [
  { value: 'email_smtp', label: 'Email SMTP', icon: Plug },
  { value: 'sms_gateway', label: 'SMS Gateway', icon: Globe },
  { value: 'mpesa', label: 'M-Pesa', icon: Globe },
  { value: 'slack', label: 'Slack', icon: Plug },
  { value: 'whatsapp', label: 'WhatsApp', icon: Globe },
  { value: 'telegram', label: 'Telegram', icon: Plug },
  { value: 'zapier', label: 'Zapier', icon: Webhook },
  { value: 'custom_api', label: 'Custom API', icon: Plug },
];

const WEBHOOK_EVENTS = [
  'ticket.created', 'ticket.updated', 'ticket.resolved', 'ticket.closed',
  'payment.received', 'payment.failed', 'invoice.created', 'invoice.paid',
  'order.created', 'order.shipped', 'order.delivered', 'user.created',
  'user.updated', 'report.generated',
];

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-14 h-14 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card"><div className="card-body space-y-3">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div></div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500">
      <AlertTriangle className="w-10 h-10 mb-3" />
      <p className="text-lg font-medium">Failed to load</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          Retry
        </button>
      )}
    </div>
  );
}

export function IntegrationsPage() {
  const { dark } = useTheme();

  const [activeTab, setActiveTab] = useState('integrations');
  const [integrations, setIntegrations] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateIntegration, setShowCreateIntegration] = useState(false);
  const [integrationForm, setIntegrationForm] = useState({ name: '', provider: 'email_smtp', config: '{\n  \n}' });
  const [creatingIntegration, setCreatingIntegration] = useState(false);

  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', events: [], secret: '' });
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const [selectedIntegrationLogs, setSelectedIntegrationLogs] = useState(null);
  const [integrationLogs, setIntegrationLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const [selectedWebhookDeliveries, setSelectedWebhookDeliveries] = useState(null);
  const [webhookDeliveries, setWebhookDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState(null);

  const [integrationStats, setIntegrationStats] = useState({});

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await integrationService.getAll();
      setIntegrations(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWebhooks = useCallback(async () => {
    try {
      const res = await integrationService.getWebhooks();
      setWebhooks(res.data?.data || res.data || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadIntegrations();
    loadWebhooks();
  }, [loadIntegrations, loadWebhooks]);

  const loadIntegrationStats = async (id) => {
    try {
      const res = await integrationService.getStats(id);
      setIntegrationStats((prev) => ({ ...prev, [id]: res.data?.data || res.data || {} }));
    } catch (_) {}
  };

  const loadIntegrationLogs = async (integration) => {
    setSelectedIntegrationLogs(integration);
    setLogsLoading(true);
    setExpandedLogId(null);
    try {
      const res = await integrationService.getLogs(integration.id);
      setIntegrationLogs(res.data?.data || res.data || []);
      loadIntegrationStats(integration.id);
    } catch (_) {
      setIntegrationLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadWebhookDeliveries = async (webhook) => {
    setSelectedWebhookDeliveries(webhook);
    setDeliveriesLoading(true);
    setExpandedDeliveryId(null);
    try {
      const res = await integrationService.getWebhookDeliveries(webhook.id);
      setWebhookDeliveries(res.data?.data || res.data || []);
    } catch (_) {
      setWebhookDeliveries([]);
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleToggleIntegration = async (id) => {
    try {
      const res = await integrationService.toggle(id);
      setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, active: res.data?.active ?? !i.active } : i)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleCreateIntegration = async () => {
    if (!integrationForm.name.trim()) return;
    setCreatingIntegration(true);
    try {
      let config = {};
      try { config = JSON.parse(integrationForm.config); } catch (_) {}
      await integrationService.create({ ...integrationForm, config });
      setShowCreateIntegration(false);
      setIntegrationForm({ name: '', provider: 'email_smtp', config: '{\n  \n}' });
      loadIntegrations();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setCreatingIntegration(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) return;
    setCreatingWebhook(true);
    try {
      await integrationService.createWebhook(webhookForm);
      setShowCreateWebhook(false);
      setWebhookForm({ name: '', url: '', events: [], secret: '' });
      loadWebhooks();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleToggleWebhook = async (id) => {
    try {
      await integrationService.updateWebhook(id, { active: !webhooks.find((w) => w.id === id)?.active });
      setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteIntegration = async (id) => {
    if (!window.confirm('Delete this integration?')) return;
    try {
      await integrationService.delete(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      if (selectedIntegrationLogs?.id === id) setSelectedIntegrationLogs(null);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    try {
      await integrationService.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      if (selectedWebhookDeliveries?.id === id) setSelectedWebhookDeliveries(null);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleToggleEvent = (event) => {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event],
    }));
  };

  const getProviderIcon = (provider) => {
    const p = PROVIDER_OPTIONS.find((o) => o.value === provider);
    return p?.icon || Plug;
  };

  const getProviderLabel = (provider) => {
    return PROVIDER_OPTIONS.find((o) => o.value === provider)?.label || provider;
  };

  const calcSuccessRate = (logs) => {
    if (!logs || logs.length === 0) return 0;
    const success = logs.filter((l) => l.status === 'success').length;
    return Math.round((success / logs.length) * 100);
  };

  const TABS = [
    { key: 'integrations', label: 'Integrations', icon: Plug },
    { key: 'webhooks', label: 'Webhooks', icon: Webhook },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations & Webhooks</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect external services and manage webhook endpoints</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedIntegrationLogs(null); setSelectedWebhookDeliveries(null); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'integrations' && <span className="text-xs text-gray-400">({integrations.length})</span>}
              {tab.key === 'webhooks' && <span className="text-xs text-gray-400">({webhooks.length})</span>}
            </button>
          );
        })}
      </div>

      {activeTab === 'integrations' && (
        <div className="space-y-4">
          {selectedIntegrationLogs ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedIntegrationLogs(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Logs: {selectedIntegrationLogs.name}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="card">
                  <div className="card-body flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {integrationStats[selectedIntegrationLogs.id]?.success_rate != null
                          ? `${integrationStats[selectedIntegrationLogs.id].success_rate}%`
                          : `${calcSuccessRate(integrationLogs)}%`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body flex items-center gap-3">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Calls</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {integrationStats[selectedIntegrationLogs.id]?.total_calls ?? integrationLogs.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {integrationStats[selectedIntegrationLogs.id]?.failed_count ?? integrationLogs.filter((l) => l.status === 'failed').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body p-0">
                  {logsLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                  ) : integrationLogs.length === 0 ? (
                    <EmptyState icon={Activity} message="No logs recorded yet" sub="Logs will appear once the integration is used" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="w-8"></th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {integrationLogs.map((log) => (
                            <tr key={log.id}>
                              <td>
                                <button onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                  {expandedLogId === log.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </button>
                              </td>
                              <td className="font-medium text-gray-900 dark:text-white">{log.action || log.endpoint || '-'}</td>
                              <td>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  log.status === 'success'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : log.status === 'failed'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                  {log.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {log.status}
                                </span>
                              </td>
                              <td className="text-sm text-gray-500">{formatDateTime(log.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {expandedLogId && (
                <div className="card mt-2">
                  <div className="card-body">
                    {(() => {
                      const log = integrationLogs.find((l) => l.id === expandedLogId);
                      if (!log) return null;
                      return (
                        <div className="space-y-3 text-sm">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Request</h4>
                            <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 dark:text-gray-300">
                              {JSON.stringify(log.request || log.request_data || {}, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Response</h4>
                            <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 dark:text-gray-300">
                              {JSON.stringify(log.response || log.response_data || {}, null, 2)}
                            </pre>
                          </div>
                          {log.error_message && (
                            <div>
                              <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">Error</h4>
                              <p className="text-red-600 dark:text-red-400">{log.error_message}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{integrations.length} integration{integrations.length !== 1 ? 's' : ''}</p>
                <button onClick={() => setShowCreateIntegration(true)} className="btn-primary gap-2">
                  <Plus className="w-4 h-4" /> Add Integration
                </button>
              </div>

              {loading ? (
                <LoadingSkeleton rows={4} />
              ) : error ? (
                <ErrorState message={error} onRetry={loadIntegrations} />
              ) : integrations.length === 0 ? (
                <EmptyState icon={Plug} message="No integrations configured" sub="Add your first integration to connect external services" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {integrations.map((integration) => {
                    const Icon = getProviderIcon(integration.provider);
                    return (
                      <div key={integration.id} className="card group">
                        <div className="card-body">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{getProviderLabel(integration.provider)}</p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              integration.active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {integration.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="space-y-1.5 mb-4 text-xs text-gray-500 dark:text-gray-400">
                            {integration.last_sync && (
                              <div className="flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3" />
                                <span>Last sync: {formatDateTime(integration.last_sync)}</span>
                              </div>
                            )}
                            {integration.last_error && (
                              <div className="flex items-center gap-1.5 text-red-500">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="truncate" title={integration.last_error}>Error: {integration.last_error}</span>
                              </div>
                            )}
                            {!integration.last_sync && !integration.last_error && (
                              <span className="text-gray-400">No activity recorded</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={integration.active}
                                onChange={() => handleToggleIntegration(integration.id)}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                            </label>
                            <div className="flex items-center gap-1">
                              <button onClick={() => loadIntegrationLogs(integration)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 text-xs" title="View Logs">
                                <Activity className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteIntegration(integration.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-500" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          {selectedWebhookDeliveries ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedWebhookDeliveries(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Deliveries: {selectedWebhookDeliveries.name}
                  </h3>
                </div>
              </div>

              <div className="card">
                <div className="card-body p-0">
                  {deliveriesLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                  ) : webhookDeliveries.length === 0 ? (
                    <EmptyState icon={Webhook} message="No delivery attempts yet" sub="Deliveries will appear when events are triggered" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="w-8"></th>
                            <th>Event</th>
                            <th>Response Status</th>
                            <th>Result</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {webhookDeliveries.map((d) => (
                            <tr key={d.id}>
                              <td>
                                <button onClick={() => setExpandedDeliveryId(expandedDeliveryId === d.id ? null : d.id)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                  {expandedDeliveryId === d.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </button>
                              </td>
                              <td className="font-medium text-gray-900 dark:text-white">{d.event || d.event_type || '-'}</td>
                              <td>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  d.response_status >= 200 && d.response_status < 300
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {d.response_status || 'N/A'}
                                </span>
                              </td>
                              <td>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  d.success || d.status === 'success'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {(d.success || d.status === 'success') ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {(d.success || d.status === 'success') ? 'Success' : 'Failed'}
                                </span>
                              </td>
                              <td className="text-sm text-gray-500">{formatDateTime(d.created_at || d.timestamp)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {expandedDeliveryId && (
                <div className="card mt-2">
                  <div className="card-body">
                    {(() => {
                      const d = webhookDeliveries.find((del) => del.id === expandedDeliveryId);
                      if (!d) return null;
                      return (
                        <div className="space-y-3 text-sm">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Payload</h4>
                            <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 dark:text-gray-300">
                              {JSON.stringify(d.payload || d.request_data || {}, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Response</h4>
                            <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 dark:text-gray-300">
                              {JSON.stringify(d.response || d.response_data || {}, null, 2)}
                            </pre>
                          </div>
                          {d.error && (
                            <div>
                              <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">Error</h4>
                              <p className="text-red-600 dark:text-red-400">{d.error}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}</p>
                <button onClick={() => setShowCreateWebhook(true)} className="btn-primary gap-2">
                  <Plus className="w-4 h-4" /> Create Webhook
                </button>
              </div>

              {loading ? (
                <LoadingSkeleton rows={3} />
              ) : webhooks.length === 0 ? (
                <EmptyState icon={Webhook} message="No webhooks configured" sub="Create a webhook endpoint to receive event notifications" />
              ) : (
                <div className="space-y-3">
                  {webhooks.map((wh) => (
                    <div key={wh.id} className="card">
                      <div className="card-body">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Webhook className="w-4 h-4 text-gray-400" />
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{wh.name}</h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                wh.active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {wh.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1 truncate">{wh.url}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(wh.events || wh.event_types || []).map((ev) => (
                                <span key={ev} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                  {ev}
                                </span>
                              ))}
                            </div>
                            {wh.last_triggered && (
                              <p className="text-xs text-gray-400 mt-2">Last triggered: {formatDateTime(wh.last_triggered)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={wh.active}
                                onChange={() => handleToggleWebhook(wh.id)}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                            </label>
                            <button onClick={() => loadWebhookDeliveries(wh)} className="btn-secondary text-xs gap-1 py-1.5">
                              <Activity className="w-3.5 h-3.5" /> Deliveries
                            </button>
                            <button onClick={() => handleDeleteWebhook(wh.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-500" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCreateIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateIntegration(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Integration</h3>
              <button onClick={() => setShowCreateIntegration(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="Integration name"
                  value={integrationForm.name}
                  onChange={(e) => setIntegrationForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                <select
                  value={integrationForm.provider}
                  onChange={(e) => setIntegrationForm((prev) => ({ ...prev, provider: e.target.value }))}
                  className="input-field w-full"
                >
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Configuration (JSON)</label>
                <textarea
                  value={integrationForm.config}
                  onChange={(e) => setIntegrationForm((prev) => ({ ...prev, config: e.target.value }))}
                  rows={8}
                  className="input-field w-full resize-none font-mono text-xs"
                  placeholder='{\n  "api_key": "",\n  "endpoint": ""\n}'
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateIntegration(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateIntegration} disabled={creatingIntegration || !integrationForm.name.trim()} className="btn-primary disabled:opacity-50">
                {creatingIntegration ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creatingIntegration ? ' Adding...' : 'Add Integration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateWebhook(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Webhook</h3>
              <button onClick={() => setShowCreateWebhook(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="Webhook name"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL *</label>
                <input
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm((prev) => ({ ...prev, url: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Events</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={webhookForm.events.includes(ev)}
                        onChange={() => handleToggleEvent(ev)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                      {ev}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret</label>
                <input
                  type="text"
                  placeholder="Optional signing secret"
                  value={webhookForm.secret}
                  onChange={(e) => setWebhookForm((prev) => ({ ...prev, secret: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateWebhook(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateWebhook} disabled={creatingWebhook || !webhookForm.name.trim() || !webhookForm.url.trim()} className="btn-primary disabled:opacity-50">
                {creatingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creatingWebhook ? ' Creating...' : 'Create Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
