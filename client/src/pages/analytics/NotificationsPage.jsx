import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, XCircle, Clock, Mail, Archive, Trash2, Settings, CheckCheck } from 'lucide-react';
import { notificationService } from '../../api/analytics';
import { formatDate, classNames } from '../../utils/helpers';

const TYPE_ICONS = { info: Bell, warning: AlertTriangle, success: CheckCircle, error: XCircle, reminder: Clock };

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({ email: true, in_app: true, sms: false, push: false });

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (activeTab === 'unread') params.is_read = false;
      if (activeTab === 'archived') params.archived = true;
      const { data } = await notificationService.getNotifications(params);
      setNotifications(data.data || data || []);
      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeTab, page]);

  useEffect(() => {
    notificationService.getUnreadCount()
      .then(({ data }) => setUnreadCount(data?.count ?? data?.unread_count ?? 0))
      .catch(() => {});
  }, []);

  const loadPrefs = async () => {
    try {
      const { data } = await notificationService.getPreferences();
      setPrefs(data?.preferences || data || { email: true, in_app: true, sms: false, push: false });
      setShowPrefs(true);
    } catch (err) { console.error(err); }
  };

  const handleMarkRead = async (id) => {
    try { await notificationService.markAsRead(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)); } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try { await notificationService.markAllAsRead(); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); setUnreadCount(0); } catch (err) { console.error(err); }
  };

  const handleArchive = async (id) => {
    try { await notificationService.archiveNotification(id); setNotifications(prev => prev.filter(n => n.id !== id)); } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try { await notificationService.deleteNotification(id); setNotifications(prev => prev.filter(n => n.id !== id)); } catch (err) { console.error(err); }
  };

  const handleSavePrefs = async () => {
    try { await notificationService.updatePreferences(prefs); setShowPrefs(false); } catch (err) { console.error(err); }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread (${unreadCount})` },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Stay updated with system alerts and reminders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleMarkAllRead} className="btn-secondary btn-sm gap-1"><CheckCheck className="w-4 h-4" /> Mark All Read</button>
          <button onClick={loadPrefs} className="btn-secondary btn-sm gap-1"><Settings className="w-4 h-4" /> Preferences</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); }} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const iconColors = { info: 'text-blue-500', warning: 'text-amber-500', success: 'text-emerald-500', error: 'text-red-500', reminder: 'text-violet-500' };
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors ${n.is_read ? 'bg-white' : 'bg-blue-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${n.is_read ? 'bg-gray-100' : 'bg-blue-100'}`}>
                      <Icon className={`w-5 h-5 ${iconColors[n.type] || 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                      <p className="text-sm text-gray-500 truncate mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleArchive(n.id); }} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Archive"><Archive className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="card-footer flex items-center justify-between">
            <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm disabled:opacity-50">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showPrefs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPrefs(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email', icon: Mail },
                { key: 'in_app', label: 'In-App', icon: Bell },
                { key: 'sms', label: 'SMS', icon: Mail },
                { key: 'push', label: 'Push', icon: Bell },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={prefs[key]} onChange={(e) => setPrefs({...prefs, [key]: e.target.checked})} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPrefs(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSavePrefs} className="btn-primary">Save Preferences</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
