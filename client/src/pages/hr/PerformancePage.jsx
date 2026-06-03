import { useState, useEffect } from 'react';
import { BarChart3, Plus, Star } from 'lucide-react';
import { performanceService } from '../../api/hr';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function PerformancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'HR Officer', 'Manager');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: '', reviewerId: '', reviewPeriod: '', reviewDate: new Date().toISOString().slice(0, 10),
    overallRating: '', kpiScore: '', goals: '', achievements: '',
    strengths: '', areasForImprovement: '', reviewerComments: '', status: 'draft'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data } = await performanceService.list({ limit: 50 });
      setReviews(data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await performanceService.create(form);
      setShowForm(false);
      fetchReviews();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Management</h1>
          <p className="text-gray-500 dark:text-gray-400">KPI tracking and performance reviews</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> New Review
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-400">Total Reviews</p>
          <p className="text-2xl font-bold">{reviews.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400">Draft</p>
          <p className="text-2xl font-bold text-gray-500">{reviews.filter(r => r.status === 'draft').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{reviews.filter(r => r.status === 'completed').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400">Avg Rating</p>
          <p className="text-2xl font-bold text-primary-600">
            {reviews.length > 0 ? (reviews.reduce((a, r) => a + (r.overall_rating || 0), 0) / reviews.length).toFixed(1) : '-'}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Performance Reviews</h3></div>
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No performance reviews</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Review Period</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reviewer</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">KPI Score</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {reviews.map(r => (
                    <tr key={r.id}>
                      <td className="px-6 py-3 text-sm font-medium">{r.full_name}</td>
                      <td className="px-6 py-3 text-sm">{r.review_period}</td>
                      <td className="px-6 py-3 text-sm">{r.reviewer_name || '-'}</td>
                      <td className="px-6 py-3">
                        {r.overall_rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-medium">{r.overall_rating}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-3 text-sm">{r.kpi_score ? `${r.kpi_score}%` : '-'}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          r.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-6 py-3 text-sm">{formatDate(r.review_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">New Performance Review</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="input-label">Employee ID</label>
                  <input value={form.employeeId} onChange={(e) => setForm({...form, employeeId: e.target.value})}
                    className="input-field" required /></div>
                <div><label className="input-label">Reviewer ID</label>
                  <input value={form.reviewerId} onChange={(e) => setForm({...form, reviewerId: e.target.value})}
                    className="input-field" /></div>
                <div><label className="input-label">Review Period</label>
                  <input value={form.reviewPeriod} onChange={(e) => setForm({...form, reviewPeriod: e.target.value})}
                    className="input-field" placeholder="e.g. Q1 2026" required /></div>
                <div><label className="input-label">Review Date</label>
                  <input type="date" value={form.reviewDate} onChange={(e) => setForm({...form, reviewDate: e.target.value})}
                    className="input-field" /></div>
                <div><label className="input-label">Overall Rating (1-5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={form.overallRating}
                    onChange={(e) => setForm({...form, overallRating: e.target.value})} className="input-field" /></div>
                <div><label className="input-label">KPI Score (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.kpiScore}
                    onChange={(e) => setForm({...form, kpiScore: e.target.value})} className="input-field" /></div>
                <div className="col-span-2"><label className="input-label">Goals & Objectives</label>
                  <textarea value={form.goals} onChange={(e) => setForm({...form, goals: e.target.value})}
                    className="input-field" rows={3} /></div>
                <div className="col-span-2"><label className="input-label">Achievements</label>
                  <textarea value={form.achievements} onChange={(e) => setForm({...form, achievements: e.target.value})}
                    className="input-field" rows={3} /></div>
                <div className="col-span-2"><label className="input-label">Strengths</label>
                  <textarea value={form.strengths} onChange={(e) => setForm({...form, strengths: e.target.value})}
                    className="input-field" rows={2} /></div>
                <div className="col-span-2"><label className="input-label">Areas for Improvement</label>
                  <textarea value={form.areasForImprovement} onChange={(e) => setForm({...form, areasForImprovement: e.target.value})}
                    className="input-field" rows={2} /></div>
                <div className="col-span-2"><label className="input-label">Reviewer Comments</label>
                  <textarea value={form.reviewerComments} onChange={(e) => setForm({...form, reviewerComments: e.target.value})}
                    className="input-field" rows={3} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Create Review'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
