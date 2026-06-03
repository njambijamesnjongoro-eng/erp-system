import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

const obligationTypes = ['tax', 'hr', 'payroll', 'insurance', 'procurement', 'data_protection', 'regulatory', 'licensing'];

export function ComplianceCenter() {
  const [obligations, setObligations] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [filter, setFilter] = useState({ type: '', status: '' });
  const [tab, setTab] = useState('obligations');

  useEffect(() => {
    grcApi.getComplianceObligations({ type: filter.type || undefined, status: filter.status || undefined, limit: 100 }).then(r => setObligations(r.data.data?.data || [])).catch(() => {});
    grcApi.getComplianceCalendar({ limit: 20 }).then(r => setCalendar(r.data.data?.data || [])).catch(() => {});
  }, [filter]);

  const statusColor = (s) => {
    const map = { compliant: 'bg-green-900 text-green-300', non_compliant: 'bg-red-900 text-red-300', partially_compliant: 'bg-yellow-900 text-yellow-300', unknown: 'bg-gray-600', not_applicable: 'bg-blue-900 text-blue-300' };
    return map[s] || 'bg-gray-700';
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Compliance Management Center</h1>

      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        {['obligations', 'calendar'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{t.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {tab === 'obligations' && (
        <>
          <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
            <select value={filter.type} onChange={e => setFilter(p => ({ ...p, type: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
              <option value="">All Types</option>{obligationTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
              <option value="">All Statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="non_compliant">Non-Compliant</option>
            </select>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            {obligations.length === 0 ? <p className="text-gray-500 text-sm">No compliance obligations</p> : (
              <div className="space-y-2">
                {obligations.map(o => (
                  <div key={o.id} className="bg-gray-700 rounded p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{o.title}</span>
                        <span className="ml-2 text-xs text-gray-400">{o.obligation_type?.replace(/_/g, ' ')}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColor(o.compliance_status)}`}>{o.compliance_status?.replace(/_/g, ' ')}</span>
                    </div>
                    {o.description && <p className="text-xs text-gray-400 mt-1">{o.description}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>Regulation: {o.regulation_name || 'N/A'}</span>
                      <span>Department: {o.department}</span>
                      <span>Due: {o.due_date ? new Date(o.due_date).toLocaleDateString() : 'N/A'}</span>
                      <span>Next Review: {o.next_assessment_date ? new Date(o.next_assessment_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'calendar' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Compliance Calendar</h2>
          {calendar.length === 0 ? <p className="text-gray-500 text-sm">No upcoming events</p> : (
            <div className="space-y-2">
              {calendar.map(e => (
                <div key={e.id} className="bg-gray-700 rounded p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{e.title}</span>
                      <span className="ml-2 text-xs text-gray-400">{e.event_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${e.status === 'upcoming' ? 'bg-blue-900 text-blue-300' : e.status === 'due' ? 'bg-yellow-900 text-yellow-300' : e.status === 'overdue' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{e.status}</span>
                      <span className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {e.description && <p className="text-xs text-gray-400 mt-1">{e.description}</p>}
                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                    <span>Dept: {e.department}</span>
                    <span>Assigned: {e.assigned_to_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
