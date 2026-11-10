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
  History,
  Trash2,
  Shuffle,
  ListOrdered,
  FileText,
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
  const [allocationMode, setAllocationMode] = useState<'LINEAR' | 'RANDOM'>('LINEAR');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Committed Records State
  const [allCommittedAllocations, setAllCommittedAllocations] = useState<MentorAllocation[]>([]);
  const [isLoadingCommitted, setIsLoadingCommitted] = useState(false);
  const [showCommittedModal, setShowCommittedModal] = useState(false);
  const [committedToDelete, setCommittedToDelete] = useState<MentorAllocation | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);

  // Commit Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch teaching faculty
  useEffect(() => {
    setIsLoadingFaculty(true);
    authFetch(`/api/staff?departmentId=${encodeURIComponent(deptId)}&type=teaching`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StaffProfile[]) => {
        if (Array.isArray(data)) {
          // Strictly exclude any non-teaching staff from mentor pool
          const eligibleTeaching = data.filter((f: any) => {
            const role = f.user?.role;
            const isNonTeaching =
              role === 'NON_TEACHING' ||
              f.isTeachingFaculty === false ||
              f.isMentorEligible === false ||
              f.staffType === 'non-teaching' ||
              (f.designation && (
                f.designation.toLowerCase().includes('non-teaching') ||
                f.designation.toLowerCase().includes('lab instructor') ||
                f.designation.toLowerCase().includes('mechanic') ||
                f.designation.toLowerCase().includes('attendant') ||
                (f.designation.toLowerCase().includes('assistant') && !f.designation.toLowerCase().includes('professor'))
              ));
            return !isNonTeaching;
          });
          setFacultyPool(eligibleTeaching);
          // By default, select all eligible teaching faculty
          setSelectedMentorIds(eligibleTeaching.map((f) => f.userId));
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

  const fetchCommittedAllocations = () => {
    setIsLoadingCommitted(true);
    authFetch(`/api/mentor-allocation?departmentId=${encodeURIComponent(deptId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: MentorAllocation[]) => {
        if (Array.isArray(data)) {
          setAllCommittedAllocations(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingCommitted(false));
  };

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
    fetchCommittedAllocations();
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

  // Run the Balanced Allocation Algorithm supporting LINEAR or RANDOM
  const handleGenerate = async (mode: 'LINEAR' | 'RANDOM' = 'LINEAR') => {
    if (selectedMentorIds.length === 0) {
      setErrorMessage('Please select at least one mentor faculty member before allocating.');
      return;
    }
    setAllocationMode(mode);
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
          mode,
        }),
      });
      const data = await res.json();
      setGeneratedResult(data);
      setStatusMessage(
        mode === 'RANDOM'
          ? '✓ Random balanced allocation generated! Students of each year cohort (2nd, 3rd, 4th) are randomized and divided equally across mentors. Review below or Commit & Confirm to Faculty.'
          : '✓ Linear sequence allocation generated! Students distributed sequentially by USN in balanced proportions (Δ <= 1). Review below or Commit & Confirm to Faculty.'
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
          allocationMode: generatedResult?.allocationMode || allocationMode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentAllocation(data);
        setGeneratedResult(null);
        fetchCommittedAllocations();
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

  // Delete Individual Committed Record
  const handleDeleteCommittedRecord = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/mentor-allocation/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStatusMessage('✓ Committed mentor allocation record deleted successfully.');
        setCommittedToDelete(null);
        fetchCommittedAllocations();
        fetchCurrentAllocation();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || 'Failed to delete committed record.');
      }
    } catch (err) {
      setErrorMessage('Failed to delete committed record.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear All Committed History
  const handleClearAllHistory = async () => {
    setIsLoading(true);
    setShowClearHistoryModal(false);
    try {
      const res = await authFetch('/api/mentor-allocation/clear-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: deptId }),
      });
      if (res.ok) {
        setStatusMessage('✓ Committed mentor allocation history cleared successfully.');
        fetchCommittedAllocations();
        fetchCurrentAllocation();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || 'Failed to clear history.');
      }
    } catch (err) {
      setErrorMessage('Failed to clear history.');
    } finally {
      setIsLoading(false);
    }
  };

  // Export any allocation groups to Excel with Parent Phone No
  const exportExcelForGroups = (rawGroups: any[], yearNum: number, acadYear: string) => {
    if (!rawGroups || rawGroups.length === 0) return;

    const rows: any[] = [];
    rawGroups.forEach((group: any, gIdx: number) => {
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
          'Academic Year': acadYear,
          'Student Year': yearNum === 0 ? `Year ${s.currentYear || 'All'}` : `Year ${yearNum}`,
          'Mentor Sl.': gIdx + 1,
          'Mentor Faculty': group.mentorName,
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
      `MIT_Mysore_${deptCode}_Mentor_Allocation_${yearNum === 0 ? 'Combined_2nd_3rd_4th' : `Year${yearNum}`}_${acadYear}.xlsx`
    );
  };

  // Official College Circular PDF Generation matching MIT Mysore reference document
  const exportPdfForGroups = async (rawGroups: any[], yearNum: number, acadYear: string) => {
    if (!rawGroups || rawGroups.length === 0) {
      setErrorMessage('No allocation groups found to export.');
      return;
    }

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
        academicYear: acadYear,
        studentYear: yearNum,
        groups: groupsToExport,
      });

      const fileName =
        yearNum === 0
          ? `MIT_Mysore_${deptCode}_Mentor_Mentee_List_2nd_3rd_4th_Year_${acadYear}.pdf`
          : `MIT_Mysore_${deptCode}_Mentor_Mentee_List_Year${yearNum}_${acadYear}.pdf`;

      doc.save(fileName);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      setErrorMessage('Failed to generate PDF document.');
    }
  };

  const handleExportExcel = () => {
    const activeGroups = generatedResult?.groups || currentAllocation?.groups;
    exportExcelForGroups(activeGroups, selectedYear, academicYear);
  };

  const handleExportPdf = () => {
    const activeGroups = generatedResult?.groups || currentAllocation?.groups;
    exportPdfForGroups(activeGroups, selectedYear, academicYear);
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

        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            onClick={() => setShowCommittedModal(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm"
          >
            <History className="w-4 h-4 text-[#7B1113]" />
            <span>Allocation Records ({allCommittedAllocations.length})</span>
          </button>
        </div>
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
                      <div className="text-[10px] text-slate-500 font-medium">
                        {fac.designation}
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
              onClick={() => handleGenerate('LINEAR')}
              disabled={isLoading || selectedMentorIds.length === 0}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              title="Allocate students sequentially by USN in balanced parity (Δ ≤ 1)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>1. Run Linear Allocation</span>
            </button>

            <button
              onClick={() => handleGenerate('RANDOM')}
              disabled={isLoading || selectedMentorIds.length === 0}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              title="Allocate students randomly with balanced cohort division for each year (2nd, 3rd, 4th)"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>2. Run Random Allocation</span>
            </button>

            {(generatedResult || currentAllocation) && (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isLoading || activeDisplayGroups.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Allocation Strategy</span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              {(generatedResult?.allocationMode || currentAllocation?.allocationMode || allocationMode) === 'RANDOM' ? (
                <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  <Shuffle className="w-3 h-3" />
                  <span>Random Balanced</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#7B1113] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  <ListOrdered className="w-3 h-3" />
                  <span>Linear Sequence</span>
                </span>
              )}
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

      {/* Committed Records Modal */}
      {showCommittedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 text-slate-800 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#7B1113]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Committed Mentor Allocation Records ({deptCode})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Officially committed and published mentor rosters. Download PDF / Excel or manage records.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user?.role === 'ADMIN' && allCommittedAllocations.length > 0 && (
                  <button
                    onClick={() => setShowClearHistoryModal(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    title="Clear all committed mentor records"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  onClick={() => setShowCommittedModal(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 grow">
              {isLoadingCommitted ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading committed records...</div>
              ) : allCommittedAllocations.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No mentor allocations have been committed yet for this department. Use the Allocation Wizard to generate and commit an allocation.
                </div>
              ) : (
                allCommittedAllocations.map((rec) => {
                  const menteeCount = rec.groups.reduce(
                    (sum, g) => sum + (g.students?.length || g.studentIds?.length || 0),
                    0
                  );
                  const isCurrentYear = rec.studentYear === selectedYear;

                  return (
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {rec.studentYear === 0
                              ? 'Combined (2nd, 3rd & 4th Year)'
                              : `Year ${rec.studentYear}`}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            COMMITTED
                          </span>
                          {rec.allocationMode && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                rec.allocationMode === 'RANDOM'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-rose-50 text-[#7B1113] border-rose-200'
                              }`}
                            >
                              {rec.allocationMode === 'RANDOM' ? 'RANDOM BALANCED' : 'LINEAR SEQUENCE'}
                            </span>
                          )}
                          {isCurrentYear && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Active in View
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600">
                          {rec.groups.length} Faculty Mentors · {menteeCount} Total Students Allocated
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          Committed on: {new Date(rec.publishedAt || rec.createdAt).toLocaleDateString()} {rec.publishedByName ? `by ${rec.publishedByName}` : ''} · Academic Year: {rec.academicYear}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          onClick={() => exportExcelForGroups(rec.groups, rec.studentYear, rec.academicYear)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Download Excel spreadsheet"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Excel</span>
                        </button>
                        <button
                          onClick={() => exportPdfForGroups(rec.groups, rec.studentYear, rec.academicYear)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Download Official Allotment PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => setCommittedToDelete(rec)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title="Delete this committed record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowCommittedModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Record Modal */}
      {committedToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Committed Mentor Record?</h3>
                <p className="text-xs text-slate-500">
                  {committedToDelete.studentYear === 0
                    ? 'Combined (2nd, 3rd & 4th Year)'
                    : `Year ${committedToDelete.studentYear}`} · Academic Year {committedToDelete.academicYear}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              This will remove this committed mentor allocation record from the database. Note that faculty records will remain until re-allocated.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCommittedToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCommittedRecord(committedToDelete.id)}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Modal */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Clear All Committed History?</h3>
                <p className="text-xs text-slate-500">Department: {deptCode}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove all saved mentor allocation records for {deptName}? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearHistoryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllHistory}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Records</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
