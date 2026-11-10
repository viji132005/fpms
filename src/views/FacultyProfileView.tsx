import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
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
import { PdfCanvasViewer } from '../components/PdfCanvasViewer.tsx';

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

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds 15 MB limit. Please select a smaller document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        cvUrl: reader.result as string,
      }));
      setSuccessMessage(`Resume file "${file.name}" attached successfully! Click "Save Profile & Documents" to persist.`);
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
        body: JSON.stringify({ ...formData, isProfileRegistered: true }),
      });
      if (res.ok) {
        setSuccessMessage('Profile and documents updated successfully!');
        await refreshAuth();
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
            {user.role === 'NON_TEACHING' ? 'Staff Profile & Portfolio Dossier' : 'Faculty Profile & Portfolio Dossier'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete your profile photo, official curriculum vitae, and qualifications.
          </p>
        </div>
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
                {formData.fullName || (user.role === 'NON_TEACHING' ? 'Staff Member' : 'Faculty Member')}
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
                placeholder={user.role === 'NON_TEACHING' ? 'Sri / Smt. Ramesh Babu' : 'Dr. / Prof. Ramesh Babu'}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official Designation
              </label>
              <input
                type="text"
                disabled
                value={formData.designation}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Academic Qualifications
            </label>
            <input
              type="text"
              disabled
              value={formData.qualification}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
            />
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
              {user.role === 'NON_TEACHING' ? 'Staff Curriculum Vitae (CV / Comprehensive Resume)' : 'Curriculum Vitae (CV / Comprehensive Resume)'}
            </label>
            <p className="text-[11px] text-slate-500">
              Upload your verified resume in PDF format. This will be accessible to the Department HOD and Administration.
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
              {formData.cvUrl.startsWith('data:image/') || formData.cvUrl.match(/\.(png|jpe?g|webp|gif)$/i) ? (
                <img
                  src={formData.cvUrl}
                  alt="Faculty CV"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow border border-slate-200 bg-white"
                />
              ) : formData.cvUrl.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
                formData.cvUrl.startsWith('data:application/msword') ||
                formData.cvUrl.endsWith('.doc') ||
                formData.cvUrl.endsWith('.docx') ? (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200 max-w-md shadow-sm">
                  <FileText className="w-12 h-12 text-[#7B1113] mx-auto mb-3" />
                  <p className="font-bold text-slate-800 text-sm">
                    {formData.fullName ? `${formData.fullName} - Curriculum Vitae` : 'Curriculum Vitae'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Microsoft Word document attached. Click below to download and view.
                  </p>
                  <a
                    href={formData.cvUrl}
                    download={`${formData.fullName || 'Faculty'}_Resume.docx`}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Word Document</span>
                  </a>
                </div>
              ) : (
                <div className="w-full h-[75vh] flex flex-col">
                  <PdfCanvasViewer
                    url={formData.cvUrl}
                    originalUrl={formData.cvUrl}
                    fileName={`${formData.fullName || 'Faculty'}_Resume.pdf`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
