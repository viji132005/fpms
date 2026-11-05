import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Student } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  GraduationCap,
  Plus,
  FileSpreadsheet,
  ArrowUpRight,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  Upload,
  Edit2,
  Trash2,
  Users,
  Phone,
  Mail,
  ShieldAlert,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const { user, department } = useAuth();
  const deptId = department?.id || 'dept-ise';
  const deptCode = department?.code || 'ISE';
  const deptName = department?.name || 'Department';

  // Selected tab: 1, 2, 3, 4, or 'graduated'
  const [activeTab, setActiveTab] = useState<number | 'graduated'>(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // In-app Delete Confirmation (replacing window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manual Add Form
  const [newStudent, setNewStudent] = useState({
    usn: '',
    fullName: '',
    email: '',
    phone: '',
    parentPhone: '',
    departmentId: deptId,
    currentYear: 1,
    currentSemester: 1,
    section: 'Section A',
    admissionCohort: '2025',
  });
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Student Form
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Excel Import States
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Promotion States (Semester-based & Cascade)
  const [promotionMode, setPromotionMode] = useState<'semester' | 'cascade'>('semester');
  const [semesterPlan, setSemesterPlan] = useState<any>(null);
  const [promotionFromYear, setPromotionFromYear] = useState<number>(4);
  const [promotionPlan, setPromotionPlan] = useState<any>(null);
  const [cascadePlan, setCascadePlan] = useState<any>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [cascadeSuccessMsg, setCascadeSuccessMsg] = useState<string | null>(null);
  const [cascadeErrorMsg, setCascadeErrorMsg] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fetchStudents = () => {
    setIsLoading(true);
    let url = `/api/students?departmentId=${encodeURIComponent(deptId)}&`;
    if (activeTab === 'graduated') {
      url += 'status=GRADUATED&';
    } else {
      url += `year=${activeTab}&`;
      if (selectedStatus) {
        url += `status=${selectedStatus}&`;
      }
    }
    if (search) url += `search=${encodeURIComponent(search)}&`;

    authFetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setStudents(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, [activeTab, selectedStatus, search, deptId]);

  const handleOpenAddModal = () => {
    const defaultYr = typeof activeTab === 'number' ? activeTab : 1;
    setNewStudent({
      usn: '',
      fullName: '',
      email: '',
      phone: '',
      parentPhone: '',
      departmentId: deptId,
      currentYear: defaultYr,
      currentSemester: defaultYr * 2 - 1,
      section: 'Section A',
      admissionCohort:
        defaultYr === 1 ? '2025' : defaultYr === 2 ? '2024' : defaultYr === 3 ? '2023' : '2022',
    });
    setAddError(null);
    setShowAddModal(true);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    try {
      const res = await authFetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStudent,
          departmentId: deptId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Failed to add student.');
        return;
      }
      setShowAddModal(false);
      fetchStudents();
    } catch (err: any) {
      setAddError(err.message || 'Network error.');
    }
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent({ ...student });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditError(null);
    try {
      const res = await authFetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usn: editingStudent.usn,
          fullName: editingStudent.fullName,
          email: editingStudent.email,
          phone: editingStudent.phone,
          parentPhone: editingStudent.parentPhone,
          currentYear: editingStudent.currentYear,
          currentSemester: editingStudent.currentSemester,
          section: editingStudent.section,
          status: editingStudent.status,
          admissionCohort: editingStudent.admissionCohort,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to update student.');
        return;
      }
      setShowEditModal(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      setEditError(err.message || 'Network error.');
    }
  };

  const confirmDeleteStudent = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/students/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchStudents();
      } else {
        const data = await res.json();
        setGeneralError(data.error || 'Failed to remove student.');
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Error removing student.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel File Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        if (!buffer) return;
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        setImportRows(jsonData);
      } catch (err) {
        console.error('Failed to parse excel file', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCommitImport = async () => {
    if (importRows.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    const targetYear = typeof activeTab === 'number' ? activeTab : 1;

    try {
      const res = await authFetch('/api/students/import-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: deptId,
          defaultYear: targetYear,
          students: importRows,
        }),
      });
      const result = await res.json();
      setImportResult(result);
      if (result.success) {
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadExcelTemplate = () => {
    const targetYr = typeof activeTab === 'number' ? activeTab : 1;
    const templateData = [
      {
        USN: '4MH24IS010',
        'Full Name': 'Sanjay Kumar R',
        Email: '4mh24is010@mitmysore.in',
        Phone: '9876543210',
        'Parent Phone': '9845112233',
        Year: targetYr,
      },
      {
        USN: '4MH24IS011',
        'Full Name': 'Sneha Rao',
        Email: '4mh24is011@mitmysore.in',
        Phone: '9876543211',
        'Parent Phone': '9845112244',
        Year: targetYr,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
    XLSX.writeFile(wb, `MIT_Mysore_${deptCode}_Student_Template.xlsx`);
  };

  const exportCurrentStudentRoster = (exportAll = false) => {
    let exportUrl = `/api/students?departmentId=${encodeURIComponent(deptId)}&`;
    if (!exportAll) {
      if (activeTab === 'graduated') {
        exportUrl += 'status=GRADUATED&';
      } else {
        exportUrl += `year=${activeTab}&`;
      }
    }

    authFetch(exportUrl)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Student[]) => {
        const exportData = data.map((s, index) => ({
          'Sl. No.': index + 1,
          'USN': s.usn,
          'Full Name': s.fullName,
          'Current Semester': s.currentSemester ? `Semester ${s.currentSemester}` : `Year ${s.currentYear}`,
          'Academic Year': s.status === 'GRADUATED' ? 'Graduated Alumni' : `Year ${s.currentYear}`,
          'Section': s.section || 'Unallotted',
          'Email': s.email,
          'Student Phone': s.phone || 'N/A',
          'Parent Phone': s.parentPhone || 'N/A',
          'Status': s.status,
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        const label = exportAll
          ? 'All_Cohorts_Including_Graduated'
          : activeTab === 'graduated'
          ? 'Graduated_Alumni'
          : `Year_${activeTab}`;
        XLSX.utils.book_append_sheet(wb, ws, `Roster`);
        XLSX.writeFile(wb, `MIT_Mysore_${deptCode}_${label}.xlsx`);
      });
  };

  // Semester Progression & Promotion Preview
  const handleOpenPromotionModal = async (fromYr: number) => {
    setPromotionFromYear(fromYr);
    setPromotionMode('semester');
    setCascadeSuccessMsg(null);
    setCascadeErrorMsg(null);
    setShowPromotionModal(true);
    fetchSemesterProgressionPreview();
    fetchCascadePreview();
    if (fromYr > 1) {
      fetchPromotionPreview(fromYr);
    }
  };

  const fetchSemesterProgressionPreview = async () => {
    try {
      const res = await authFetch('/api/students/promote-semester-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: deptId }),
      });
      if (res.ok) {
        const plan = await res.json();
        setSemesterPlan(plan);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteSemesterProgression = async () => {
    setIsPromoting(true);
    setCascadeErrorMsg(null);
    setCascadeSuccessMsg(null);
    try {
      const res = await authFetch('/api/students/promote-semester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: deptId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCascadeSuccessMsg(
          data.message || 'Semester progression executed successfully for all cohorts!'
        );
        fetchStudents();
        fetchSemesterProgressionPreview();
      } else {
        setCascadeErrorMsg(data.error || 'Semester progression failed.');
      }
    } catch (err: any) {
      console.error(err);
      setCascadeErrorMsg(err.message || 'Network error.');
    } finally {
      setIsPromoting(false);
    }
  };

  const fetchCascadePreview = async () => {
    try {
      const res = await authFetch('/api/students/promote-cascade-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: deptId }),
      });
      if (res.ok) {
        const plan = await res.json();
        setCascadePlan(plan);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteCascadePromotion = async () => {
    setIsPromoting(true);
    setCascadeErrorMsg(null);
    try {
      const res = await authFetch('/api/students/promote-cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: deptId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCascadeSuccessMsg(
          `Annual Cascade Promotion complete! 4th Year graduated (${data.summary?.year4Graduated}), 3rd→4th (${data.summary?.year3To4Promoted}), 2nd→3rd (${data.summary?.year2To3Promoted}), 1st→2nd (${data.summary?.year1To2Promoted}). 1st Year is now empty and ready for incoming batch.`
        );
        fetchStudents();
        fetchCascadePreview();
      } else {
        setCascadeErrorMsg(data.error || 'Cascade promotion failed.');
      }
    } catch (err: any) {
      console.error(err);
      setCascadeErrorMsg(err.message || 'Network error.');
    } finally {
      setIsPromoting(false);
    }
  };

  const fetchPromotionPreview = async (fromYear: number) => {
    try {
      const res = await authFetch('/api/students/promote-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: deptId, fromYear }),
      });
      const plan = await res.json();
      setPromotionPlan(plan);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecutePromotion = async () => {
    if (promotionPlan?.collision) return;
    setIsPromoting(true);
    setCascadeErrorMsg(null);
    try {
      const res = await authFetch('/api/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: deptId,
          fromYear: promotionFromYear,
        }),
      });
      if (res.ok) {
        setShowPromotionModal(false);
        fetchStudents();
      } else {
        const data = await res.json();
        setCascadeErrorMsg(data.error || 'Promotion blocked.');
      }
    } catch (err: any) {
      console.error(err);
      setCascadeErrorMsg(err.message || 'Error executing promotion.');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Student Information & Cohort Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-[#7B1113] border border-rose-200">
              Dept: {deptCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department student database, structured year-wise records, parent phone records, and strictly sequential promotions.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start">
          <button
            onClick={() => exportCurrentStudentRoster(false)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            title="Download active view in Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Active Tab</span>
          </button>
          <button
            onClick={() => exportCurrentStudentRoster(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            title="Download all cohorts including graduated alumni"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Export All Cohorts (Incl. Alumni)</span>
          </button>
        </div>
      </div>

      {generalError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{generalError}</span>
          </div>
          <button
            onClick={() => setGeneralError(null)}
            className="text-rose-400 hover:text-rose-700 text-sm font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Structural Year Selector Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#7B1113]" />
            <span>Select Academic Cohort / Year:</span>
          </div>

          {/* Action buttons configured for the selected year */}
          {user?.role === 'ADMIN' && (
            <div className="flex flex-wrap items-center gap-2">
              {activeTab !== 'graduated' && (
                <button
                  onClick={handleOpenAddModal}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Student (Year {activeTab})</span>
                </button>
              )}

              {activeTab !== 'graduated' && (
                <button
                  onClick={() => {
                    setImportRows([]);
                    setImportFileName('');
                    setImportResult(null);
                    setShowImportModal(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import Excel to Year {activeTab}</span>
                </button>
              )}

              <button
                onClick={() =>
                  handleOpenPromotionModal(typeof activeTab === 'number' ? activeTab : 4)
                }
                className="px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-700" />
                <span>Controlled Cohort Promotion</span>
              </button>
            </div>
          )}
        </div>

        {/* 5 Structural Boxes: 1st, 2nd, 3rd, 4th, Graduated Alumni */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 1, label: '1st Year', sem: 'Sem I & II' },
            { id: 2, label: '2nd Year', sem: 'Sem III & IV' },
            { id: 3, label: '3rd Year', sem: 'Sem V & VI' },
            { id: 4, label: '4th Year', sem: 'Sem VII & VIII' },
            { id: 'graduated', label: 'Previous Graduated', sem: 'Alumni Cohorts' },
          ].map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSelectedStatus('');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#7B1113]/5 border-[#7B1113] text-[#7B1113] shadow-sm ring-1 ring-[#7B1113]'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{item.label}</span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                      isSelected
                        ? 'bg-[#7B1113] border-[#7B1113] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <CheckCircle className="w-3 h-3" />}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">{item.sem}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab !== 'graduated' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Status Filter:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none text-xs"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DETAINED">DETAINED</option>
                {activeTab === 4 && <option value="GRADUATED">GRADUATED</option>}
              </select>
            </div>
          )}

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{students.length}</strong> record(s)
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by USN, Name, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
          />
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-14">Sl. No.</th>
                <th className="py-3 px-4">USN & Candidate</th>
                <th className="py-3 px-3 text-center">Current Sem & Year</th>
                <th className="py-3 px-3 text-center">Section</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Student Phone</th>
                <th className="py-3 px-4 font-bold text-slate-700">Parent Phone No</th>
                <th className="py-3 px-4 text-center">Status</th>
                {user?.role === 'ADMIN' && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No students found in this cohort.
                  </td>
                </tr>
              ) : (
                students.map((student, index) => {
                  const isGraduated = student.status === 'GRADUATED';
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {index + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{student.fullName}</div>
                        <div className="text-[11px] text-[#7B1113] font-mono font-bold">
                          {student.usn}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isGraduated ? (
                          <span className="inline-flex px-2 py-0.5 rounded font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                            Graduated Alumni
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-800 text-xs">
                              Semester {student.currentSemester || (student.currentYear * 2 - 1)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Year {student.currentYear}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                          {student.section || 'Unallotted'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {student.email}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        {student.phone || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-900 bg-amber-50/30">
                        {student.parentPhone ? (
                          <span className="text-slate-800">{student.parentPhone}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Not recorded</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isGraduated
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : student.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>

                      {user?.role === 'ADMIN' && (
                        <td className="py-3 px-4 text-right">
                          {isGraduated ? (
                            <span className="text-[11px] text-slate-400 italic font-medium">
                              Alumni (Archived)
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(student)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                title="Edit Student Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(student)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                title="Remove Student Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Add Student to Year {newStudent.currentYear}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    University Seat Number (USN)
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.usn}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, usn: e.target.value.toUpperCase() })
                    }
                    placeholder="4MH24IS001"
                    className="w-full px-3 py-1.5 font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={newStudent.section}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, section: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                    <option value="Section C">Section C</option>
                    <option value="Section D">Section D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={newStudent.currentYear}
                    onChange={(e) => {
                      const yr = Number(e.target.value);
                      setNewStudent({
                        ...newStudent,
                        currentYear: yr,
                        currentSemester: yr * 2 - 1,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={newStudent.currentSemester}
                    onChange={(e) => {
                      const sem = Number(e.target.value);
                      setNewStudent({
                        ...newStudent,
                        currentSemester: sem,
                        currentYear: Math.ceil(sem / 2),
                      });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Student Name</label>
                <input
                  type="text"
                  required
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                  placeholder="e.g. Aditi Sharma"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Email</label>
                <input
                  type="email"
                  required
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="4mh24is001@mitmysore.in"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Phone</label>
                  <input
                    type="tel"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Parent Phone No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newStudent.parentPhone}
                    onChange={(e) => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                    placeholder="9845012345"
                    className="w-full px-3 py-1.5 border border-amber-300 bg-amber-50/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-900">Edit Student Record</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">USN</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.usn}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, usn: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-1.5 font-mono uppercase border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={editingStudent.section || 'Section A'}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, section: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                    <option value="Section C">Section C</option>
                    <option value="Section D">Section D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={editingStudent.currentYear}
                    onChange={(e) => {
                      const yr = Number(e.target.value);
                      setEditingStudent({
                        ...editingStudent,
                        currentYear: yr,
                        currentSemester: yr * 2 - 1,
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={editingStudent.currentSemester || (editingStudent.currentYear * 2 - 1)}
                    onChange={(e) => {
                      const sem = Number(e.target.value);
                      setEditingStudent({
                        ...editingStudent,
                        currentSemester: sem,
                        currentYear: Math.ceil(sem / 2),
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.fullName}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, fullName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editingStudent.email}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, email: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Phone</label>
                  <input
                    type="tel"
                    value={editingStudent.phone || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, phone: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Parent Phone No</label>
                  <input
                    type="tel"
                    value={editingStudent.parentPhone || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, parentPhone: e.target.value })
                    }
                    placeholder="9845012345"
                    className="w-full px-3 py-1.5 border border-amber-300 bg-amber-50/20 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingStudent.status}
                  disabled={editingStudent.status === 'GRADUATED'}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, status: e.target.value as any })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DETAINED">DETAINED (Allows Retest / Re-enrollment)</option>
                  {editingStudent.currentYear === 4 && (
                    <option value="GRADUATED">GRADUATED (Alumni)</option>
                  )}
                </select>
                {editingStudent.status === 'GRADUATED' && (
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    Graduated alumni records are permanently archived and status cannot be toggled.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm"
                >
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Import Excel to Year {typeof activeTab === 'number' ? activeTab : 1}
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Download Template</div>
                  <div className="text-[11px] text-slate-500">
                    Includes USN, Full Name, Email, Phone, Parent Phone.
                  </div>
                </div>
                <button
                  onClick={downloadExcelTemplate}
                  className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100"
                >
                  Template .XLSX
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Excel File</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#7B1113] file:text-white hover:file:bg-[#600d0f]"
                />
              </div>

              {importRows.length > 0 && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                  Detected {importRows.length} valid student rows in {importFileName}. Ready to import!
                </div>
              )}

              {importResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs ${
                    importResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {importResult.message ||
                    `Successfully imported ${importResult.importedCount} student(s)!`}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={importRows.length === 0 || isImporting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isImporting ? 'Importing...' : 'Commit Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Cohort Promotion Modal */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-[#7B1113]" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Department Student Progression & Promotion
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Synchronous VTU semester progression across all cohorts and annual graduation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPromotionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPromotionMode('semester')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer ${
                  promotionMode === 'semester'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                VTU Semester Progression (All Batches)
              </button>
              <button
                type="button"
                onClick={() => setPromotionMode('cascade')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer ${
                  promotionMode === 'cascade'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annual Cascade (Year 4 → Alumni)
              </button>
            </div>

            {cascadeSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Promotion / Progression Succeeded!</div>
                  <div className="text-[11px] mt-0.5">{cascadeSuccessMsg}</div>
                </div>
              </div>
            )}

            {cascadeErrorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Progression Blocked / Error</div>
                  <div className="text-[11px] mt-0.5">{cascadeErrorMsg}</div>
                </div>
              </div>
            )}

            {/* TAB 1: VTU SEMESTER PROGRESSION (SIMULTANEOUS) */}
            {promotionMode === 'semester' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-950 space-y-1.5">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#7B1113]">
                      <GraduationCap className="w-4 h-4" />
                      Detected Cycle: {semesterPlan?.cycle === 'ODD' ? 'ODD to EVEN Semesters' : 'EVEN to ODD + Graduation'}
                    </span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-[#7B1113]">
                      {semesterPlan?.eligibleStudentsCount ?? 0} Eligible Students
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    VTU examinations run simultaneously for all semesters. When progressing, all active cohorts advance concurrently:
                    {semesterPlan?.cycle === 'ODD'
                      ? ' Semesters 1, 3, 5, 7 advance to Semesters 2, 4, 6, 8.'
                      : ' Semesters 2, 4, 6 advance to 3, 5, 7, and 8th semester seniors become Graduated Alumni.'}
                  </p>
                </div>

                {/* Progression Stages List */}
                <div className="space-y-2">
                  {semesterPlan?.moves?.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#7B1113] text-white flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">
                            {m.action}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {m.toSemester === 9
                              ? 'Status updated to GRADUATED alumni (permanently archived)'
                              : `From Year ${m.fromYear} to Year ${m.toYear}`}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-200 text-slate-800">
                        {m.studentCount} students
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPromotionModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isPromoting || !semesterPlan || semesterPlan.eligibleStudentsCount === 0}
                    onClick={handleExecuteSemesterProgression}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>
                      {isPromoting
                        ? 'Advancing Cohorts...'
                        : `Execute Semester Progression (${semesterPlan?.cycle || 'ODD'} → ${semesterPlan?.cycle === 'ODD' ? 'EVEN' : 'ODD'})`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ANNUAL CASCADE PROMOTION */}
            {promotionMode === 'cascade' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-blue-950">
                    <ShieldAlert className="w-4 h-4 text-blue-700" />
                    <span>Institutional Reverse Cascade (Collision-Free):</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Undergraduate progression executes in reverse senior order so each incoming cohort moves into an empty year without collisions:
                  </p>
                </div>

                {/* 4 Interactive Stages Preview */}
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                        1
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">
                          Year 4 → Graduated Alumni
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Graduating seniors move to alumni, leaving 4th Year empty
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-200 text-slate-800">
                      {cascadePlan?.year4?.graduating ?? 0} students
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                        2
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">
                          Year 3 → Year 4
                        </div>
                        <div className="text-[10px] text-slate-500">
                          3rd year juniors advance into the newly vacated 4th year
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-200 text-slate-800">
                      {cascadePlan?.year3?.promotingToYear4 ?? 0} students
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                        3
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">
                          Year 2 → Year 3
                        </div>
                        <div className="text-[10px] text-slate-500">
                          2nd year sophomores advance into the newly vacated 3rd year
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-200 text-slate-800">
                      {cascadePlan?.year2?.promotingToYear3 ?? 0} students
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                        4
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">
                          Year 1 → Year 2
                        </div>
                        <div className="text-[10px] text-slate-500">
                          1st year freshmen advance into the newly vacated 2nd year
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-200 text-slate-800">
                      {cascadePlan?.year1?.promotingToYear2 ?? 0} students
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPromotionModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isPromoting}
                    onClick={handleExecuteCascadePromotion}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>{isPromoting ? 'Processing Cascade...' : 'Execute Annual Cascade Promotion'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal (no window.confirm) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Remove Student Record?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to remove <strong className="text-slate-800">{deleteTarget.fullName}</strong> ({deleteTarget.usn})?
              This will also unassign any active mentor relationships.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteStudent}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
