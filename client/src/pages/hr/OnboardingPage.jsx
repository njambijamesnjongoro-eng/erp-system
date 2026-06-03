import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Plus, UserPlus } from 'lucide-react';
import { onboardingService } from '../../api/hr';
import { formatDate } from '../../utils/helpers';

export function OnboardingPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState('');
  const [searched, setSearched] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', taskName: '', assignedTo: '', dueDate: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async (empId) => {
    setLoading(true);
    try {
      const { data } = await onboardingService.getTasks(empId);
      setTasks(data.data);
      setSearched(true);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (employeeId) fetchTasks(employeeId);
  };

  const handleComplete = async (taskId) => {
    try {
      await onboardingService.completeTask(taskId);
      fetchTasks(employeeId);
    } catch (err) { alert('Failed to complete task'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onboardingService.createTask(form);
      setShowForm(false);
      setForm({ employeeId: '', taskName: '', assignedTo: '', dueDate: '', notes: '' });
      if (form.employeeId) fetchTasks(form.employeeId);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Onboarding</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage onboarding tasks and workflows</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSearch} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="input-label">Employee ID</label>
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
              className="input-field" placeholder="Enter employee ID to view onboarding tasks" />
          </div>
          <button type="submit" className="btn-primary">Search</button>
          <button type="button" onClick={() => setShowForm(true)} className="btn-secondary gap-2">
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </form>
      </div>

      {searched && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Onboarding Tasks ({completedCount}/{tasks.length} completed)</h3>
              <div className="h-2 w-32 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 rounded-full transition-all"
                  style={{ width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No onboarding tasks found for this employee</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      task.status === 'completed'
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}>
                    <button onClick={() => task.status !== 'completed' && handleComplete(task.id)}
                      className="mt-0.5 flex-shrink-0">
                      {task.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 hover:text-primary-600" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {task.task_name}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        {task.assigned_to_name && <span>Assigned to: {task.assigned_to_name}</span>}
                        {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
                        {task.completed_at && <span>Completed: {formatDate(task.completed_at)}</span>}
                      </div>
                      {task.notes && <p className="text-xs text-gray-500 mt-1">{task.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add Onboarding Task</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="input-label">Employee ID *</label>
                <input value={form.employeeId} onChange={(e) => setForm({...form, employeeId: e.target.value})}
                  className="input-field" required /></div>
              <div><label className="input-label">Task Name *</label>
                <input value={form.taskName} onChange={(e) => setForm({...form, taskName: e.target.value})}
                  className="input-field" required /></div>
              <div><label className="input-label">Assigned To (Employee ID)</label>
                <input value={form.assignedTo} onChange={(e) => setForm({...form, assignedTo: e.target.value})}
                  className="input-field" /></div>
              <div><label className="input-label">Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})}
                  className="input-field" /></div>
              <div><label className="input-label">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})}
                  className="input-field" rows={2} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
