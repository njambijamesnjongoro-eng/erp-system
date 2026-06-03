import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, MessageSquare, ClipboardList, Plus, Search, Filter, Bell, CheckCircle,
  Clock, User, Mail, Send, X, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  Pin, Eye, EyeOff
} from 'lucide-react';
import { announcementService, messageService } from '../../api/portal';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatDateTime } from '../../utils/helpers';

const TABS = [
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'notice', label: 'Notice Board', icon: ClipboardList },
];

const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CATEGORY_COLORS = {
  General: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  HR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  IT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Operations: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'All Staff': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const NOTICE_CATEGORIES = ['All', 'General', 'HR', 'Finance', 'IT', 'Operations', 'Events'];

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-14 h-14 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card"><div className="card-body space-y-3">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div></div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500">
      <AlertTriangle className="w-10 h-10 mb-3" />
      <p className="text-lg font-medium">Failed to load</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          Retry
        </button>
      )}
    </div>
  );
}

export function CommunicationsCenter() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('announcements');

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState(null);
  const [expandedAnnId, setExpandedAnnId] = useState(null);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', category: 'General', priority: 'Normal', content: '', department: '' });
  const [creatingAnn, setCreatingAnn] = useState(false);

  // Messages state
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [msgError, setMsgError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [msgSearch, setMsgSearch] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [msgForm, setMsgForm] = useState({ recipient: '', subject: '', message: '', broadcast: false });
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Notice board state
  const [noticeItems, setNoticeItems] = useState([]);
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeFilter, setNoticeFilter] = useState('All');

  const loadAnnouncements = useCallback(async () => {
    try {
      setAnnLoading(true);
      setAnnError(null);
      const res = await announcementService.getAll();
      setAnnouncements(res.data?.data || res.data || []);
    } catch (err) {
      setAnnError(err.message);
    } finally {
      setAnnLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setMsgLoading(true);
      setMsgError(null);
      const [sentRes, receivedRes, unreadRes] = await Promise.all([
        messageService.getSent(),
        messageService.getReceived(),
        messageService.getUnreadCount(),
      ]);
      const sent = sentRes.data?.data || sentRes.data || [];
      const received = receivedRes.data?.data || receivedRes.data || [];
      const combined = [...received.map((m) => ({ ...m, direction: 'incoming' })), ...sent.map((m) => ({ ...m, direction: 'outgoing' }))];
      combined.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      setMessages(combined);
      setUnreadCount(unreadRes.data?.data?.count || unreadRes.data?.count || 0);
    } catch (err) {
      setMsgError(err.message);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  const loadNoticeBoard = useCallback(async () => {
    try {
      setNoticeLoading(true);
      const res = await announcementService.getAll({ pinned: true });
      const items = res.data?.data || res.data || [];
      const enriched = items.length > 0 ? items : [
        { id: 1, title: 'Company Town Hall Meeting', category: 'Events', date: '2026-06-01', icon: 'Megaphone', pinned: true },
        { id: 2, title: 'New HR Policy Updates', category: 'HR', date: '2026-05-28', icon: 'User', pinned: true },
        { id: 3, title: 'Q2 Financial Review Published', category: 'Finance', date: '2026-05-25', icon: 'ClipboardList', pinned: true },
        { id: 4, title: 'IT System Maintenance Scheduled', category: 'IT', date: '2026-05-30', icon: 'Clock', pinned: true },
        { id: 5, title: 'Office Closure Notice', category: 'Operations', date: '2026-05-20', icon: 'Bell', pinned: true },
        { id: 6, title: 'Annual Staff Awards Ceremony', category: 'Events', date: '2026-06-15', icon: 'CheckCircle', pinned: true },
      ];
      setNoticeItems(enriched);
    } catch (_) {
      setNoticeItems([]);
    } finally {
      setNoticeLoading(false);
    }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { loadNoticeBoard(); }, [loadNoticeBoard]);

  const handleCreateAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.content.trim()) return;
    setCreatingAnn(true);
    try {
      await announcementService.create(annForm);
      setShowCreateAnnouncement(false);
      setAnnForm({ title: '', category: 'General', priority: 'Normal', content: '', department: '' });
      loadAnnouncements();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setCreatingAnn(false);
    }
  };

  const handleMarkAnnouncementRead = async (id) => {
    try {
      await announcementService.markRead(id);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    } catch (_) {}
  };

  const handleExpandAnnouncement = (ann) => {
    if (expandedAnnId === ann.id) {
      setExpandedAnnId(null);
      return;
    }
    setExpandedAnnId(ann.id);
    if (!ann.is_read) handleMarkAnnouncementRead(ann.id);
  };

  const handleSendMessage = async () => {
    if (!msgForm.subject.trim() || !msgForm.message.trim()) return;
    if (!msgForm.broadcast && !msgForm.recipient) return;
    setSendingMsg(true);
    try {
      if (msgForm.broadcast) {
        await messageService.sendBroadcast({ subject: msgForm.subject, message: msgForm.message });
      } else {
        await messageService.send({ recipient_id: msgForm.recipient, subject: msgForm.subject, message: msgForm.message });
      }
      setShowNewMessage(false);
      setMsgForm({ recipient: '', subject: '', message: '', broadcast: false });
      loadMessages();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    try {
      await messageService.send({ recipient_id: selectedMessage.sender_id || selectedMessage.user_id, subject: `Re: ${selectedMessage.subject}`, message: replyText });
      setShowReply(false);
      setReplyText('');
      loadMessages();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    if (msg.direction === 'incoming' && !msg.is_read) {
      try {
        await messageService.markRead(msg.id);
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (_) {}
    }
  };

  const getPriorityColor = (priority) => PRIORITY_COLORS[priority] || PRIORITY_COLORS.Normal;
  const getCategoryColor = (category) => CATEGORY_COLORS[category] || CATEGORY_COLORS.General;

  const filteredMessages = messages.filter((m) =>
    !msgSearch || m.subject?.toLowerCase().includes(msgSearch.toLowerCase()) || m.sender_name?.toLowerCase().includes(msgSearch.toLowerCase())
  );

  const filteredNotices = noticeFilter === 'All' ? noticeItems : noticeItems.filter((n) => n.category === noticeFilter);

  const noticeIcons = { Megaphone, MessageSquare, ClipboardList, User, Clock, Bell, CheckCircle };

  const filteredAnnouncements = announcements.filter((a) => {
    if (!a.title && !a.content) return false;
    return true;
  });

  const renderTabBadge = () => {
    if (activeTab === 'messages' && unreadCount > 0) {
      return (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communications Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Announcements, messages, and notices</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedMessage(null); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'messages' && isActive && renderTabBadge()}
            </button>
          );
        })}
      </div>

      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
            </p>
            <button onClick={() => setShowCreateAnnouncement(true)} className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> Create Announcement
            </button>
          </div>

          {annLoading ? <LoadingSkeleton /> : annError ? (
            <ErrorState message={annError} onRetry={loadAnnouncements} />
          ) : filteredAnnouncements.length === 0 ? (
            <EmptyState icon={Megaphone} message="No announcements" sub="Create the first announcement to get started" />
          ) : (
            filteredAnnouncements.map((ann) => {
              const isExpanded = expandedAnnId === ann.id;
              return (
                <div key={ann.id} className="card cursor-pointer" onClick={() => handleExpandAnnouncement(ann)}>
                  <div className="card-body">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${ann.is_read ? 'bg-transparent border-2 border-gray-300 dark:border-gray-600' : 'bg-primary-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ann.priority)}`}>
                            {ann.priority || 'Normal'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(ann.category)}`}>
                            {ann.category || 'General'}
                          </span>
                          {ann.department && (
                            <span className="text-xs text-gray-400">{ann.department}</span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{formatDate(ann.created_at || ann.date)}</span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{ann.title}</h3>
                        <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {ann.content || ann.description || ''}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {isExpanded ? (
                            <span className="text-xs text-primary-600 flex items-center gap-1"><ChevronUp className="w-3 h-3" /> Show less</span>
                          ) : (
                            <span className="text-xs text-primary-600 flex items-center gap-1"><ChevronDown className="w-3 h-3" /> Show more</span>
                          )}
                          {ann.author && <span className="text-xs text-gray-400 ml-auto">Posted by {ann.author}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-80 w-full flex-shrink-0">
            <div className="card">
              <div className="card-body p-0">
                <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => setShowNewMessage(true)} className="btn-primary flex-1 gap-2 justify-center text-sm">
                      <Plus className="w-4 h-4" /> New Message
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={msgSearch}
                      onChange={(e) => setMsgSearch(e.target.value)}
                      className="input-field pl-10 w-full text-sm"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[500px]">
                  {msgLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
                  ) : msgError ? (
                    <ErrorState message={msgError} onRetry={loadMessages} />
                  ) : filteredMessages.length === 0 ? (
                    <EmptyState icon={Mail} message="No messages" sub="Start a new conversation" />
                  ) : (
                    filteredMessages.map((msg) => (
                      <button
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg)}
                        className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          selectedMessage?.id === msg.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${msg.is_read ? 'bg-transparent border-2 border-gray-300 dark:border-gray-600' : 'bg-primary-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {msg.sender_name || msg.sender || msg.recipient_name || 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(msg.created_at || msg.date)}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{msg.subject}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{msg.message || msg.body || ''}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            {selectedMessage ? (
              <div className="card">
                <div className="card-body p-0">
                  <div className="p-5 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedMessage.subject}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${selectedMessage.direction === 'incoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {selectedMessage.direction === 'incoming' ? 'Received' : 'Sent'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{selectedMessage.sender_name || selectedMessage.sender || selectedMessage.recipient_name || 'Unknown'}</span>
                      </div>
                      <span>·</span>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedMessage.sender_email || selectedMessage.recipient_email || '-'}</span>
                      </div>
                      <span>·</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDateTime(selectedMessage.created_at || selectedMessage.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.message || selectedMessage.body || 'No content'}
                    </p>
                  </div>
                  <div className="p-4">
                    {showReply ? (
                      <div className="space-y-3">
                        <textarea
                          placeholder="Type your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          className="input-field w-full resize-none text-sm"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setShowReply(false); setReplyText(''); }} className="btn-secondary text-sm">Cancel</button>
                          <button onClick={handleReply} disabled={!replyText.trim()} className="btn-primary gap-2 text-sm disabled:opacity-50">
                            <Send className="w-4 h-4" /> Send Reply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowReply(true)} className="btn-primary gap-2 text-sm">
                        <MessageSquare className="w-4 h-4" /> Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body">
                  <EmptyState icon={Mail} message="Select a message" sub="Choose a conversation from the left panel" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notice' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Category:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {NOTICE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNoticeFilter(cat)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    noticeFilter === cat
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {noticeLoading ? (
            <LoadingSkeleton />
          ) : filteredNotices.length === 0 ? (
            <EmptyState icon={ClipboardList} message="No notices found" sub="Try a different category filter" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotices.map((item) => {
                const IconComp = noticeIcons[item.icon] || ClipboardList;
                return (
                  <div key={item.id} className="card group hover:shadow-md transition-shadow">
                    <div className="card-body">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <IconComp className="w-5 h-5 text-primary-600" />
                        </div>
                        {item.pinned && <Pin className="w-4 h-4 text-amber-500" />}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showCreateAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateAnnouncement(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Announcement</h3>
              <button onClick={() => setShowCreateAnnouncement(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="Announcement title"
                  value={annForm.title}
                  onChange={(e) => setAnnForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={annForm.category}
                  onChange={(e) => setAnnForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="input-field w-full"
                >
                  {['General', 'HR', 'Finance', 'IT', 'Operations', 'All Staff'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={annForm.priority}
                  onChange={(e) => setAnnForm((prev) => ({ ...prev, priority: e.target.value }))}
                  className="input-field w-full"
                >
                  {['Low', 'Normal', 'High', 'Urgent'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department (optional)</label>
                <input
                  type="text"
                  placeholder="Target department"
                  value={annForm.department}
                  onChange={(e) => setAnnForm((prev) => ({ ...prev, department: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content *</label>
                <textarea
                  placeholder="Announcement details..."
                  value={annForm.content}
                  onChange={(e) => setAnnForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="input-field w-full resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateAnnouncement(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateAnnouncement} disabled={creatingAnn || !annForm.title.trim() || !annForm.content.trim()} className="btn-primary disabled:opacity-50">
                {creatingAnn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creatingAnn ? ' Publishing...' : 'Publish Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewMessage(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Message</h3>
              <button onClick={() => setShowNewMessage(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className={`${msgForm.broadcast ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient</label>
                <select
                  value={msgForm.recipient}
                  onChange={(e) => setMsgForm((prev) => ({ ...prev, recipient: e.target.value }))}
                  className="input-field w-full"
                  disabled={msgForm.broadcast}
                >
                  <option value="">Select a recipient...</option>
                  <option value="1">John Doe</option>
                  <option value="2">Jane Smith</option>
                  <option value="3">Admin User</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={msgForm.broadcast}
                    onChange={(e) => setMsgForm((prev) => ({ ...prev, broadcast: e.target.checked, recipient: '' }))}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  <span className="ms-2 text-sm text-gray-600 dark:text-gray-400">Send to All (Broadcast)</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                <input
                  type="text"
                  placeholder="Message subject"
                  value={msgForm.subject}
                  onChange={(e) => setMsgForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
                <textarea
                  placeholder="Type your message..."
                  value={msgForm.message}
                  onChange={(e) => setMsgForm((prev) => ({ ...prev, message: e.target.value }))}
                  rows={5}
                  className="input-field w-full resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewMessage(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSendMessage} disabled={sendingMsg || !msgForm.subject.trim() || !msgForm.message.trim()} className="btn-primary gap-2 disabled:opacity-50">
                {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingMsg ? ' Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
