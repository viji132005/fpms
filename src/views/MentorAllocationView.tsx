import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { MentorAllocation, StaffProfile } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { generateCollegeAllotmentPdf } from '../utils/allotmentPdf.ts';
import {
  Network,
  Play,
  Save,
  Send,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Download,
  Phone,
  Mail,
  Layers,
  Check,
  X,
  ShieldCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';

export const MentorAllocationView: React.FC = () => {
  const { user, department, institution } = useAuth();
  const deptId = department?.id || 'dept-ise';
  const deptCode = department?.code || 'ISE';
  const deptName = department?.name || 'Information Science & Engineering';

  // Default to 0 (Combined 2nd, 3rd & 4th Year) as requested by user
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [academicYear, setAcademicYear] = useState(institution?.currentAcademicYear || '2026-27');

  useEffect(() => {
    if (institution?.currentAcademicYear) {
      setAcademicYear(institution.currentAcademicYear);
    }
  }, [institution?.currentAcademicYear]);

  // Faculty pool and selection for mentors
  const [facultyPool, setFacultyPool] = useState<StaffProfile[]>([]);
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(false);

  // All students for fallback resolution
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Allocation State
  const [currentAllocation, setCurrentAllocation] = useState<MentorAllocation | null>(null);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Commit Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch teaching faculty
  useEffect(() => {
    setIsLoadingFaculty(true);
    authFetch(`/api/staff?departmentId=${encodeURIComponent(deptId)}&type=teaching`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StaffProfile[]) => {
        if (Array.isArray(data)) {
          setFacultyPool(data);
          // By default, select all faculty
          setSelectedMentorIds(data.map((f) => f.userId));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingFaculty(false));
  }, [deptId]);

  // Fetch all students for full mentee hydration
  useEffect(() => {
    authFetch(`/api/students?departmentId=${encodeURIComponent(deptId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setAllStudents(data);
      })
      .catch((err) => console.error(err));
  }, [deptId]);

  const fetchCurrentAllocation = () => {
    setIsLoading(true);
    authFetch(`/api/mentor-allocation?departmentId=${encodeURIComponent(deptId)}&year=${selectedYear}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCurrentAllocation(data[0]);
        } else {
          setCurrentAllocation(null);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    setGeneratedResult(null);
    fetchCurrentAllocation();
  }, [selectedYear, deptId]);

  // Toggle mentor selection
  const handleToggleMentor = (userId: string) => {
    setSelectedMentorIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllMentors = () => {
    setSelectedMentorIds(facultyPool.map((f) => f.userId));
  };

  const handleClearAllMentors = () => {
    setSelectedMentorIds([]);
  };

  // Run the Balanced Allocation Algorithm with custom selected faculty
  const handleGenerate = async () => {
    if (selectedMentorIds.length === 0) {
      setErrorMessage('Please select at least one mentor faculty member before allocating.');
      return;
    }
    setIsLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await authFetch('/api/mentor-allocation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: deptId,
          studentYear: selectedYear,
          academicYear,
          selectedMentorIds,
        }),
      });
      const data = await res.json();
      setGeneratedResult(data);
      setStatusMessage(
        'Allocation preview generated! Review the student roster below. You can Save as Draft or Confirm & Commit to Faculty.'
      );
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to generate mentor allocation. Please check student and mentor pools.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save as Draft or Publish
  const handleSaveOrPublish = async (publishImmediately: boolean) => {
    const rawGroups = generatedResult ? generatedResult.groups : currentAllocation?.groups;
    if (!rawGroups || rawGroups.length === 0) return;

    setIsLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setShowConfirmModal(false);

    try {
      const res = await authFetch('/api/mentor-allocation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: deptId,
          studentYear: selectedYear,
          academicYear,
          groups: rawGroups,
          publishImmediately,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentAllocation(data);
        setGeneratedResult(null);
        setStatusMessage(
          publishImmediately
            ? '✓ Allocation officially committed and published! Allocated students now reflect in each faculty member’s corner separately under 2nd, 3rd, and 4th year tabs.'
            : '✓ Draft allocation saved successfully. You can review and inspect the roster before committing.'
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to save allocation.');
    } finally {
      setIsLoading(false);
    }
  };

  // Export to Excel with Parent Phone No
  const handleExportExcel = () => {
    const activeGroups = generatedResult?.groups || currentAllocation?.groups;
    if (!activeGroups) return;

    const rows: any[] = [];
    activeGroups.forEach((group: any, gIdx: number) => {
      let mentees = Array.isArray(group.students) && group.students.length > 0 ? group.students : [];
      if (mentees.length === 0 && Array.isArray(group.studentIds)) {
        mentees = group.studentIds
          .map((sId: string) => allStudents.find((s) => s.id === sId))
          .filter(Boolean);
      }

      mentees.forEach((s: any) => {
        rows.push({
          'Sl. No.': rows.length + 1,
          'Department': `${deptName} (${deptCode})`,
          'Academic Year': academicYear,
          'Student Year': selectedYear === 0 ? `Year ${s.currentYear || 'All'}` : `Year ${selectedYear}`,
          'Mentor Sl.': gIdx + 1,
          'Mentor Faculty': group.mentorName,
          'Mentor Staff ID': group.staffId,
          'Student USN': s.usn,
          'Student Full Name': s.fullName,
          'Student Email': s.email || 'N/A',
          'Student Phone': s.phone || 'N/A',
          'Parent Phone': s.parentPhone || 'N/A',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mentor_Allocation');
    XLSX.writeFile(
      wb,
      `MIT_Mysore_${deptCode}_Mentor_Allocation_${selectedYear === 0 ? 'Combined_2nd_3rd_4th' : `Year${selectedYear}`}_${academicYear}.xlsx`
    );
  };

  // Official College Circular PDF Generation matching MIT Mysore reference document
  const handleExportPdf = async () => {
    const rawGroups = generatedResult?.groups || currentAllocation?.groups;
    if (!rawGroups || rawGroups.length === 0) {
      setErrorMessage('No allocation groups found to export. Please run allocation first.');
      return;
    }

    // Hydrate student objects with USN and fullName guaranteed
    const groupsToExport = rawGroups.map((g: any) => {
      let students = Array.isArray(g.students) && g.students.length > 0 ? g.students : [];
      if (students.length === 0 && Array.isArray(g.studentIds) && g.studentIds.length > 0) {
        students = g.studentIds
          .map((sId: string) => allStudents.find((s) => s.id === sId))
          .filter(Boolean);
      }

      return {
        mentorName: g.mentorName || 'Faculty Mentor',
        staffId: g.staffId || '',
        students: students.map((s: any) => ({
          usn: s.usn || '',
          fullName: s.fullName || '',
          currentYear: s.currentYear,
          parentPhone: s.parentPhone || '',
        })),
      };
    });

    try {
      const doc = await generateCollegeAllotmentPdf({
        departmentName: deptName,
        deptCode: deptCode,
        academicYear: academicYear,
        groups: groupsToExport,
      });

      const fileName =
        selectedYear === 0
          ? `MIT_Mysore_${deptCode}_Mentor_Mentee_List_2nd_3rd_4th_Year_${academicYear}.pdf`
          : `MIT_Mysore_${deptCode}_Mentor_Mentee_List_Year${selectedYear}_${academicYear}.pdf`;

      doc.save(fileName);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      setErrorMessage('Failed to generate PDF document. Please try again.');
    }
  };

  // Hydrate active display groups with full student details
  const rawActiveGroups = generatedResult?.groups || currentAllocation?.groups || [];
  const activeDisplayGroups = rawActiveGroups.map((g: any) => {
    let students = Array.isArray(g.students) && g.students.length > 0 ? g.students : [];
    if (students.length === 0 && Array.isArray(g.studentIds) && g.studentIds.length > 0) {
      students = g.studentIds
        .map((sId: string) => allStudents.find((s) => s.id === sId))
        .filter(Boolean);
    }
    return { ...g, students };
  });

  const totalAllocatedStudents = activeDisplayGroups.reduce(
    (sum: number, g: any) => sum + (g.students?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Balanced Mentor Allocation System
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-[#7B1113] border border-rose-200">
              Dept: {deptCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department of {deptName} • Generate balanced allocations, save drafts to review, and commit with confirmation to faculty portals.
          </p>
        </div>

        {activeDisplayGroups.length > 0 && (
          <div className="flex items-center gap-2 self-start flex-wrap">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              title="Download Excel spreadsheet of student allocation"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              title="Download official college circular in PDF format"
            >
              <Download className="w-4 h-4" />
              <span>Download Official Allotment (.pdf)</span>
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 text-sm font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 text-sm font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Step 1: Select Student Academic Year */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-[#7B1113] text-white flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Select Student Academic Year Cohort</span>
          </div>
          <span className="text-xs text-slate-500">
            Target Dept: <strong className="text-slate-800">{deptName} ({deptCode})</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            {
              year: 0,
              label: 'Combined (2nd, 3rd & 4th Year)',
              sem: 'Semester III through VIII',
              isSpecial: true,
            },
            { year: 2, label: '2nd Year Only', sem: 'Semester III & IV' },
            { year: 3, label: '3rd Year Only', sem: 'Semester V & VI' },
            { year: 4, label: '4th Year Only', sem: 'Semester VII & VIII' },
            { year: 1, label: '1st Year Only', sem: 'Semester I & II' },
          ].map((item) => {
            const isSelected = selectedYear === item.year;
            return (
              <button
                key={item.year}
                onClick={() => setSelectedYear(item.year)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#7B1113]/5 border-[#7B1113] text-[#7B1113] shadow-sm ring-1 ring-[#7B1113]'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{item.label}</span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                      isSelected
                        ? 'bg-[#7B1113] border-[#7B1113] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 leading-snug">{item.sem}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Customize Mentor Faculty Pool */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-[#7B1113] text-white flex items-center justify-center text-[10px]">
              2
            </span>
            <span>Choose Faculty Members to Act as Mentors</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllMentors}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Select All ({facultyPool.length})
            </button>
            <button
              onClick={handleClearAllMentors}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Clear Selection
            </button>
            <span className="text-xs font-bold text-[#7B1113] px-2.5 py-1 bg-rose-50 rounded-md border border-rose-200">
              {selectedMentorIds.length} Selected
            </span>
          </div>
        </div>

        {isLoadingFaculty ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading faculty list...</div>
        ) : facultyPool.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No teaching faculty found in {deptCode} department. Please add faculty in Staff Management first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
            {facultyPool.map((fac) => {
              const isChecked = selectedMentorIds.includes(fac.userId);
              return (
                <div
                  key={fac.userId}
                  onClick={() => handleToggleMentor(fac.userId)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-rose-50/50 border-[#7B1113]/30 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        isChecked
                          ? 'bg-[#7B1113] border-[#7B1113] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 leading-tight">
                        {fac.fullName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {fac.staffId} • {fac.designation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3: Run & Commit Action Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <span className="w-5 h-5 rounded-full bg-[#7B1113] text-white flex items-center justify-center text-[10px]">
            3
          </span>
          <span>Generate, Review Draft & Commit Allocation</span>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading || selectedMentorIds.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>1. Run Allocation Algorithm</span>
            </button>

            {(generatedResult || currentAllocation?.status === 'DRAFT') && (
              <button
                onClick={() => handleSaveOrPublish(false)}
                disabled={isLoading}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-sm"
                title="Save draft to database without reflecting to faculty portals"
              >
                <Save className="w-3.5 h-3.5" />
                <span>2. Save Draft</span>
              </button>
            )}

            {(generatedResult || currentAllocation) && (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isLoading || activeDisplayGroups.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Commit allocation with explicit confirmation to reflect across all faculty corners"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>3. Commit & Confirm to Faculty</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Allocation Summary Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Status</span>
            <span
              className={`text-xs font-bold inline-flex items-center gap-1 ${
                generatedResult
                  ? 'text-blue-700'
                  : currentAllocation?.status === 'PUBLISHED'
                  ? 'text-emerald-700'
                  : currentAllocation?.status === 'DRAFT'
                  ? 'text-amber-700'
                  : 'text-slate-500'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>
                {generatedResult
                  ? 'Proposed Draft (Pending Confirmation)'
                  : currentAllocation
                  ? `${currentAllocation.status} (v${currentAllocation.versionNumber})`
                  : 'No Active Allocation'}
              </span>
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Participating Mentors</span>
            <span className="text-xs font-bold text-slate-800 tabular-nums">
              {activeDisplayGroups.length} Faculty Members
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Mentees Allocated</span>
            <span className="text-xs font-bold text-slate-800 tabular-nums">
              {totalAllocatedStudents} Students
            </span>
          </div>
        </div>

        {activeDisplayGroups.length > 0 && (
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#7B1113] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Preview Official Circular PDF</span>
          </button>
        )}
      </div>

      {/* Mentor Groups Grid */}
      {activeDisplayGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          <Network className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">
            No mentor groups currently allocated for {selectedYear === 0 ? 'Combined Multi-Year' : `Year ${selectedYear}`}.
          </p>
          <p className="text-slate-400 mt-1">
            Click &ldquo;1. Run Allocation Algorithm&rdquo; above to generate the balanced mentor roster.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeDisplayGroups.map((group: any, idx: number) => {
            const mentees = group.students || [];
            return (
              <div
                key={group.mentorId || idx}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Group Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h2 className="text-xs font-bold text-slate-900">{group.mentorName}</h2>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 ml-6 block">{group.staffId}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold text-[#7B1113] bg-rose-50 border border-rose-200 tabular-nums">
                      {mentees.length} Mentees
                    </span>
                  </div>

                  {/* Student List */}
                  <div className="p-4 max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {mentees.length > 0 ? (
                      mentees.map((st: any, sIdx: number) => (
                        <div key={st.id || st.usn} className="py-2.5 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400 w-4">
                                {sIdx + 1}.
                              </span>
                              <span className="font-mono font-bold text-[#7B1113]">{st.usn}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 rounded">
                              Year {st.currentYear || selectedYear}
                            </span>
                          </div>

                          <div className="font-medium text-slate-900 pl-6 text-[11px]">{st.fullName}</div>

                          <div className="pl-6 flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                            {st.phone && <span>Ph: {st.phone}</span>}
                            {st.parentPhone && (
                              <span className="text-amber-800 font-semibold bg-amber-50 px-1 rounded">
                                Parent: {st.parentPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-center py-4 text-xs italic">
                        No students in this group.
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
                  <span>Balance Parity: Δ ≤ 1</span>
                  <span>{mentees.length} students</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal Before Committing to Faculty */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#7B1113]">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Confirm & Commit Mentor Allocation
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>Ready to publish to faculty corners</span>
              </div>
              <p className="text-emerald-900 leading-relaxed">
                You are about to officially commit this mentor allocation for <strong>{deptName} ({deptCode})</strong>.
                Once confirmed, these <strong>{totalAllocatedStudents} mentees</strong> will immediately reflect in each faculty mentor&apos;s digital notebook separated under 2nd, 3rd, and 4th year tabs.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Mentors</span>
                <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {activeDisplayGroups.length}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Students</span>
                <span className="text-sm font-extrabold text-[#7B1113] tabular-nums">
                  {totalAllocatedStudents}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Academic Year</span>
                <span className="text-xs font-extrabold text-slate-800 font-mono mt-0.5 block">
                  {academicYear}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Tip: You can download and inspect the official circular PDF before confirming to ensure there are no discrepancies.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Review More / Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveOrPublish(true)}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Yes, Confirm & Commit to Faculty</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
