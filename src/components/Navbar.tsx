import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { CrestLogo } from './CrestLogo.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Bell,
  LogOut,
  User as UserIcon,
  CheckCheck,
  CheckCircle2,
  FileText,
  ArrowRight,
  Clock,
  Download,
} from 'lucide-react';

interface NavbarProps {
  onSignInClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignInClick }) => {
  const {
    user,
    profile,
    department,
    logout,
    unreadCount,
    notifications,
    refreshNotifications,
    setActiveTab,
    isMasterAdmin,
  } = useAuth();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isNotifOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await authFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      await refreshNotifications();
    } catch {
      // transient glitch ignore
    }
  };

  const handleMarkAllRead = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await authFetch('/api/notifications/read-all', { method: 'PUT' });
      await refreshNotifications();
    } catch {
      // transient glitch ignore
    }
  };

  const recentNotifications = (notifications || []).slice(0, 5);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark & crest */}
        <div
          onClick={() => setActiveTab(isMasterAdmin ? 'master-departments' : 'dashboard')}
          className="cursor-pointer shrink-0"
        >
          <CrestLogo size="md" showText={true} />
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {!user ? null : (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span
                className={`font-semibold px-2 py-0.5 rounded ${
                  isMasterAdmin
                    ? 'text-amber-800 bg-amber-50 border border-amber-300'
                    : 'text-slate-700'
                }`}
              >
                {isMasterAdmin ? 'MASTER ADMIN' : user.role}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {isMasterAdmin
                  ? 'MIT Mysore Institutional Central Governance'
                  : department?.name || 'Maharaja Institute of Technology, Mysore'}
              </span>
            </div>
          )}
        </nav>

        {/* Zone 3: Primary Action & Notifications Corner */}
        <div className="flex items-center gap-3 shrink-0">
          {!user ? (
            <button
              onClick={onSignInClick}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              Sign In to FPMS
            </button>
          ) : isMasterAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Corner Notifications Popover Dropdown */}
              <div className="relative" ref={notifDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen((prev) => !prev)}
                  className={`relative p-2 rounded-lg transition-colors ${
                    isNotifOpen
                      ? 'bg-rose-50 text-[#7B1113]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Notifications & Circulars"
                  aria-label="View Notifications"
                  aria-expanded={isNotifOpen}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[10px] font-bold text-white bg-[#7B1113] rounded-full ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50 animate-in fade-in-50 zoom-in-95">
                    {/* Popover Header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#7B1113] text-white rounded-full">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>

                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-[#7B1113] hover:text-[#600d0f] flex items-center gap-1 hover:underline"
                          title="Mark all notifications as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    {/* Notification Items List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {recentNotifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          <Bell className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                          <span>No recent notifications</span>
                        </div>
                      ) : (
                        recentNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              handleMarkAsRead(notif.id);
                              setActiveTab('notifications');
                              setIsNotifOpen(false);
                            }}
                            className={`p-3 text-xs flex items-start gap-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                              !notif.isRead ? 'bg-rose-50/30' : ''
                            }`}
                          >
                            <div className="p-1.5 rounded-md bg-slate-100 text-[#7B1113] shrink-0 mt-0.5">
                              {notif.type === 'CIRCULAR' ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : (
                                <Bell className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="font-semibold text-slate-900 truncate">
                                  {notif.title}
                                </p>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-[#7B1113] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                {notif.message}
                              </p>

                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                <span>{notif.createdAt?.split('T')[0]}</span>
                                {notif.attachmentUrl && (
                                  <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1 rounded font-medium">
                                    <Download className="w-2.5 h-2.5" /> Doc
                                  </span>
                                )}
                              </div>
                            </div>

                            {!notif.isRead && (
                              <button
                                type="button"
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                title="Mark read"
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Popover Footer */}
                    <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('notifications');
                          setIsNotifOpen(false);
                        }}
                        className="w-full py-1.5 text-xs font-semibold text-[#7B1113] hover:text-[#600d0f] hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>View All Notifications & Circulars</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Chip */}
              <button
                onClick={() =>
                  setActiveTab(
                    isMasterAdmin
                      ? 'master-departments'
                      : user.role === 'ADMIN'
                      ? 'settings'
                      : 'profile'
                  )
                }
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                  {profile?.fullName ? (
                    profile.fullName.charAt(0)
                  ) : (
                    <UserIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                    {profile?.fullName || user.email.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {isMasterAdmin ? 'MASTER ADMIN' : user.role}
                  </span>
                </div>
              </button>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
