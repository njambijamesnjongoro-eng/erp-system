import { useState, useEffect, useCallback } from 'react';
import {
  Ticket, Plus, Search, MessageSquare, Paperclip, Clock, AlertTriangle, CheckCircle,
  Loader2, X, ChevronDown, ChevronUp, User, Filter
} from 'lucide-react';
import { ticketService } from '../../api/portal';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatDateTime } from '../../utils/helpers';

const STATUS_OPTIONS = ['All', 'Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Critical'];
const CATEGORY_OPTIONS = ['All', 'IT Support', 'HR', 'Asset Maintenance', 'Procurement', 'Complaint', 'General'];

const PRIORITY_COLORS = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_COLORS = {
  Open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Waiting on Customer': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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

export function SupportTickets() {
  const { dark } = useTheme();

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', category: 'General', priority: 'Medium', description: '' });
  const [creating, setCreating] = useState(false);

  const [assigning, setAssigning] = useState(null);
  const [assignTo, setAssignTo] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (priorityFilter !== 'All') params.priority = priorityFilter;
      if (categoryFilter !== 'All') params.category = categoryFilter;
      if (search) params.search = search;
      const [ticketRes, statsRes] = await Promise.all([
        ticketService.getAll(params),
        ticketService.getStats(),
      ]);
      setTickets(ticketRes.data?.data || ticketRes.data || []);
      setStats(statsRes.data?.data || statsRes.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadMessages = async (ticketId) => {
    setMessagesLoading(true);
    try {
      const res = await ticketService.getMessages(ticketId);
      setMessages(res.data?.data || res.data || []);
    } catch (err) {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleExpand = (ticket) => {
    if (expandedId === ticket.id) {
      setExpandedId(null);
      setSelectedTicket(null);
      setMessages([]);
      return;
    }
    setExpandedId(ticket.id);
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  };

  const handleCreateTicket = async () => {
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      await ticketService.create(createForm);
      setShowCreateModal(false);
      setCreateForm({ title: '', category: 'General', priority: 'Medium', description: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleChangeStatus = async (id, status) => {
    try {
      await ticketService.updateStatus(id, { status });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleAssign = async (id) => {
    if (!assignTo) return;
    try {
      await ticketService.assign(id, { assigned_to: assignTo });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, assigned_to: assignTo } : t)));
      setAssigning(null);
      setAssignTo('');
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      await ticketService.addMessage(selectedTicket.id, { message: newMessage });
      setNewMessage('');
      loadMessages(selectedTicket.id);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await ticketService.uploadAttachment(selectedTicket.id, formData);
      loadMessages(selectedTicket.id);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
    e.target.value = '';
  };

  const getAvgResolutionTime = () => {
    if (!stats) return '-';
    return stats.avg_resolution_time || stats.averageResolutionTime || '-';
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and track support requests</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card"><div className="card-body space-y-3">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div></div>
          ))}
        </div>
        <div className="card"><div className="card-body p-0">
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div></div>
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load tickets</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stats?.total ?? tickets.length} total tickets</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Create Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tickets" value={stats?.total ?? tickets.length} icon={Ticket} color="bg-primary-600" />
        <StatCard label="Open Tickets" value={stats?.open ?? stats?.open_count ?? 0} icon={Clock} color="bg-orange-500" />
        <StatCard label="High / Critical" value={stats?.high_critical ?? stats?.highCriticalCount ?? 0} icon={AlertTriangle} color="bg-red-500" />
        <StatCard label="Avg Resolution Time" value={getAvgResolutionTime()} icon={CheckCircle} color="bg-blue-500" />
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[130px]">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input-field w-auto min-w-[120px]">
                  {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field w-auto min-w-[150px]">
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {tickets.length === 0 ? (
            <EmptyState icon={Ticket} message="No tickets found" sub={search ? 'Try adjusting your search or filters' : 'Create your first support ticket'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>Ticket #</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Requester</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <button onClick={() => handleExpand(t)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                          {expandedId === t.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                      </td>
                      <td className="font-mono text-sm font-medium text-gray-900 dark:text-white">#{t.ticket_no || t.id}</td>
                      <td className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{t.title}</td>
                      <td><span className="text-xs text-gray-600 dark:text-gray-400">{t.category}</span></td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.Medium}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || STATUS_COLORS.Open}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{t.requester || t.requested_by || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{t.assigned_to || 'Unassigned'}</td>
                      <td className="text-sm text-gray-500">{formatDate(t.created_at)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleExpand(t)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="View">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {assigning === t.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Employee name"
                                value={assignTo}
                                onChange={(e) => setAssignTo(e.target.value)}
                                className="input-field text-xs w-28 py-1"
                              />
                              <button onClick={() => handleAssign(t.id)} className="p-1 text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => { setAssigning(null); setAssignTo(''); }} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => { setAssigning(t.id); setAssignTo(t.assigned_to || ''); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Assign">
                              <User className="w-4 h-4" />
                            </button>
                          )}
                          <select
                            value=""
                            onChange={(e) => { if (e.target.value) handleChangeStatus(t.id, e.target.value); }}
                            className="text-xs bg-transparent border-none cursor-pointer text-gray-500 focus:outline-none p-1"
                            title="Change Status"
                          >
                            <option value="" disabled>Status</option>
                            {STATUS_OPTIONS.filter((s) => s !== 'All' && s !== t.status).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedTicket && expandedId && (
        <div className="card">
          <div className="card-body p-0">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTicket.title}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedTicket.status] || STATUS_COLORS.Open}`}>
                  {selectedTicket.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedTicket.description || 'No description provided.'}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>Category: {selectedTicket.category}</span>
                <span>Priority: {selectedTicket.priority}</span>
                <span>Created: {formatDateTime(selectedTicket.created_at)}</span>
              </div>
            </div>

            <div className="p-5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Conversation</h4>
              </div>
              {messagesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No messages yet</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-900 dark:text-white">{msg.sender || msg.user_name || 'User'}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(msg.created_at)}</p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{msg.message || msg.body || msg.text}</p>
                        {msg.attachment_url && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-1"
                          >
                            <Paperclip className="w-3 h-3" /> Attachment
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2 mt-4">
                <textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="input-field flex-1 min-h-[60px] text-sm resize-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                />
                <div className="flex flex-col gap-2">
                  <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="btn-primary p-2 disabled:opacity-50" title="Send">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <label className="btn-secondary p-2 cursor-pointer" title="Upload Attachment">
                    <Paperclip className="w-4 h-4" />
                    <input type="file" className="hidden" onChange={handleUploadAttachment} />
                  </label>
                </div>
              </div>
            </div>

            {selectedTicket.activity_log && selectedTicket.activity_log.length > 0 && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Activity Log</h4>
                </div>
                <div className="space-y-2">
                  {selectedTicket.activity_log.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-white">{log.user || log.performed_by}</span>
                          {' '}{log.action || log.description}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Support Ticket</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="Brief summary of the issue"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="input-field w-full"
                >
                  {CATEGORY_OPTIONS.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, priority: e.target.value }))}
                  className="input-field w-full"
                >
                  {PRIORITY_OPTIONS.filter((p) => p !== 'All').map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  placeholder="Detailed description of the issue..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="input-field w-full resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateTicket} disabled={creating || !createForm.title.trim()} className="btn-primary disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creating ? ' Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
