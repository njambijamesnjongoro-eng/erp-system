import { useState, useEffect } from 'react';
import { Clock, RotateCcw, LogOut, Search, Calendar } from 'lucide-react';
import { attendanceService, employeeService } from '../../api/hr';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function AttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [todayStatus, setTodayStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [clockingIn, setClockingIn] = useState(false);

  const empId = user?.employee_id ? null : null;

  useEffect(() => {
    fetchAttendance();
    fetchSummary();
    if (user?.employee_id) {
      attendanceService.getTodayStatus(user.id).then(r => setTodayStatus(r.data.data)).catch(() => {});
    }
  }, [selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = { date: selectedDate, limit: 50 };
      if (search) params.search = search;
      const { data } = await attendanceService.list(params);
      setRecords(data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try {
      const { data } = await attendanceService.getSummary({});
      setSummary(data.data);
    } catch (err) { /* ignore */ }
  };

  const handleClockIn = async () => {
    if (!user?.id) return;
    setClockingIn(true);
    try {
      const { data } = await attendanceService.clockIn(user.id);
      setTodayStatus(data.data);
    } catch (err) { alert(err.response?.data?.message || 'Clock in failed'); }
    finally { setClockingIn(false); }
  };

  const handleClockOut = async () => {
    if (!user?.id) return;
    setClockingIn(true);
    try {
      const { data } = await attendanceService.clockOut(user.id);
      setTodayStatus(data.data);
    } catch (err) { alert(err.response?.data?.message || 'Clock out failed'); }
    finally { setClockingIn(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400">Track employee attendance and work hours</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field w-auto" />
          {todayStatus && !todayStatus.clock_out ? (
            <button onClick={handleClockOut} disabled={clockingIn} className="btn-danger gap-2">
              <LogOut className="w-4 h-4" /> Clock Out
            </button>
          ) : (
            <button onClick={handleClockIn} disabled={clockingIn} className="btn-primary gap-2">
              <Clock className="w-4 h-4" /> Clock In
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="Present" value={summary.present_days || '0'} color="text-emerald-600" />
          <StatCard label="Absent" value={summary.absent_days || '0'} color="text-red-600" />
          <StatCard label="Late" value={summary.late_arrivals || '0'} color="text-amber-600" />
          <StatCard label="Late Minutes" value={summary.total_late_minutes || '0'} color="text-amber-600" />
          <StatCard label="Overtime (min)" value={summary.total_overtime_minutes || '0'} color="text-blue-600" />
          <StatCard label="Total Hours" value={(summary.total_work_hours || '0').toString()} color="text-primary-600" />
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Attendance Records — {formatDate(selectedDate)}</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Search employee..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-48 text-sm" />
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No attendance records for this date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Clock In</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Clock Out</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Hours</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-3 text-sm font-medium">{r.full_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{r.department_name || '-'}</td>
                      <td className="px-6 py-3 text-sm">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : '-'}</td>
                      <td className="px-6 py-3 text-sm">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : '-'}</td>
                      <td className="px-6 py-3 text-sm">{r.work_hours}h</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          r.status === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-6 py-3 text-sm">{r.is_late ? `${r.late_minutes}min` : '-'}</td>
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

function StatCard({ label, value, color }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
