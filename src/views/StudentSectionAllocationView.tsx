import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import type {
  Student,
  StudentSectionAllocationRun,
  SectionConfig,
  SectionAllocationBand,
  AllocatedStudent,
} from '../types/index.ts';
import {
  DEFAULT_PERFORMANCE_BANDS,
  validatePerformanceBands,
} from '../utils/sectionAllocation.ts';
import {
  generatePerformanceTemplate,
  parsePerformanceExcel,
  exportSectionAllocationWorkbook,
  generateSectionAllocationPdf,
  exportSectionAllocationCsv,
  type ExcelValidationResult,
} from '../utils/sectionAllocationExcel.ts';
import {
  SplitSquareVertical,
  Sparkles,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Check,
  History,
  Users,
  Building2,
  BarChart3,
  Calendar,
  Layers,
  ArrowLeft,
} from 'lucide-react';

export const StudentSectionAllocationView: React.FC = () => {
  const { user, department, institution } = useAuth();

  const deptId = department?.id || 'dept-ise';
  const deptCode = department?.code || 'ISE';
  const deptName = department?.name || 'Department of Information Science & Engineering';
  const currentAcademicYear = institution?.currentAcademicYear || '2026-27';

  // Navigation tab: 'wizard' vs 'history'
  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');

  // Wizard active step: 1 (Section Setup), 2 (Allocation Method), 3 (Review & Commit)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Year Selection & Cohort Auto-Sync
  const [selectedYear, setSelectedYear] = useState<number>(2); // 1, 2, 3, 4
  const [selectedSemester, setSelectedSemester] = useState<number>(4);
  const [cohortStudents, setCohortStudents] = useState<Student[]>([]);
  const [isLoadingCohort, setIsLoadingCohort] = useState<boolean>(false);
  const [deptStudentSemesters, setDeptStudentSemesters] = useState<Record<number, number>>({
    1: 1,
    2: 4,
    3: 6,
    4: 8,
  });

  // Section Configuration: 2, 3, 4, or 'CUSTOM'
  const [numSections, setNumSections] = useState<number>(3); // 2, 3, 4, or custom
  const [isCustomSections, setIsCustomSections] = useState<boolean>(false);
  const [customSectionInput, setCustomSectionInput] = useState<number>(5);
  const [sectionConfigs, setSectionConfigs] = useState<SectionConfig[]>([
    { name: 'Section A', capacity: 999, targetCount: 0 },
    { name: 'Section B', capacity: 999, targetCount: 0 },
    { name: 'Section C', capacity: 999, targetCount: 0 },
  ]);

  // Allocation Method
  const [allocationMethod, setAllocationMethod] = useState<'RANDOM' | 'PERFORMANCE'>('RANDOM');

  // Method B: Performance Balanced Settings (Separated CGPA vs SGPA)
  const [performanceMetric, setPerformanceMetric] = useState<'CGPA' | 'SGPA'>('CGPA');
  const [sgpaSemester, setSgpaSemester] = useState<number>(3);
  const [missingScorePolicy, setMissingScorePolicy] = useState<'LOWEST_BAND' | 'DISTRIBUTE_EVENLY' | 'UNASSIGNED'>('LOWEST_BAND');

  // Dynamic Performance Bands (configurable number of parts & ranges)
  const [bandCount, setBandCount] = useState<number>(4);
  const [performanceBands, setPerformanceBands] = useState<SectionAllocationBand[]>(DEFAULT_PERFORMANCE_BANDS);

  // Excel Upload State
  const [uploadedScores, setUploadedScores] = useState<Record<string, number>>({});
  const [excelValidationReport, setExcelValidationReport] = useState<ExcelValidationResult | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Review & Commit State
  const [currentRun, setCurrentRun] = useState<StudentSectionAllocationRun | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [filterSection, setFilterSection] = useState<string>('ALL');
  const [manualAdjustmentCount, setManualAdjustmentCount] = useState<number>(0);
  const [committedSuccess, setCommittedSuccess] = useState<boolean>(false);

  // Notification banners
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // History list
  const [historyRuns, setHistoryRuns] = useState<StudentSectionAllocationRun[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch active running semesters per year from Student Management
  const fetchDeptSemesters = async () => {
    try {
      const res = await authFetch(`/api/students?departmentId=${encodeURIComponent(deptId)}&status=ACTIVE`);
      if (res.ok) {
        const students: Student[] = await res.json();
        const semMap: Record<number, number> = { 1: 1, 2: 4, 3: 6, 4: 8 };
        [1, 2, 3, 4].forEach((yr) => {
          const yrStudents = students.filter((s) => s.currentYear === yr && s.currentSemester);
          if (yrStudents.length > 0) {
            const semCounts: Record<number, number> = {};
            yrStudents.forEach((s) => {
              const sem = s.currentSemester || (yr * 2 - 1);
              semCounts[sem] = (semCounts[sem] || 0) + 1;
            });
            const top = Object.entries(semCounts).sort((a, b) => b[1] - a[1])[0];
            semMap[yr] = top ? Number(top[0]) : yr * 2 - 1;
          } else {
            semMap[yr] = yr * 2 - 1;
          }
        });
        setDeptStudentSemesters(semMap);
        setSelectedSemester(semMap[selectedYear] || selectedYear * 2);
      }
    } catch (err) {
      console.warn('Could not sync student semester cycle:', err);
    }
  };

  useEffect(() => {
    fetchDeptSemesters();
  }, [deptId]);

  // Auto-sync semester when year changes
  useEffect(() => {
    if (deptStudentSemesters[selectedYear]) {
      setSelectedSemester(deptStudentSemesters[selectedYear]);
    } else {
      setSelectedSemester(selectedYear * 2);
    }
  }, [selectedYear, deptStudentSemesters]);

  // Sync section count configs
  useEffect(() => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const count = isCustomSections ? customSectionInput : numSections;
    const totalCount = cohortStudents.length;
    const base = Math.floor(totalCount / count);
    const remainder = totalCount % count;

    const updated: SectionConfig[] = [];
    for (let i = 0; i < count; i++) {
      const existing = sectionConfigs[i];
      const target = base + (i < remainder ? 1 : 0);
      updated.push({
        name: existing?.name || `Section ${letters[i] || i + 1}`,
        capacity: 999, // Capacity restriction removed per requirements
        targetCount: target,
      });
    }
    setSectionConfigs(updated);
  }, [numSections, isCustomSections, customSectionInput, cohortStudents.length]);

  // Fetch eligible cohort students
  const fetchCohortStudents = async () => {
    setIsLoadingCohort(true);
    setErrorMessage(null);
    try {
      const url = `/api/students?departmentId=${encodeURIComponent(deptId)}&year=${selectedYear}&status=ACTIVE`;
      const res = await authFetch(url);
      if (res.ok) {
        const data: Student[] = await res.json();
        setCohortStudents(data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load students.');
    } finally {
      setIsLoadingCohort(false);
    }
  };

  useEffect(() => {
    fetchCohortStudents();
  }, [deptId, selectedYear]);

  // Fetch history runs
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await authFetch(`/api/section-allocations?departmentId=${encodeURIComponent(deptId)}`);
      if (res.ok) {
        const data: StudentSectionAllocationRun[] = await res.json();
        setHistoryRuns(data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, deptId]);

  // Update default bands when number of parts changes
  const handleBandCountChange = (count: number) => {
    setBandCount(count);
    if (count === 2) {
      setPerformanceBands([
        { id: 'band-1', name: 'High Tier (>= 7.50)', min: 7.5, max: 10.0, inclusiveMin: true, inclusiveMax: true, description: 'Above Average' },
        { id: 'band-2', name: 'Standard Tier (< 7.50)', min: 0.0, max: 7.5, inclusiveMin: true, inclusiveMax: false, description: 'Foundational' },
      ]);
    } else if (count === 3) {
      setPerformanceBands([
        { id: 'band-1', name: 'Elite Tier (> 8.50)', min: 8.5, max: 10.0, inclusiveMin: false, inclusiveMax: true, description: 'Top Performers' },
        { id: 'band-2', name: 'First Class (7.00 - 8.50)', min: 7.0, max: 8.5, inclusiveMin: true, inclusiveMax: true, description: 'Strong Performers' },
        { id: 'band-3', name: 'Developing Tier (< 7.00)', min: 0.0, max: 7.0, inclusiveMin: true, inclusiveMax: false, description: 'Foundational' },
      ]);
    } else if (count === 4) {
      setPerformanceBands(DEFAULT_PERFORMANCE_BANDS);
    } else if (count === 5) {
      setPerformanceBands([
        { id: 'band-1', name: 'Distinction (> 9.00)', min: 9.0, max: 10.0, inclusiveMin: false, inclusiveMax: true, description: 'Elite' },
        { id: 'band-2', name: 'High First (8.00 - 9.00)', min: 8.0, max: 9.0, inclusiveMin: true, inclusiveMax: true, description: 'Very Good' },
        { id: 'band-3', name: 'First Class (7.00 - 8.00)', min: 7.0, max: 8.0, inclusiveMin: true, inclusiveMax: true, description: 'Good' },
        { id: 'band-4', name: 'Second Class (6.00 - 7.00)', min: 6.0, max: 7.0, inclusiveMin: true, inclusiveMax: true, description: 'Average' },
        { id: 'band-5', name: 'Pass / Support (< 6.00)', min: 0.0, max: 6.0, inclusiveMin: true, inclusiveMax: false, description: 'Support Needed' },
      ]);
    }
  };

  const handleUpdateBandRange = (index: number, field: 'name' | 'min' | 'max', val: any) => {
    const updated = [...performanceBands];
    updated[index] = {
      ...updated[index],
      [field]: field === 'name' ? val : Number(val),
    };
    setPerformanceBands(updated);
  };

  // Generate & Download Excel Entry Template
  const handleDownloadTemplate = () => {
    const studentsPayload = cohortStudents.map((s) => ({
      usn: s.usn,
      fullName: s.fullName,
    }));
    const cohortLabel = `Year ${selectedYear} (Semester ${selectedSemester}) — Dept: ${deptCode}`;
    const semLabel = performanceMetric === 'SGPA' ? `Sem ${sgpaSemester}` : undefined;

    const fileBytes = generatePerformanceTemplate(
      studentsPayload,
      performanceMetric,
      cohortLabel,
      semLabel
    );

    const blob = new Blob([fileBytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MIT_Mysore_${deptCode}_Year${selectedYear}_${performanceMetric}_Entry_Template.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse Uploaded Excel File (Key match by student USN)
  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    setUploadedFileName(file.name);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parsePerformanceExcel(
        buffer,
        cohortStudents.map((s) => ({ usn: s.usn, id: s.id, fullName: s.fullName }))
      );

      setUploadedScores(result.scoresMap);
      setExcelValidationReport(result);

      if (!result.isValid) {
        setErrorMessage(
          `Uploaded Excel file has validation issues: ${result.errorSummary.join(', ')}. Please check student USNs and score values.`
        );
      } else {
        setSuccessMessage(
          `Excel scores successfully matched by USN for ${result.matchedCount} of ${cohortStudents.length} students!`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read uploaded Excel file.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Execute Allocation (True Random without hardcoded seeds)
  const handleGenerateAllocation = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setCommittedSuccess(false);

    if (cohortStudents.length === 0) {
      setErrorMessage('No eligible active students available in this cohort.');
      return;
    }

    if (allocationMethod === 'PERFORMANCE') {
      const bandValidation = validatePerformanceBands(performanceBands);
      if (!bandValidation.isValid) {
        setErrorMessage(`Performance bands error: ${bandValidation.errors.join('; ')}`);
        return;
      }
    }

    // Always generate a fresh random seed for truly unbiased randomization
    const freshRandomSeed = `seed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    setIsGenerating(true);
    try {
      const res = await authFetch('/api/section-allocations/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: deptId,
          academicYear: currentAcademicYear,
          yearOfStudy: selectedYear,
          semester: selectedSemester,
          method: allocationMethod,
          performanceMetric: allocationMethod === 'PERFORMANCE' ? performanceMetric : undefined,
          sections: sectionConfigs,
          bands: performanceBands,
          randomSeed: freshRandomSeed,
          performanceScores: uploadedScores,
          missingPolicy: missingScorePolicy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to generate allocation preview.');
        return;
      }

      const run: StudentSectionAllocationRun = {
        id: `draft-run-${Date.now()}`,
        departmentId: deptId,
        academicYear: currentAcademicYear,
        yearOfStudy: selectedYear,
        semester: selectedSemester,
        title: `Year ${selectedYear} (Sem ${selectedSemester}) Section Allocation`,
        status: 'DRAFT',
        method: allocationMethod,
        performanceMetric: allocationMethod === 'PERFORMANCE' ? performanceMetric : null,
        sgpaSemester: allocationMethod === 'PERFORMANCE' && performanceMetric === 'SGPA' ? sgpaSemester : null,
        randomSeed: freshRandomSeed,
        algorithmVersion: data.result.algorithmVersion || '1.0-BALANCED',
        sections: sectionConfigs,
        bands: performanceBands,
        totalStudentsCount: data.result.allocatedStudents.length,
        students: data.result.allocatedStudents,
        summary: data.result.summary,
        createdById: user?.id || 'admin',
        createdByName: user?.email || 'Department Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versionNumber: 1,
      };

      setCurrentRun(run);
      setManualAdjustmentCount(0);
      setFilterSection('ALL');
      setCurrentStep(3); // Review step
      setSuccessMessage('Section allocation generated successfully! Click any section box below to view that section roster.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing allocation.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual Section Reassignment Dropdown Change
  const handleManualSectionChange = (studentUsn: string, newSection: string) => {
    if (!currentRun) return;

    const studentIndex = currentRun.students.findIndex((s) => s.usn === studentUsn);
    if (studentIndex < 0) return;

    const updatedStudents = [...currentRun.students];
    updatedStudents[studentIndex] = {
      ...updatedStudents[studentIndex],
      assignedSection: newSection,
      isManualOverride: true,
    };

    // Recompute distribution stats
    const sectionCounts: Record<string, number> = {};
    const sectionScoreSums: Record<string, number> = {};
    const sectionScoreCounts: Record<string, number> = {};
    const sectionBandCounts: Record<string, Record<string, number>> = {};

    currentRun.sections.forEach((sec) => {
      sectionCounts[sec.name] = 0;
      sectionScoreSums[sec.name] = 0;
      sectionScoreCounts[sec.name] = 0;
      sectionBandCounts[sec.name] = {};
    });

    updatedStudents.forEach((st) => {
      const sec = st.assignedSection;
      sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
      if (st.performanceValue !== null && st.performanceValue !== undefined) {
        sectionScoreSums[sec] = (sectionScoreSums[sec] || 0) + st.performanceValue;
        sectionScoreCounts[sec] = (sectionScoreCounts[sec] || 0) + 1;
      }
      if (st.bandName) {
        if (!sectionBandCounts[sec]) sectionBandCounts[sec] = {};
        sectionBandCounts[sec][st.bandName] = (sectionBandCounts[sec][st.bandName] || 0) + 1;
      }
    });

    const sectionAverages: Record<string, number> = {};
    currentRun.sections.forEach((sec) => {
      const count = sectionScoreCounts[sec.name] || 0;
      sectionAverages[sec.name] = count > 0 ? Number((sectionScoreSums[sec.name] / count).toFixed(2)) : 0;
    });

    setCurrentRun({
      ...currentRun,
      students: updatedStudents,
      summary: {
        sectionCounts,
        sectionAverages,
        sectionBandCounts,
      },
    });
    setManualAdjustmentCount((prev) => prev + 1);
  };

  // Commit Section Allocation for Year
  const handleCommitAllocation = async () => {
    if (!currentRun) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await authFetch('/api/section-allocations/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRun),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to commit allocation.');
        return;
      }
      setSuccessMessage(
        `Section allocation committed for Year ${selectedYear} (${selectedSemester}th Sem)! You can download the official section roster in Excel and PDF below.`
      );
      setCurrentRun(data.run);
      setCommittedSuccess(true);
      fetchHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error committing allocation.');
    } finally {
      setIsSaving(false);
    }
  };

  // Export Multi-Sheet Excel
  const handleExportExcel = (targetRun?: StudentSectionAllocationRun) => {
    const run = targetRun || currentRun;
    if (!run) return;

    const fileBytes = exportSectionAllocationWorkbook(run, institution?.institutionName, deptName);
    const blob = new Blob([fileBytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MIT_Mysore_${deptCode}_Year${run.yearOfStudy}_Section_Allocation.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Official PDF
  const handleExportPdf = (targetRun?: StudentSectionAllocationRun) => {
    const run = targetRun || currentRun;
    if (!run) return;

    const doc = generateSectionAllocationPdf(
      run,
      institution?.institutionName || 'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
      deptName
    );
    doc.save(`MIT_Mysore_${deptCode}_Year${run.yearOfStudy}_Section_Allocation.pdf`);
  };

  // Filter students for Review Table (Clicking Section card filters to that section!)
  const filteredStudents = useMemo(() => {
    if (!currentRun) return [];
    return currentRun.students.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.usn.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesSection = filterSection === 'ALL' || s.assignedSection === filterSection;
      return matchesSearch && matchesSection;
    });
  }, [currentRun, studentSearch, filterSection]);

  const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Student Section Allocation & Division
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-[#7B1113] border border-rose-200">
              Dept: {deptCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Divide students of an academic cohort into balanced sections (Random or Performance-balanced) and export official student section rosters.
          </p>
        </div>

        {/* Tab switch: New Allocation Wizard vs History */}
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => {
              setActiveTab('wizard');
              setCommittedSuccess(false);
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'wizard'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-4 h-4" />
            <span>Allocation Wizard</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Committed Records ({historyRuns.length})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between shadow-sm animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-700 text-sm font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-sm animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-700 text-sm font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* TAB 1: ALLOCATION WIZARD */}
      {activeTab === 'wizard' && (
        <div className="space-y-6">
          {/* Step Indicator Header (3 Simple Steps) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs font-bold">
            {[
              { num: 1, label: '1. Year & Section Setup' },
              { num: 2, label: '2. Allocation Method' },
              { num: 3, label: '3. Review & Commit' },
            ].map((st) => (
              <div
                key={st.num}
                onClick={() => {
                  if (st.num < currentStep || (st.num === 2 && currentRun)) {
                    setCurrentStep(st.num);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all ${
                  currentStep === st.num
                    ? 'bg-[#7B1113] text-white shadow-sm'
                    : currentStep > st.num
                    ? 'text-emerald-700 bg-emerald-50 cursor-pointer hover:bg-emerald-100'
                    : 'text-slate-400 bg-slate-50'
                }`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                  {currentStep > st.num ? '✓' : st.num}
                </span>
                <span>{st.label}</span>
              </div>
            ))}
          </div>

          {/* ============================================================== */}
          {/* STEP 1: YEAR SELECTION & SECTION SETUP */}
          {/* ============================================================== */}
          {currentStep === 1 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in-50">
              {/* Year Selection & Automatic Semester Display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#7B1113]" />
                    <span>Select Academic Cohort / Year:</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-[#7B1113] border border-rose-200 rounded-lg text-xs font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Active Running Term: {selectedSemester}th Semester ({romanNumerals[selectedSemester]} Sem)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {[1, 2, 3, 4].map((yr) => {
                    const isSelected = selectedYear === yr;
                    const sem = deptStudentSemesters[yr] || yr * 2;
                    return (
                      <button
                        key={yr}
                        onClick={() => {
                          setSelectedYear(yr);
                          setSelectedSemester(sem);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#7B1113]/5 border-[#7B1113] text-[#7B1113] ring-1 ring-[#7B1113] shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">
                            {yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isSelected
                                ? 'bg-[#7B1113] border-[#7B1113] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Running: Sem {sem} ({romanNumerals[sem]} Sem)
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cohort Student Count Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-800 shadow-xs">
                    <Users className="w-5 h-5 text-[#7B1113]" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {isLoadingCohort ? 'Counting active cohort students...' : `${cohortStudents.length} Students Registered`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Department of {deptName} · Year {selectedYear} ({selectedSemester}th Semester)
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-[#7B1113] text-sm">
                    {sectionConfigs.length} Sections Configured
                  </span>
                  <div className="text-[11px] text-slate-400">
                    ~{Math.round(cohortStudents.length / sectionConfigs.length)} students per section
                  </div>
                </div>
              </div>

              {/* Number of Sections Setup (2, 3, 4, or Custom) */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#7B1113]" />
                    <span>Number of Sections to Divide Into:</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[2, 3, 4].map((count) => {
                    const isSelected = !isCustomSections && numSections === count;
                    return (
                      <button
                        key={count}
                        onClick={() => {
                          setIsCustomSections(false);
                          setNumSections(count);
                        }}
                        className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#7B1113] text-white border-[#7B1113] font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-sm font-bold">{count} Sections</div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-rose-100' : 'text-slate-400'}`}>
                          ({Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i)).join(', ')})
                        </div>
                      </button>
                    );
                  })}

                  {/* Custom Sections Option */}
                  <button
                    onClick={() => setIsCustomSections(true)}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isCustomSections
                        ? 'bg-[#7B1113] text-white border-[#7B1113] font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-bold">Custom Sections</div>
                    <div className={`text-[10px] mt-0.5 ${isCustomSections ? 'text-rose-100' : 'text-slate-400'}`}>
                      (Specify Number)
                    </div>
                  </button>
                </div>

                {/* Custom Sections Number Input */}
                {isCustomSections && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950">Enter Custom Number of Sections:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={customSectionInput}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                          setCustomSectionInput(val);
                        }}
                        className="w-20 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-center font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                      />
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Sections will be automatically labeled from Section A to Section {String.fromCharCode(64 + customSectionInput)}.
                    </p>
                  </div>
                )}

                {/* Section Allocation Cards Preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {sectionConfigs.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5"
                    >
                      <div className="font-bold text-slate-900 text-sm">{sec.name}</div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Target Balance:</span>
                        <span className="font-mono font-bold text-[#7B1113]">{sec.targetCount} Students</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  disabled={cohortStudents.length === 0}
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>Proceed to Allocation Method</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: ALLOCATION METHOD */}
          {/* ============================================================== */}
          {currentStep === 2 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7B1113]" />
                    <span>Select Allocation Algorithm & Methodology</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Year {selectedYear} ({selectedSemester}th Semester) · {cohortStudents.length} Students across {sectionConfigs.length} Sections
                  </p>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Setup</span>
                </button>
              </div>

              {/* Method Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Method A: Random Allocation */}
                <div
                  onClick={() => setAllocationMethod('RANDOM')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    allocationMethod === 'RANDOM'
                      ? 'bg-[#7B1113]/5 border-[#7B1113] ring-2 ring-[#7B1113] shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">Option 1: Random Allocation</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          allocationMethod === 'RANDOM'
                            ? 'bg-[#7B1113] border-[#7B1113] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {allocationMethod === 'RANDOM' && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Truly random, unbiased shuffle. Every execution generates a fresh allotment with no hardcoded or repeated seeds.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100/80 text-[11px] text-slate-500 font-medium">
                    ✓ Immediate division · No score spreadsheet required
                  </div>
                </div>

                {/* Method B: Performance Balanced Allocation */}
                <div
                  onClick={() => setAllocationMethod('PERFORMANCE')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    allocationMethod === 'PERFORMANCE'
                      ? 'bg-[#7B1113]/5 border-[#7B1113] ring-2 ring-[#7B1113] shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">Option 2: Performance Balanced Allocation</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          allocationMethod === 'PERFORMANCE'
                            ? 'bg-[#7B1113] border-[#7B1113] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {allocationMethod === 'PERFORMANCE' && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Stratifies students by CGPA or SGPA across tiers so every section receives equal proportions of top, middle, and developing performers.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100/80 text-[11px] text-[#7B1113] font-semibold">
                    ✓ Academic parity · Customizable score ranges
                  </div>
                </div>
              </div>

              {/* Sub-settings for Performance Balanced Allocation */}
              {allocationMethod === 'PERFORMANCE' && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                  {/* Metric Choice: Separate CGPA vs SGPA */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Select Performance Metric (0.0 to 10.0 scale):
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <button
                        type="button"
                        onClick={() => setPerformanceMetric('CGPA')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          performanceMetric === 'CGPA'
                            ? 'bg-[#7B1113] text-white border-[#7B1113] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        CGPA (Cumulative)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPerformanceMetric('SGPA')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          performanceMetric === 'SGPA'
                            ? 'bg-[#7B1113] text-white border-[#7B1113] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        SGPA (Semester Grade)
                      </button>
                    </div>
                  </div>

                  {/* Configurable Number of Tiers / Parts */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Configure Performance Tiers / Parts:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-medium">Number of Parts:</span>
                        {[2, 3, 4, 5].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => handleBandCountChange(cnt)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              bandCount === cnt
                                ? 'bg-[#7B1113] text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editable Tier Ranges */}
                    <div className="space-y-2">
                      {performanceBands.map((band, idx) => (
                        <div
                          key={band.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={band.name}
                              onChange={(e) => handleUpdateBandRange(idx, 'name', e.target.value)}
                              className="font-bold text-slate-800 border-b border-slate-200 focus:outline-none focus:border-[#7B1113]"
                            />
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-400">Min:</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={band.min}
                              onChange={(e) => handleUpdateBandRange(idx, 'min', e.target.value)}
                              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-bold"
                            />
                            <span className="text-slate-400">to Max:</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={band.max}
                              onChange={(e) => handleUpdateBandRange(idx, 'max', e.target.value)}
                              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Excel Upload with USN Key Matching */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Upload Student {performanceMetric} Excel / CSV File:
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Matches student USN automatically from any column structure (Name, Email, USN, {performanceMetric}).
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Pre-filled Template</span>
                      </button>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Upload className="w-5 h-5 text-[#7B1113]" />
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            {uploadedFileName ? uploadedFileName : `Select Excel (.xlsx) containing USN & ${performanceMetric}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {excelValidationReport
                              ? `Matched ${excelValidationReport.matchedCount} of ${cohortStudents.length} students`
                              : 'Accepts files with extra columns (e.g. email, phone); USN is used as match key'}
                          </div>
                        </div>
                      </div>

                      <label className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer transition-colors shrink-0">
                        <span>{isParsingExcel ? 'Parsing...' : 'Upload Excel'}</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleUploadExcel}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ← Back to Setup
                </button>

                <button
                  type="button"
                  disabled={isGenerating || cohortStudents.length === 0}
                  onClick={handleGenerateAllocation}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Computing Allocation...' : 'Generate Section Allocation'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: REVIEW, SECTION ROSTER & COMMIT */}
          {/* ============================================================== */}
          {currentStep === 3 && currentRun && (
            <div className="space-y-6 animate-in fade-in-50">
              {/* Review Header Banner */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Year {selectedYear} ({selectedSemester}th Semester) — Section Allocation
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {committedSuccess ? 'COMMITTED' : 'UNCOMMITTED PREVIEW'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Divided {currentRun.totalStudentsCount} students into {currentRun.sections.length} sections using {currentRun.method === 'RANDOM' ? 'Random Balanced Allocation' : `Performance Balanced (${currentRun.performanceMetric})`}. Click any section card below to view its student roster.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {allocationMethod === 'RANDOM' && !committedSuccess && (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateAllocation}
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>Try Another Random Allotment</span>
                    </button>
                  )}

                  {!committedSuccess ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleCommitAllocation}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSaving ? 'Committing...' : `Commit Section Allocation for Year ${selectedYear}`}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportExcel()}
                        className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Download Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportPdf()}
                        className="px-3.5 py-2 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-rose-600" />
                        <span>Download PDF (.pdf)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section Distribution Cards (Clicking one filters table below to that section!) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                  <span>CLICK A SECTION TO FILTER ROSTER:</span>
                  <button
                    onClick={() => setFilterSection('ALL')}
                    className={`text-xs font-bold cursor-pointer ${
                      filterSection === 'ALL' ? 'text-[#7B1113] underline' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Show All Sections ({currentRun.totalStudentsCount})
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {currentRun.sections.map((sec) => {
                    const isCardSelected = filterSection === sec.name;
                    const count = currentRun.summary.sectionCounts[sec.name] || 0;
                    const avg = currentRun.summary.sectionAverages ? currentRun.summary.sectionAverages[sec.name] : null;

                    return (
                      <div
                        key={sec.name}
                        onClick={() => setFilterSection(sec.name)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isCardSelected
                            ? 'bg-[#7B1113] text-white border-[#7B1113] shadow-md ring-2 ring-[#7B1113]'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{sec.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCardSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {count} std
                          </span>
                        </div>

                        {avg !== null && avg !== undefined && (
                          <div className={`text-[11px] font-mono mt-1 ${isCardSelected ? 'text-rose-100' : 'text-slate-500'}`}>
                            Avg {currentRun.performanceMetric}: <strong>{avg}</strong>
                          </div>
                        )}

                        <div className={`text-[10px] mt-2 font-medium ${isCardSelected ? 'text-rose-200' : 'text-slate-400'}`}>
                          {isCardSelected ? '✓ Currently showing' : 'Click to inspect roster'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Student Roster Table for Selected Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Roster: {filterSection === 'ALL' ? 'All Sections' : filterSection}
                    </span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {filteredStudents.length} Students
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by USN or Name..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 text-center w-12">#</th>
                        <th className="py-2.5 px-4">USN & Candidate</th>
                        <th className="py-2.5 px-3 text-center">Assigned Section</th>
                        {currentRun.method === 'PERFORMANCE' && (
                          <>
                            <th className="py-2.5 px-3 text-center font-mono">{currentRun.performanceMetric}</th>
                            <th className="py-2.5 px-3">Performance Tier</th>
                          </>
                        )}
                        <th className="py-2.5 px-3 text-right">Reassign</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No students match the search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((st, index) => (
                          <tr key={st.studentId || st.usn} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {index + 1}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-900">{st.fullName}</div>
                              <div className="text-[11px] font-mono font-bold text-[#7B1113]">{st.usn}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex px-2 py-0.5 rounded font-bold text-xs bg-[#7B1113]/10 text-[#7B1113]">
                                {st.assignedSection}
                              </span>
                            </td>
                            {currentRun.method === 'PERFORMANCE' && (
                              <>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                                  {st.performanceValue !== null && st.performanceValue !== undefined
                                    ? st.performanceValue.toFixed(2)
                                    : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-[11px] text-slate-600">
                                  {st.bandName || 'Unassigned'}
                                </td>
                              </>
                            )}
                            <td className="py-2.5 px-3 text-right">
                              <select
                                value={st.assignedSection}
                                onChange={(e) => handleManualSectionChange(st.usn, e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-[#7B1113]"
                              >
                                {currentRun.sections.map((sec) => (
                                  <option key={sec.name} value={sec.name}>
                                    {sec.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMMITTED RECORDS (HISTORY) */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-[#7B1113]" />
                <span>Committed Section Allocations for {deptCode}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved section allotments for each year and cohort. Download official Excel and PDF rosters for distribution to students.
              </p>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading committed records...</div>
          ) : historyRuns.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No section allocations have been committed yet for this department. Use the Allocation Wizard to divide cohorts into sections.
            </div>
          ) : (
            <div className="space-y-3">
              {historyRuns.map((run) => (
                <div
                  key={run.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        Year {run.yearOfStudy} · {run.semester ? `${run.semester}th Semester` : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        COMMITTED
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {run.totalStudentsCount} Students divided into {run.sections.length} Sections ({run.sections.map((s) => s.name).join(', ')})
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Committed on: {new Date(run.publishedAt || run.createdAt).toLocaleDateString()} by {run.publishedByName || run.createdByName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportExcel(run)}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportPdf(run)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
