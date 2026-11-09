import React, { useEffect, useState } from 'react';
import { Department } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Building2,
  Plus,
  UserCheck,
  X,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Search,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  User,
  Sliders,
} from 'lucide-react';

interface HandoverCardData {
  departmentName: string;
  departmentCode: string;
  adminName: string;
  email: string;
  temporaryPassword: string;
  role: string;
  loginUrl: string;
  issuedAt: string;
  instructions: string;
}

export const DepartmentManagement: React.FC = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);



  // Credential Handover Card Modal
  const [handoverCard, setHandoverCard] = useState<HandoverCardData | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Department Admin Credentials Change Modal
  const [showDeptCredModal, setShowDeptCredModal] = useState(false);
  const [targetDeptForCreds, setTargetDeptForCreds] = useState<Department | null>(null);
  const [deptAdminCredForm, setDeptAdminCredForm] = useState({
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminStaffId: '',
  });

  // Edit Department Form (Name & Shortcut)
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    code: '',
    active: true,
  });

  // Provision Form State (STRICT: Clean, reliable, no unnecessary fields)
  const [provisionForm, setProvisionForm] = useState({
    name: '',
    code: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: 'mitm123',
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

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCodeChange = (rawCode: string) => {
    const cleanCode = rawCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const suggestedEmail = cleanCode ? `${cleanCode.toLowerCase()}.admin@mitmysore.in` : '';
    const suggestedPassword = cleanCode ? `mitm@${cleanCode.toLowerCase()}2026` : '';
    setProvisionForm((prev) => ({
      ...prev,
      code: cleanCode,
      adminEmail: prev.adminEmail || suggestedEmail,
      adminPassword: prev.adminPassword || suggestedPassword,
    }));
  };

  // Submit Department Provisioning
  const handleProvisionDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await authFetch('/api/departments/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provisionForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to provision department.');
        setIsSubmitting(false);
        return;
      }

      setShowProvisionModal(false);
      setHandoverCard(data.handoverCard);
      setSuccessBanner(
        `Department "${data.department.name}" (${data.department.code}) provisioned successfully with separate portal & isolated credentials!`
      );
      setProvisionForm({
        name: '',
        code: '',
        adminName: '',
        adminEmail: '',
        adminPhone: '',
        adminPassword: 'mitm123',
      });
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Department Modal
  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setEditForm({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      active: dept.active !== false,
    });
    setFormError(null);
    setShowEditDeptModal(true);
  };

  // Save Department Edit (Name, Shortcut, Options)
  const handleSaveDepartmentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await authFetch(`/api/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to update department options.');
        setIsSubmitting(false);
        return;
      }

      setShowEditDeptModal(false);
      setSuccessBanner(`Department updated: ${data.name} (Shortcut: ${data.code}).`);
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Department Admin Credentials Reset Modal
  const openDeptCredentialsModal = (dept: Department) => {
    setTargetDeptForCreds(dept);
    setFormError(null);
    const existingEmail =
      dept.savedCredentials?.email ||
      dept.hod?.email ||
      `${dept.code.toLowerCase()}.admin@mitmysore.in`;
    const existingName =
      dept.savedCredentials?.adminName ||
      dept.hod?.fullName ||
      `${dept.code} Department Administrator`;

    setDeptAdminCredForm({
      adminName: existingName,
      adminEmail: existingEmail,
      adminPassword: dept.savedCredentials?.temporaryPassword || 'mitm123',
      adminStaffId: dept.savedCredentials?.staffId || `MITM-${dept.code}-ADM`,
    });
    setShowDeptCredModal(true);
  };

  // Submit Department Admin Credentials Reset
  const handleSaveDeptAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeptForCreds) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await authFetch(`/api/departments/${targetDeptForCreds.id}/reset-admin-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptAdminCredForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to update department administrator credentials.');
        setIsSubmitting(false);
        return;
      }

      setShowDeptCredModal(false);
      setSuccessBanner(
        `Department Admin credentials updated for ${targetDeptForCreds.name} (${targetDeptForCreds.code})!`
      );
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };



  // View Handover Slip
  const viewDepartmentHandoverSlip = (dept: Department) => {
    const isISE = dept.code === 'ISE' || dept.id === 'dept-ise';
    const email =
      dept.savedCredentials?.email ||
      (isISE ? 'ise.admin@mitmysore.in' : `${dept.code.toLowerCase()}.admin@mitmysore.in`);
    const password = dept.savedCredentials?.temporaryPassword || 'mitm123';
    const adminName =
      dept.savedCredentials?.adminName ||
      (isISE ? 'Prof. K. S. Manjunath (ISE Admin)' : `${dept.name} Administrator`);

    setHandoverCard({
      departmentName: dept.name,
      departmentCode: dept.code,
      adminName,
      email,
      temporaryPassword: password,
      role: 'Department Administrator (ADMIN)',
      loginUrl: '/login',
      issuedAt: dept.savedCredentials?.issuedAt || new Date().toISOString(),
      instructions:
        'Official credentials issued by Institutional Master Admin. Use institutional email and password to log in and manage departmental timetables, courses, faculty, and student cohorts.',
    });
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
Authorized Officer: ${handoverCard.adminName}
Role: ${handoverCard.role}
Login Email: ${handoverCard.email}
Password: ${handoverCard.temporaryPassword}
Portal URL: ${handoverCard.loginUrl}
Issued At: ${handoverCard.issuedAt}
Notice: ${handoverCard.instructions}
=====================================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const filteredDepts = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.savedCredentials?.adminName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. MASTER ADMIN CENTRAL TOP BANNER BOX */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              MASTER ADMINISTRATOR PORTAL
            </span>
            <span className="text-xs text-amber-200/80 font-mono">
              {user?.email}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            Institutional Department Portals & Central Governance
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            Each provisioned department operates as an independent portal with separate data entry, timetables, and designated Department Administrators.
          </p>
        </div>

        {/* Right side: strictly ONLY the "Add Department" button */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setShowProvisionModal(true)}
            className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            id="master-admin-add-dept-btn"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between gap-2 shadow-sm animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold text-base cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Search and Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search department by name, code (e.g. ISE, AIDS), or admin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1113] focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Total Departments: <strong className="text-slate-800">{departments.length}</strong>
          </span>
          <span>·</span>
          <span>
            Active: <strong className="text-emerald-700">{departments.filter((d) => d.active).length}</strong>
          </span>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            Loading departments from database...
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No departments found matching &quot;{searchQuery}&quot;</p>
            <p className="text-slate-400 mt-1">Click &quot;Add Department&quot; above to create one.</p>
          </div>
        ) : (
          filteredDepts.map((dept) => {
            const isISE = dept.code === 'ISE' || dept.id === 'dept-ise';
            const adminName =
              dept.savedCredentials?.adminName ||
              (isISE ? 'Prof. K. S. Manjunath (ISE Admin)' : (dept.hod?.fullName || `${dept.name} Administrator`));
            const adminEmail =
              dept.savedCredentials?.email ||
              (isISE ? 'ise.admin@mitmysore.in' : `${dept.code.toLowerCase()}.admin@mitmysore.in`);
            const adminPassword = dept.savedCredentials?.temporaryPassword || 'mitm123';

            return (
              <div
                key={dept.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
                  isISE ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-black text-[#7B1113] bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                        {dept.code}
                      </span>
                      {isISE && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Primary Department
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        dept.active ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                      }`}
                    >
                      {dept.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h2 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                    {dept.name}
                  </h2>

                  {/* Credentials Information Box for Department Administrator */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Authorized Department Admin
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        ADMIN ROLE
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                      <span className="truncate">{adminName}</span>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono truncate">
                      {adminEmail}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                      <span>Password: <strong className="text-slate-700">{adminPassword}</strong></span>
                      <span className="text-[9px] text-slate-400">Isolated Portal</span>
                    </div>
                  </div>
                </div>

                {/* Master Admin Actions Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="text-[11px] font-semibold text-[#7B1113] hover:text-[#5a0c0e] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Modify department name or shortcut"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Edit Options</span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => openDeptCredentialsModal(dept)}
                      className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Change admin email ID or password"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                      <span>Change Admin Creds</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => viewDepartmentHandoverSlip(dept)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                      title="View & copy credential handover slip"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. ADD DEPARTMENT MODAL (EASY, CLEAN & RELIABLE)                */}
      {/* ============================================================== */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 my-8 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
                  <Building2 className="w-5 h-5 text-[#7B1113]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Add New Department & Admin Credentials
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Creates an isolated departmental portal with its own admin credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProvisionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleProvisionDepartment} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={provisionForm.name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                    placeholder="e.g. Artificial Intelligence & Data Science"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shortcut / Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={provisionForm.code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="e.g. AIDS"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={provisionForm.adminName}
                  onChange={(e) => setProvisionForm({ ...provisionForm, adminName: e.target.value })}
                  placeholder="e.g. Prof. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Login Email ID *
                  </label>
                  <input
                    type="email"
                    required
                    value={provisionForm.adminEmail}
                    onChange={(e) => setProvisionForm({ ...provisionForm, adminEmail: e.target.value })}
                    placeholder="aids.admin@mitmysore.in"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Portal Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={provisionForm.adminPassword}
                    onChange={(e) => setProvisionForm({ ...provisionForm, adminPassword: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={provisionForm.adminPhone}
                  onChange={(e) => setProvisionForm({ ...provisionForm, adminPhone: e.target.value })}
                  placeholder="e.g. 9845012345"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Department & Generate Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. EDIT DEPARTMENT OPTIONS (NAME & SHORTCUT) MODAL             */}
      {/* ============================================================== */}
      {showEditDeptModal && editingDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-[#7B1113] rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Modify Department Options
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Edit name, shortcut / code, and branch status
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditDeptModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDepartmentEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Shortcut / Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      code: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Short unique tag, e.g. ISE, AIDS, CSE, AIML
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active-toggle"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="rounded text-[#7B1113] focus:ring-[#7B1113]"
                />
                <label htmlFor="active-toggle" className="text-xs font-medium text-slate-700">
                  Active Department Branch
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditDeptModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Department Options'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. CHANGE DEPARTMENT ADMIN CREDENTIALS MODAL                   */}
      {/* ============================================================== */}
      {showDeptCredModal && targetDeptForCreds && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Change Department Admin Credentials
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {targetDeptForCreds.name} ({targetDeptForCreds.code}) Portal Administrator
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeptCredModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDeptAdminCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Admin Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={deptAdminCredForm.adminName}
                    onChange={(e) => setDeptAdminCredForm({ ...deptAdminCredForm, adminName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Admin Login Email ID *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={deptAdminCredForm.adminEmail}
                    onChange={(e) => setDeptAdminCredForm({ ...deptAdminCredForm, adminEmail: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff / Identification ID
                </label>
                <input
                  type="text"
                  value={deptAdminCredForm.adminStaffId}
                  onChange={(e) => setDeptAdminCredForm({ ...deptAdminCredForm, adminStaffId: e.target.value })}
                  placeholder={`MITM-${targetDeptForCreds.code}-ADM`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Login Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={deptAdminCredForm.adminPassword}
                    onChange={(e) => setDeptAdminCredForm({ ...deptAdminCredForm, adminPassword: e.target.value })}
                    placeholder="Enter password (min 4 characters)"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeptCredModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Admin Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ============================================================== */}
      {/* 5. CREDENTIAL HANDOVER SLIP MODAL                              */}
      {/* ============================================================== */}
      {handoverCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Authorized Credential Handover Slip
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    MIT Mysore Department Administrator
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHandoverCard(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs space-y-2 mb-4">
              <div>
                <span className="text-slate-400 text-[10px] block">DEPARTMENT</span>
                <span className="font-bold text-slate-900">
                  {handoverCard.departmentName} ({handoverCard.departmentCode})
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">AUTHORIZED ADMINISTRATOR</span>
                <span className="text-slate-800">{handoverCard.adminName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">ROLE</span>
                <span className="text-slate-800 font-bold">{handoverCard.role}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">LOGIN EMAIL ID</span>
                <span className="font-bold text-[#7B1113] select-all">
                  {handoverCard.email}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">PORTAL PASSWORD</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 select-all">
                  {handoverCard.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={copyHandoverCard}
                className="flex-1 py-2.5 px-3 bg-[#7B1113] hover:bg-[#600d0f] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Copied Slip!' : 'Copy Credential Slip'}</span>
              </button>
              <button
                onClick={() => setHandoverCard(null)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
