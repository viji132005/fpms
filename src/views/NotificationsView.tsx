import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { Notification } from '../types/index.ts';
import {
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
  FileText,
  Plus,
  Eye,
  Download,
  X,
  Send,
  Calendar,
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
  Bookmark,
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { user, department, notifications, refreshNotifications, setActiveTab, isMasterAdmin } = useAuth();
  const deptCode = department?.code || 'ISE';

  // Selection & Customize Delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'CIRCULARS' | 'SAVED' | 'UPDATES'>('ALL');

  // Modal for Admin/HOD to circulate circular
  const [showCirculateModal, setShowCirculateModal] = useState(false);
  const [durationTypeChoice, setDurationTypeChoice] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [circularForm, setCircularForm] = useState({
    title: '',
    message: '',
    circularNumber: `MITM/${deptCode}/CIR/${new Date().getFullYear()}/${Math.floor(
      100 + Math.random() * 900
    )}`,
    circularDate: new Date().toISOString().split('T')[0],
    attachmentUrl: '',
    attachmentName: '',
    targetAudience: 'ALL' as 'ALL' | 'FACULTY',
    durationDays: 0, // 0 = Always Active
    validUntil: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    name: string;
    title: string;
  } | null>(null);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await authFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      await refreshNotifications();
    } catch {
      // Ignore background transient network glitches
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await authFetch('/api/notifications/read-all', { method: 'PUT' });
      await refreshNotifications();
      setStatusMessage('All notifications marked as read.');
    } catch {
      // Ignore background transient network glitches
    }
  };

  const handleDeleteSingle = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await authFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setStatusMessage('Notification removed.');
        await refreshNotifications();
      }
    } catch {
      setErrorMessage('Failed to delete notification.');
    }
  };

  const handleToggleSave = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await authFetch(`/api/notifications/${id}/save`, { method: 'PUT' });
      if (res.ok) {
        await refreshNotifications();
        setStatusMessage('Document bookmark updated.');
      }
    } catch {
      // Ignore background transient network glitches
    }
  };

  // In-app Confirmation Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<'BATCH' | 'ALL' | null>(null);

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirmTarget(null);

    try {
      const res = await authFetch('/api/notifications/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setStatusMessage(`Successfully deleted ${selectedIds.size} selected notification(s).`);
        setSelectedIds(new Set());
        await refreshNotifications();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to delete selected items.');
      }
    } catch {
      setErrorMessage('Network error while deleting notifications.');
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    setDeleteConfirmTarget(null);

    try {
      const res = await authFetch('/api/notifications/clear-all', { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage('All notifications cleared from inbox.');
        setSelectedIds(new Set());
        await refreshNotifications();
      }
    } catch {
      setErrorMessage('Network error clearing notifications.');
    }
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const handleNotificationClick = (notif: any) => {
    handleMarkAsRead(notif.id);
    if (notif.attachmentUrl) {
      setPreviewDoc({
        url: notif.attachmentUrl,
        name: notif.attachmentName || 'Circular Document',
        title: notif.title,
      });
    } else if (notif.linkUrl) {
      const tab = notif.linkUrl
        .replace('/faculty/', '')
        .replace('/hod/', '')
        .replace('/admin/', '');
      setActiveTab(tab);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCircularForm((prev) => ({
        ...prev,
        attachmentUrl: reader.result as string,
        attachmentName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCirculateCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circularForm.title || !circularForm.message) return;
    setIsSending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    // Compute final validUntil if durationDays > 0 and validUntil not set manually
    let calculatedValidUntil = circularForm.validUntil;
    if (circularForm.durationDays > 0 && !calculatedValidUntil) {
      calculatedValidUntil = new Date(
        Date.now() + circularForm.durationDays * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    try {
      const res = await authFetch('/api/notifications/circular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...circularForm,
          validUntil: calculatedValidUntil || undefined,
        }),
      });
      if (res.ok) {
        setShowCirculateModal(false);
        setCircularForm({
          title: '',
          message: '',
          circularNumber: `MITM/${deptCode}/CIR/${new Date().getFullYear()}/${Math.floor(
            100 + Math.random() * 900
          )}`,
          circularDate: new Date().toISOString().split('T')[0],
          attachmentUrl: '',
          attachmentName: '',
          targetAudience: 'ALL',
          durationDays: 0,
          validUntil: '',
        });
        setDurationTypeChoice('PRESET');
        setStatusMessage(
          'Official circular broadcasted successfully across the institution/department!'
        );
        await refreshNotifications();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to circulate notification.');
      }
    } catch {
      setErrorMessage('Network error circulating notification.');
    } finally {
      setIsSending(false);
    }
  };

  const isCircularExpired = (notif: Notification) => {
    if (!notif.validUntil) return false;
    return new Date(notif.validUntil).getTime() < Date.now();
  };

  const isImageFile = (url: string, name?: string) => {
    if (url?.startsWith('data:image/')) return true;
    if (name) {
      const ext = name.split('.').pop()?.toLowerCase();
      if (ext && ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return true;
    }
    return false;
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'UNREAD') return !n.isRead;
    if (filterType === 'CIRCULARS') return n.type === 'CIRCULAR';
    if (filterType === 'SAVED') return !!n.isSaved;
    if (filterType === 'UPDATES') return n.type !== 'CIRCULAR';
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#7B1113]" />
            <span>Institutional Circulars & Notifications</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department broadcasts, official circulars with direct document downloads, customizable active time periods, and multi-item cleanup.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          {(isMasterAdmin || user?.role === 'ADMIN' || user?.role === 'HOD') && (
            <button
              onClick={() => setShowCirculateModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Circulate Official Notice</span>
            </button>
          )}

          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => setDeleteConfirmTarget('ALL')}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Inbox</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* FILTER & CUSTOMIZE SELECTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'ALL'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilterType('UNREAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'UNREAD'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Unread ({notifications.filter((n) => !n.isRead).length})
          </button>
          <button
            onClick={() => setFilterType('CIRCULARS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'CIRCULARS'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Official Circulars ({notifications.filter((n) => n.type === 'CIRCULAR').length})
          </button>
          <button
            onClick={() => setFilterType('SAVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterType === 'SAVED'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Documents ({notifications.filter((n) => n.isSaved).length})</span>
          </button>
          <button
            onClick={() => setFilterType('UPDATES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'UPDATES'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Academic Updates ({notifications.filter((n) => n.type !== 'CIRCULAR').length})
          </button>
        </div>

        {/* Multi-Select & Batch Delete Action Bar */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
            >
              {selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#7B1113]" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{selectedIds.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}</span>
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={() => setDeleteConfirmTarget('BATCH')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors animate-in zoom-in-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 shadow-sm">
          <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No notifications found.</p>
          <p className="text-slate-400 mt-1">
            {filterType === 'ALL'
              ? 'You are completely up to date.'
              : `No notifications in ${filterType.toLowerCase()} view.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
          {filteredNotifications.map((notif) => {
            const isSelected = selectedIds.has(notif.id);
            const expired = isCircularExpired(notif);

            return (
              <div
                key={notif.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${
                  isSelected
                    ? 'bg-amber-50/40'
                    : !notif.isRead
                    ? 'bg-rose-50/20'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSelect(notif.id, e)}
                    className="mt-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={isSelected ? 'Deselect item' : 'Select item'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#7B1113]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>

                  {/* Icon */}
                  <div
                    onClick={() => handleNotificationClick(notif)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0 mt-0.5 cursor-pointer"
                  >
                    {notif.type === 'CIRCULAR' ? (
                      <FileText className="w-4 h-4 text-[#7B1113]" />
                    ) : notif.type === 'SUBMISSION_RETURNED' ? (
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                    ) : notif.type === 'SUBMISSION_APPROVED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Bell className="w-4 h-4 text-[#7B1113]" />
                    )}
                  </div>

                  {/* Main Content */}
                  <div
                    className="space-y-1.5 flex-1 cursor-pointer"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900 hover:text-[#7B1113] transition-colors">
                        {notif.title}
                      </h3>
                      {notif.circularNumber && (
                        <span className="text-[10px] font-mono font-semibold text-[#7B1113] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {notif.circularNumber}
                        </span>
                      )}

                      {/* Expiration / Duration Status */}
                      {expired ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Notice Expired</span>
                        </span>
                      ) : notif.validUntil ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>
                            Valid until {notif.validUntil.split('T')[0]}
                          </span>
                        </span>
                      ) : notif.durationDays && notif.durationDays > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Valid for {notif.durationDays} days</span>
                        </span>
                      ) : notif.type === 'CIRCULAR' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Active Broadcast
                        </span>
                      ) : null}

                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#7B1113]" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {notif.message}
                    </p>

                    {/* Attachment Action Bar: View & Direct Download */}
                    {notif.attachmentUrl && (
                      <div className="pt-1.5 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {/* View Preview Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDoc({
                              url: notif.attachmentUrl!,
                              name: notif.attachmentName || 'Circular Document',
                              title: notif.title,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#7B1113] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#7B1113]" />
                          <span>Preview Document ({notif.attachmentName || 'Official Slip'})</span>
                        </button>

                        {/* Direct Download Button */}
                        <a
                          href={notif.attachmentUrl}
                          download={notif.attachmentName || `circular-${notif.id}.pdf`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-sm"
                          title="Download attached official file directly"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Download File</span>
                        </a>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 pt-1 flex-wrap">
                      <span>
                        {notif.createdAt?.split('T')[0]} {notif.createdAt?.split('T')[1]?.substring(0, 5)}
                      </span>
                      {notif.actorName && <span>· Circulated by {notif.actorName}</span>}
                    </div>
                  </div>
                </div>

                {/* Individual Actions Right Toolbar */}
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-[#7B1113] bg-slate-100 hover:bg-rose-50 border border-slate-200 px-2 py-1 rounded-md transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mark read</span>
                    </button>
                  )}

                  {/* Bookmark/Save button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSave(notif.id, e)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      notif.isSaved
                        ? 'text-amber-600 hover:text-amber-700 bg-amber-50'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    title={notif.isSaved ? 'Remove from Saved' : 'Save Document / Bookmark'}
                  >
                    <Bookmark className={`w-4 h-4 ${notif.isSaved ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => handleDeleteSingle(notif.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete this notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {notif.linkUrl && (
                    <button
                      onClick={() => handleNotificationClick(notif)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                      title="Navigate to item"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CIRCULATE OFFICIAL NOTICE MODAL */}
      {showCirculateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-[#7B1113] rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Circulate Official Notice / Circular</h2>
                  <p className="text-[11px] text-slate-500">
                    Broadcasted to authorized faculty, staff, and leadership with customizable validity.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCirculateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCirculateCircular} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Circular / Reference No.
                  </label>
                  <input
                    type="text"
                    required
                    value={circularForm.circularNumber}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, circularNumber: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Notice Date
                  </label>
                  <input
                    type="date"
                    required
                    value={circularForm.circularDate}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, circularDate: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notice Subject / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule for Academic Audit & Portfolio Verification"
                  value={circularForm.title}
                  onChange={(e) => setCircularForm({ ...circularForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Circular Description & Instructions *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the circular requirements, deadlines, and instructions..."
                  value={circularForm.message}
                  onChange={(e) => setCircularForm({ ...circularForm, message: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={circularForm.targetAudience}
                    onChange={(e) =>
                      setCircularForm({
                        ...circularForm,
                        targetAudience: e.target.value as 'ALL' | 'FACULTY',
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value="ALL">All Staff & Faculty (Department / Institution)</option>
                    <option value="FACULTY">Teaching Faculty Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Validity Time Period
                  </label>
                  <select
                    value={durationTypeChoice === 'CUSTOM' ? 'CUSTOM' : circularForm.durationDays}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setDurationTypeChoice('CUSTOM');
                      } else {
                        setDurationTypeChoice('PRESET');
                        const days = Number(e.target.value);
                        setCircularForm({
                          ...circularForm,
                          durationDays: days,
                          validUntil: days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
                        });
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value={0}>Always Active (Permanent Notice)</option>
                    <option value={1}>1 Day (Urgent Priority Notice)</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value="CUSTOM">Custom Time Period / Expiry Date...</option>
                  </select>
                </div>
              </div>

              {/* Customizable Time Period Inputs */}
              {durationTypeChoice === 'CUSTOM' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2 animate-in fade-in-50">
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Custom Expiration & Time Period Settings</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Active Duration (in Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        placeholder="e.g. 5, 10, 45"
                        value={circularForm.durationDays || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const dateStr = val > 0 ? new Date(Date.now() + val * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '';
                          setCircularForm({
                            ...circularForm,
                            durationDays: val,
                            validUntil: dateStr,
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Specific Expiry Date
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={circularForm.validUntil}
                        onChange={(e) => {
                          const dateVal = e.target.value;
                          const diffMs = new Date(dateVal).getTime() - Date.now();
                          const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                          setCircularForm({
                            ...circularForm,
                            validUntil: dateVal,
                            durationDays: days,
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-700">
                    Notice will be marked active and automatically archived once the selected expiration period elapses.
                  </p>
                </div>
              )}

              {/* Document Attachment Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attach Official Document (PDF or Image)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileSelect}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-[#7B1113] hover:file:bg-rose-100"
                />
                {circularForm.attachmentName && (
                  <p className="text-[10px] text-emerald-700 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Attached: {circularForm.attachmentName}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCirculateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Circulating...' : 'Dispatch Circular'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7B1113]" />
                <h3 className="text-xs font-bold text-slate-900 truncate max-w-md">
                  {previewDoc.title} — ({previewDoc.name})
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 rounded-lg p-2 flex items-center justify-center min-h-[300px]">
              {isImageFile(previewDoc.url, previewDoc.name) ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[60vh] max-w-full object-contain rounded"
                />
              ) : previewDoc.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[60vh] rounded border border-slate-300"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">{previewDoc.name}</p>
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#7B1113] rounded-lg shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Attachment</span>
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">
                Official MIT Mysore Attachment
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  className="px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Download Document</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-800 font-bold text-sm mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </div>
              <span>Confirm Deletion</span>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {deleteConfirmTarget === 'BATCH'
                ? `Are you sure you want to delete ${selectedIds.size} selected notification(s)? This action cannot be undone.`
                : 'Are you sure you want to clear all notifications from your inbox? This action cannot be undone.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteConfirmTarget === 'BATCH' ? handleBatchDelete : handleClearAll}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
