import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

export function GRCDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { grcApi.getDashboard().then(r => setData(r.data.data)).catch(() => {}); }, []);

  if (!data) return <div className="p-6 text-gray-400">Loading dashboard...</div>;

  const score = data.complianceScore;
  const gradeColor = score?.overall_grade === 'A' ? 'text-green-400' : score?.overall_grade === 'B' ? 'text-blue-400' : score?.overall_grade === 'C' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Governance, Risk & Compliance Dashboard</h1>

      {/* Compliance Score Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 bg-gray-800 rounded-lg p-6 text-center">
          <div className={`text-5xl font-bold ${gradeColor}`}>{score?.overall_grade || 'N/A'}</div>
          <div className="text-2xl font-bold mt-2">{score?.compliance_score?.toFixed(1) || 0}%</div>
          <div className="text-sm text-gray-400 mt-1">Compliance Score</div>
          <div className="mt-4 space-y-1 text-xs text-gray-400">
            <div className="flex justify-between"><span>Policy Acceptance</span><span>{score?.policy_acceptance_rate?.toFixed(1) || 0}%</span></div>
            <div className="flex justify-between"><span>Access Review</span><span>{score?.access_review_completion?.toFixed(1) || 0}%</span></div>
            <div className="flex justify-between"><span>Open Findings</span><span>{score?.open_findings || 0}</span></div>
            <div className="flex justify-between"><span>Open Risks</span><span>{score?.open_risks || 0}</span></div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-400">{data.policies?.published || 0}</div>
            <div className="text-sm text-gray-400">Published Policies</div>
            <div className="text-xs text-gray-500 mt-1">{data.policies?.draft || 0} in draft</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">{data.audits?.completed || 0}</div>
            <div className="text-sm text-gray-400">Completed Audits</div>
            <div className="text-xs text-gray-500 mt-1">{data.audits?.in_progress || 0} in progress</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{data.risks?.critical || 0}</div>
            <div className="text-sm text-gray-400">Critical Risks</div>
            <div className="text-xs text-gray-500 mt-1">{data.risks?.high || 0} high risks</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-400">{data.sodViolations?.open || 0}</div>
            <div className="text-sm text-gray-400">SoD Violations</div>
            <div className="text-xs text-gray-500 mt-1">{data.sodViolations?.total || 0} total</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{data.investigations?.open || 0}</div>
            <div className="text-sm text-gray-400">Open Investigations</div>
            <div className="text-xs text-gray-500 mt-1">{data.investigations?.total || 0} total</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-400">{data.accessReviews?.pending || 0}</div>
            <div className="text-sm text-gray-400">Pending Reviews</div>
            <div className="text-xs text-gray-500 mt-1">{data.accessReviews?.total || 0} total reviews</div>
          </div>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Compliance Status</h2>
          {data.compliance?.rows?.length > 0 ? (
            <div className="space-y-2">
              {data.compliance.rows.map(c => (
                <div key={c.compliance_status} className="flex justify-between items-center bg-gray-700 rounded p-2 text-sm">
                  <span className="capitalize">{c.compliance_status?.replace(/_/g, ' ') || 'Unknown'}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${c.compliance_status === 'compliant' ? 'bg-green-900 text-green-300' : c.compliance_status === 'non_compliant' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{c.c}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No compliance data</p>}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Upcoming Events</h2>
          {data.upcomingEvents?.length > 0 ? (
            <div className="space-y-2">
              {data.upcomingEvents.map(e => (
                <div key={e.id} className="bg-gray-700 rounded p-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{e.title}</span>
                    <span className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString()}</span>
                  </div>
                  <span className="text-xs text-gray-500">{e.event_type} · {e.department}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No upcoming events</p>}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Governance Activity Log</h2>
        {data.recentActivity?.length > 0 ? (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {data.recentActivity.map(a => (
              <div key={a.id} className="flex justify-between text-sm text-gray-300 py-1 border-b border-gray-700 last:border-0">
                <span><span className="text-gray-500 text-xs">{a.event_type}</span> {a.description}</span>
                <span className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-500 text-sm">No recent activity</p>}
      </div>
    </div>
  );
}
