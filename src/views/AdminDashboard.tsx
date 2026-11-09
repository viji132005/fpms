import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Department, Student, StaffProfile } from '../types/index.ts';
import { authFetch } from '../utils/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Users,
  GraduationCap,
  Building2,
  Eye,
  X,
  Search,
  FileSpreadsheet,
  Mail,
  Phone,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  FileText,
  Download,
} from 'lucide-react';
import { FacultyRegistrationModal } from '../components/FacultyRegistrationModal.tsx';

export const AdminDashboard: React.FC = () => {
  const { department: contextDept, user, profile } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);

  useEffect(() => {
    if (user?.role === 'HOD' && profile && !profile.isProfileRegistered) {
      setShowRegistrationModal(true);
    }
  }, [user, profile]);

  // Student Drilldown Modal State
  const [selectedCohortYear, setSelectedCohortYear] = useState<number | string | null>(null);
  const [cohortStudents, setCohortStudents] = useState<Student[]>([]);
  const [cohortLoading, setCohortLoading] = useState<boolean>(false);
  const [cohortSearch, setCohortSearch] = useState<string>('');

  // Staff Drilldown Modal State
  const [selectedStaffType, setSelectedStaffType] = useState<'teaching' | 'non-teaching' | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);
  const [staffSearch, setStaffSearch] = useState<string>('');

  // Resume / CV preview modal
  const [previewCv, setPreviewCv] = useState<{ url: string; name: string } | null>(null);

  const fetchDashboardData = () => {
    setIsLoading(true);
    const query = contextDept?.id ? `?departmentId=${encodeURIComponent(contextDept.id)}` : '';
    authFetch(`/api/analytics/dashboard${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load metrics');
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === 'object') {
          setMetrics(data);
          if (data.department) setDepartment(data.department);
        }
      })
      .catch((err) => console.error('Error fetching admin metrics:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [contextDept]);

  const openCohortDetails = (year: number | string) => {
    setSelectedCohortYear(year);
    setCohortLoading(true);
    setCohortSearch('');
    const query = year === 'GRADUATED' ? 'status=GRADUATED' : `year=${year}`;
    authFetch(`/api/students?${query}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setCohortStudents(data);
        } else {
          setCohortStudents([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching cohort students:', err);
        setCohortStudents([]);
      })
      .finally(() => setCohortLoading(false));
  };

  const closeCohortDetails = () => {
    setSelectedCohortYear(null);
    setCohortStudents([]);
    setCohortSearch('');
  };

  const openStaffDetails = (type: 'teaching' | 'non-teaching') => {
    setSelectedStaffType(type);
    setStaffLoading(true);
    setStaffSearch('');
    authFetch(`/api/staff?type=${type}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setStaffList(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setStaffLoading(false));
  };

  const exportCohortToExcel = () => {
    if (cohortStudents.length === 0 || selectedCohortYear === null) return;
    const exportRows = filteredCohortStudents.map((s, idx) => ({
      'Sl. No.': idx + 1,
      USN: s.usn,
      'Full Name': s.fullName,
      'Academic Year': s.status === 'GRADUATED' ? 'Graduated Alumni' : `Year ${s.currentYear}`,
      Email: s.email,
      'Student Phone': s.phone,
      'Parent Phone': s.parentPhone || '—',
      Status: s.status,
      'Assigned Mentor': s.mentorName || 'Pending Allocation',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    const sheetName = selectedCohortYear === 'GRADUATED' ? 'Graduated_Students' : `Year_${selectedCohortYear}_Students`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `MIT_Mysore_${deptInfo.code}_${sheetName}.xlsx`);
  };

  const filteredCohortStudents = cohortStudents.filter((s) => {
    if (!cohortSearch.trim()) return true;
    const q = cohortSearch.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.usn.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.parentPhone && s.parentPhone.includes(q)) ||
      (s.mentorName && s.mentorName.toLowerCase().includes(q))
    );
  });

  const filteredStaffList = staffList.filter((sp) => {
    if (!staffSearch.trim()) return true;
    const q = staffSearch.toLowerCase();
    return (
      sp.fullName.toLowerCase().includes(q) ||
      sp.staffId.toLowerCase().includes(q) ||
      sp.designation.toLowerCase().includes(q) ||
      sp.user?.email.toLowerCase().includes(q)
    );
  });

  if (isLoading && !metrics) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading department administration dashboard...
      </div>
    );
  }

  const staff = metrics?.staff ?? { teaching: 0, nonTeaching: 0, mentorEligible: 0 };
  const students = metrics?.students ?? { total: 0, year1: 0, year2: 0, year3: 0, year4: 0, graduated: 0 };
  const deptInfo = department || contextDept || {
    name: 'Information Science and Engineering',
    code: 'ISE',
    description: 'Maharaja Institute of Technology, Mysore',
  };

  const cohortList = [
    {
      year: 1,
      label: '1st Year',
      semesters: 'I & II Semester',
      count: students.year1 ?? 0,
      badgeColor: 'border-blue-200 hover:border-blue-400 bg-blue-50/40 text-blue-900',
      badgeBg: 'bg-blue-100 text-blue-800',
    },
    {
      year: 2,
      label: '2nd Year',
      semesters: 'III & IV Semester',
      count: students.year2 ?? 0,
      badgeColor: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 text-emerald-900',
      badgeBg: 'bg-emerald-100 text-emerald-800',
    },
    {
      year: 3,
      label: '3rd Year',
      semesters: 'V & VI Semester',
      count: students.year3 ?? 0,
      badgeColor: 'border-amber-200 hover:border-amber-400 bg-amber-50/40 text-amber-900',
      badgeBg: 'bg-amber-100 text-amber-800',
    },
    {
      year: 4,
      label: '4th Year',
      semesters: 'VII & VIII Semester',
      count: students.year4 ?? 0,
      badgeColor: 'border-purple-200 hover:border-purple-400 bg-purple-50/40 text-purple-900',
      badgeBg: 'bg-purple-100 text-purple-800',
    },
    {
      year: 'GRADUATED',
      label: 'Graduated Alumni',
      semesters: 'Previous Batch Graduates',
      count: students.graduated ?? 0,
      badgeColor: 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 text-indigo-900',
      badgeBg: 'bg-indigo-100 text-indigo-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* First-time Profile Registration Modal for HOD */}
      {user?.role === 'HOD' && (
        <FacultyRegistrationModal
          isOpen={showRegistrationModal}
          onSuccess={() => setShowRegistrationModal(false)}
        />
      )}

      {/* Top Welcome Banner: Same to same feature box for HOD as in faculty dashboard */}
      {user?.role === 'HOD' ? (
        <div className="bg-gradient-to-r from-slate-900 to-[#7B1113] rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <span>{deptInfo.name} ({deptInfo.code})</span>
              <span>•</span>
              <span className="text-rose-200">Academic Year 2026-27</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
              Welcome, {profile?.fullName || user?.email}
            </h1>
            <p className="text-xs text-rose-100 mt-1 max-w-xl">
              {profile?.designation || 'Professor & Head of Department'} · {profile?.qualification || 'Ph.D, M.Tech'}
            </p>
            {/* Contact and Email only (hardcoded ID and account active removed) */}
            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-rose-100">
              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{user?.email || (profile as any)?.email || 'hod.ise@mitmysore.in'}</span>
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
                  {(profile?.fullName || user?.email || 'H').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Dynamic Header for Admin */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#7B1113] text-white">
                Institutional Admin
              </span>
              <span className="text-xs text-slate-500 font-medium">· Dynamic Department Scope</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              {deptInfo.name} ({deptInfo.code})
            </h1>
            <p className="text-xs text-slate-500">
              Maharaja Institute of Technology, Mysore · Academic Assessment Cycle
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Operating Department
              </p>
              <p className="text-sm font-bold text-slate-800 font-mono">{deptInfo.code}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Department Info */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Department</span>
            <Building2 className="w-4 h-4 text-[#7B1113]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{deptInfo.code}</div>
            <p className="text-xs text-slate-500 truncate mt-0.5" title={deptInfo.name}>
              {deptInfo.name}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Autonomous & Verified</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>

        {/* Teaching Faculty - Clickable to View Roster */}
        <button
          onClick={() => openStaffDetails('teaching')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Teaching Faculty</span>
            <Users className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {staff.teaching}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Professors & Instructors</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#7B1113] font-medium">
            <span>Click to inspect faculty</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Non-Teaching Staff - Clickable to View Roster */}
        <button
          onClick={() => openStaffDetails('non-teaching')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Non-Teaching Staff</span>
            <Users className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {staff.nonTeaching}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Lab & Technical Personnel</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#7B1113] font-medium">
            <span>Click to inspect staff</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Department Students Total */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Enrolled Students</span>
            <GraduationCap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {students.total}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Active Across 4 Years</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Graduated Alumni: {students.graduated || 0}</span>
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Student Distribution Cards (Clickable Drilldowns) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Student Cohort Distribution & Year-Wise Inspection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any year card to inspect the complete student roster with serial numbers, parent contacts, and assigned mentors.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full self-start">
            Total Active: {students.total} Students
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2">
          {cohortList.map((c) => (
            <button
              key={c.year}
              onClick={() => openCohortDetails(c.year)}
              className={`p-4 rounded-xl border text-left transition-all hover:shadow-md flex flex-col justify-between ${c.badgeColor} group`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">{c.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.badgeBg}`}>
                    View
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{c.semesters}</p>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums text-slate-900">{c.count}</span>
                <span className="text-xs font-medium text-[#7B1113] group-hover:underline flex items-center">
                  <span>Roster</span>
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Student Cohort Drilldown Modal */}
      {selectedCohortYear !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span>
                    {selectedCohortYear === 'GRADUATED'
                      ? 'Graduated Alumni Records'
                      : `Year ${selectedCohortYear} Student Cohort Roster`}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {deptInfo.name} · {cohortStudents.length} student(s) recorded
                </p>
              </div>

              <div className="flex items-center gap-2">
                {cohortStudents.length > 0 && (
                  <button
                    onClick={exportCohortToExcel}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Export Excel</span>
                  </button>
                )}
                <button
                  onClick={closeCohortDetails}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by USN, student name, or mentor..."
                  value={cohortSearch}
                  onChange={(e) => setCohortSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Showing: {filteredCohortStudents.length} of {cohortStudents.length}
              </span>
            </div>

            {/* Table Content with Serial Numbers */}
            <div className="flex-1 overflow-auto p-4">
              {cohortLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading student roster...</div>
              ) : filteredCohortStudents.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No students found matching active search.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 bg-slate-50">
                      <th className="py-2.5 px-3 text-center w-12">Sl. No.</th>
                      <th className="py-2.5 px-3">Student USN & Name</th>
                      <th className="py-2.5 px-3">Institutional Email</th>
                      <th className="py-2.5 px-3">Student Phone</th>
                      <th className="py-2.5 px-3">Parent Phone</th>
                      <th className="py-2.5 px-3">Assigned Mentor</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCohortStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-slate-900">{s.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{s.usn}</p>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                          {s.email}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                          {s.phone || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                          {s.parentPhone || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {s.mentorName ? (
                            <span className="font-medium text-slate-900">{s.mentorName}</span>
                          ) : (
                            <span className="text-slate-400 italic">Not Assigned</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : s.status === 'GRADUATED'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff Roster Drilldown Modal */}
      {selectedStaffType && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>
                    {selectedStaffType === 'teaching'
                      ? 'Teaching Faculty Directory'
                      : 'Non-Teaching Technical Staff Directory'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {deptInfo.name} · {staffList.length} staff member(s)
                </p>
              </div>
              <button
                onClick={() => setSelectedStaffType(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff by name, staff ID, or designation..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Showing: {filteredStaffList.length} of {staffList.length}
              </span>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {staffLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading staff records...</div>
              ) : filteredStaffList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No staff members found matching criteria.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 bg-slate-50">
                      <th className="py-2.5 px-3 text-center w-12">Sl. No.</th>
                      <th className="py-2.5 px-3">Staff Name & ID</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3">Qualification</th>
                      <th className="py-2.5 px-3">Official Email</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3 text-right">Resume / CV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredStaffList.map((sp, idx) => (
                      <tr key={sp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-900">{sp.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{sp.staffId}</p>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">{sp.designation}</td>
                        <td className="py-2.5 px-3 text-slate-600">{sp.qualification || 'M.Tech'}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {sp.user?.email || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                          {sp.phone || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {sp.cvUrl ? (
                            <button
                              onClick={() => setPreviewCv({ url: sp.cvUrl, name: `${sp.fullName}_Resume.pdf` })}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded inline-flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-[#7B1113]" />
                              <span>View Resume</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not Uploaded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CV Preview Modal */}
      {previewCv && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>{previewCv.name}</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewCv.url}
                  download={previewCv.name}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewCv(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 bg-slate-100 overflow-auto min-h-[500px]">
              <iframe
                src={previewCv.url}
                className="w-full h-[70vh] rounded-lg border border-slate-300 bg-white"
                title={previewCv.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
