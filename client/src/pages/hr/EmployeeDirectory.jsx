import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, ChevronDown, User, Mail, Phone, Building2, Briefcase, Calendar, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { employeeService, departmentService } from '../../api/hr';
import { formatDate, getStatusColor, getInitials } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function EmployeeDirectory() {
  const { hasRole } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showFilters, setShowFilters] = useState(false);

  const canManage = hasRole('System Admin', 'CEO', 'HR Officer');

  const fetchEmployees = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (departmentFilter) params.departmentId = departmentFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await employeeService.list(params);
      setEmployees(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentService.list();
      setDepartments(data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDepartments(); }, []);
  useEffect(() => { fetchEmployees(); }, [departmentFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchEmployees(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employee Directory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{pagination.total} employees</p>
        </div>
        {canManage && (
          <Link to="/hr/employees/new" className="btn-primary gap-2">
            <Plus className="w-4 h-4" />
            Add Employee
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Search by name, ID, email..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-field w-auto min-w-[160px]">
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto min-w-[140px]">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No employees found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Hired</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 pr-4">
                        <Link to={`/hr/employees/${emp.id}`} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 text-sm font-medium flex-shrink-0">
                            {getInitials(emp.full_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{emp.full_name}</p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{emp.employee_id}</td>
                      <td className="py-3 px-4 text-sm">{emp.department_name || '-'}</td>
                      <td className="py-3 px-4 text-sm">{emp.position || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(emp.employment_status)}`}>
                          {emp.employment_status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(emp.date_hired)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/hr/employees/${emp.id}`} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                            <User className="w-4 h-4" />
                          </Link>
                          {canManage && (
                            <>
                              <Link to={`/hr/employees/${emp.id}/edit`} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button disabled={!pagination.hasPrev} onClick={() => fetchEmployees(pagination.page - 1)}
                  className="btn-secondary text-sm disabled:opacity-50">Previous</button>
                <button disabled={!pagination.hasNext} onClick={() => fetchEmployees(pagination.page + 1)}
                  className="btn-secondary text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
