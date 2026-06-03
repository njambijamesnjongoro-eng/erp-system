import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Trash2, Edit3, Filter,
  X, Loader2, AlertTriangle
} from 'lucide-react';
import { calendarService } from '../../api/portal';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatDateTime } from '../../utils/helpers';

const EVENT_TYPES = [
  { key: 'meeting', label: 'Meeting', color: 'bg-blue-500' },
  { key: 'maintenance', label: 'Maintenance', color: 'bg-orange-500' },
  { key: 'leave', label: 'Leave', color: 'bg-emerald-500' },
  { key: 'training', label: 'Training', color: 'bg-purple-500' },
  { key: 'deadline', label: 'Deadline', color: 'bg-red-500' },
  { key: 'holiday', label: 'Holiday', color: 'bg-yellow-500' },
  { key: 'reminder', label: 'Reminder', color: 'bg-gray-500' },
];

const EVENT_TYPE_COLORS = Object.fromEntries(EVENT_TYPES.map((t) => [t.key, t.color]));
const EVENT_TYPE_BG = Object.fromEntries(EVENT_TYPES.map((t) => [t.key, t.color.replace('bg-', 'bg-').replace('-500', '-100').replace('bg-emerald', 'bg-emerald').replace('bg-yellow', 'bg-yellow')]));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-14 h-14 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '-'}</p>
        </div>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { dark } = useTheme();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [stats, setStats] = useState(null);

  const [createForm, setCreateForm] = useState({
    title: '', description: '', event_type: 'meeting', start_date: '', end_date: '',
    all_day: false, location: '', color: '#3B82F6', department: '', reminder_minutes: 15,
  });
  const [creating, setCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const start = new Date(year, month, 1 - startPad);
      const end = new Date(year, month + 1, 6 - lastDay.getDay());
      const [eventsRes, statsRes] = await Promise.all([
        calendarService.getAll({ start: start.toISOString(), end: end.toISOString() }),
        calendarService.getStats(),
      ]);
      setEvents(eventsRes.data?.data || eventsRes.data || []);
      setStats(statsRes.data?.data || statsRes.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year, month, startPad, lastDay]);

  useEffect(() => { loadData(); }, [loadData]);

  const navigateMonth = (delta) => {
    setCurrentDate(new Date(year, month + delta, 1));
    setSelectedDate(null);
    setSelectedEvent(null);
    setShowDetailPanel(false);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const getEventsForDay = (day) => {
    const dateStr = new Date(year, month, day).toDateString();
    return events.filter((e) => {
      const eStart = new Date(e.start_date || e.start);
      const eEnd = new Date(e.end_date || e.end || e.start_date || e.start);
      const eDay = eStart.toDateString();
      return eDay === dateStr || (eStart <= new Date(year, month, day) && eEnd >= new Date(year, month, day));
    });
  };

  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toDateString();
    return events.filter((e) => {
      const eStart = new Date(e.start_date || e.start);
      return eStart.toDateString() === dateStr;
    });
  };

  const isToday = (day) => {
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (day) => {
    return selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  const handleDayClick = (day) => {
    const d = new Date(year, month, day);
    setSelectedDate(d);
    setSelectedEvent(null);
    setShowDetailPanel(false);
    setViewMode('agenda');
  };

  const handleCreateEvent = async () => {
    if (!createForm.title.trim() || !createForm.start_date) return;
    setCreating(true);
    try {
      const payload = { ...createForm };
      if (editingEvent) {
        await calendarService.update(editingEvent.id, payload);
      } else {
        await calendarService.create(payload);
      }
      setShowCreateModal(false);
      setEditingEvent(null);
      setCreateForm({
        title: '', description: '', event_type: 'meeting', start_date: '', end_date: '',
        all_day: false, location: '', color: '#3B82F6', department: '', reminder_minutes: 15,
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setCreateForm({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'meeting',
      start_date: event.start_date ? event.start_date.slice(0, 16) : '',
      end_date: event.end_date ? event.end_date.slice(0, 16) : '',
      all_day: event.all_day || false,
      location: event.location || '',
      color: event.color || '#3B82F6',
      department: event.department || '',
      reminder_minutes: event.reminder_minutes || 15,
    });
    setShowDetailPanel(false);
    setShowCreateModal(true);
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await calendarService.delete(id);
      setSelectedEvent(null);
      setShowDetailPanel(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setEditingEvent(null);
    setCreateForm({
      title: '', description: '', event_type: 'meeting', start_date: '', end_date: '',
      all_day: false, location: '', color: '#3B82F6', department: '', reminder_minutes: 15,
    });
  };

  const getEventColor = (type) => EVENT_TYPE_COLORS[type] || 'bg-blue-500';
  const getTypeLabel = (type) => EVENT_TYPES.find((t) => t.key === type)?.label || type;

  const upcomingDeadlines = events.filter((e) => {
    const d = new Date(e.start_date || e.start);
    return e.event_type === 'deadline' && d >= new Date();
  }).length;

  const thisWeekCount = events.filter((e) => {
    const d = new Date(e.start_date || e.start);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return d >= weekStart && d <= weekEnd;
  }).length;

  const thisMonthCount = events.filter((e) => {
    const d = new Date(e.start_date || e.start);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Schedule and manage events</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card"><div className="card-body space-y-3">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div></div>
          ))}
        </div>
        <div className="card"><div className="card-body p-0">
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div></div>
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load calendar</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{events.length} events this month</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="This Week" value={thisWeekCount} icon={Calendar} color="bg-primary-600" />
        <StatCard label="This Month" value={thisMonthCount} icon={Clock} color="bg-blue-500" />
        <StatCard label="Upcoming Deadlines" value={upcomingDeadlines} icon={AlertTriangle} color="bg-red-500" />
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white min-w-[180px] text-center">
                  {MONTHS[month]} {year}
                </h2>
                <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={goToToday} className="ml-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                  Today
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode('agenda')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'agenda' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                >
                  Agenda
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <Filter className="w-4 h-4 text-gray-400" />
            {EVENT_TYPES.map((t) => (
              <span key={t.key} className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                {t.label}
              </span>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row">
            <div className={`${viewMode === 'agenda' && selectedDate ? 'lg:w-3/5' : 'w-full'} border-r border-gray-200 dark:border-gray-800`}>
              {viewMode === 'month' && (
                <div>
                  <div className="grid grid-cols-7">
                    {DAYS.map((d) => (
                      <div key={d} className="p-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-800">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: startPad }).map((_, i) => (
                      <div key={`pad-${i}`} className="min-h-[100px] p-1.5 border-b border-r border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/30" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dayEvents = getEventsForDay(day);
                      return (
                        <div
                          key={day}
                          onClick={() => handleDayClick(day)}
                          className={`min-h-[100px] p-1.5 border-b border-r border-gray-100 dark:border-gray-800/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${
                            isSelected(day) ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-inset ring-primary-400' : ''
                          }`}
                        >
                          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${
                            isToday(day) ? 'bg-primary-600 text-white' : 'text-gray-900 dark:text-white'
                          }`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map((e) => (
                              <div
                                key={e.id}
                                onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); setShowDetailPanel(true); }}
                                className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${getEventColor(e.event_type)}`}
                                title={e.title}
                              >
                                {e.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-400 px-1">+{dayEvents.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewMode === 'agenda' && (
                <div className="p-4">
                  {!selectedDate ? (
                    <EmptyState icon={Calendar} message="Select a day to view agenda" sub="Click on any date in the month view" />
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Events for {formatDate(selectedDate)}
                      </h3>
                      {getEventsForSelectedDate().length === 0 ? (
                        <EmptyState icon={Calendar} message="No events scheduled for this period" />
                      ) : (
                        <div className="space-y-3">
                          {getEventsForSelectedDate().map((e) => (
                            <div
                              key={e.id}
                              onClick={() => { setSelectedEvent(e); setShowDetailPanel(true); }}
                              className="card cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <div className="card-body flex items-start gap-3">
                                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${getEventColor(e.event_type)}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{e.title}</h4>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${getEventColor(e.event_type)}`}>
                                      {getTypeLabel(e.event_type)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {formatDateTime(e.start_date || e.start)}{e.end_date ? ` - ${formatDateTime(e.end_date)}` : ''}
                                  </p>
                                  {e.location && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      <MapPin className="w-3 h-3 inline mr-1" />{e.location}
                                    </p>
                                  )}
                                  {e.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{e.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {showDetailPanel && selectedEvent && (
              <div className="lg:w-2/5 w-full p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Details</h3>
                  <button onClick={() => setShowDetailPanel(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className={`w-full h-2 rounded-full ${getEventColor(selectedEvent.event_type)}`} />
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEvent.title}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white mt-2 ${getEventColor(selectedEvent.event_type)}`}>
                      {getTypeLabel(selectedEvent.event_type)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatDateTime(selectedEvent.start_date || selectedEvent.start)}</span>
                    </div>
                    {selectedEvent.end_date && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>To {formatDateTime(selectedEvent.end_date)}</span>
                      </div>
                    )}
                    {selectedEvent.location && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedEvent.location}</span>
                      </div>
                    )}
                    {selectedEvent.department && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{selectedEvent.department}</span>
                      </div>
                    )}
                    {selectedEvent.color && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Color:</span>
                        <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: selectedEvent.color }} />
                      </div>
                    )}
                    {selectedEvent.all_day && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        All Day
                      </span>
                    )}
                  </div>
                  {selectedEvent.description && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Description</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleEditEvent(selectedEvent)} className="btn-secondary gap-2 text-sm">
                      <Edit3 className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="btn-secondary gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'agenda' && !selectedDate && (
              <div className="lg:w-2/5 w-full p-4 hidden lg:block" />
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseCreateModal}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingEvent ? 'Edit Event' : 'Create Event'}</h3>
              <button onClick={handleCloseCreateModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="Event title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  placeholder="Event description..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="input-field w-full resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type</label>
                <select
                  value={createForm.event_type}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, event_type: e.target.value }))}
                  className="input-field w-full"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start *</label>
                  <input
                    type="datetime-local"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, end_date: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={createForm.all_day}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, all_day: e.target.checked }))}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  <span className="ms-2 text-sm text-gray-600 dark:text-gray-400">All Day</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="Event location"
                  value={createForm.location}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <input
                  type="color"
                  value={createForm.color}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select
                  value={createForm.department}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, department: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="">All Departments</option>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Management">Management</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reminder (minutes before)</label>
                <select
                  value={createForm.reminder_minutes}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, reminder_minutes: Number(e.target.value) }))}
                  className="input-field w-full"
                >
                  <option value={0}>None</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={1440}>1 day</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleCloseCreateModal} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateEvent} disabled={creating || !createForm.title.trim() || !createForm.start_date} className="btn-primary disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creating ? ' Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
