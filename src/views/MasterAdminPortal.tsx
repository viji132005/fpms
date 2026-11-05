import React, { useEffect, useState } from 'react';
import { Department, StaffProfile } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Building2,
  Plus,
  Users,
  GraduationCap,
  UserCheck,
  X,
  UserX,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  RotateCcw,
  Search,
  Sparkles,
  Download,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  Power,
  FileText,
} from 'lucide-react';

interface HandoverCardData {
  departmentName: string;
  departmentCode: string;
  hodName: string;
  email: string;
  temporaryPassword: string;
  role: string;
  loginUrl: string;
  issuedAt: string;
  instructions: string;
}

export const MasterAdminPortal: React.FC = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyList, setFacultyList] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'DEPARTMENTS' | 'CREDENTIALS'>('DEPARTMENTS');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showHodModal, setShowHodModal] = useState(false);
  const [selectedDeptForHod, setSelectedDeptForHod] = useState<Department | null>(null);
  const [selectedHodUserId, setSelectedHodUserId] = useState<string>('');
  const [resetConfirmDept, setResetConfirmDept] = useState<Department | null>(null);

  // Credential Handover Card Modal
  const [handoverCard, setHandoverCard] = useState<HandoverCardData | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Form State for Provisioning / Adding
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    hodName: '',
    hodEmail: '',
    hodPhone: '',
    hodPassword: '',
    hodDesignation: 'Professor & Head of Department',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchDepartments = () => {
    setIsLoading(true);
    authFetch('/api/departments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch((err) => console.warn(err))
      .finally(() => setIsLoading(false));
  };

  const fetchFaculty = () => {
    authFetch('/api/staff?type=teaching')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setFacultyList(data);
      })
      .catch((err) => console.warn(err));
  };

  useEffect(() => {
    fetchDepartments();
    fetchFaculty();
  }, []);

  // Handle department code change with auto-generation of suggested credentials
  const handleCodeChange = (rawCode: string) => {
    const cleanCode = rawCode.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const suggestedEmail = cleanCode ? `hod.${cleanCode.toLowerCase()}@mitmysore.in` : '';
    const suggestedPassword = cleanCode ? `mitm@${cleanCode.toLowerCase()}2026` : '';
    setDeptForm((prev) => ({
      ...prev,
      code: cleanCode,
      hodEmail: prev.hodEmail || suggestedEmail,
      hodPassword: prev.hodPassword || suggestedPassword,
    }));
  };

  // Submit Department Creation & Provisioning
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingDept) {
        // Edit existing department
        const res = await authFetch(`/api/departments/${editingDept.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deptForm.name,
            code: deptForm.code,
            description: deptForm.description,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || 'Failed to update department.');
          setIsSubmitting(false);
          return;
        }

        setEditingDept(null);
        setSuccessBanner(`Department "${deptForm.name}" (${deptForm.code}) updated successfully!`);
      } else {
        // Provision new department with admin credentials
        const res = await authFetch('/api/departments/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deptForm),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || 'Failed to provision department.');
          setIsSubmitting(false);
          return;
        }

        setShowAddModal(false);
        setHandoverCard(data.handoverCard);
        setSuccessBanner(
          `Department "${data.department.name}" (${data.department.code}) provisioned successfully with Authorized Department Admin credentials!`
        );
      }

      setDeptForm({
        name: '',
        code: '',
        description: '',
        hodName: '',
        hodEmail: '',
        hodPhone: '',
        hodPassword: '',
        hodDesignation: 'Professor & Head of Department',
      });
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Credentials for Department Admin
  const confirmResetCredentials = async () => {
    if (!resetConfirmDept) return;
    const dept = resetConfirmDept;
    setResetConfirmDept(null);

    try {
      const res = await authFetch(`/api/departments/${dept.id}/reset-hod-credentials`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to reset credentials.');
        return;
      }

      setHandoverCard(data.handoverCard);
      setSuccessBanner(
        `New credentials generated for ${dept.name} (${dept.code}). Hand over the credential slip to the branch admin.`
      );
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || 'Network error.');
    }
  };

  // Assign or Reassign HOD from existing faculty
  const handleAssignHod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptForHod) return;
    setFormError(null);

    try {
      const res = await authFetch(`/api/departments/${selectedDeptForHod.id}/assign-hod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hodUserId: selectedHodUserId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to assign HOD.');
        return;
      }
      setShowHodModal(false);
      setSelectedDeptForHod(null);
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || 'Network error.');
    }
  };

  const startEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      hodName: dept.hod?.fullName || '',
      hodEmail: dept.hod?.email || '',
      hodPhone: dept.hod?.phone || '',
      hodPassword: '',
      hodDesignation: dept.hod?.designation || 'Professor & Head of Department',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const copyHandoverCard = () => {
    if (!handoverCard) return;
    const text = `
=====================================================
MAHARAJA INSTITUTE OF TECHNOLOGY, MYSORE (MIT MYSORE)
FACULTY PORTFOLIO MANAGEMENT SYSTEM (FPMS)
AUTHORIZED DEPARTMENT ADMINISTRATOR CREDENTIAL SLIP
=====================================================
Department: ${handoverCard.departmentName} (${handoverCard.departmentCode})
Authorized Admin / HOD: ${handoverCard.hodName}
Role: ${handoverCard.role}
Institutional Login Email: ${handoverCard.email}
Initial Password: ${handoverCard.temporaryPassword}
Official Portal URL: ${handoverCard.loginUrl}
Issued At: ${handoverCard.issuedAt}
Notice: ${handoverCard.instructions}
=====================================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const downloadHandoverSlip = () => {
    if (!handoverCard) return;
    const text = `
=====================================================
MAHARAJA INSTITUTE OF TECHNOLOGY, MYSORE (MIT MYSORE)
FACULTY PORTFOLIO MANAGEMENT SYSTEM (FPMS)
AUTHORIZED DEPARTMENT ADMINISTRATOR CREDENTIAL SLIP
=====================================================
Department: ${handoverCard.departmentName} (${handoverCard.departmentCode})
Authorized Admin / HOD: ${handoverCard.hodName}
Role: ${handoverCard.role}
Institutional Login Email: ${handoverCard.email}
Initial Password: ${handoverCard.temporaryPassword}
Official Portal URL: ${handoverCard.loginUrl}
Issued At: ${handoverCard.issuedAt}
Notice: ${handoverCard.instructions}
=====================================================
    `.trim();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FPMS_Credentials_${handoverCard.departmentCode}_${handoverCard.hodName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredDepts = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hod?.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalFacultyCount = departments.reduce(
    (acc, d) => acc + (d.stats?.teachingFacultyCount || 0),
    0
  );
  const totalStudentsCount = departments.reduce(
    (acc, d) => acc + (d.stats?.activeStudentsCount || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Master Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-xl p-6 text-white shadow-md border border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              MASTER ADMINISTRATOR PORTAL
            </span>
            <span className="text-xs text-amber-200/80 font-mono">
              {user?.email}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            Institutional Department Governance & Admin Delegation
          </h1>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Centralized authority to create college branches, configure official department names and short codes, issue scoped administrator credentials for each branch, and monitor institutional capacity.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingDept(null);
            setDeptForm({
              name: '',
              code: '',
              description: '',
              hodName: '',
              hodEmail: '',
              hodPhone: '',
              hodPassword: '',
              hodDesignation: 'Professor & Head of Department',
            });
            setFormError(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-lg shadow-sm flex items-center gap-2 transition-all shrink-0 self-start md:self-center"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>Add / Provision Department</span>
        </button>
      </div>

      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Total Departments</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {departments.length}
            </div>
          </div>
          <div className="p-2.5 bg-rose-50 text-[#7B1113] rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Configured Admins</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
              {departments.filter((d) => d.hodId).length}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Affiliated Faculty</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {totalFacultyCount}
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Enrolled Students</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {totalStudentsCount}
            </div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('DEPARTMENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'DEPARTMENTS'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departments ({departments.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('CREDENTIALS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'CREDENTIALS'
                ? 'bg-[#7B1113] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Branch Admins Directory ({departments.filter((d) => d.hod).length})</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search branch name, code (ISE, CSE), or HOD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
          />
        </div>
      </div>

      {/* VIEW 1: DEPARTMENTS GRID */}
      {activeSubTab === 'DEPARTMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              Loading institutional departments...
            </div>
          ) : filteredDepts.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No departments found matching &quot;{searchQuery}&quot;</p>
              <p className="text-slate-400 mt-1">Click &quot;Add / Provision Department&quot; above to create a new branch.</p>
            </div>
          ) : (
            filteredDepts.map((dept) => (
              <div
                key={dept.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-amber-300 transition-colors"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-[#7B1113] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {dept.code}
                      </span>
                      <h2 className="text-sm font-bold text-slate-900 mt-2 leading-snug">
                        {dept.name}
                      </h2>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        dept.active ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                      }`}
                    >
                      {dept.active ? 'Active Branch' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                    {dept.description || `Department of ${dept.name} established at MIT Mysore.`}
                  </p>

                  {/* Branch Administrator Status */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Authorized Branch Admin
                      </span>
                      {dept.hod && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          ACTIVE ACCOUNT
                        </span>
                      )}
                    </div>

                    {dept.hod ? (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>{dept.hod.fullName}</span>
                          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono">
                          {dept.hod.email}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {dept.hod.designation || 'Head of Department'}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-amber-700 py-1">
                        <span>No administrator credentials assigned</span>
                        <UserX className="w-4 h-4 text-amber-500 shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-slate-100">
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="font-bold text-slate-800 tabular-nums">
                        {dept.stats?.teachingFacultyCount || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-[#7B1113]" />
                        <span>Faculty Staff</span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="font-bold text-slate-800 tabular-nums">
                        {dept.stats?.activeStudentsCount || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                        <GraduationCap className="w-3 h-3 text-amber-600" />
                        <span>Students</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Master Admin Controls Footer */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setResetConfirmDept(dept)}
                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 transition-colors"
                    title="Generate new temporary password slip"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Reset Credentials</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditDept(dept)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                      title="Edit department name and short code"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDeptForHod(dept);
                        setSelectedHodUserId(dept.hod?.id || '');
                        setShowHodModal(true);
                      }}
                      className="text-[11px] font-semibold text-[#7B1113] hover:text-[#600d0f] transition-colors"
                    >
                      {dept.hod ? 'Reassign HOD' : 'Assign HOD'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: BRANCH ADMINS CREDENTIALS DIRECTORY */}
      {activeSubTab === 'CREDENTIALS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Authorized Department Administrators & HOD Directory
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All institutional login credentials issued by the Master Administrator.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Department Name</th>
                  <th className="py-2.5 px-4">Authorized Admin</th>
                  <th className="py-2.5 px-4">Official Email</th>
                  <th className="py-2.5 px-4">Contact Phone</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#7B1113]">
                      {d.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {d.name}
                    </td>
                    <td className="py-3 px-4">
                      {d.hod ? (
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{d.hod.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-amber-700 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {d.hod?.email || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {d.hod?.phone || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setResetConfirmDept(d)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROVISION / EDIT DEPARTMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 my-8 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
                  <Building2 className="w-5 h-5 text-[#7B1113]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingDept ? 'Edit Department Profile' : 'Add Department & Generate Admin Credentials'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {editingDept
                      ? 'Customize department full name and short form code.'
                      : 'Master Admin branch creation and administrator credential provisioning.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDepartment} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                  1. Department Academic Profile
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Information Science and Engineering"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Short Form (Code) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. ISE"
                      value={deptForm.code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department Description / Vision
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of department..."
                    value={deptForm.description}
                    onChange={(e) =>
                      setDeptForm({ ...deptForm, description: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              {!editingDept && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/80 space-y-3">
                  <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] block">
                    2. Authorized Department Admin Credentials (HOD)
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        HOD Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Sharath Kumar Y H"
                        value={deptForm.hodName}
                        onChange={(e) =>
                          setDeptForm({ ...deptForm, hodName: e.target.value })
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Official Login Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. hod.ise@mitmysore.in"
                        value={deptForm.hodEmail}
                        onChange={(e) =>
                          setDeptForm({ ...deptForm, hodEmail: e.target.value })
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Initial Temporary Password
                      </label>
                      <input
                        type="text"
                        value={deptForm.hodPassword}
                        onChange={(e) =>
                          setDeptForm({ ...deptForm, hodPassword: e.target.value })
                        }
                        placeholder="e.g. mitm@ise2026"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 9880011223"
                        value={deptForm.hodPhone}
                        onChange={(e) =>
                          setDeptForm({ ...deptForm, hodPhone: e.target.value })
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Saving...'
                      : editingDept
                      ? 'Update Department'
                      : 'Provision Department & Generate Slip'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL CREDENTIAL HANDOVER SLIP MODAL */}
      {handoverCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-amber-300 max-w-lg w-full p-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl">
                  <KeyRound className="w-6 h-6 text-[#7B1113]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Official Handover Document
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900 mt-1">
                    Department Administrator Credentials Slip
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setHandoverCard(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Credential Slip Design */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans text-[11px] font-semibold">Department:</span>
                <span className="font-bold text-slate-900 font-sans">
                  {handoverCard.departmentName} ({handoverCard.departmentCode})
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans text-[11px] font-semibold">Authorized Admin / HOD:</span>
                <span className="font-bold text-slate-900 font-sans">
                  {handoverCard.hodName}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans text-[11px] font-semibold">Assigned Role:</span>
                <span className="text-emerald-700 font-bold font-sans">
                  {handoverCard.role}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans text-[11px] font-semibold">Login Email ID:</span>
                <span className="font-bold text-[#7B1113]">{handoverCard.email}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans text-[11px] font-semibold">Initial Password:</span>
                <span className="font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                  {handoverCard.temporaryPassword}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans text-[11px] font-semibold">Portal Login URL:</span>
                <span className="text-slate-600 text-[11px]">{handoverCard.loginUrl}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 italic">
              {handoverCard.instructions}
            </p>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyHandoverCard}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Slip'}</span>
                </button>

                <button
                  type="button"
                  onClick={downloadHandoverSlip}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4 text-slate-700" />
                  <span>Download (.txt)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setHandoverCard(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESET CREDENTIALS MODAL */}
      {resetConfirmDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm mb-2">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <RotateCcw className="w-4 h-4" />
              </div>
              <span>Regenerate Credentials</span>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Regenerate administrator credentials for <strong>{resetConfirmDept.name} ({resetConfirmDept.code})</strong>? Existing active sessions will require this newly generated password.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetConfirmDept(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetCredentials}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm"
              >
                Confirm & Generate Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN HOD MODAL */}
      {showHodModal && selectedDeptForHod && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Reassign Head of Department — {selectedDeptForHod.code}
              </h2>
              <button
                onClick={() => setShowHodModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-rose-50 text-rose-800 text-xs rounded border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleAssignHod} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Teaching Faculty to designate as HOD:
                </label>
                <select
                  value={selectedHodUserId}
                  onChange={(e) => setSelectedHodUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                >
                  <option value="">— Unassign Current HOD —</option>
                  {facultyList
                    .filter((f: any) => f.user?.departmentId === selectedDeptForHod.id)
                    .map((fac) => (
                      <option key={fac.userId} value={fac.userId}>
                        {fac.fullName} ({fac.designation}) — {fac.staffId}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Faculty in this department will be granted departmental administration rights.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHodModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
