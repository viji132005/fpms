import React, { useEffect, useState } from 'react';
import { StaffProfile } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Crown,
  Phone,
  Mail,
  GraduationCap,
  X,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const { user, department } = useAuth();
  const deptId = department?.id || 'dept-ise';
  const deptCode = department?.code || 'ISE';
  const deptName = department?.name || 'Department';

  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'teaching' | 'non-teaching'>('teaching');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStaffType, setAddStaffType] = useState<'teaching' | 'non-teaching'>('teaching');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);

  // In-app Delete Confirmation (no window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // HOD Modal & Details
  const [showHodModal, setShowHodModal] = useState(false);
  const [hodForm, setHodForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    qualification: 'Ph.D in CSE',
    designation: 'Professor & Head of Department',
  });
  const [hodSaving, setHodSaving] = useState(false);
  const [hodError, setHodError] = useState<string | null>(null);

  // Add Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    designation: 'Assistant Professor',
    customDesignation: '',
    isCustomDesignation: false,
    qualification: 'M.Tech',
    bio: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = () => {
    setIsLoading(true);
    let url = `/api/staff?departmentId=${encodeURIComponent(deptId)}&`;
    if (activeTab === 'teaching') url += 'type=teaching&';
    if (activeTab === 'non-teaching') url += 'type=non-teaching&';
    if (search) url += `search=${encodeURIComponent(search)}&`;

    authFetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setStaffList(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, [activeTab, search, deptId]);

  // Current HOD in staff list or fallback
  const currentHod = staffList.find(
    (s) =>
      s.designation?.toLowerCase().includes('head of department') ||
      s.designation?.toLowerCase().includes('hod')
  );

  const openHodModal = () => {
    if (currentHod) {
      setHodForm({
        fullName: currentHod.fullName,
        email: (currentHod as any).user?.email || '',
        phone: currentHod.phone || '',
        qualification: currentHod.qualification || 'Ph.D',
        designation: currentHod.designation || 'Professor & Head of Department',
      });
    } else {
      setHodForm({
        fullName: '',
        email: `hod.${deptCode.toLowerCase()}@mitmysore.in`,
        phone: '',
        qualification: 'Ph.D',
        designation: 'Professor & Head of Department',
      });
    }
    setShowHodModal(true);
  };

  const handleSaveHod = async (e: React.FormEvent) => {
    e.preventDefault();
    setHodSaving(true);
    setHodError(null);
    try {
      const res = await authFetch(`/api/departments/${encodeURIComponent(deptId)}/hod-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hodForm),
      });
      if (res.ok) {
        setShowHodModal(false);
        fetchStaff();
      } else {
        const err = await res.json();
        setHodError(err.error || 'Failed to update HOD details.');
      }
    } catch (err: any) {
      setHodError(err.message || 'Error updating HOD');
    } finally {
      setHodSaving(false);
    }
  };

  const confirmDeleteStaff = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/staff/${deleteTarget.userId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        fetchStaff();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to remove staff member.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error removing staff member.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAddModal = (type: 'teaching' | 'non-teaching') => {
    setAddStaffType(type);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      designation: type === 'teaching' ? 'Assistant Professor' : 'Lab Instructor',
      customDesignation: '',
      isCustomDesignation: false,
      qualification: type === 'teaching' ? 'M.Tech' : 'B.E / Diploma',
      bio: '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const finalDesignation = formData.isCustomDesignation
      ? formData.customDesignation.trim()
      : formData.designation;

    if (!finalDesignation) {
      setFormError('Please provide a valid designation.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await authFetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          departmentId: deptId,
          designation: finalDesignation,
          qualification: formData.qualification.trim(),
          isTeachingFaculty: addStaffType === 'teaching',
          bio: formData.bio.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to add staff member.');
        setIsSubmitting(false);
        return;
      }
      setShowAddModal(false);
      setSearch('');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        designation: addStaffType === 'teaching' ? 'Assistant Professor' : 'Lab Instructor',
        customDesignation: '',
        isCustomDesignation: false,
        qualification: addStaffType === 'teaching' ? 'M.Tech' : 'B.E / Diploma',
        bio: '',
      });
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || 'Error creating staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await authFetch(`/api/staff/${editingStaff.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStaff),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to update staff member.');
        setIsSubmitting(false);
        return;
      }
      setShowEditModal(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || 'Error updating staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7B1113]" />
            <span>Staff & Faculty Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department of {deptName} ({deptCode}) • Managed by Administration
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex items-center gap-2 self-start flex-wrap">
            <button
              onClick={() => handleOpenAddModal('teaching')}
              className="px-3 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Faculty Member</span>
            </button>
            <button
              onClick={() => handleOpenAddModal('non-teaching')}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>Add Non-Teaching Staff</span>
            </button>
          </div>
        )}
      </div>

      {/* Dedicated HOD Management Card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Department HOD - {deptName}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {currentHod?.fullName || 'HOD Not Configured'}
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-3 mt-1 flex-wrap">
              <span>{currentHod?.designation || 'Professor & Head of Department'}</span>
              <span>•</span>
              <span className="font-mono text-[11px]">{(currentHod as any)?.user?.email || 'N/A'}</span>
              <span>•</span>
              <span className="font-mono text-[11px]">{currentHod?.phone || 'No phone'}</span>
              <span>•</span>
              <span>{currentHod?.qualification || 'Ph.D'}</span>
            </div>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={openHodModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shrink-0"
          >
            {currentHod ? 'Modify HOD Details' : 'Configure Department HOD'}
          </button>
        )}
      </div>

      {/* Tabs & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Segmented Tab Controls: Teaching vs Non-Teaching */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('teaching')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'teaching'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Teaching Faculty
          </button>
          <button
            onClick={() => setActiveTab('non-teaching')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'non-teaching'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Non-Teaching Technical Staff
          </button>
        </div>

        {/* Search & Department Indicator */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              name="staffSearchQuery"
              id="staffSearchQuery"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-52 sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
            />
          </div>

          <div className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-[#7B1113] border border-rose-200">
            Dept: {deptCode}
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-16">Sl. No.</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Designation & Department</th>
                <th className="py-3 px-4">Qualifications</th>
                <th className="py-3 px-4">Contact Info (Login Credentials)</th>
                {user?.role === 'ADMIN' && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading staff directory...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No staff records found matching the active criteria.
                  </td>
                </tr>
              ) : (
                staffList.map((member, index) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                      {index + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#7B1113]/10 text-[#7B1113] flex items-center justify-center font-bold text-xs shrink-0">
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{member.fullName}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{member.designation}</div>
                      <div className="text-[11px] text-slate-500">{deptName}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{member.qualification || 'N/A'}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{(member as any).user?.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{member.phone || '—'}</span>
                      </div>
                    </td>

                    {user?.role === 'ADMIN' && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingStaff(member);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                userId: member.userId,
                                name: member.fullName,
                              })
                            }
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                            title="Remove Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Add {addStaffType === 'teaching' ? 'Teaching Faculty' : 'Non-Teaching Staff'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Email & phone will serve as initial login credentials with default password.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder={
                    addStaffType === 'teaching' ? 'e.g. Dr. Ramesh Babu' : 'e.g. Mr. Shivakumar M'
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={`username.${deptCode.toLowerCase()}@mitmysore.in`}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                {!formData.isCustomDesignation ? (
                  <div className="space-y-2">
                    <select
                      value={formData.designation}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setFormData({ ...formData, isCustomDesignation: true, customDesignation: '' });
                        } else {
                          setFormData({ ...formData, designation: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                    >
                      {addStaffType === 'teaching' ? (
                        <>
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Professor">Professor</option>
                          <option value="Professor & Head of Department">Professor & HOD</option>
                          <option value="CUSTOM">+ Enter Custom Designation Manually</option>
                        </>
                      ) : (
                        <>
                          <option value="Senior Lab Instructor">Senior Lab Instructor</option>
                          <option value="Lab Instructor">Lab Instructor</option>
                          <option value="Technical Assistant">Technical Assistant</option>
                          <option value="Office Superintendent">Office Superintendent</option>
                          <option value="Attender">Attender</option>
                          <option value="CUSTOM">+ Enter Custom Designation Manually</option>
                        </>
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={formData.customDesignation}
                      onChange={(e) => setFormData({ ...formData, customDesignation: e.target.value })}
                      placeholder="Type custom designation here..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          isCustomDesignation: false,
                          designation: addStaffType === 'teaching' ? 'Assistant Professor' : 'Lab Instructor',
                        })
                      }
                      className="text-xs text-slate-500 hover:text-slate-800 underline shrink-0"
                    >
                      Use List
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Highest Qualification</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder={addStaffType === 'teaching' ? 'M.Tech, Ph.D' : 'B.E / Diploma'}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
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
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-900">Edit Staff Details</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.fullName}
                  onChange={(e) => setEditingStaff({ ...editingStaff, fullName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.designation}
                    onChange={(e) => setEditingStaff({ ...editingStaff, designation: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Qualification</label>
                <input
                  type="text"
                  value={editingStaff.qualification}
                  onChange={(e) => setEditingStaff({ ...editingStaff, qualification: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
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
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Add/Modify HOD Modal */}
      {showHodModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Configure Department HOD</h2>
              </div>
              <button onClick={() => setShowHodModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {hodError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                {hodError}
              </div>
            )}

            <form onSubmit={handleSaveHod} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">HOD Full Name</label>
                <input
                  type="text"
                  required
                  value={hodForm.fullName}
                  onChange={(e) => setHodForm({ ...hodForm, fullName: e.target.value })}
                  placeholder="e.g. Dr. Sharath Kumar Y H"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={hodForm.email}
                    onChange={(e) => setHodForm({ ...hodForm, email: e.target.value })}
                    placeholder={`hod.${deptCode.toLowerCase()}@mitmysore.in`}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={hodForm.phone}
                    onChange={(e) => setHodForm({ ...hodForm, phone: e.target.value })}
                    placeholder="9448123456"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={hodForm.designation}
                    onChange={(e) => setHodForm({ ...hodForm, designation: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Qualifications</label>
                  <input
                    type="text"
                    required
                    value={hodForm.qualification}
                    onChange={(e) => setHodForm({ ...hodForm, qualification: e.target.value })}
                    placeholder="Ph.D, M.Tech"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
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
                  disabled={hodSaving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {hodSaving ? 'Saving...' : 'Set as Department HOD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal (fixes silent window.confirm block) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Remove Staff Member?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to remove <strong className="text-slate-800">{deleteTarget.name}</strong>?
              This will deactivate their login access and department records permanently.
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
                onClick={confirmDeleteStaff}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Remove Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
