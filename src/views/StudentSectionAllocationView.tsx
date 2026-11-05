import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
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
  ExcelValidationResult,
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
} from 'lucide-react';

export const StudentSectionAllocationView: React.FC = () => {
  const { user, department, institution } = useAuth();

  const deptId = department?.id || 'dept-ise';
  const deptCode = department?.code || 'ISE';
  const deptName = department?.name || 'Department of Information Science & Engineering';
  const currentAcademicYear = institution?.currentAcademicYear || '2026-27';

  // Navigation tab: 'wizard' vs 'history'
  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');

  // Wizard active step: 1 (Cohort), 2 (Sections), 3 (Method), 4 (Preview & Adjust), 5 (Published)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Cohort Selection
  const [selectedYear, setSelectedYear] = useState<number>(2); // 1, 2, 3, 4
  const [selectedSemester, setSelectedSemester] = useState<number>(4); // default sem 4 for 2nd year
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [cohortStudents, setCohortStudents] = useState<Student[]>([]);
  const [isLoadingCohort, setIsLoadingCohort] = useState<boolean>(false);

  // Step 2: Section Configuration
  const [numSections, setNumSections] = useState<number>(3); // 2, 3, 4
  const [sectionConfigs, setSectionConfigs] = useState<SectionConfig[]>([
    { name: 'Section A', capacity: 60, targetCount: 0 },
    { name: 'Section B', capacity: 60, targetCount: 0 },
    { name: 'Section C', capacity: 60, targetCount: 0 },
  ]);

  // Step 3: Allocation Method
  const [allocationMethod, setAllocationMethod] = useState<'RANDOM' | 'PERFORMANCE'>('PERFORMANCE');
  const [randomSeed, setRandomSeed] = useState<string>(`seed-${Math.floor(10000 + Math.random() * 90000)}`);

  // Method B: Performance Balanced Settings
  const [performanceMetric, setPerformanceMetric] = useState<'CGPA' | 'SGPA'>('CGPA');
  const [sgpaSemester, setSgpaSemester] = useState<number>(3);
  const [performanceBands] = useState<SectionAllocationBand[]>(DEFAULT_PERFORMANCE_BANDS);
  const [missingScorePolicy, setMissingScorePolicy] = useState<'LOWEST_BAND' | 'DISTRIBUTE_EVENLY' | 'UNASSIGNED'>('LOWEST_BAND');

  // Excel Upload State
  const [uploadedScores, setUploadedScores] = useState<Record<string, number>>({});
  const [excelValidationReport, setExcelValidationReport] = useState<ExcelValidationResult | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Step 4: Preview Run & Manual Overrides
  const [currentRun, setCurrentRun] = useState<StudentSectionAllocationRun | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [filterSection, setFilterSection] = useState<string>('ALL');
  const [filterBand, setFilterBand] = useState<string>('ALL');
  const [manualAdjustmentCount, setManualAdjustmentCount] = useState<number>(0);

  // Notification banners
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // History list
  const [historyRuns, setHistoryRuns] = useState<StudentSectionAllocationRun[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Auto-sync semester when year changes
  useEffect(() => {
    if (selectedYear === 1) setSelectedSemester(2);
    else if (selectedYear === 2) setSelectedSemester(4);
    else if (selectedYear === 3) setSelectedSemester(6);
    else if (selectedYear === 4) setSelectedSemester(8);
  }, [selectedYear]);

  // Sync section count configs
  useEffect(() => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const totalCount = cohortStudents.length;
    const base = Math.floor(totalCount / numSections);
    const remainder = totalCount % numSections;

    const updated: SectionConfig[] = [];
    for (let i = 0; i < numSections; i++) {
      const existing = sectionConfigs[i];
      const target = base + (i < remainder ? 1 : 0);
      updated.push({
        name: existing?.name || `Section ${letters[i]}`,
        capacity: existing?.capacity || 60,
        targetCount: target,
      });
    }
    setSectionConfigs(updated);
  }, [numSections, cohortStudents.length]);

  // Fetch eligible cohort students
  const fetchCohortStudents = async () => {
    setIsLoadingCohort(true);
    setErrorMessage(null);
    try {
      let url = `/api/students?departmentId=${encodeURIComponent(deptId)}&year=${selectedYear}&`;
      if (selectedStatus) {
        url += `status=${encodeURIComponent(selectedStatus)}&`;
      }
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
  }, [deptId, selectedYear, selectedStatus]);

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

  // Total capacity check
  const totalCapacity = useMemo(() => {
    return sectionConfigs.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0);
  }, [sectionConfigs]);

  const capacityShortfall = cohortStudents.length > totalCapacity;

  // Handle section capacity change
  const handleCapacityChange = (index: number, newCapacity: number) => {
    const updated = [...sectionConfigs];
    updated[index].capacity = newCapacity;
    setSectionConfigs(updated);
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

  // Parse Uploaded Excel File
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
          `Uploaded Excel file has validation issues: ${result.errorSummary.join(', ')}. Please review report.`
        );
      } else {
        setSuccessMessage(
          `Excel scores successfully loaded for ${result.matchedCount} of ${cohortStudents.length} students!`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read uploaded Excel file.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Execute Allocation Preview
  const handleGenerateAllocation = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (cohortStudents.length === 0) {
      setErrorMessage('No eligible students available for allocation.');
      return;
    }

    if (capacityShortfall) {
      setErrorMessage(
        `Insufficient total capacity (${totalCapacity}) for ${cohortStudents.length} students. Please increase section capacities.`
      );
      return;
    }

    if (allocationMethod === 'PERFORMANCE') {
      const bandValidation = validatePerformanceBands(performanceBands);
      if (!bandValidation.isValid) {
        setErrorMessage(`Performance bands error: ${bandValidation.errors.join('; ')}`);
        return;
      }
    }

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
          randomSeed: String(randomSeed),
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
        title: `Year ${selectedYear} (Sem ${selectedSemester}) Section Allocation (Draft)`,
        status: 'DRAFT',
        method: allocationMethod,
        performanceMetric: allocationMethod === 'PERFORMANCE' ? performanceMetric : null,
        sgpaSemester: allocationMethod === 'PERFORMANCE' && performanceMetric === 'SGPA' ? sgpaSemester : null,
        randomSeed: String(randomSeed),
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
      setCurrentStep(4);
      setSuccessMessage('Allocation generated successfully! You can now review distribution and manually adjust sections.');
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
    if (studentIndex === -1) return;

    const updatedStudents: AllocatedStudent[] = [...currentRun.students];
    const previousSection = updatedStudents[studentIndex].assignedSection;
    if (previousSection === newSection) return;

    updatedStudents[studentIndex] = {
      ...updatedStudents[studentIndex],
      assignedSection: newSection,
      isManualOverride: true,
      overrideReason: `Manual reassignment from ${previousSection} to ${newSection}`,
    };

    // Recalculate summary statistics
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

  // Save Draft
  const handleSaveDraft = async () => {
    if (!currentRun) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await authFetch('/api/section-allocations/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRun),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save draft.');
        return;
      }
      setSuccessMessage('Section allocation saved as DRAFT successfully.');
      setCurrentRun(data.run);
      fetchHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving draft.');
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Allocation
  const handlePublishAllocation = async () => {
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
        setErrorMessage(data.error || 'Failed to publish allocation.');
        return;
      }
      setSuccessMessage(
        `Section allocation officially PUBLISHED! Assigned sections have been synchronized across all ${currentRun.totalStudentsCount} student profiles in Student Management.`
      );
      setCurrentRun(data.run);
      setCurrentStep(5);
      fetchCohortStudents();
      fetchHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error publishing allocation.');
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
    link.download = `MIT_Mysore_${deptCode}_Year${run.yearOfStudy}_Section_Allocation_v${run.versionNumber}.xlsx`;
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
    doc.save(`MIT_Mysore_${deptCode}_Year${run.yearOfStudy}_Section_Allocation_v${run.versionNumber}.pdf`);
  };

  // Export CSV
  const handleExportCsv = (targetRun?: StudentSectionAllocationRun) => {
    const run = targetRun || currentRun;
    if (!run) return;

    const csvContent = exportSectionAllocationCsv(run);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MIT_Mysore_${deptCode}_Year${run.yearOfStudy}_Section_Allocation_v${run.versionNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter students for Step 4 Preview Table
  const filteredStudents = useMemo(() => {
    if (!currentRun) return [];
    return currentRun.students.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.usn.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesSection = filterSection === 'ALL' || s.assignedSection === filterSection;
      const matchesBand = filterBand === 'ALL' || s.bandName === filterBand;
      return matchesSearch && matchesSection && matchesBand;
    });
  }, [currentRun, studentSearch, filterSection, filterBand]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#7B1113] text-white flex items-center justify-center shadow-sm">
              <SplitSquareVertical className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Intelligent Student Section Allocation</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-[#7B1113] border border-rose-200">
                  {deptCode}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Stratified performance balancing, random balanced distribution, and official multi-section roster exports.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('wizard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wizard'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7B1113]" />
            <span>Allocation Wizard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>History & Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 text-sm font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 text-sm font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* TAB A: ALLOCATION WIZARD */}
      {activeTab === 'wizard' && (
        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            {[
              { num: 1, label: '1. Cohort Selection' },
              { num: 2, label: '2. Section Setup' },
              { num: 3, label: '3. Allocation Method' },
              { num: 4, label: '4. Review & Publish' },
            ].map((step) => (
              <div
                key={step.num}
                onClick={() => {
                  if (step.num <= currentStep || (step.num === 4 && currentRun)) {
                    setCurrentStep(step.num);
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  currentStep === step.num
                    ? 'bg-white text-[#7B1113] shadow-sm font-bold border border-rose-200'
                    : currentStep > step.num
                    ? 'text-emerald-700 bg-emerald-50/50 cursor-pointer'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                {currentStep > step.num ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center">
                    {step.num}
                  </span>
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: COHORT SELECTION */}
          {currentStep === 1 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#7B1113]" />
                    <span>Step 1: Select Student Cohort for Section Allocation</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data dynamically synced with Student Management (single source of truth). No re-typing required.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Academic Year:</span>
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                    {currentAcademicYear}
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                    <Building2 className="w-4 h-4 text-[#7B1113]" />
                    <span className="truncate">{deptName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year of Study</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setSelectedYear(yr)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          selectedYear === yr
                            ? 'bg-[#7B1113] border-[#7B1113] text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Yr {yr}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Running Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem} (Year {Math.ceil(sem / 2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value="ACTIVE">Active Students Only (Recommended)</option>
                    <option value="">All Statuses</option>
                  </select>
                </div>
              </div>

              {/* Cohort Summary Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-lg font-mono text-[#7B1113]">
                    {cohortStudents.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Eligible Students for Year {selectedYear} (Semester {selectedSemester})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {cohortStudents.length > 0
                        ? `Ready to divide into academic sections. Single source of truth: Student Management.`
                        : `No active students found in this cohort. Please check Student Management.`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchCohortStudents}
                  disabled={isLoadingCohort}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCohort ? 'animate-spin' : ''}`} />
                  <span>Refresh Cohort</span>
                </button>
              </div>

              {/* Student Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 bg-slate-50">
                      <th className="py-2 px-3 text-center w-12">#</th>
                      <th className="py-2 px-4">USN</th>
                      <th className="py-2 px-4">Student Name</th>
                      <th className="py-2 px-3 text-center">Sem & Year</th>
                      <th className="py-2 px-3 text-center">Current Section</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cohortStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          {isLoadingCohort ? 'Loading cohort...' : 'No matching student records found.'}
                        </td>
                      </tr>
                    ) : (
                      cohortStudents.slice(0, 25).map((st, idx) => (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-4 font-mono font-bold text-[#7B1113]">{st.usn}</td>
                          <td className="py-1.5 px-4 font-medium text-slate-800">{st.fullName}</td>
                          <td className="py-1.5 px-3 text-center text-slate-600">
                            Sem {st.currentSemester} (Yr {st.currentYear})
                          </td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-700">
                            {st.section || 'Unassigned'}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              {st.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {cohortStudents.length > 25 && (
                <div className="text-[11px] text-slate-500 text-center">
                  Showing first 25 of {cohortStudents.length} students in this cohort.
                </div>
              )}

              {/* Step 1 Footer Action */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  disabled={cohortStudents.length === 0}
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Continue to Section Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SECTION SETUP */}
          {currentStep === 2 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <SplitSquareVertical className="w-4 h-4 text-[#7B1113]" />
                    <span>Step 2: Configure Academic Sections & Capacities</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define number of sections, individual classroom capacities, and verify balanced distribution.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">Cohort Size:</span>
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-rose-50 text-[#7B1113] border border-rose-200">
                    {cohortStudents.length} Students
                  </span>
                </div>
              </div>

              {/* Number of sections selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Number of Sections to Allocate</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-w-lg">
                  {[2, 3, 4, 5, 6].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setNumSections(k)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        numSections === k
                          ? 'bg-[#7B1113] border-[#7B1113] text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{k} Sections</span>
                      <span className="text-[10px] font-normal opacity-80">
                        (~{Math.ceil(cohortStudents.length / k)}/sec)
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section configuration list */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700">Configured Section Details & Capacities:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sectionConfigs.map((sec, idx) => {
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{sec.name}</span>
                            <span className="text-[11px] font-semibold text-[#7B1113] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Target: {sec.targetCount} Students
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Balanced target for this section based on {cohortStudents.length} total students.
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Classroom Max Capacity
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={sec.capacity}
                            onChange={(e) => handleCapacityChange(idx, Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Capacity check banner */}
              <div
                className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
                  capacityShortfall
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {capacityShortfall ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">Total Configured Capacity: </span>
                    <span className="font-mono font-bold">{totalCapacity} seats</span> across {numSections} sections.
                    {capacityShortfall ? (
                      <span className="ml-1 text-rose-700">
                        Deficit of {cohortStudents.length - totalCapacity} seats! Please increase section capacities.
                      </span>
                    ) : (
                      <span className="ml-1 text-emerald-700">
                        Sufficient capacity for all {cohortStudents.length} eligible students (
                        {totalCapacity - cohortStudents.length} surplus seats available).
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2 Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Back to Cohort Selection
                </button>
                <button
                  type="button"
                  disabled={capacityShortfall}
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Continue to Allocation Method</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CHOOSE ALLOCATION METHOD */}
          {currentStep === 3 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7B1113]" />
                    <span>Step 3: Select Allocation Methodology</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Distribute students using equitable academic performance bands or reproducible random balancing.
                  </p>
                </div>
              </div>

              {/* Method Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setAllocationMethod('PERFORMANCE')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    allocationMethod === 'PERFORMANCE'
                      ? 'bg-[#7B1113]/5 border-[#7B1113] text-[#7B1113] ring-1 ring-[#7B1113] shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <BarChart3 className="w-4 h-4 text-[#7B1113]" />
                      <span>Method B: Academic Performance-Based (CGPA/SGPA)</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        allocationMethod === 'PERFORMANCE'
                          ? 'bg-[#7B1113] border-[#7B1113] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {allocationMethod === 'PERFORMANCE' && '✓'}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Stratifies students into VTU merit tiers (&gt;8.5, 7.0–8.5, 6.0–7.0, &lt;6.0) and balances top, mid, and pass performers equally across all sections.
                  </p>
                </div>

                <div
                  onClick={() => setAllocationMethod('RANDOM')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    allocationMethod === 'RANDOM'
                      ? 'bg-[#7B1113]/5 border-[#7B1113] text-[#7B1113] ring-1 ring-[#7B1113] shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <span>Method A: Random Balanced Allocation</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        allocationMethod === 'RANDOM'
                          ? 'bg-[#7B1113] border-[#7B1113] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {allocationMethod === 'RANDOM' && '✓'}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Evenly distributes students across sections at random using a reproducible mathematical seed, maintaining strictly equal section sizes.
                  </p>
                </div>
              </div>

              {/* METHOD A CONFIG: Random Seed */}
              {allocationMethod === 'RANDOM' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Reproducible Random Seed:</div>
                      <div className="text-[11px] text-slate-500">
                        The same seed generates the exact same student assignment every time for audit verification.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={randomSeed}
                        onChange={(e) => setRandomSeed(e.target.value)}
                        className="w-36 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setRandomSeed(`seed-${Math.floor(10000 + Math.random() * 90000)}`)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Re-roll Seed</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* METHOD B CONFIG: Excel Template, Upload & Bands */}
              {allocationMethod === 'PERFORMANCE' && (
                <div className="space-y-4">
                  {/* Metric Choice */}
                  <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">Metric Basis:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="metricChoice"
                        checked={performanceMetric === 'CGPA'}
                        onChange={() => setPerformanceMetric('CGPA')}
                        className="text-[#7B1113] focus:ring-[#7B1113]"
                      />
                      <span>Cumulative GPA (CGPA)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="metricChoice"
                        checked={performanceMetric === 'SGPA'}
                        onChange={() => setPerformanceMetric('SGPA')}
                        className="text-[#7B1113] focus:ring-[#7B1113]"
                      />
                      <span>Semester GPA (SGPA)</span>
                    </label>

                    {performanceMetric === 'SGPA' && (
                      <div className="flex items-center gap-1.5 ml-4">
                        <span className="text-slate-500 font-medium">Semester:</span>
                        <select
                          value={sgpaSemester}
                          onChange={(e) => setSgpaSemester(Number(e.target.value))}
                          className="px-2 py-1 text-xs bg-white border border-slate-300 rounded font-bold"
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                            <option key={s} value={s}>
                              Sem {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Excel Template & Upload Action Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* B1: Download Pre-filled Template */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>1. Download Pre-filled Template (.xlsx)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Download an Excel file populated with the exact USNs and names of all {cohortStudents.length} students in this cohort.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Download {performanceMetric} Template</span>
                      </button>
                    </div>

                    {/* B2: Upload Completed Excel */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <Upload className="w-4 h-4 text-[#7B1113]" />
                          <span>2. Upload Completed Performance Excel</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Upload the sheet with entered marks. The system verifies 0.00–10.00 score boundaries, duplicates, and matches.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleUploadExcel}
                          disabled={isParsingExcel}
                          className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#7B1113] file:text-white hover:file:bg-[#600d0f] cursor-pointer"
                        />
                        {uploadedFileName && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Selected: {uploadedFileName} ({Object.keys(uploadedScores).length} scores parsed)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Validation Report Card */}
                  {excelValidationReport && (
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Excel Validation Summary:</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {excelValidationReport.matchedCount} of {cohortStudents.length} cohort students mapped
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div className="p-2 bg-slate-50 rounded border border-slate-100">
                          <div className="text-slate-500">Expected Cohort</div>
                          <div className="font-bold text-slate-800">{excelValidationReport.totalExpected}</div>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                          <div className="text-emerald-700">Matched Scores</div>
                          <div className="font-bold text-emerald-900">{excelValidationReport.validScoresCount}</div>
                        </div>
                        <div className="p-2 bg-amber-50 rounded border border-amber-100">
                          <div className="text-amber-700">Missing Scores</div>
                          <div className="font-bold text-amber-900">{excelValidationReport.missingScoresCount}</div>
                        </div>
                        <div className="p-2 bg-rose-50 rounded border border-rose-100">
                          <div className="text-rose-700">Invalid / Errors</div>
                          <div className="font-bold text-rose-900">{excelValidationReport.invalidScores.length}</div>
                        </div>
                      </div>

                      {excelValidationReport.missingScoresCount > 0 && (
                        <div className="p-2.5 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 text-[11px] mt-2 flex items-center justify-between gap-3">
                          <div>
                            Notice: {excelValidationReport.missingScoresCount} student(s) have no score recorded in Excel.
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-bold">Missing Score Policy:</span>
                            <select
                              value={missingScorePolicy}
                              onChange={(e: any) => setMissingScorePolicy(e.target.value)}
                              className="px-2 py-1 text-xs bg-white border border-amber-300 rounded font-semibold text-slate-800"
                            >
                              <option value="LOWEST_BAND">Assign to Lowest Band</option>
                              <option value="DISTRIBUTE_EVENLY">Distribute Evenly</option>
                              <option value="UNASSIGNED">Leave Unassigned</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Performance Bands Table */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Configured VTU Performance Tiers (Stratified Balancing):
                      </span>
                      <span className="text-[10px] text-slate-500">Contiguous boundaries strictly validated</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {performanceBands.map((band, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                          <div className="font-bold text-[#7B1113]">{band.name}</div>
                          <div className="text-[11px] font-mono text-slate-600">
                            {band.min === 0 ? `< ${band.max}` : band.max === 10 ? `> ${band.min}` : `${band.min} – ${band.max}`}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{band.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Back to Section Setup
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateAllocation}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating Allocation...' : 'Generate Balanced Allocation'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 & 5: PREVIEW, REVIEW & INTERACTIVE ADJUSTMENTS */}
          {currentStep >= 4 && currentRun && (
            <div className="space-y-6">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <div className="text-xs text-slate-500 font-semibold">Total Students</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">{currentRun.totalStudentsCount}</div>
                  <div className="text-[10px] text-slate-400">Year {currentRun.yearOfStudy} (Sem {currentRun.semester})</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <div className="text-xs text-slate-500 font-semibold">Allocated Sections</div>
                  <div className="text-2xl font-bold text-[#7B1113] font-mono">{currentRun.sections.length}</div>
                  <div className="text-[10px] text-slate-400">
                    {currentRun.sections.map((s) => s.name.replace('Section ', '')).join(', ')}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <div className="text-xs text-slate-500 font-semibold">Methodology</div>
                  <div className="text-xs font-bold text-slate-800 truncate pt-1">
                    {currentRun.method === 'PERFORMANCE' ? `CGPA / SGPA Stratified` : `Random Balanced`}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {currentRun.method === 'RANDOM' ? `Seed: ${currentRun.randomSeed}` : `${currentRun.performanceMetric || 'CGPA'} Basis`}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <div className="text-xs text-slate-500 font-semibold">Status & Overrides</div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1 pt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${currentRun.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-amber-100 text-amber-800 font-bold'}`}>
                      {currentRun.status}
                    </span>
                    <span className="text-[10px] text-slate-400">v{currentRun.versionNumber}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {manualAdjustmentCount > 0 ? `${manualAdjustmentCount} manual adjustment(s)` : 'Pure algorithmic balance'}
                  </div>
                </div>
              </div>

              {/* Section Breakdown Cards */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#7B1113]" />
                    <span>Section Distribution & Academic Parity</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    All sections maintained within capacity and performance parity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {currentRun.sections.map((sec, idx) => {
                    const studentCount = currentRun.summary?.sectionCounts?.[sec.name] || 0;
                    const avgScore = currentRun.summary?.sectionAverages?.[sec.name];
                    const bandCounts = currentRun.summary?.sectionBandCounts?.[sec.name];
                    const capacityPercent = Math.min(100, Math.round((studentCount / sec.capacity) * 100));

                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{sec.name}</span>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                            {studentCount} Students
                          </span>
                        </div>

                        {/* Capacity progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Capacity Usage:</span>
                            <span>{studentCount} / {sec.capacity} seats ({capacityPercent}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${capacityPercent > 100 ? 'bg-rose-600' : 'bg-[#7B1113]'}`}
                              style={{ width: `${Math.min(100, capacityPercent)}%` }}
                            />
                          </div>
                        </div>

                        {/* Performance metrics if available */}
                        {avgScore !== undefined && avgScore > 0 && (
                          <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Avg {currentRun.performanceMetric || 'CGPA'}:</span>
                            <span className="font-mono font-bold text-[#7B1113]">{avgScore.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Band count pills */}
                        {bandCounts && (
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            {Object.entries(bandCounts).map(([bandName, count]) => (
                              <span
                                key={bandName}
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200"
                              >
                                {bandName.split(' ')[0]}: {count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Full Student Allocation Table with Live Reassignment */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Student Allocation Roster & Section Reassignments
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Reassign sections on an individual basis. Summary counts and averages recalculate instantly.
                    </p>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search USN or Name..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                      />
                    </div>

                    <select
                      value={filterSection}
                      onChange={(e) => setFilterSection(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700"
                    >
                      <option value="ALL">All Sections</option>
                      {currentRun.sections.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    {currentRun.method === 'PERFORMANCE' && (
                      <select
                        value={filterBand}
                        onChange={(e) => setFilterBand(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700"
                      >
                        <option value="ALL">All Merit Bands</option>
                        {performanceBands.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 bg-slate-50 z-10">
                        <th className="py-2.5 px-3 text-center w-12">#</th>
                        <th className="py-2.5 px-4">USN</th>
                        <th className="py-2.5 px-4">Student Full Name</th>
                        <th className="py-2.5 px-3 text-center">Sem & Year</th>
                        {currentRun.method === 'PERFORMANCE' && (
                          <>
                            <th className="py-2.5 px-3 text-center">{currentRun.performanceMetric || 'CGPA'}</th>
                            <th className="py-2.5 px-3">Performance Band</th>
                          </>
                        )}
                        <th className="py-2.5 px-4 text-center">Assigned Section (Dropdown Reassign)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No students matching the filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student, idx) => (
                          <tr key={student.usn} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-4 font-mono font-bold text-[#7B1113]">{student.usn}</td>
                            <td className="py-2 px-4">
                              <div className="font-semibold text-slate-800">{student.fullName}</div>
                              {student.isManualOverride && (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Manually Adjusted
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600">
                              Sem {student.currentSemester} (Yr {student.currentYear})
                            </td>
                            {currentRun.method === 'PERFORMANCE' && (
                              <>
                                <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                                  {student.performanceValue !== null && student.performanceValue !== undefined
                                    ? student.performanceValue.toFixed(2)
                                    : '—'}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    {student.bandName || 'Unassigned'}
                                  </span>
                                </td>
                              </>
                            )}
                            <td className="py-2 px-4 text-center">
                              <select
                                value={student.assignedSection}
                                onChange={(e) => handleManualSectionChange(student.usn, e.target.value)}
                                className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113] cursor-pointer"
                              >
                                {currentRun.sections.map((s) => (
                                  <option key={s.name} value={s.name}>
                                    {s.name} ({currentRun.summary?.sectionCounts?.[s.name] || 0}/{s.capacity})
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

                {/* Final Actions Toolbar: Save Draft, Publish, Export */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleExportExcel()}
                      className="px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      title="Download multi-sheet Excel workbook with summary, section sheets, and master roster"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>Export Multi-Sheet Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportPdf()}
                      className="px-3 py-2 text-xs font-semibold text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      title="Download official printable PDF formatted with MIT Mysore seal"
                    >
                      <FileText className="w-4 h-4 text-[#7B1113]" />
                      <span>Export Official PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportCsv()}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      title="Download raw CSV file"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveDraft}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Save as Draft
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handlePublishAllocation}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Publish & Synchronize Roster</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB B: ALLOCATION HISTORY & AUDIT TRAIL */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Section Allocation Audit Trail & Past Runs</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review previous drafts and published allocations, compare distribution variance, and re-download official exports.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh History</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading allocation history...</div>
          ) : historyRuns.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No previous allocation runs recorded for {deptCode}. Use the Allocation Wizard to create the first section distribution.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyRuns.map((run) => (
                <div key={run.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        Year {run.yearOfStudy}{run.semester ? ` (Sem ${run.semester})` : ''}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          run.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {run.status}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        v{run.versionNumber}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        · {run.method === 'PERFORMANCE' ? `Performance (${run.performanceMetric || 'CGPA'})` : `Random Balanced`}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-3 pt-0.5">
                      <span>{run.totalStudentsCount} Students across {run.sections.length} Sections</span>
                      <span>· Created by {run.createdByName}</span>
                      <span>· {new Date(run.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-2 pt-1 flex-wrap">
                      {run.sections.map((sec) => (
                        <span key={sec.name} className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {sec.name}: {run.summary?.sectionCounts?.[sec.name] || 0}
                          {run.summary?.sectionAverages?.[sec.name] ? ` (avg ${run.summary.sectionAverages[sec.name].toFixed(2)})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions for History Item */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleExportExcel(run)}
                      className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                      title="Download Excel Workbook"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportPdf(run)}
                      className="p-2 text-[#7B1113] bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                      title="Download Official PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentRun(run);
                        setActiveTab('wizard');
                        setCurrentStep(4);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      View & Edit
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
