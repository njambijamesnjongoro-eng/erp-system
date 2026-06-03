import { useState, useEffect, useCallback } from 'react';
import {
  User, FileText, CalendarDays, Briefcase, Clock, GraduationCap,
  Bell, Edit3, Download, CheckCircle, AlertCircle, Loader2,
  Mail, Phone, MapPin, Shield, BookOpen, DollarSign, X,
  Calendar, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { essPortalService } from '../../api/portal';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatDateTime, getStatusColor, classNames } from '../../utils/helpers';

const fmt = (n) => new Intl.NumberFormat('en-KE', {
  style: 'currency', currency: 'KES', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n ?? 0);

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'payslips', label: 'Payslips', icon: FileText },
  { id: 'leave', label: 'Leave Balances', icon: CalendarDays },
  { id: 'assets', label: 'Assigned Assets', icon: Briefcase },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'trainings', label: 'Trainings', icon: GraduationCap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function SkeletonLine({ className }) {
  return <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className || ''}`} />;
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="card-body space-y-3">
        <SkeletonLine className="w-1/3" />
        <SkeletonLine className="w-1/2" />
        <SkeletonLine className="w-2/3" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Icon className="w-10 h-10 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const colors = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    read: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    unread: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    upcoming: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return <span className={`${base} ${colors[status] || colors.pending}`}>{status.replace(/_/g, ' ')}</span>;
}

export function EssPortal() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [assets, setAssets] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear, setAttYear] = useState(new Date().getFullYear());

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profRes, payRes, leaveRes, assetRes, attRes, trainRes, notifRes] = await Promise.all([
        essPortalService.getProfile(),
        essPortalService.getPayslips(),
        essPortalService.getLeaveBalances(),
        essPortalService.getAssets(),
        essPortalService.getAttendance({ month: attMonth, year: attYear }),
        essPortalService.getTrainings(),
        essPortalService.getNotifications(),
      ]);
      setProfile(profRes.data?.data || profRes.data);
      setPayslips(payRes.data?.data || payRes.data || []);
      setLeaveBalances(leaveRes.data?.data || leaveRes.data || []);
      setAssets(assetRes.data?.data || assetRes.data || []);
      setAttendance(attRes.data?.data || attRes.data || []);
      setTrainings(trainRes.data?.data || trainRes.data || []);
      setNotifications(notifRes.data?.data || notifRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [attMonth, attYear]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadTabData = useCallback(async (tab) => {
    setTabLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      const loaders = {
        profile: async () => { const r = await essPortalService.getProfile(); setProfile(r.data?.data || r.data); },
        payslips: async () => { const r = await essPortalService.getPayslips(); setPayslips(r.data?.data || r.data || []); },
        leave: async () => { const r = await essPortalService.getLeaveBalances(); setLeaveBalances(r.data?.data || r.data || []); },
        assets: async () => { const r = await essPortalService.getAssets(); setAssets(r.data?.data || r.data || []); },
        attendance: async () => { const r = await essPortalService.getAttendance({ month: attMonth, year: attYear }); setAttendance(r.data?.data || r.data || []); },
        trainings: async () => { const r = await essPortalService.getTrainings(); setTrainings(r.data?.data || r.data || []); },
        notifications: async () => { const r = await essPortalService.getNotifications(); setNotifications(r.data?.data || r.data || []); },
      };
      if (loaders[tab]) await loaders[tab]();
    } catch (err) {
      setError(err.message);
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [attMonth, attYear]);

  useEffect(() => {
    if (!loading) loadTabData(activeTab);
  }, [activeTab, loading, loadTabData]);

  const handleEditProfile = () => {
    setProfileForm({
      phone: profile?.phone || '',
      address: profile?.address || '',
      emergency_contact: profile?.emergency_contact || '',
    });
    setEditingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await essPortalService.updateProfile(profileForm);
      setProfile(res.data?.data || res.data);
      setEditingProfile(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await essPortalService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) yearOptions.push(y);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Self-Service Portal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your profile, payslips, leave &amp; more</p>
          </div>
        </div>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertCircle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load portal data</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
        <button onClick={loadAll} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          Retry
        </button>
      </div>
    );
  }

  const renderTabNav = () => (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="flex gap-1 overflow-x-auto pb-px scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={classNames(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderProfile = () => {
    if (tabLoading.profile) return <SkeletonCard />;
    const p = profile;
    if (!p) return <EmptyState icon={User} message="Profile data not available" />;

    const fields = [
      { label: 'Full Name', value: p.full_name || p.name, icon: User },
      { label: 'Email', value: p.email, icon: Mail },
      { label: 'Department', value: p.department, icon: Briefcase },
      { label: 'Position', value: p.position || p.job_title, icon: Shield },
      { label: 'Phone', value: p.phone, icon: Phone, editable: true },
      { label: 'Address', value: p.address, icon: MapPin, editable: true },
      { label: 'Emergency Contact', value: p.emergency_contact, icon: AlertCircle, editable: true },
    ];

    return (
      <div className="space-y-6">
        {profileSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-4 py-3 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            Profile updated successfully
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h2>
          {!editingProfile && (
            <button onClick={handleEditProfile} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="card">
            <div className="card-body space-y-4">
              {[
                { key: 'phone', label: 'Phone', icon: Phone },
                { key: 'address', label: 'Address', icon: MapPin },
                { key: 'emergency_contact', label: 'Emergency Contact', icon: AlertCircle },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={profileForm[field.key] || ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              ))}
              {profileError && <p className="text-sm text-red-500">{profileError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const Icon = field.icon;
              return (
                <div key={field.label} className="card">
                  <div className="card-body flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{field.label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{field.value || '-'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderPayslips = () => {
    if (tabLoading.payslips) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payslips</h2>
        {payslips.length === 0 ? (
          <EmptyState icon={FileText} message="No payslips available yet" />
        ) : (
          <div className="card">
            <div className="card-body p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Basic Salary</th>
                    <th>Deductions</th>
                    <th>Allowances</th>
                    <th>Net Pay</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((ps) => (
                    <tr key={ps.id}>
                      <td className="font-medium text-gray-900 dark:text-white">
                        {ps.period || `${ps.month}/${ps.year}`}
                      </td>
                      <td>{fmt(ps.basic_salary ?? ps.basic ?? 0)}</td>
                      <td className="text-red-600 dark:text-red-400">{fmt(ps.deductions ?? ps.total_deductions ?? 0)}</td>
                      <td className="text-emerald-600 dark:text-emerald-400">{fmt(ps.allowances ?? ps.total_allowances ?? 0)}</td>
                      <td className="font-semibold text-gray-900 dark:text-white">{fmt(ps.net_pay ?? ps.net_salary ?? 0)}</td>
                      <td className="text-right">
                        <button className="flex items-center gap-1.5 ml-auto px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLeaveBalances = () => {
    if (tabLoading.leave) return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Balances</h2>
        {leaveBalances.length === 0 ? (
          <EmptyState icon={CalendarDays} message="No leave balance data available" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaveBalances.map((lb) => {
              const used = lb.used ?? lb.taken ?? 0;
              const total = lb.total ?? lb.entitled ?? lb.balance ?? 0;
              const remaining = Math.max(0, total - used);
              const pct = total > 0 ? (used / total) * 100 : 0;
              return (
                <div key={lb.type || lb.id} className="card">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white capitalize">{lb.type || lb.leave_type}</h3>
                      <CalendarDays className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-end gap-4 mb-3">
                      <div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{remaining}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 pb-1">
                        <span className="text-gray-900 dark:text-white font-medium">{used}</span> used of {total}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={classNames(
                          'h-full rounded-full transition-all duration-300',
                          pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAssets = () => {
    if (tabLoading.assets) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned Assets</h2>
        {assets.length === 0 ? (
          <EmptyState icon={Briefcase} message="No assets assigned to you" />
        ) : (
          <div className="card">
            <div className="card-body p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Serial Number</th>
                    <th>Category</th>
                    <th>Assigned Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium text-gray-900 dark:text-white">{a.name || a.asset_name}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400 font-mono">{a.serial_number || a.serial_no || '-'}</td>
                      <td>{a.category || a.asset_category || '-'}</td>
                      <td className="text-sm text-gray-500">{formatDate(a.assigned_date || a.assigned_at)}</td>
                      <td><StatusBadge status={a.status || 'assigned'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAttendance = () => {
    if (tabLoading.attendance) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Records</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={attMonth}
              onChange={(e) => setAttMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('en', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={attYear}
              onChange={(e) => setAttYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        {attendance.length === 0 ? (
          <EmptyState icon={Clock} message="No attendance records for this period" />
        ) : (
          <div className="card">
            <div className="card-body p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((att) => (
                    <tr key={att.id}>
                      <td className="font-medium text-gray-900 dark:text-white">{formatDate(att.date || att.attendance_date)}</td>
                      <td className="text-sm">{att.clock_in || att.check_in ? new Date(att.clock_in || att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="text-sm">{att.clock_out || att.check_out ? new Date(att.clock_out || att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="text-sm font-medium">{att.hours_worked != null ? `${att.hours_worked}h` : '-'}</td>
                      <td><StatusBadge status={att.status || 'present'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTrainings = () => {
    if (tabLoading.trainings) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Training &amp; Development</h2>
        {trainings.length === 0 ? (
          <EmptyState icon={GraduationCap} message="No training records found" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {trainings.map((t) => (
              <div key={t.id} className="card">
                <div className="card-body">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{t.title || t.training_name || t.course}</h3>
                    <StatusBadge status={t.status || (t.completed_at ? 'completed' : 'upcoming')} />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t.description || t.topic || ''}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {t.start_date ? formatDate(t.start_date) : '-'} {t.end_date ? `- ${formatDate(t.end_date)}` : ''}
                    </span>
                    {t.duration && <span>{t.duration}</span>}
                    {t.provider && <span>{t.provider}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderNotifications = () => {
    if (tabLoading.notifications) return <SkeletonCard />;
    const unreadCount = notifications.filter((n) => !n.read_at).length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-primary-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} message="No notifications yet" />
        ) : (
          <div className="card">
            <div className="card-body p-0 divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    className={classNames(
                      'flex items-start gap-3 px-5 py-4 transition-colors',
                      isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    )}
                  >
                    <div className={classNames(
                      'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                      isUnread ? 'bg-blue-500' : 'bg-transparent'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={classNames(
                        'text-sm',
                        isUnread ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                      )}>
                        {n.title || n.subject}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{n.message || n.body || ''}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at || n.sent_at)}</p>
                    </div>
                    {isUnread && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfile();
      case 'payslips': return renderPayslips();
      case 'leave': return renderLeaveBalances();
      case 'assets': return renderAssets();
      case 'attendance': return renderAttendance();
      case 'trainings': return renderTrainings();
      case 'notifications': return renderNotifications();
      default: return renderProfile();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Self-Service Portal</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {profile ? `Welcome, ${profile.full_name || profile.name || profile.email}` : 'Manage your profile, payslips, leave &amp; more'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {renderTabNav()}
      {renderContent()}
    </div>
  );
}
