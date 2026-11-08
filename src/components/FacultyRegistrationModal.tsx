import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Camera,
  UserCheck,
  Phone,
  GraduationCap,
  Briefcase,
  Sparkles,
  BookOpen,
  FileText,
  Upload,
  AlertCircle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onSuccess: () => void;
}

export const FacultyRegistrationModal: React.FC<Props> = ({ isOpen, onSuccess }) => {
  const { user, profile, department, refreshAuth } = useAuth();

  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    designation: profile?.designation || 'Assistant Professor',
    qualification: profile?.qualification || 'M.Tech in Computer Science',
    phone: profile?.phone || '',
    specialization: profile?.specialization || 'Full Stack Development',
    bio: profile?.bio || '',
    profilePhotoUrl: profile?.profilePhotoUrl || '',
    cvUrl: profile?.cvUrl || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        profilePhotoUrl: reader.result as string,
      }));
      setErrorMessage(null);
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
    setErrorMessage(null);

    if (!formData.fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Please provide your active contact phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/staff/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          isProfileRegistered: true,
        }),
      });

      if (res.ok) {
        await refreshAuth();
        onSuccess();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to complete profile registration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error completing registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 my-8 animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="text-center pb-5 border-b border-slate-100 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#7B1113]/10 text-[#7B1113] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="text-[11px] font-bold text-[#7B1113] uppercase tracking-wider">
            Maharaja Institute of Technology, Mysore
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Faculty Profile Registration
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Welcome to FPMS! Please complete your official faculty details and upload your profile picture (DP) to set up your account.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Circular Facebook / WhatsApp style DP uploader */}
          <div className="flex flex-col items-center justify-center pb-2">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-[#7B1113]/20 shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-white">
                {formData.profilePhotoUrl ? (
                  <img
                    src={formData.profilePhotoUrl}
                    alt="Profile DP Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#7B1113] to-slate-900 flex items-center justify-center text-white text-3xl font-black">
                    {(formData.fullName || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <label
                htmlFor="faculty-reg-dp-upload"
                className="absolute bottom-0 right-0 p-2 bg-[#7B1113] hover:bg-[#600d0f] text-white rounded-full shadow-lg border-2 border-white cursor-pointer transition-transform hover:scale-110"
                title="Upload Profile Picture"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="faculty-reg-dp-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 mt-2">
              Profile Picture (DP) · Click camera icon to upload
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Name with Title *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Prof. Gururaja M P"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1113] bg-white font-medium"
              />
            </div>

            {/* Staff ID (Read-only badge) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Staff / Employee ID
              </label>
              <input
                type="text"
                disabled
                value={profile?.staffId || ''}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-mono font-bold cursor-not-allowed"
              />
            </div>

            {/* Official Designation and Qualification (Fixed as entered by Admin) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:col-span-2 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Official Designation: </span>
                  <span className="text-slate-900 font-semibold">{profile?.designation || formData.designation || 'Faculty'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Qualification: </span>
                  <span className="text-slate-900 font-semibold">{profile?.qualification || formData.qualification || 'M.Tech'}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                * Note: Designation and Qualification are fixed as entered by Administration. To request updates, please meet the Department Administrator or HOD.
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#7B1113]" />
                <span>Contact Phone Number *</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1113] bg-white font-medium"
              />
            </div>

            {/* Core Specialization */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#7B1113]" />
                <span>Area of Specialization</span>
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g. Machine Learning, Cloud"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1113] bg-white font-medium"
              />
            </div>
          </div>

          {/* Academic Bio */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Short Academic Bio / Teaching Philosophy
            </label>
            <textarea
              rows={2}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Brief summary of your academic background, research interests, and subjects handled..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1113] bg-white"
            />
          </div>

          {/* Optional CV Upload */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <div>
                <div className="font-bold text-slate-800">Faculty Curriculum Vitae (CV)</div>
                <div className="text-[10px] text-slate-500">
                  {formData.cvUrl ? 'CV file attached' : 'Optional document attachment'}
                </div>
              </div>
            </div>
            <label className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold text-[11px] hover:bg-slate-100 cursor-pointer flex items-center gap-1">
              <Upload className="w-3 h-3" />
              <span>{formData.cvUrl ? 'Change CV' : 'Upload CV'}</span>
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleCvUpload} className="hidden" />
            </label>
          </div>

          {/* Department badge */}
          <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-between">
            <span>Department: <strong>{department?.name || 'Information Science and Engineering'}</strong></span>
            <span className="font-mono text-[#7B1113] font-bold">{department?.code || 'ISE'}</span>
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#7B1113] hover:bg-[#600d0f] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering Profile...' : 'Complete & Register Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
