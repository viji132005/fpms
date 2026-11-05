import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { calculateProfileCompleteness } from '../utils/completeness.ts';
import { authFetch } from '../utils/api.ts';
import {
  FolderGit2,
  Network,
  Bell,
  Award,
  BookOpen,
  ArrowRight,
  Clock,
  CalendarDays,
  Plus,
  AlertTriangle,
  CheckCircle2,
  UserCircle,
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user, profile, department, setActiveTab } = useAuth();
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [menteesCount, setMenteesCount] = useState<number>(0);
  const [recentFeed, setRecentFeed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      authFetch('/api/portfolio').then((r) => (r.ok ? r.json() : [])),
      authFetch('/api/mentor-allocation/my-students').then((r) => (r.ok ? r.json() : [])),
      authFetch('/api/feed').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([portfolio, mentees, feed]) => {
        if (Array.isArray(portfolio)) setPortfolioItems(portfolio);
        if (Array.isArray(mentees)) setMenteesCount(mentees.length);
        if (Array.isArray(feed)) setRecentFeed(feed.slice(0, 3));
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const pubs = portfolioItems.filter((p) => p.category === 'PUBLICATION');
  const patents = portfolioItems.filter((p) => p.category === 'PATENT');
  const fdps = portfolioItems.filter(
    (p) => p.category === 'FDP' || p.category === 'WORKSHOP' || p.category === 'CONFERENCE'
  );
  const awards = portfolioItems.filter((p) => p.category === 'AWARD');

  const completeness = calculateProfileCompleteness({
    ...profile,
    activityCount: portfolioItems.length,
  });

  const isProfileIncomplete = completeness.score < 80;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#7B1113] rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-amber-300 uppercase tracking-wider">
            {department?.name || 'Department'} ({department?.code || 'ISE'})
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
            Welcome, {profile?.fullName || user?.email}
          </h1>
          <p className="text-xs text-rose-100 mt-1 max-w-xl">
            {profile?.designation} · {profile?.qualification} · Academic Session 2026-27
          </p>
        </div>
      </div>

      {/* Profile Incomplete Warning Banner */}
      {isProfileIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">
                Action Required: Complete Your Faculty Profile ({completeness.score}% Complete)
              </div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Missing: {completeness.missingFields.join(', ')}. Please update your contact details, photo, and CV document.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('profile')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-center"
          >
            <span>Complete Profile Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row (Tasks removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Profile Completeness */}
        <div
          onClick={() => setActiveTab('profile')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-[#7B1113] transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Profile Completeness</span>
            <span className="text-xs font-bold text-[#7B1113] tabular-nums">
              {completeness.score}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className="bg-[#7B1113] h-2 rounded-full transition-all duration-500"
              style={{ width: `${completeness.score}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">
            {completeness.missingFields.length === 0
              ? 'All verified information up to date'
              : `${completeness.missingFields.length} recommended item(s) pending`}
          </p>
        </div>

        {/* Academic Records */}
        <div
          onClick={() => setActiveTab('portfolio')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-[#7B1113] transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-700">Portfolio Records</span>
            <FolderGit2 className="w-4 h-4 text-[#7B1113]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {portfolioItems.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {pubs.length} Pubs · {patents.length} Patents · {fdps.length} FDPs
          </p>
        </div>

        {/* Assigned Mentees */}
        <div
          onClick={() => setActiveTab('mentees')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-[#7B1113] transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-700">Assigned Student Mentees</span>
            <Network className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {menteesCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {menteesCount > 0 ? 'Digital mentoring notebook active' : 'Awaiting admin cohort allocation'}
          </p>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
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
              <div className="text-xs font-bold text-slate-900">Add Portfolio Item</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Upload publication or patent proof</div>
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
              <div className="text-[10px] text-slate-500 mt-0.5">View master and personal schedule</div>
            </button>

            <button
              onClick={() => setActiveTab('ai-report')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition-colors flex flex-col justify-between"
            >
              <Award className="w-4 h-4 text-amber-600 mb-2" />
              <div className="text-xs font-bold text-slate-900">AI Report Assistant</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Interactive appraisal preparation</div>
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
              className="text-[11px] font-semibold text-[#7B1113] hover:underline"
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
    </div>
  );
};
