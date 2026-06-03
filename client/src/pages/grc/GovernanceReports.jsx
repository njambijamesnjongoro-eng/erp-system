import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

const reportTypes = [
  { key: 'compliance', label: 'Compliance Report' },
  { key: 'audit', label: 'Audit Report' },
  { key: 'risk', label: 'Risk Report' },
  { key: 'policy', label: 'Policy Report' },
  { key: 'access_review', label: 'Access Review Report' },
  { key: 'sod', label: 'SoD Violations Report' },
  { key: 'governance_summary', label: 'Governance Summary' },
];

export function GovernanceReports() {
  const [reports, setReports] = useState([]);
  const [selectedType, setSelectedType] = useState('governance_summary');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = () => {
    grcApi.getReports({ limit: 50 }).then(r => setReports(r.data.data?.data || [])).catch(() => {});
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await grcApi.generateReport({
        reportType: selectedType,
        title: reportTypes.find(t => t.key === selectedType)?.label || selectedType,
        scope: 'Enterprise-wide',
        periodStart: new Date(Date.now() - 90 * 86400000).toISOString(),
        periodEnd: new Date().toISOString(),
      });
      setPreview(r.data.data);
      fetchReports();
    } catch (e) { alert('Generation failed'); }
    setGenerating(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Governance Reporting</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Generate Report</h2>
          <div className="space-y-3">
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="w-full bg-gray-700 px-3 py-2 rounded text-sm">
              {reportTypes.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <button onClick={handleGenerate} disabled={generating} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm">
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

          {preview && (
            <div className="mt-4 bg-gray-700 rounded p-3 text-xs space-y-1">
              <h3 className="font-medium text-sm mb-2">Preview: {preview.reportId}</h3>
              {preview.summary && Object.entries(preview.summary).map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-gray-400">{k.replace(/_/g, ' ')}</span><span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span></div>
              ))}
              {preview.rows && <div className="mt-2 text-gray-400">{preview.rows.length} rows generated</div>}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Generated Reports</h2>
          {reports.length === 0 ? <p className="text-gray-500 text-sm">No reports generated</p> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reports.map(r => (
                <div key={r.id} className="bg-gray-700 rounded p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.report_type?.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400">{new Date(r.generated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>By: {r.generated_by_name}</span>
                    <span>Scope: {r.scope || 'Enterprise'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
