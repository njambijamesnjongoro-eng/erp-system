import React, { useState, useEffect } from 'react';
import { socApi } from '../../api/soc';

const reportTypes = [
  { key: 'failed_logins', label: 'Failed Logins' },
  { key: 'user_risk', label: 'User Risk Summary' },
  { key: 'threats', label: 'Threat Summary' },
  { key: 'incidents', label: 'Incident Summary' },
  { key: 'malware', label: 'Malware Activity' },
  { key: 'data_access', label: 'Data Access Report' },
];

export function SecurityReports() {
  const [reports, setReports] = useState([]);
  const [selectedType, setSelectedType] = useState('failed_logins');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [params, setParams] = useState({ days: 7, limit: 50 });

  useEffect(() => {
    socApi.getReports().then(r => setReports(r.data.data)).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const r = await socApi.generateReport(selectedType, params);
      setPreview(r.data.data);
      const r2 = await socApi.getReports();
      setReports(r2.data.data);
    } catch (e) {
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Security Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Generate Report</h2>
          <div className="space-y-3">
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full bg-gray-700 px-3 py-2 rounded text-sm">
              {reportTypes.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <div className="flex gap-3">
              <div><label className="text-xs text-gray-400 block mb-1">Days</label>
                <input type="number" value={params.days} onChange={e => setParams(p => ({ ...p, days: parseInt(e.target.value) || 7 }))} className="bg-gray-700 px-3 py-2 rounded text-sm w-20" /></div>
              <div><label className="text-xs text-gray-400 block mb-1">Limit</label>
                <input type="number" value={params.limit} onChange={e => setParams(p => ({ ...p, limit: parseInt(e.target.value) || 50 }))} className="bg-gray-700 px-3 py-2 rounded text-sm w-20" /></div>
            </div>
            <button onClick={handleGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm">
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {preview && (
            <div className="mt-4 space-y-2">
              <h3 className="font-medium text-sm">Preview</h3>
              <div className="bg-gray-700 rounded p-3 text-xs space-y-1">
                <div><span className="text-gray-400">Type:</span> {preview.report_type}</div>
                <div><span className="text-gray-400">Period:</span> {preview.period_start?.slice(0, 10)} → {preview.period_end?.slice(0, 10)}</div>
                {preview.summary && typeof preview.summary === 'object' && Object.entries(preview.summary).slice(0, 8).map(([k, v]) => (
                  <div key={k}><span className="text-gray-400">{k.replace(/_/g, ' ')}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                ))}
                <div><span className="text-gray-400">Rows:</span> {preview.total_count}</div>
                <div><span className="text-gray-400">Generated:</span> {new Date(preview.generated_at).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Generated Reports</h2>
          {reports.length === 0 ? <p className="text-gray-500 text-sm">No reports generated yet</p> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reports.map(r => (
                <div key={r.id} className="bg-gray-700 rounded p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.report_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400">{new Date(r.generated_at).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{r.period_start?.slice(0, 10)} → {r.period_end?.slice(0, 10)}</span>
                    <span>{r.total_count} rows</span>
                    <span>{r.generated_by_name || ''}</span>
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
