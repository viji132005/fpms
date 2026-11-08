import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  FolderGit2,
  Network,
  Bell,
  ArrowRight,
  Clock,
  CalendarDays,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  User,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { FacultyRegistrationModal } from '../components/FacultyRegistrationModal.tsx';
import { PERSONAL_DAYS, PERSONAL_PERIODS } from '../utils/personalTimetablePdf.ts';
import { FacultyPersonalGridCell } from '../types/index.ts';

export const FacultyDashboard: React.FC = () => {
  const { user, profile, department, setActiveTab } = useAuth();
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [menteesList, setMenteesList] = useState<any[]>([]);
  const [recentFeed, setRecentFeed] = useState<any[]>([]);
  const [personalGrid, setPersonalGrid] = useState<Record<string, FacultyPersonalGridCell>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedMenteeYear, setSelectedMenteeYear] = useState<string>('ALL');

  useEffect(() => {
    // Check if faculty profile needs first-time registration
    if (user?.role === 'FACULTY' && profile && !profile.isProfileRegistered) {
      setShowRegistrationModal(true);
    }
  }, [user, profile]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      authFetch('/api/portfolio?scope=mine').then((r) => (r.ok ? r.json() : [])),
      authFetch('/api/mentor-allocation/my-students').then((r) => (r.ok ? r.json() : [])),
      authFetch('/api/feed').then((r) => (r.ok ? r.json() : [])),
      authFetch('/api/faculty/personal-schedule').then((r) => (r.ok ? r.json() : { schedule: { grid: {} } })),
    ])
      .then(([portfolio, mentees, feed, scheduleData]) => {
        if (Array.isArray(portfolio)) setPortfolioItems(portfolio);
        if (Array.isArray(mentees)) setMenteesList(mentees);
        if (Array.isArray(feed)) setRecentFeed(feed.slice(0, 3));
        if (scheduleData?.schedule?.grid) setPersonalGrid(scheduleData.schedule.grid);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  // Filter mentees by year
  const filteredMentees = menteesList.filter((item) => {
    if (selectedMenteeYear === 'ALL') return true;
    const y = item.studentYear || item.student?.currentYear;
    return String(y) === selectedMenteeYear;
  });

  const yearCounts = {
    1: menteesList.filter((m) => (m.studentYear || m.student?.currentYear) === 1).length,
    2: menteesList.filter((m) => (m.studentYear || m.student?.currentYear) === 2).length,
    3: menteesList.filter((m) => (m.studentYear || m.student?.currentYear) === 3).length,
    4: menteesList.filter((m) => (m.studentYear || m.student?.currentYear) === 4).length,
  };

  const savedSlotCount = Object.keys(personalGrid).length;

  return (
    <div className="space-y-6">
      {/* First-time Faculty Profile Registration Modal */}
      <FacultyRegistrationModal
        isOpen={showRegistrationModal}
        onSuccess={() => setShowRegistrationModal(false)}
      />

      {/* Welcome Banner with Facebook / WhatsApp style Faculty DP on right (camera icon removed) */}
      <div className="bg-gradient-to-r from-slate-900 to-[#7B1113] rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <span>{department?.name || 'Department'} ({department?.code || 'ISE'})</span>
            <span>•</span>
            <span className="text-rose-200">Academic Year 2026-27</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
            Welcome, {profile?.fullName || user?.email}
          </h1>
          <p className="text-xs text-rose-100 mt-1 max-w-xl">
            {profile?.designation || 'Faculty'} · {profile?.qualification || 'Department Faculty'}
          </p>
          {/* Contact and Email only (hardcoded ID and account active removed as requested) */}
          <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-rose-100">
            <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
              <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{user?.email || (profile as any)?.email || 'email@mitmysore.in'}</span>
            </span>
            {profile?.phone && (
              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{profile.phone}</span>
              </span>
            )}
          </div>
        </div>

        {/* Facebook / WhatsApp style DP frame on right (camera icon removed) */}
        <div className="flex items-center gap-3 shrink-0 self-center sm:self-auto">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-white/30 shadow-2xl overflow-hidden bg-slate-800 flex items-center justify-center">
            {profile?.profilePhotoUrl ? (
              <img
                src={profile.profilePhotoUrl}
                alt={profile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white text-2xl font-black">
                {(profile?.fullName || user?.email || 'F').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Academic Records */}
        <div
          onClick={() => setActiveTab('portfolio')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-[#7B1113] transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-700">Portfolio Records</span>
            <FolderGit2 className="w-4 h-4 text-[#7B1113]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {portfolioItems.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Public institutional repository dossier
          </p>
        </div>

        {/* Assigned Mentees */}
        <div
          onClick={() => {
            document.getElementById('dashboard-mentee-details')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-[#7B1113] transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-700">Assigned Student Mentees</span>
            <Network className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {menteesList.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {menteesList.length > 0 ? 'Click to view year-wise breakdown below' : 'Awaiting admin cohort allocation'}
          </p>
        </div>

        {/* View Personal Timetable (Scrolls down to timetable directly in dashboard) */}
        <div
          onClick={() => {
            document.getElementById('dashboard-personal-timetable')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-[#7B1113] transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-700">View Personal Timetable</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mt-2">
            <span>{savedSlotCount} Weekly Slots Saved</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Click to view your personal timetable grid below
          </p>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions (AI Report Assistant replaced with Notifications & Circulars) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Faculty Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab('portfolio')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition-colors flex flex-col justify-between"
            >
              <FolderGit2 className="w-4 h-4 text-[#7B1113] mb-2" />
              <div className="text-xs font-bold text-slate-900">Academic Portfolio</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Public dossiers & folders</div>
            </button>

            <button
              onClick={() => setActiveTab('mentees')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition-colors flex flex-col justify-between"
            >
              <Network className="w-4 h-4 text-blue-600 mb-2" />
              <div className="text-xs font-bold text-slate-900">Student Mentee Notebook</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Parent contact & attendance remarks</div>
            </button>

            <button
              onClick={() => setActiveTab('timetables')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition-colors flex flex-col justify-between"
            >
              <CalendarDays className="w-4 h-4 text-emerald-600 mb-2" />
              <div className="text-xs font-bold text-slate-900">Class Timetables</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Edit personal grid & export PDF</div>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition-colors flex flex-col justify-between"
            >
              <Bell className="w-4 h-4 text-amber-600 mb-2" />
              <div className="text-xs font-bold text-slate-900">Notifications & Circulars</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Official circulars & notices</div>
            </button>
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Department Campus Announcements
            </h2>
            <button
              onClick={() => setActiveTab('feed')}
              className="text-[11px] font-semibold text-[#7B1113] hover:underline cursor-pointer"
            >
              View Feed →
            </button>
          </div>

          {recentFeed.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No campus announcements posted yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentFeed.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setActiveTab('feed')}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {post.title}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1">
                    <span>{post.authorName}</span>
                    <span>{post.eventDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Year-Wise Mentee Students Details Section */}
      <section id="dashboard-mentee-details" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Network className="w-4 h-4 text-[#7B1113]" />
              <span>Assigned Student Mentees (Year-Wise Cohort Details)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of student mentees assigned to you for academic mentoring and parent communication.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('mentees')}
            className="text-xs font-bold text-[#7B1113] hover:underline self-start sm:self-auto flex items-center gap-1 cursor-pointer"
          >
            <span>Open Mentoring Notebook</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Year Filter Segmented Control */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedMenteeYear('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              selectedMenteeYear === 'ALL'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Years ({menteesList.length})
          </button>
          {[1, 2, 3, 4].map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedMenteeYear(String(yr))}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedMenteeYear === String(yr)
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : '4th Year'}{' '}
              ({yearCounts[yr as 1 | 2 | 3 | 4] || 0})
            </button>
          ))}
        </div>

        {/* Mentees Table / Grid */}
        {filteredMentees.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No student mentees assigned for this filter.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mentees will be listed here once allocated by Department Administrator.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">USN</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Year / Sem</th>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">CGPA</th>
                  <th className="py-2.5 px-3">Student Contact</th>
                  <th className="py-2.5 px-3">Parent Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMentees.map((item, idx) => {
                  const s = item.student || {};
                  const year = item.studentYear || s.currentYear || 1;
                  const yearLabel = year === 1 ? '1st Year' : year === 2 ? '2nd Year' : year === 3 ? '3rd Year' : '4th Year';
                  return (
                    <tr key={s.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#7B1113]">
                        {s.usn || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-semibold">
                        {s.fullName || 'Student'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {yearLabel} · Sem {s.currentSemester || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {s.section ? `Section ${s.section}` : 'Unassigned'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {s.cgpa ? Number(s.cgpa).toFixed(2) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {s.phone || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {s.parentPhone || s.guardianPhone || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Embedded Personal Timetable Section (Directly on Dashboard) */}
      <section id="dashboard-personal-timetable" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="text-[10px] font-bold text-[#7B1113] uppercase tracking-wider">
              {department?.name || 'Department of Information Science and Engineering'}
            </div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
              <Clock className="w-4.5 h-4.5 text-[#7B1113]" />
              <span>My Personal Teaching Timetable (Saved Schedule)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Weekly class timetable saved for your faculty account. To edit slots or export as PDF, access the full timetable editor.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('timetables')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Edit Full Timetable</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timetable Single Grid Display */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] border-b border-slate-800">
                <th className="py-2.5 px-3 font-bold uppercase tracking-wider w-24 text-center border-r border-slate-800 bg-[#7B1113]">
                  Day
                </th>
                {PERSONAL_PERIODS.map((period, idx) => (
                  <th
                    key={idx}
                    className={`py-2 px-2.5 font-semibold text-center border-r border-slate-800 ${
                      period.isBreak ? 'bg-slate-800 text-amber-300 w-20' : 'min-w-[130px]'
                    }`}
                  >
                    {period.isBreak ? (
                      <div className="py-0.5">
                        <div className="font-extrabold text-[9px] tracking-wider">{period.label}</div>
                        <div className="text-[8px] text-slate-400 font-mono">{period.timeRange}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-[10px] text-slate-200">
                          Period {idx < 2 ? idx + 1 : idx < 5 ? idx : idx - 1}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">{period.timeRange}</div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERSONAL_DAYS.map((day, rIdx) => (
                <tr
                  key={day.key}
                  className={`border-b border-slate-200 ${rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                >
                  <td className="py-2.5 px-3 font-extrabold text-xs text-[#7B1113] border-r border-slate-200 bg-rose-50/40 text-center">
                    <div>{day.label}</div>
                    <div className="text-[10px] font-mono text-slate-400">({day.key})</div>
                  </td>

                  {PERSONAL_PERIODS.map((period) => {
                    if (period.isBreak) {
                      return (
                        <td
                          key={period.index}
                          className="py-2 px-1 text-center bg-slate-100/70 border-r border-slate-200 text-[9px] font-bold text-slate-400 uppercase select-none"
                        >
                          {period.index === 2 ? 'Tea' : 'Lunch'}
                        </td>
                      );
                    }

                    const cellKey = `${day.key}-${period.index}`;
                    const cell = personalGrid[cellKey];

                    return (
                      <td
                        key={period.index}
                        className="py-2 px-2.5 border-r border-slate-200 align-top min-h-[50px]"
                      >
                        {cell && cell.subject ? (
                          <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-slate-900 space-y-0.5">
                            <div className="font-bold text-[11px] text-[#7B1113] leading-tight">
                              {cell.subject}
                            </div>
                            <div className="text-[10px] text-slate-600 font-medium">
                              {cell.year} {cell.batch ? `(${cell.batch})` : ''}
                            </div>
                            {cell.room && (
                              <div className="text-[9px] text-slate-500 font-mono">
                                {cell.room}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-300 italic text-center py-2">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
