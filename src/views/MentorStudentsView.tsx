import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { generateCollegeAllotmentPdf } from '../utils/allotmentPdf.ts';
import {
  Network,
  GraduationCap,
  Mail,
  Phone,
  Download,
  FileSpreadsheet,
  BookOpen,
  Edit3,
  Check,
  Save,
  Layers,
  Filter,
} from 'lucide-react';

export const MentorStudentsView: React.FC = () => {
  const { user, profile, department } = useAuth();
  const deptCode = department?.code || 'ISE';
  const deptName = department?.name || 'Information Science & Engineering';

  const [mentees, setMentees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYearFilter, setSelectedYearFilter] = useState<'ALL' | number>('ALL');

  // Digital notebook remarks per student (student USN -> remarks string)
  const [remarks, setRemarks] = useState<{ [usn: string]: string }>({});
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null);

  useEffect(() => {
    // Load stored remarks from localStorage
    try {
      const saved = localStorage.getItem(`fpms_mentee_remarks_${user?.id}`);
      if (saved) setRemarks(JSON.parse(saved));
    } catch {}

    authFetch('/api/mentor-allocation/my-students')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setMentees(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  const saveRemark = (usn: string, text: string) => {
    const updated = { ...remarks, [usn]: text };
    setRemarks(updated);
    try {
      localStorage.setItem(`fpms_mentee_remarks_${user?.id}`, JSON.stringify(updated));
    } catch {}
    setEditingRemarks(null);
  };

  const countYear = (y: number) => mentees.filter((m) => m.studentYear === y).length;
  const countYear2 = countYear(2);

  if (user?.role === 'NON_TEACHING' || profile?.isTeachingFaculty === false) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
          <Network className="w-6 h-6 text-slate-400" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Student Mentorship Not Applicable</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          As per institutional academic policy, non-teaching faculty and technical staff are not assigned student mentoring cohorts.
        </p>
      </div>
    );
  }
  const countYear3 = countYear(3);
  const countYear4 = countYear(4);
  const countYear1 = countYear(1);

  const displayedMentees = mentees.filter((m) => {
    if (selectedYearFilter === 'ALL') return true;
    return m.studentYear === selectedYearFilter;
  });

  const handleExport = () => {
    if (displayedMentees.length === 0) return;
    const rows = displayedMentees.map((m, idx) => ({
      'Sl No': idx + 1,
      'USN': m.student.usn,
      'Student Full Name': m.student.fullName,
      'Academic Year': m.academicYear,
      'Cohort Year': `Year ${m.studentYear}`,
      'Email': m.student.email,
      'Student Phone': m.student.phone || 'N/A',
      'Parent Phone': m.student.parentPhone || 'N/A',
      'Status': m.student.status,
      'Mentor Remarks': remarks[m.student.usn] || 'Regular attendance',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'My_Mentees');
    XLSX.writeFile(
      wb,
      `MIT_Mysore_${deptCode}_Mentees_${profile?.fullName || 'Faculty'}_${selectedYearFilter === 'ALL' ? 'All_Years' : `Year_${selectedYearFilter}`}.xlsx`
    );
  };

  const handleDownloadOfficialPdf = async () => {
    if (mentees.length === 0) return;

    // Group this faculty's mentees into the structured PDF format
    const group = {
      mentorName: profile?.fullName || user?.email || 'Faculty Mentor',
      staffId: profile?.staffId || 'MITM-FACULTY',
      students: displayedMentees.map((m) => ({
        usn: m.student.usn,
        fullName: m.student.fullName,
        currentYear: m.studentYear,
        parentPhone: m.student.parentPhone,
      })),
    };

    try {
      const doc = await generateCollegeAllotmentPdf({
        departmentName: deptName,
        deptCode: deptCode,
        academicYear: mentees[0]?.academicYear || '2026-27',
        studentYear: selectedYearFilter === 'ALL' ? 0 : Number(selectedYearFilter),
        groups: [group],
      });

      doc.save(
        `MIT_Mysore_${deptCode}_Mentee_List_${profile?.fullName || 'Faculty'}_${selectedYearFilter === 'ALL' ? 'Combined_Batches' : `Year_${selectedYearFilter}`}.pdf`
      );
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-[#7B1113]" />
            <span>Assigned Student Mentee Digital Notebook</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official student mentees allocated to {profile?.fullName || user?.email} · Separated by 2nd, 3rd, and 4th year batches.
          </p>
        </div>

        {mentees.length > 0 && (
          <div className="flex items-center gap-2 self-start flex-wrap">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              title="Download Excel file"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export (.xlsx)</span>
            </button>
            <button
              onClick={handleDownloadOfficialPdf}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              title="Download official college format PDF matching MIT Mysore letterhead"
            >
              <Download className="w-4 h-4" />
              <span>Download Official Allotment (.pdf)</span>
            </button>
          </div>
        )}
      </div>

      {/* Cohort Year Tabs (2nd, 3rd, 4th Year) */}
      {mentees.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
          <button
            onClick={() => setSelectedYearFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              selectedYearFilter === 'ALL'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Mentees</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedYearFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {mentees.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedYearFilter(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              selectedYearFilter === 2
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>2nd Year</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedYearFilter === 2 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {countYear2}
            </span>
          </button>

          <button
            onClick={() => setSelectedYearFilter(3)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              selectedYearFilter === 3
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>3rd Year</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedYearFilter === 3 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {countYear3}
            </span>
          </button>

          <button
            onClick={() => setSelectedYearFilter(4)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              selectedYearFilter === 4
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>4th Year</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedYearFilter === 4 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {countYear4}
            </span>
          </button>

          {countYear1 > 0 && (
            <button
              onClick={() => setSelectedYearFilter(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                selectedYearFilter === 1
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>1st Year</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedYearFilter === 1 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                }`}
              >
                {countYear1}
              </span>
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading assigned mentees...</div>
      ) : mentees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          <Network className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No students currently allocated to your mentor roster.</p>
          <p className="text-slate-400 mt-1">
            Once administration confirms and publishes the department mentor allocation, your allocated student mentees will automatically reflect here.
          </p>
        </div>
      ) : displayedMentees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700">No mentees in the selected cohort year.</p>
          <p className="text-slate-400 mt-1">Switch to "All Mentees" or another year tab above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-800">
              Showing: <span className="text-[#7B1113] tabular-nums">{displayedMentees.length} Mentees</span>
              {selectedYearFilter !== 'ALL' && ` (Year ${selectedYearFilter})`}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Academic Year: {mentees[0]?.academicYear || '2026-27'} · Dept: {deptCode}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-14">Sl. No.</th>
                  <th className="py-3 px-4">USN & Candidate</th>
                  <th className="py-3 px-3 text-center">Cohort Year</th>
                  <th className="py-3 px-4">Student Email</th>
                  <th className="py-3 px-4">Student Phone</th>
                  <th className="py-3 px-4 font-bold text-slate-900 bg-amber-50/50">
                    Parent Phone No
                  </th>
                  <th className="py-3 px-4">Digital Notebook / Remarks</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {displayedMentees.map(({ student, academicYear, studentYear }, idx) => {
                  const currentRemark = remarks[student.usn] || '';
                  const isEditing = editingRemarks === student.usn;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{student.fullName}</div>
                        <div className="font-mono text-[11px] font-bold text-[#7B1113]">
                          {student.usn}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        Year {studentYear}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {student.email}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        {student.phone || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-900 bg-amber-50/30">
                        {student.parentPhone ? (
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Phone className="w-3 h-3 text-amber-600" />
                            <span>{student.parentPhone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not recorded</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              defaultValue={currentRemark}
                              id={`remark-${student.usn}`}
                              placeholder="e.g. Needs extra lab hours..."
                              className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#7B1113] w-48"
                            />
                            <button
                              onClick={() => {
                                const el = document.getElementById(
                                  `remark-${student.usn}`
                                ) as HTMLInputElement;
                                saveRemark(student.usn, el?.value || '');
                              }}
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingRemarks(student.usn)}
                            className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 group"
                            title="Click to edit remark"
                          >
                            <span className="text-[11px] italic">
                              {currentRemark || 'Click to add note / remark'}
                            </span>
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#7B1113]" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
