import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { calculateProfileCompleteness } from '../utils/completeness.ts';
import { authFetch } from '../utils/api.ts';
import {
  UserCircle,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Save,
  CheckCircle2,
  Upload,
  FileText,
  Eye,
  Camera,
  X,
  Download,
  AlertCircle,
} from 'lucide-react';

export const FacultyProfileView: React.FC = () => {
  const { user, profile, department, refreshAuth } = useAuth();

  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    designation: profile?.designation || '',
    qualification: profile?.qualification || '',
    specialization: profile?.specialization || '',
    bio: profile?.bio || '',
    cvUrl: profile?.cvUrl || '',
    profilePhotoUrl: profile?.profilePhotoUrl || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCvModal, setShowCvModal] = useState(false);

  if (!user || !profile) {
    return <div className="p-8 text-xs text-slate-500">Loading faculty profile...</div>;
  }

  const completeness = calculateProfileCompleteness({
    ...formData,
    activityCount: profile.activityCount || 1,
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        profilePhotoUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        cvUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await authFetch(`/api/staff/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSuccessMessage('Profile and documents updated successfully!');
        refreshAuth();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Faculty Profile & Portfolio Dossier
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete your profile photo, official curriculum vitae, and academic qualifications.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <span className="font-mono text-xs font-bold text-[#7B1113] bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
            {profile.staffId}
          </span>
        </div>
      </div>

      {/* Completeness Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-[#7B1113]" />
            <h2 className="text-xs font-bold text-slate-900">Profile Completeness Status</h2>
          </div>
          <span className="text-base font-bold font-mono text-[#7B1113] tabular-nums">
            {completeness.score}%
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-[#7B1113] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${completeness.score}%` }}
          />
        </div>

        {completeness.missingFields.length > 0 ? (
          <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center justify-between">
            <div>
              <strong>Pending for 100% completion:</strong> {completeness.missingFields.join(', ')}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
              Action Required
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile is 100% complete and fully verified for institutional appraisal.</span>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-700 font-bold text-sm cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Photo & Identity Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#7B1113] bg-slate-200 flex items-center justify-center shadow-inner">
                {formData.profilePhotoUrl ? (
                  <img
                    src={formData.profilePhotoUrl}
                    alt={formData.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-slate-400">
                    {formData.fullName?.charAt(0) || 'F'}
                  </span>
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 p-1.5 bg-[#7B1113] text-white rounded-full cursor-pointer shadow-md hover:bg-[#600d0f] transition-colors"
                title="Upload Profile Picture"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1">
              <div className="text-sm font-bold text-slate-900">
                {formData.fullName || 'Faculty Member'}
              </div>
              <div className="text-slate-600">{formData.designation}</div>
              <div className="text-slate-500 font-mono text-[11px]">{user.email}</div>
              <label
                htmlFor="photo-upload"
                className="inline-block mt-2 text-xs font-semibold text-[#7B1113] hover:underline cursor-pointer"
              >
                {formData.profilePhotoUrl ? 'Change Profile Photo' : 'Upload Profile Picture'}
              </label>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Name (Shown in Greetings & Portfolios)
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Dr. / Prof. Ramesh Babu"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Designation</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                required
                placeholder="9880011223"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Academic Qualifications
              </label>
              <input
                type="text"
                required
                placeholder="Ph.D, M.Tech in Computer Science"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Academic Biography & Professional Background
            </label>
            <textarea
              rows={3}
              placeholder="Provide a brief summary of teaching experience, research interests, and institutional responsibilities..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
            />
          </div>

          {/* Real CV Upload & View Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block font-bold text-slate-800">
              Curriculum Vitae (CV / Comprehensive Resume)
            </label>
            <p className="text-[11px] text-slate-500">
              Upload your verified faculty resume in PDF format. This will be accessible to the Department HOD and Principal.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" />
                <span>{formData.cvUrl ? 'Replace Uploaded CV' : 'Upload CV / Resume (PDF)'}</span>
                <input
                  type="file"
                  accept="application/pdf, image/*"
                  onChange={handleCvUpload}
                  className="hidden"
                />
              </label>

              {formData.cvUrl && (
                <button
                  type="button"
                  onClick={() => setShowCvModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#7B1113] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View & Verify Uploaded CV</span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Profile...' : 'Save Profile & Documents'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* CV Viewer Modal */}
      {showCvModal && formData.cvUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7B1113]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {formData.fullName} — Curriculum Vitae
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {department?.name || 'MIT Mysore'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={formData.cvUrl}
                  download={`${formData.fullName}_CV.pdf`}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setShowCvModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[450px]">
              {formData.cvUrl.startsWith('data:image/') ? (
                <img
                  src={formData.cvUrl}
                  alt="Faculty CV"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow border border-slate-200 bg-white"
                />
              ) : (
                <iframe
                  src={formData.cvUrl}
                  title="Faculty CV"
                  className="w-full h-[75vh] rounded-lg border border-slate-300 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
