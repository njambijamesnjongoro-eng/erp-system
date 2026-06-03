import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown, Search, Filter, AlertCircle } from 'lucide-react';
import { approvalService } from '../../api/procurement';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const URGENCY_COLORS = {
  low: 'emerald',
  medium: 'amber',
  high: 'orange',
  critical: 'red',
};

export function ProcurementApprovals() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [pendingList, setPendingList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved_today: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [comments, setComments] = useState('');

  const fetchPending = async () => {
    try {
      const res = await approvalService.getPending();
      setPendingList(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await approvalService.getHistory();
      setHistoryList(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await approvalService.getStats();
      setStats(res.data?.data || res.data || { pending: 0, approved_today: 0, rejected: 0 });
    } catch (err) {
      /* ignore */
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPending(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab]);

  const openActionModal = (req, action) => {
    setSelectedRequest(req);
    setActionType(action);
    setComments('');
    setShowModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest) return;
    try {
      if (actionType === 'approve') {
        await approvalService.approve(selectedRequest.id, { comments });
      } else {
        await approvalService.reject(selectedRequest.id, { comments });
      }
      setShowModal(false);
      setSelectedRequest(null);
      setActionType(null);
      setComments('');
      await Promise.all([fetchPending(), fetchStats()]);
    } catch (err) {
      alert(err.message);
    }
  };

  const daysPending = (createdAt) => {
    const diff = new Date() - new Date(createdAt);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>;
  if (error) return <div className="text-red-500 p-4">Error loading approvals: {error}</div>;

  const statCards = [
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved Today', value: stats.approved_today, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve purchase requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((sc) => {
          const Icon = sc.icon;
          return (
            <div key={sc.label} className="card">
              <div className="card-body flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${sc.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${sc.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{sc.label}</p>
                  <p className={`text-xl font-bold ${sc.color}`}>{sc.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-4">
            <button
              onClick={() => setTab('pending')}
              className={`btn btn-sm ${tab === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setTab('history')}
              className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
            >
              History
            </button>
          </div>
        </div>

        {tab === 'pending' && (
          <div className="card-body p-0">
            {pendingList.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No pending approvals</div>
            ) : (
              <div className="divide-y">
                {pendingList.map((req) => (
                  <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-500">#{req.request_number ?? req.id}</span>
                          <span className={`badge badge-${URGENCY_COLORS[req.urgency] || 'gray'}`}>{req.urgency}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {daysPending(req.created_at)} days pending
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate">{req.title}</h4>
                        <p className="text-sm text-gray-500">
                          {req.requester_name ?? req.requester?.name} &middot; {fmt(req.total ?? req.estimated_total)}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => openActionModal(req, 'approve')}
                          className="btn btn-sm btn-primary inline-flex items-center gap-1"
                        >
                          <ThumbsUp className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => openActionModal(req, 'reject')}
                          className="btn btn-sm btn-secondary inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <ThumbsDown className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Request#</th>
                    <th>Title</th>
                    <th>Requester</th>
                    <th>Action</th>
                    <th>Date</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No approval history</td></tr>
                  ) : historyList.map((entry) => (
                    <tr key={entry.id}>
                      <td className="font-mono text-sm">#{entry.request_number ?? entry.request_id}</td>
                      <td className="max-w-[160px] truncate font-medium">{entry.title}</td>
                      <td>{entry.requester_name ?? entry.requester?.name}</td>
                      <td>
                        <span className={`badge ${entry.action === 'approved' ? 'badge-emerald' : 'badge-red'}`}>
                          {entry.action === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{formatDateTime(entry.action_date ?? entry.created_at)}</td>
                      <td className="max-w-[200px] truncate text-sm text-gray-500">{entry.comments || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">
                {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h2>
              {selectedRequest && (
                <p className="text-sm text-gray-500 mt-1">
                  #{selectedRequest.request_number ?? selectedRequest.id} &mdash; {selectedRequest.title}
                </p>
              )}
            </div>
            <div className="p-6">
              <label className="label">Comments</label>
              <textarea
                className="input"
                rows={4}
                placeholder={actionType === 'approve' ? 'Approval notes (optional)...' : 'Reason for rejection...'}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
              {actionType === 'reject' && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Please provide a reason for rejection.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleConfirmAction}
                className={`btn ${actionType === 'approve' ? 'btn-primary' : 'btn-danger'}`}
              >
                {actionType === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
