import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Network,
  CalendarDays,
  Rss,
  Bell,
  Settings,
  KeyRound,
  UserCircle,
  FolderGit2,
  Sparkles,
  Building2,
  ShieldCheck,
  SplitSquareVertical,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, activeTab, setActiveTab, unreadCount, department, isMasterAdmin } = useAuth();
  if (!user) return null;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }

  let items: NavItem[] = [];

  if (isMasterAdmin) {
    items = [
      { id: 'departments', label: 'Department Portals', icon: <Building2 className="w-4 h-4 text-amber-400" /> },
      { id: 'academic-year', label: 'Academic Year Settings', icon: <CalendarDays className="w-4 h-4 text-amber-400" /> },
      { id: 'security', label: 'Change Email & Password', icon: <KeyRound className="w-4 h-4 text-amber-400" /> },
    ];
  } else if (user.role === 'ADMIN') {
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'staff', label: 'Staff Management', icon: <Users className="w-4 h-4" /> },
      { id: 'students', label: 'Student Management', icon: <GraduationCap className="w-4 h-4" /> },
      { id: 'section-allocation', label: 'Section Allocation', icon: <SplitSquareVertical className="w-4 h-4" /> },
      { id: 'mentor-allocation', label: 'Mentor Allocation', icon: <Network className="w-4 h-4" /> },
      { id: 'portfolio', label: 'Academic Portfolio', icon: <FolderGit2 className="w-4 h-4" /> },
      { id: 'timetables', label: 'Timetable Management', icon: <CalendarDays className="w-4 h-4" /> },
      { id: 'feed', label: 'Institutional Feed', icon: <Rss className="w-4 h-4" /> },
      { id: 'notifications', label: 'Notifications & Circulars', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
      { id: 'security', label: 'Account & Security', icon: <KeyRound className="w-4 h-4" /> },
    ];
  } else if (user.role === 'HOD') {
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'profile', label: 'My Profile', icon: <UserCircle className="w-4 h-4" /> },
      { id: 'staff', label: 'Department Faculty', icon: <Users className="w-4 h-4" /> },
      { id: 'students', label: 'Student Management', icon: <GraduationCap className="w-4 h-4" /> },
      { id: 'portfolio', label: 'Academic Portfolio', icon: <FolderGit2 className="w-4 h-4" /> },
      { id: 'timetables', label: 'Timetable', icon: <CalendarDays className="w-4 h-4" /> },
      { id: 'feed', label: 'Academic Feed', icon: <Rss className="w-4 h-4" /> },
      { id: 'notifications', label: 'Notifications & Circulars', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
      { id: 'security', label: 'Account & Security', icon: <KeyRound className="w-4 h-4" /> },
    ];
  } else if (user.role === 'NON_TEACHING') {
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'profile', label: 'My Profile', icon: <UserCircle className="w-4 h-4" /> },
      { id: 'portfolio', label: 'Academic Portfolio', icon: <FolderGit2 className="w-4 h-4" /> },
      { id: 'timetables', label: 'Lab & Timetable', icon: <CalendarDays className="w-4 h-4" /> },
      { id: 'feed', label: 'Academic Feed', icon: <Rss className="w-4 h-4" /> },
      { id: 'notifications', label: 'Notifications & Circulars', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
      { id: 'security', label: 'Account & Security', icon: <KeyRound className="w-4 h-4" /> },
    ];
  } else {
    // FACULTY
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'profile', label: 'My Profile', icon: <UserCircle className="w-4 h-4" /> },
      { id: 'portfolio', label: 'Academic Portfolio', icon: <FolderGit2 className="w-4 h-4" /> },
      { id: 'mentees', label: 'Mentor Students', icon: <Network className="w-4 h-4" /> },
      { id: 'timetables', label: 'Timetable', icon: <CalendarDays className="w-4 h-4" /> },
      { id: 'feed', label: 'Academic Feed', icon: <Rss className="w-4 h-4" /> },
      { id: 'notifications', label: 'Notifications & Circulars', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
      { id: 'security', label: 'Account & Security', icon: <KeyRound className="w-4 h-4" /> },
    ];
  }

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            {isMasterAdmin && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isMasterAdmin ? 'Master Admin' : `${user.role} Portal`}</span>
          </span>
          <span className="text-[10px] text-amber-400 font-mono font-bold">
            {isMasterAdmin ? 'ALL DEPTS' : (department?.code || 'ISE')}
          </span>
        </div>
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-[#7B1113]' : 'bg-[#7B1113] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">Maharaja Institute of Technology Mysore</p>
        <p>Institutional FPMS Platform</p>
      </div>
    </aside>
  );
};
