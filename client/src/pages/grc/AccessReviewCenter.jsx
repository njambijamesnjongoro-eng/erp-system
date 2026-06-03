import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

export function AccessReviewCenter() {
  const [reviews, setReviews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', reviewType: 'quarterly', department: '', reviewerName: '', scheduledStartDate: '', scheduledEndDate: '' });

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = () => {
    grcApi.getAccessReviews({ limit: 100 }).then(r => setReviews(r.data.data?.data || [])).catch(() => {});
  };

  const handleCreate = async () => {
    await grcApi.createAccessReview(form);
    setShowForm(false);
    setForm({ title: '', reviewType: 'quarterly', department: '', reviewerName: '', scheduledStartDate: '', scheduledEndDate: '' });
    fetchReviews();
  };

  const handleSelect = async (id) => {
    const r = await grcApi.getAccessReview(id);
    setSelected(r.data.data);
  };

  const handleDecision = async (entryId, decision) => {
    await grcApi.updateAccessReviewEntry(entryId, { reviewDecision: decision });
    if (selected) handleSelect(selected.review_id);
  };

  const getStatus = (r) => {
    if (!selected) return 'bg-gray-600';
    const total = selected.entries?.length || 0;
    if (total === 0) return 'bg-gray-600';
    const reviewed = selected.entries.filter(e => e.review_decision !== 'pending').length;
    const pct = (reviewed / total) * 100;
    return pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-yellow-500' : 'bg-red-500';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Access Review & Certification</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">{showForm ? 'Cancel' : 'New Review'}</button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Review Title" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.reviewType} onChange={e => setForm(p => ({ ...p, reviewType: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              <option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="ad_hoc">Ad-Hoc</option><option value="triggered">Triggered</option>
            </select>
            <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Department" className="bg-gray-700 px-3 py-2 rounded text-sm" />
          </div>
          <input value={form.reviewerName} onChange={e => setForm(p => ({ ...p, reviewerName: e.target.value }))} placeholder="Reviewer Name" className="bg-gray-700 px-3 py-2 rounded text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.scheduledStartDate} onChange={e => setForm(p => ({ ...p, scheduledStartDate: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm" />
            <input type="date" value={form.scheduledEndDate} onChange={e => setForm(p => ({ ...p, scheduledEndDate: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm" />
          </div>
          <button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">Create Review</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Reviews</h2>
          {reviews.length === 0 ? <p className="text-gray-500 text-sm">No access reviews</p> : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {reviews.map(r => (
                <div key={r.id} onClick={() => handleSelect(r.review_id)} className={`bg-gray-700 rounded p-3 text-sm cursor-pointer hover:bg-gray-600 ${selected?.review_id === r.review_id ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{r.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'completed' ? 'bg-green-900 text-green-300' : r.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' : 'bg-blue-900 text-blue-300'}`}>{r.status}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>{r.review_type}</span><span>{r.department}</span>
                    <span>{r.reviewed_users}/{r.total_users} reviewed</span>
                    {r.flagged_users > 0 && <span className="text-red-400">{r.flagged_users} flagged</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="mb-3">
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <div className="flex gap-3 text-xs text-gray-400 mt-1">
                <span>{selected.review_type}</span><span>Dept: {selected.department}</span>
                <span>Reviewer: {selected.reviewer_name}</span>
                <span>{selected.scheduled_start_date?.slice(0, 10)} → {selected.scheduled_end_date?.slice(0, 10)}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div className={`h-2 rounded-full ${getStatus()} transition-all`} style={{ width: `${selected.entries?.length > 0 ? (selected.entries.filter(e => e.review_decision !== 'pending').length / selected.entries.length) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{selected.entries?.filter(e => e.review_decision !== 'pending').length || 0}/{selected.entries?.length || 0} reviewed</span>
                <span>{selected.entries?.filter(e => e.review_decision === 'flagged').length || 0} flagged</span>
              </div>
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {(selected.entries || []).map(e => (
                <div key={e.id} className="bg-gray-700 rounded p-2 text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{e.user_name}</span>
                      <span className="text-xs text-gray-400 ml-2">{e.role_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${e.review_decision === 'approved' ? 'bg-green-900 text-green-300' : e.review_decision === 'revoked' ? 'bg-red-900 text-red-300' : e.review_decision === 'flagged' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-600'}`}>
                        {e.review_decision}
                      </span>
                      {e.review_decision === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleDecision(e.id, 'approved')} className="text-xs bg-green-700 hover:bg-green-600 px-2 py-0.5 rounded">Approve</button>
                          <button onClick={() => handleDecision(e.id, 'flagged')} className="text-xs bg-yellow-700 hover:bg-yellow-600 px-2 py-0.5 rounded">Flag</button>
                          <button onClick={() => handleDecision(e.id, 'revoked')} className="text-xs bg-red-700 hover:bg-red-600 px-2 py-0.5 rounded">Revoke</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{e.department} · {e.user_email}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
