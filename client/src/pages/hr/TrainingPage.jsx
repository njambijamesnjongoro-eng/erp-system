import { useState, useEffect } from 'react';
import { BookOpen, Award, Plus, Search } from 'lucide-react';
import { trainingService } from '../../api/hr';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function TrainingPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'HR Officer');
  const [activeTab, setActiveTab] = useState('programs');
  const [programs, setPrograms] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('program');

  const tabs = ['programs', 'trainings', 'certifications'];

  useEffect(() => {
    fetchPrograms();
    fetchTrainings();
    fetchCertifications();
  }, []);

  const fetchPrograms = async () => {
    try { const { data } = await trainingService.listPrograms(); setPrograms(data.data); } catch (err) { console.error(err); }
  };

  const fetchTrainings = async () => {
    try { const { data } = await trainingService.listEmployeeTraining({ limit: 50 }); setTrainings(data.data); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchCertifications = async () => {
    try { const { data } = await trainingService.listCertifications({ limit: 50 }); setCerts(data.data); } catch (err) { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Training & Certifications</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage employee training and certifications</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <button onClick={() => { setFormType('program'); setShowForm(true); }} className="btn-secondary gap-2">
                <Plus className="w-4 h-4" /> Program
              </button>
              <button onClick={() => { setFormType('training'); setShowForm(true); }} className="btn-primary gap-2">
                <Plus className="w-4 h-4" /> Assign Training
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 capitalize ${
                  activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
                }`}>{tab}</button>
            ))}
          </nav>
        </div>

        <div className="card-body p-0">
          {activeTab === 'programs' && (
            <div className="p-6">
              {programs.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No programs defined</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs.map(p => (
                    <div key={p.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{p.category} · {p.duration_hours}h</p>
                      {p.is_mandatory && <span className="text-xs text-amber-600 font-medium">Mandatory</span>}
                      <p className="text-xs text-gray-500 mt-2">{p.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'trainings' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : trainings.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><p>No training records</p></div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Training</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Provider</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Completed</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Expires</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {trainings.map(t => (
                      <tr key={t.id}>
                        <td className="px-6 py-3 text-sm font-medium">{t.full_name}</td>
                        <td className="px-6 py-3 text-sm">{t.training_name || t.program_name}</td>
                        <td className="px-6 py-3 text-sm">{t.provider || '-'}</td>
                        <td className="px-6 py-3 text-sm">{formatDate(t.completion_date)}</td>
                        <td className="px-6 py-3 text-sm">{formatDate(t.expiry_date)}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            t.status === 'enrolled' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'certifications' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Certification</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Issuing Body</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Number</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Issued</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {certs.map(c => (
                    <tr key={c.id}>
                      <td className="px-6 py-3 text-sm font-medium">{c.full_name}</td>
                      <td className="px-6 py-3 text-sm">{c.name}</td>
                      <td className="px-6 py-3 text-sm">{c.issuing_body || '-'}</td>
                      <td className="px-6 py-3 text-sm font-mono">{c.certificate_number || '-'}</td>
                      <td className="px-6 py-3 text-sm">{formatDate(c.issue_date)}</td>
                      <td className="px-6 py-3 text-sm">{formatDate(c.expiry_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
