import React, { useState, useEffect } from 'react';
import { fileSecurityApi } from '../../api/fileSecurity';

export function FileManager() {
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchFiles = () => {
    setLoading(true);
    fileSecurityApi.listFiles({ search, classification: filterClass, status: filterStatus, limit: 50 })
      .then(r => { setFiles(r.data.data.files); setTotal(r.data.data.total); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchFiles(); }, [search, filterClass, filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this file?')) return;
    await fileSecurityApi.deleteFile(id);
    fetchFiles();
  };

  const handleDownload = async (id) => {
    try {
      const res = await fileSecurityApi.downloadFile(id);
      const disposition = res.headers['content-disposition'];
      const match = disposition && disposition.match(/filename="?(.+?)"?$/);
      const name = match ? match[1] : 'download';
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Download failed'); }
  };

  const getClassColor = (c) => {
    const map = { public: 'text-green-400', internal: 'text-blue-400', confidential: 'text-yellow-400', highly_confidential: 'text-red-400' };
    return map[c] || 'text-gray-400';
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">File Manager</h1>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap gap-3">
          <input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-gray-700 px-3 py-1.5 rounded text-sm w-64" />
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="bg-gray-700 px-3 py-1.5 rounded text-sm">
            <option value="">All Classifications</option>
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="confidential">Confidential</option>
            <option value="highly_confidential">Highly Confidential</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-700 px-3 py-1.5 rounded text-sm">
            <option value="active">Active</option>
            <option value="quarantined">Quarantined</option>
            <option value="deleted">Deleted</option>
            <option value="all">All</option>
          </select>
          <span className="text-sm text-gray-400 self-center">{total} files</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No files found</div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-left py-2 px-3">Classification</th>
              <th className="text-right py-2 px-3">Size</th>
              <th className="text-left py-2 px-3">Uploaded By</th>
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-center py-2 px-3">Actions</th>
            </tr></thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="py-2 px-3 truncate max-w-xs">{f.original_name}</td>
                  <td className="py-2 px-3 text-xs">{f.mime_type}</td>
                  <td className={`py-2 px-3 text-xs font-medium ${getClassColor(f.classification)}`}>{f.classification}</td>
                  <td className="py-2 px-3 text-right">{(f.file_size / 1024).toFixed(1)} KB</td>
                  <td className="py-2 px-3 text-xs">{f.uploaded_by_name || '-'}</td>
                  <td className="py-2 px-3 text-xs">{new Date(f.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setSelectedFile(selectedFile?.id === f.id ? null : f)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Info</button>
                      <button onClick={() => handleDownload(f.id)} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">DL</button>
                      <button onClick={() => handleDelete(f.id)} className="text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedFile && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">{selectedFile.original_name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-400">Type:</span> {selectedFile.mime_type}</div>
            <div><span className="text-gray-400">Size:</span> {(selectedFile.file_size / 1024).toFixed(1)} KB</div>
            <div><span className="text-gray-400">Classification:</span> {selectedFile.classification}</div>
            <div><span className="text-gray-400">Department:</span> {selectedFile.department || 'N/A'}</div>
            <div><span className="text-gray-400">Category:</span> {selectedFile.file_category || 'N/A'}</div>
            <div><span className="text-gray-400">Status:</span> {selectedFile.status}</div>
            <div><span className="text-gray-400">Uploaded:</span> {new Date(selectedFile.created_at).toLocaleString()}</div>
            <div><span className="text-gray-400">Checksum:</span> <span className="text-xs">{selectedFile.checksum_sha256?.substring(0, 16)}...</span></div>
          </div>
          {selectedFile.description && <p className="mt-2 text-sm text-gray-400">{selectedFile.description}</p>}
        </div>
      )}
    </div>
  );
}
