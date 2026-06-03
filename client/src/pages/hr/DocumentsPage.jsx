import { useState, useEffect } from 'react';
import { FileText, Upload, Search, CheckCircle, X, File } from 'lucide-react';
import { documentService } from '../../api/hr';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function DocumentsPage() {
  const { user, hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'HR Officer');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({ employeeId: '', documentType: '', description: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (!canManage && user?.id) params.employeeId = user.id;
      const { data } = await documentService.list(params);
      setDocs(data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employeeId', uploadForm.employeeId);
      formData.append('documentType', uploadForm.documentType);
      formData.append('description', uploadForm.description);
      await documentService.upload(formData);
      setShowUpload(false);
      setFile(null);
      setUploadForm({ employeeId: '', documentType: '', description: '' });
      fetchDocs();
    } catch (err) { alert(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleVerify = async (id) => {
    try {
      await documentService.verify(id, user.id);
      fetchDocs();
    } catch (err) { alert('Verification failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Employee documents and file storage</p>
        </div>
        {canManage && (
          <button onClick={() => setShowUpload(true)} className="btn-primary gap-2">
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Documents ({docs.length})</h3></div>
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No documents uploaded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Uploaded</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Verified</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {docs.map(d => (
                    <tr key={d.id}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-primary-600" />
                          <span className="text-sm font-medium">{d.document_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm">{d.full_name}</td>
                      <td className="px-6 py-3 text-sm capitalize">{d.document_type}</td>
                      <td className="px-6 py-3 text-sm">{formatDate(d.created_at)}</td>
                      <td className="px-6 py-3">
                        {d.is_verified ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{d.status}</span>
                      </td>
                      <td className="px-6 py-3">
                        {canManage && !d.is_verified && (
                          <button onClick={() => handleVerify(d.id)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">
                            Verify
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowUpload(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Document</h3>
              <button onClick={() => setShowUpload(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div><label className="input-label">Employee ID</label>
                <input value={uploadForm.employeeId} onChange={(e) => setUploadForm({...uploadForm, employeeId: e.target.value})}
                  className="input-field" required /></div>
              <div><label className="input-label">Document Type</label>
                <select value={uploadForm.documentType} onChange={(e) => setUploadForm({...uploadForm, documentType: e.target.value})}
                  className="input-field" required>
                  <option value="">Select</option>
                  <option value="contract">Contract</option>
                  <option value="certificate">Certificate</option>
                  <option value="national_id">National ID</option>
                  <option value="passport">Passport</option>
                  <option value="insurance">Insurance</option>
                  <option value="academic">Academic</option>
                  <option value="other">Other</option>
                </select></div>
              <div><label className="input-label">Description</label>
                <textarea value={uploadForm.description} onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  className="input-field" rows={2} /></div>
              <div>
                <label className="input-label">File</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])}
                  className="input-field" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={uploading} className="btn-primary">{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
