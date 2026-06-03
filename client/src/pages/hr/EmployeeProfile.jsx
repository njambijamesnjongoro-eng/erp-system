import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, Mail, Phone, Building2, Briefcase, Calendar, MapPin, Shield,
  CreditCard, FileText, ChevronLeft, Edit, Camera, Globe, Hash,
  BookOpen, Award, Activity, Clock, DollarSign, Users
} from 'lucide-react';
import { employeeService, attendanceService, leaveService, trainingService, documentService, insuranceService } from '../../api/hr';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function EmployeeProfile() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [training, setTraining] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [insurance, setInsurance] = useState([]);

  const canManage = hasRole('System Admin', 'CEO', 'HR Officer');

  const tabs = ['profile', 'employment', 'attendance', 'leave', 'training', 'documents', 'insurance'];

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data } = await employeeService.getById(id);
        setEmployee(data.data);

        const [att, lv, tr, doc, ins] = await Promise.all([
          attendanceService.list({ employeeId: id, limit: 5 }),
          leaveService.listRequests({ employeeId: id, limit: 5 }),
          trainingService.listEmployeeTraining({ employeeId: id, limit: 5 }),
          documentService.list({ employeeId: id, limit: 5 }),
          insuranceService.list({ employeeId: id, limit: 5 }),
        ]);
        setAttendance(att.data.data);
        setLeaveHistory(lv.data.data);
        setTraining(tr.data.data);
        setDocuments(doc.data.data);
        setInsurance(ins.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  if (!employee) return (
    <div className="text-center py-20 text-gray-400">
      <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p className="text-lg">Employee not found</p>
      <Link to="/hr/employees" className="text-primary-600 mt-2 inline-block">Back to directory</Link>
    </div>
  );

  const statCards = [
    { label: 'Leave Balance', value: '—', icon: Calendar },
    { label: 'Attendance', value: '—', icon: Clock },
    { label: 'Trainings', value: training.length.toString(), icon: BookOpen },
    { label: 'Documents', value: documents.length.toString(), icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hr/employees" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{employee.full_name}</h1>
          <p className="text-gray-500 dark:text-gray-400">{employee.position} · {employee.department_name}</p>
        </div>
        {canManage && (
          <Link to={`/hr/employees/${id}/edit`} className="btn-secondary gap-2 ml-auto">
            <Edit className="w-4 h-4" /> Edit
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {employee.passport_photo ? (
                <img src={`/${employee.passport_photo}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary-600" />
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400">Employee ID</p>
                <p className="text-sm font-medium">{employee.employee_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.employment_status)}`}>
                  {employee.employment_status || 'active'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p className="text-sm font-medium capitalize">{employee.employment_type?.replace('_', ' ') || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Date Hired</p>
                <p className="text-sm font-medium">{formatDate(employee.date_hired)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <s.icon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        <div className="card-body">
          {activeTab === 'profile' && <ProfileTab employee={employee} />}
          {activeTab === 'employment' && <EmploymentTab employee={employee} />}
          {activeTab === 'attendance' && <AttendanceTab data={attendance} />}
          {activeTab === 'leave' && <LeaveTab data={leaveHistory} />}
          {activeTab === 'training' && <TrainingTab data={training} />}
          {activeTab === 'documents' && <DocumentsTab data={documents} />}
          {activeTab === 'insurance' && <InsuranceTab data={insurance} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ employee }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Section title="Personal Information">
        <Row icon={User} label="Full Name" value={employee.full_name} />
        <Row icon={User} label="Gender" value={employee.gender} />
        <Row icon={Calendar} label="Date of Birth" value={formatDate(employee.date_of_birth)} />
        <Row icon={Hash} label="National ID" value={employee.national_id} />
        <Row icon={Globe} label="Passport Number" value={employee.passport_number} />
        <Row icon={MapPin} label="Address" value={employee.address} />
        <Row icon={MapPin} label="City" value={employee.city} />
        <Row icon={MapPin} label="Country" value={employee.country} />
      </Section>
      <Section title="Contact Information">
        <Row icon={Mail} label="Email" value={employee.email} />
        <Row icon={Phone} label="Phone" value={employee.phone} />
        <Row icon={Phone} label="Secondary Phone" value={employee.phone_secondary} />
      </Section>
      <Section title="Emergency Contact">
        <Row icon={User} label="Name" value={employee.emergency_contact_name} />
        <Row icon={Phone} label="Phone" value={employee.emergency_contact_phone} />
        <Row icon={Users} label="Relation" value={employee.emergency_contact_relation} />
        <Row icon={User} label="Contact 2" value={employee.emergency_contact_name_2} />
        <Row icon={Phone} label="Phone 2" value={employee.emergency_contact_phone_2} />
      </Section>
      <Section title="Bank & Tax">
        <Row icon={Building2} label="Bank" value={employee.bank_name} />
        <Row icon={CreditCard} label="Account" value={employee.bank_account_number} />
        <Row icon={User} label="Account Name" value={employee.bank_account_name} />
        <Row icon={Hash} label="Tax ID" value={employee.tax_id} />
        <Row icon={Shield} label="Social Security" value={employee.social_security_number} />
      </Section>
    </div>
  );
}

function EmploymentTab({ employee }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Section title="Employment Details">
        <Row icon={Hash} label="Employee ID" value={employee.employee_id} />
        <Row icon={Building2} label="Department" value={employee.department_name} />
        <Row icon={Briefcase} label="Position" value={employee.position} />
        <Row icon={Briefcase} label="Job Title" value={employee.job_title} />
        <Row icon={Briefcase} label="Type" value={employee.employment_type?.replace('_', ' ')} />
        <Row icon={Activity} label="Status" value={employee.employment_status} />
        <Row icon={Calendar} label="Date Hired" value={formatDate(employee.date_hired)} />
        <Row icon={Calendar} label="Contract Start" value={formatDate(employee.contract_start_date)} />
        <Row icon={Calendar} label="Contract End" value={formatDate(employee.contract_end_date)} />
        <Row icon={Calendar} label="Probation End" value={formatDate(employee.probation_end_date)} />
        <Row icon={DollarSign} label="Role" value={employee.role_name || 'Not assigned'} />
      </Section>
      <Section title="Notes">
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{employee.notes || 'No notes'}</p>
      </Section>
    </div>
  );
}

function AttendanceTab({ data }) {
  if (data.length === 0) return <p className="text-gray-400 text-center py-8">No attendance records</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Clock In</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Clock Out</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Hours</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map((r) => (
            <tr key={r.id}>
              <td className="py-3 text-sm">{formatDate(r.date)}</td>
              <td className="py-3 text-sm">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : '-'}</td>
              <td className="py-3 text-sm">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : '-'}</td>
              <td className="py-3 text-sm">{r.work_hours}h</td>
              <td className="py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaveTab({ data }) {
  if (data.length === 0) return <p className="text-gray-400 text-center py-8">No leave records</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Start</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">End</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Days</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map((r) => (
            <tr key={r.id}>
              <td className="py-3 text-sm">{r.leave_type_name}</td>
              <td className="py-3 text-sm">{formatDate(r.start_date)}</td>
              <td className="py-3 text-sm">{formatDate(r.end_date)}</td>
              <td className="py-3 text-sm">{r.total_days}</td>
              <td className="py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  r.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrainingTab({ data }) {
  if (data.length === 0) return <p className="text-gray-400 text-center py-8">No training records</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Training</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Provider</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Completed</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Expires</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map((r) => (
            <tr key={r.id}>
              <td className="py-3 text-sm">{r.training_name || r.program_name}</td>
              <td className="py-3 text-sm">{r.provider || '-'}</td>
              <td className="py-3 text-sm">{formatDate(r.completion_date)}</td>
              <td className="py-3 text-sm">{formatDate(r.expiry_date)}</td>
              <td className="py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'enrolled' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsTab({ data }) {
  if (data.length === 0) return <p className="text-gray-400 text-center py-8">No documents uploaded</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((d) => (
        <div key={d.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <FileText className="w-8 h-8 text-primary-600 mb-2" />
          <p className="text-sm font-medium truncate">{d.document_name}</p>
          <p className="text-xs text-gray-400">{d.document_type}</p>
          {d.is_verified && <span className="text-xs text-emerald-600">Verified</span>}
        </div>
      ))}
    </div>
  );
}

function InsuranceTab({ data }) {
  if (data.length === 0) return <p className="text-gray-400 text-center py-8">No insurance records</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Provider</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Policy #</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Coverage End</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map((r) => (
            <tr key={r.id}>
              <td className="py-3 text-sm">{r.insurance_type}</td>
              <td className="py-3 text-sm">{r.provider}</td>
              <td className="py-3 text-sm">{r.policy_number}</td>
              <td className="py-3 text-sm">{formatDate(r.coverage_end_date)}</td>
              <td className="py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 pb-2 border-b border-gray-200 dark:border-gray-800">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm">{value || '-'}</p>
      </div>
    </div>
  );
}
