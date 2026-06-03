import React, { useState, useRef } from 'react';
import { fileSecurityApi } from '../../api/fileSecurity';

export function FileUploadCenter() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [classification, setClassification] = useState('internal');
  const [fileCategory, setFileCategory] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const fileInputRef = useRef();

  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files));
    setResults([]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResults([]);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('classification', classification);
      fd.append('fileCategory', fileCategory);
      fd.append('description', description);
      if (department) fd.append('department', department);
      try {
        const res = await fileSecurityApi.uploadFile(fd);
        uploaded.push({ name: file.name, status: 'success', data: res.data.data });
      } catch (err) {
        uploaded.push({ name: file.name, status: 'error', message: err.response?.data?.message || err.message });
      }
    }
    setResults(uploaded);
    setUploading(false);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const classifications = [
    { value: 'public', label: 'Public', color: 'green' },
    { value: 'internal', label: 'Internal', color: 'blue' },
    { value: 'confidential', label: 'Confidential', color: 'yellow' },
    { value: 'highly_confidential', label: 'Highly Confidential', color: 'red' },
  ];

  const categories = ['employee', 'contract', 'payroll', 'hr_document', 'finance_report', 'procurement', 'certificate', 'company_record', 'other'];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Secure File Upload Center</h1>

      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden"
                 accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.pptx" />
          {files.length === 0 ? (
            <div className="text-gray-400">
              <p className="text-lg">Drop files here or click to browse</p>
              <p className="text-xs mt-1">Allowed: PDF, JPG, PNG, DOCX, XLSX, PPTX (max 50MB)</p>
            </div>
          ) : (
            <div className="text-left space-y-1">
              {files.map((f, i) => (
                <div key={i} className="text-sm bg-gray-700 px-3 py-1 rounded flex justify-between">
                  <span>{f.name}</span>
                  <span className="text-gray-400">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Classification</label>
            <select value={classification} onChange={e => setClassification(e.target.value)}
              className="w-full bg-gray-700 px-3 py-2 rounded text-sm">
              {classifications.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Category</label>
            <select value={fileCategory} onChange={e => setFileCategory(e.target.value)}
              className="w-full bg-gray-700 px-3 py-2 rounded text-sm">
              <option value="">Select category</option>
              {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Department</label>
            <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. HR, Finance"
              className="w-full bg-gray-700 px-3 py-2 rounded text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={handleUpload} disabled={files.length === 0 || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm transition-colors">
              {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional file description"
            className="w-full bg-gray-700 px-3 py-2 rounded text-sm" />
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Upload Results</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`p-3 rounded text-sm ${r.status === 'success' ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                <div className="flex justify-between">
                  <span className="font-medium">{r.name}</span>
                  <span>{r.status === 'success' ? '✓ Uploaded' : `✗ Failed`}</span>
                </div>
                {r.status === 'error' && <p className="text-red-400 text-xs mt-1">{r.message}</p>}
                {r.status === 'success' && <p className="text-green-400 text-xs mt-1">Classification: {r.data.classification}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
