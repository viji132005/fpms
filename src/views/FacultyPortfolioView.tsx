import React, { useEffect, useState, useRef } from 'react';
import { PortfolioItem, StaffProfile } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FolderGit2,
  Plus,
  Search,
  FileText,
  Trash2,
  Upload,
  Download,
  Eye,
  X,
  User,
  ArrowLeft,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export const FacultyPortfolioView: React.FC = () => {
  const { user, profile, department } = useAuth();
  const deptId = department?.id || 'dept-ise';

  // Navigation state
  // null = root directory of faculty dossiers
  // string = selected facultyUserId
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Data state
  const [allFaculty, setAllFaculty] = useState<StaffProfile[]>([]);
  const [allItems, setAllItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Modals state
  const [showAddRecordModal, setShowAddRecordModal] = useState<boolean>(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState<boolean>(false);

  // File upload state for Add Modal
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    name: string;
    title: string;
    category: string;
  } | null>(null);

  // In-app Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Category Folder Deletion State
  const [categoryToDelete, setCategoryToDelete] = useState<{ name: string; count: number } | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState<boolean>(false);

  // Add Record Form State
  const [formData, setFormData] = useState({
    category: 'Research Publications',
    title: '',
    academicYear: '2026-27',
    eventDate: new Date().toISOString().split('T')[0],
    details: {} as Record<string, any>,
    evidenceDocUrl: '',
    evidenceDocName: '',
  });

  // Default suggested categories
  const suggestedCategories = [
    'Research Publications',
    'Patents & Intellectual Property',
    'Faculty Development Programs (FDP)',
    'Workshops & Seminars',
    'Conference Papers',
    'Professional Certifications',
    'Funded Research Projects',
    'Book Chapters & Monographs',
    'Consultancy & Industry Projects',
    'Honors & Awards',
  ];

  // Load all faculty profiles and portfolio items
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, portfolioRes] = await Promise.all([
        authFetch('/api/staff?type=teaching'),
        authFetch('/api/portfolio'), // Public institutional repository
      ]);

      const staffData = staffRes.ok ? await staffRes.json() : [];
      const portfolioData = portfolioRes.ok ? await portfolioRes.json() : [];

      if (Array.isArray(staffData)) setAllFaculty(staffData);
      if (Array.isArray(portfolioData)) setAllItems(portfolioData);
    } catch (err) {
      console.error('Error loading portfolio directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch categories for the active faculty
  useEffect(() => {
    const targetUserId = selectedFacultyId || user?.id;
    if (targetUserId) {
      authFetch(`/api/portfolio/categories?facultyUserId=${encodeURIComponent(targetUserId)}`)
        .then((res) => (res.ok ? res.json() : suggestedCategories))
        .then((cats) => {
          if (Array.isArray(cats)) {
            setCategories(cats);
          }
        })
        .catch(() => setCategories(suggestedCategories));
    }
  }, [selectedFacultyId, user, allItems]);

  // Order faculty list so the current user's folder is FIRST
  const sortedFacultyList = React.useMemo(() => {
    if (!allFaculty || allFaculty.length === 0) return [];
    const currentUserId = user?.id;

    const myProfile = allFaculty.find((f) => f.userId === currentUserId);
    const others = allFaculty.filter((f) => f.userId !== currentUserId);

    // Sort others alphabetically by full name
    others.sort((a, b) => a.fullName.localeCompare(b.fullName));

    return myProfile ? [myProfile, ...others] : others;
  }, [allFaculty, user]);

  // Selected faculty profile
  const currentFaculty = allFaculty.find((f) => f.userId === selectedFacultyId) || null;
  const isViewingOwnFolder = selectedFacultyId === user?.id;
  // Strictly owner-only: logged in user only has edit/delete on their own folder, view-only on others
  const canManageFolder = isViewingOwnFolder;

  // Filter items for the selected faculty (or all if at root)
  const displayedItems = React.useMemo(() => {
    let list = allItems;
    if (selectedFacultyId) {
      list = list.filter((item) => item.facultyUserId === selectedFacultyId);
    }
    if (selectedCategory !== 'ALL') {
      list = list.filter((item) => item.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.facultyName && item.facultyName.toLowerCase().includes(q)) ||
          JSON.stringify(item.details || {}).toLowerCase().includes(q)
      );
    }
    return list;
  }, [allItems, selectedFacultyId, selectedCategory, search]);

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setFileError('File size exceeds the 15 MB institutional limit.');
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        evidenceDocUrl: result,
        evidenceDocName: file.name,
      }));
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      setFileError('Failed to read selected document. Please try again.');
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const res = await authFetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddRecordModal(false);
        setFormData({
          category: categories[0] || 'Research Publications',
          title: '',
          academicYear: '2026-27',
          eventDate: new Date().toISOString().split('T')[0],
          details: {},
          evidenceDocUrl: '',
          evidenceDocName: '',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadData();
      }
    } catch (err) {
      console.error('Error creating portfolio record:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmittingCategory(true);
    try {
      const res = await authFetch('/api/portfolio/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: newCategoryName.trim(),
          facultyUserId: selectedFacultyId || user?.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.category && !categories.includes(data.category)) {
          setCategories((prev) => [...prev, data.category]);
        }
        setFormData((prev) => ({ ...prev, category: newCategoryName.trim() }));
        setSelectedCategory(newCategoryName.trim());
        setNewCategoryName('');
        setShowNewCategoryModal(false);
      }
    } catch (err) {
      console.error('Error adding category:', err);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/portfolio/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        loadData();
      }
    } catch (err) {
      console.error('Error deleting portfolio item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      const res = await authFetch('/api/portfolio/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: categoryToDelete.name,
          facultyUserId: selectedFacultyId || user?.id,
        }),
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c !== categoryToDelete.name));
        if (selectedCategory === categoryToDelete.name) {
          setSelectedCategory('ALL');
        }
        setCategoryToDelete(null);
        await loadData();
      }
    } catch (err) {
      console.error('Error deleting category folder:', err);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleDownloadDoc = (url: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'portfolio_document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span
              onClick={() => {
                setSelectedFacultyId(null);
                setSelectedCategory('ALL');
              }}
              className="text-slate-600 hover:text-[#7B1113] cursor-pointer"
            >
              Academic Repository
            </span>
            {currentFaculty && (
              <>
                <span>/</span>
                <span className="text-[#7B1113] font-bold">{currentFaculty.fullName}</span>
                {selectedCategory !== 'ALL' && (
                  <>
                    <span>/</span>
                    <span className="text-slate-700">{selectedCategory}</span>
                  </>
                )}
              </>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-[#7B1113]" />
            <span>Institutional Academic Portfolio & Research Repository</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Public academic repository · Open institutional access to faculty research, publications, patents, and certifications.
          </p>
        </div>

        {/* Global Action / Search */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {selectedFacultyId && (
            <button
              onClick={() => {
                setSelectedFacultyId(null);
                setSelectedCategory('ALL');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Faculty Folders</span>
            </button>
          )}

          {canManageFolder && selectedFacultyId && (
            <div className="flex flex-col items-stretch sm:items-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFileError('');
                  if (selectedCategory !== 'ALL' && categories.includes(selectedCategory)) {
                    setFormData((prev) => ({ ...prev, category: selectedCategory }));
                  }
                  setShowAddRecordModal(true);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Academic Contribution</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewCategoryName('');
                  setShowNewCategoryModal(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#7B1113] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Add New Folder</span>
              </button>
            </div>
          )}

          {!canManageFolder && selectedFacultyId && (
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 flex items-center gap-1.5 shadow-xs">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>View-Only Academic Access</span>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: ROOT DIRECTORY - ALL FACULTY FOLDERS */}
      {!selectedFacultyId && (
        <div className="space-y-6">
          {/* Search Bar & Stats */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              Showing <strong>{sortedFacultyList.length} Faculty Dossier Folders</strong> in Department
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search faculty name or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-full sm:w-72 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
              />
            </div>
          </div>

          {/* Grid of Faculty Folders */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedFacultyList
              .filter((fac) => {
                if (!search) return true;
                const q = search.toLowerCase();
                return (
                  fac.fullName.toLowerCase().includes(q) ||
                  fac.designation.toLowerCase().includes(q) ||
                  fac.specialization.toLowerCase().includes(q)
                );
              })
              .map((fac, idx) => {
                const isCurrentUser = fac.userId === user?.id;
                const facItems = allItems.filter((item) => item.facultyUserId === fac.userId);

                return (
                  <div
                    key={fac.userId}
                    onClick={() => {
                      setSelectedFacultyId(fac.userId);
                      setSelectedCategory('ALL');
                    }}
                    className={`rounded-2xl p-5 border shadow-sm transition-all cursor-pointer relative group flex flex-col justify-between ${
                      isCurrentUser
                        ? 'bg-gradient-to-br from-rose-50/70 via-white to-amber-50/30 border-[#7B1113] ring-2 ring-[#7B1113]/10 hover:shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Top folder badge / tag */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isCurrentUser
                                ? 'bg-[#7B1113] text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Folder className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Faculty Dossier
                            </div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#7B1113] transition-colors">
                              {fac.fullName}
                            </div>
                          </div>
                        </div>

                        {isCurrentUser && (
                          <span className="text-[10px] font-bold text-[#7B1113] bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
                            Your Folder
                          </span>
                        )}
                      </div>

                      {/* Faculty Details */}
                      <div className="text-xs text-slate-600 space-y-1 mb-4">
                        <div className="font-semibold text-slate-800">{fac.designation}</div>
                        <div className="text-[11px] text-slate-500">{fac.qualification}</div>
                        {fac.specialization && (
                          <div className="text-[11px] text-slate-500 truncate">
                            Specialization: {fac.specialization}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Counts & Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="font-bold text-[#7B1113] flex items-center gap-1.5">
                        <span className="text-sm font-extrabold tabular-nums">{facItems.length}</span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {facItems.length === 1 ? 'Record' : 'Records'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-600 group-hover:text-[#7B1113] flex items-center gap-1">
                        <span>Open Folder</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 2: INSIDE A SELECTED FACULTY'S FOLDER */}
      {selectedFacultyId && currentFaculty && (
        <div className="space-y-6">
          {/* Faculty Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-4 ring-slate-100 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
                {currentFaculty.profilePhotoUrl ? (
                  <img
                    src={currentFaculty.profilePhotoUrl}
                    alt={currentFaculty.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white text-2xl font-bold">
                    {currentFaculty.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">{currentFaculty.fullName}</h2>
                  {isViewingOwnFolder && (
                    <span className="text-[10px] font-bold text-[#7B1113] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      You (Owner)
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  {currentFaculty.designation} · {currentFaculty.qualification}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  {currentFaculty.bio || 'Department teaching faculty and research contributor.'}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                  {((currentFaculty as any).user?.email || (currentFaculty as any).email) && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{(currentFaculty as any).user?.email || (currentFaculty as any).email}</span>
                    </span>
                  )}
                  {currentFaculty.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{currentFaculty.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions (View Resume) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (currentFaculty.cvUrl) {
                    setPreviewDoc({
                      url: currentFaculty.cvUrl,
                      name: `${currentFaculty.fullName.replace(/\s+/g, '_')}_Resume_CV.pdf`,
                      title: `${currentFaculty.fullName} — Verified Academic Resume / CV`,
                      category: 'Official Curriculum Vitae',
                    });
                  }
                }}
                disabled={!currentFaculty.cvUrl}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                  currentFaculty.cvUrl
                    ? 'text-white bg-[#7B1113] hover:bg-[#600d0f] shadow-sm cursor-pointer'
                    : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                }`}
                title={
                  currentFaculty.cvUrl
                    ? 'View verified faculty resume uploaded in profile section'
                    : isViewingOwnFolder
                    ? 'Upload your verified resume in My Profile to view it here'
                    : 'This faculty member has not uploaded a resume yet'
                }
              >
                <FileText className="w-4 h-4" />
                <span>{currentFaculty.cvUrl ? 'View Resume' : 'Resume Not Uploaded'}</span>
              </button>
            </div>
          </div>

          {/* Category Folders Bar (Custom Folders) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="uppercase tracking-wider">Academic Category Folders</span>
              <span className="text-slate-400 font-normal">
                Click any folder to filter documents
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* All Folder */}
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#7B1113] text-white border-[#7B1113] shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold tabular-nums">
                    {allItems.filter((p) => p.facultyUserId === selectedFacultyId).length}
                  </span>
                </div>
                <div className="text-xs font-bold truncate">All Categories</div>
                <div
                  className={`text-[10px] truncate ${
                    selectedCategory === 'ALL' ? 'text-rose-100' : 'text-slate-400'
                  }`}
                >
                  Complete Dossier
                </div>
              </button>

              {/* Dynamic Category Folders */}
              {categories.map((cat) => {
                const count = allItems.filter(
                  (p) => p.facultyUserId === selectedFacultyId && p.category === cat
                ).length;
                const isSelected = selectedCategory === cat;

                return (
                  <div
                    key={cat}
                    className={`relative group rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#7B1113] text-white border-[#7B1113] shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full p-3 text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Folder className="w-4 h-4" />
                        <span className="text-xs font-mono font-bold tabular-nums">{count}</span>
                      </div>
                      <div className="text-xs font-bold truncate pr-5" title={cat}>
                        {cat}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-rose-100' : 'text-slate-400'
                        }`}
                      >
                        {count === 1 ? '1 Document' : `${count} Documents`}
                      </div>
                    </button>

                    {/* Delete Folder Action (Owner only) */}
                    {canManageFolder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete({ name: cat, count });
                        }}
                        className={`absolute top-2 right-2 p-1 rounded-md transition-all cursor-pointer ${
                          isSelected
                            ? 'text-rose-200 hover:text-white hover:bg-white/10 opacity-80 hover:opacity-100'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-70 group-hover:opacity-100'
                        }`}
                        title={`Delete folder "${cat}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Documents / Contributions List in Selected Category */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedCategory === 'ALL' ? 'All Academic Documents' : selectedCategory} (
                  {displayedItems.length})
                </h3>
                {canManageFolder && selectedCategory !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryToDelete({
                        name: selectedCategory,
                        count: displayedItems.length,
                      });
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title={`Delete folder "${selectedCategory}"`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Folder</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>
            </div>

            {displayedItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-xs text-slate-500 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center mx-auto mb-3">
                  <Folder className="w-6 h-6 text-[#7B1113]" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {selectedCategory === 'ALL'
                    ? 'No academic documents in dossier yet'
                    : `Empty Folder: "${selectedCategory}"`}
                </p>
                <p className="text-slate-500 mt-1 max-w-md mx-auto">
                  {canManageFolder
                    ? selectedCategory === 'ALL'
                      ? 'Click "Add Academic Contribution" above to upload your research publications, patents, or certificates.'
                      : `This folder currently has 0 documents. Upload records via "Add Academic Contribution" or delete this empty folder.`
                    : 'This faculty member has not uploaded documents into this folder yet.'}
                </p>
                {canManageFolder && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFileError('');
                        if (selectedCategory !== 'ALL' && categories.includes(selectedCategory)) {
                          setFormData((prev) => ({ ...prev, category: selectedCategory }));
                        }
                        setShowAddRecordModal(true);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{selectedCategory !== 'ALL' ? `Upload to ${selectedCategory}` : 'Add Academic Contribution'}</span>
                    </button>
                    {selectedCategory !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryToDelete({ name: selectedCategory, count: 0 });
                        }}
                        className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Empty Folder</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              displayedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 max-w-3xl">
                    {/* Index */}
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                      {idx + 1}
                    </div>

                    <div className="space-y-1">
                      {/* Clean metadata without pill borders or 'Verified' status */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-bold text-[#7B1113]">{item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>AY {item.academicYear}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.eventDate}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>

                      {/* Details row */}
                      {item.details && Object.keys(item.details).length > 0 && (
                        <div className="text-xs text-slate-600 pt-0.5 space-x-2">
                          {item.details.journal && (
                            <span>
                              <strong>Journal:</strong> {item.details.journal}
                            </span>
                          )}
                          {item.details.doi && (
                            <span>
                              <strong>DOI:</strong> {item.details.doi}
                            </span>
                          )}
                          {item.details.applicationNumber && (
                            <span>
                              <strong>App No:</strong> {item.details.applicationNumber}
                            </span>
                          )}
                          {item.details.organizer && (
                            <span>
                              <strong>Organizer:</strong> {item.details.organizer}
                            </span>
                          )}
                          {item.details.issuer && (
                            <span>
                              <strong>Issuer:</strong> {item.details.issuer}
                            </span>
                          )}
                          {item.details.authors && (
                            <span>
                              <strong>Co-Authors:</strong> {item.details.authors}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: View replaces View Evidence, Download, Delete */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {item.evidenceDocUrl ? (
                      <>
                        <button
                          onClick={() =>
                            setPreviewDoc({
                              url: item.evidenceDocUrl!,
                              name: item.evidenceDocName || `${item.category.toLowerCase()}_file.pdf`,
                              title: item.title,
                              category: item.category,
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="View attached document"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#7B1113]" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() =>
                            handleDownloadDoc(
                              item.evidenceDocUrl!,
                              item.evidenceDocName || `${item.category.toLowerCase()}_file.pdf`
                            )
                          }
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No document attached</span>
                    )}

                    {canManageFolder && item.facultyUserId === user?.id && (
                      <button
                        onClick={() => setDeleteTarget({ id: item.id, title: item.title })}
                        className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create Custom Category Folder */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#7B1113]" />
                <h3 className="text-sm font-bold text-slate-900">Create New Category Folder</h3>
              </div>
              <button
                onClick={() => setShowNewCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Folder Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Consultancy Projects, Book Chapters, Keynotes"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              {/* Suggestions */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
                  Or pick a suggested institutional category:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Book Chapters',
                    'Sponsored Research',
                    'Consultancy Projects',
                    'Keynote Lectures',
                    'Student Mentored Projects',
                    'Hackathon Mentorship',
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewCategoryName(s)}
                      className="px-2 py-1 text-[11px] bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-[#7B1113] rounded-lg border border-slate-200 cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory || !newCategoryName.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingCategory ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Academic Contribution */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Add Academic Contribution</h3>
                <p className="text-[11px] text-slate-500">Upload documents and research evidence into your folder</p>
              </div>
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Category Folder *</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryModal(true)}
                      className="text-[10px] text-[#7B1113] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Create a new custom folder"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ New Folder</span>
                    </button>
                  </div>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Title / Contribution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus in Cloud-Edge Environments"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="2026-27">2026-27 (Current)</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Journal / Organization / Issuer</label>
                  <input
                    type="text"
                    placeholder="e.g. IEEE / Springer / VTU / NPTEL"
                    value={formData.details.journal || formData.details.organizer || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: {
                          ...formData.details,
                          journal: e.target.value,
                          organizer: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DOI / Paper URL / App No.</label>
                  <input
                    type="text"
                    placeholder="e.g. 10.1109/ACCESS.2026..."
                    value={formData.details.doi || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: { ...formData.details, doi: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Co-Authors / Collaborators</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Sharath Kumar, Prof. Ganavi"
                    value={formData.details.authors || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: { ...formData.details, authors: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Documentary Evidence Upload */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supporting Document / Certificate (PDF or Image, max 15MB)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="portfolio-evidence-file"
                />

                {!formData.evidenceDocUrl ? (
                  <label
                    htmlFor="portfolio-evidence-file"
                    className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-[#7B1113] bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl p-4 flex flex-col items-center justify-center text-center block"
                  >
                    <Upload className="w-5 h-5 text-slate-400 mb-1.5" />
                    <span className="font-semibold text-[#7B1113]">
                      Click to upload certificate or scan
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Accepts scanned certificates, signed approvals, or papers (.pdf, .jpg, .png)
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-slate-900 truncate">
                          {formData.evidenceDocName || 'Attached Document'}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-medium">Ready for upload</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          evidenceDocUrl: '',
                          evidenceDocName: '',
                        }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Remove document"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {fileError && (
                  <div className="flex items-center gap-1.5 text-rose-600 text-[11px] mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingFile}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingFile ? 'Processing...' : 'Upload to Portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: In-App Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="truncate pr-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-amber-400">{previewDoc.category}</span>
                  <span>·</span>
                  <span className="truncate">{previewDoc.name}</span>
                </div>
                <h3 className="text-sm font-bold text-white truncate mt-0.5">{previewDoc.title}</h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadDoc(previewDoc.url, previewDoc.name)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content View */}
            <div className="flex-1 p-4 bg-slate-100 overflow-auto flex items-center justify-center min-h-[500px]">
              {previewDoc.url.startsWith('data:image/') ||
              previewDoc.name.match(/\.(png|jpe?g|webp|gif)$/i) ? (
                <div className="max-w-full max-h-[75vh] flex items-center justify-center p-2 bg-white rounded-lg shadow-inner">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    className="max-h-[70vh] max-w-full object-contain rounded"
                  />
                </div>
              ) : previewDoc.url.startsWith('data:application/pdf') ||
                previewDoc.url.startsWith('blob:') ||
                previewDoc.url.endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[75vh] rounded-lg border border-slate-300 bg-white shadow-sm"
                  title={previewDoc.title}
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                  <FileText className="w-12 h-12 text-[#7B1113] mx-auto mb-3" />
                  <p className="font-bold text-slate-800">{previewDoc.name}</p>
                  <p className="text-xs text-slate-500 mt-1">This document format is ready for local inspection.</p>
                  <button
                    onClick={() => handleDownloadDoc(previewDoc.url, previewDoc.name)}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Document</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Remove Academic Record?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <strong className="text-slate-800">{deleteTarget.title}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteRecord}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Category Folder Confirmation */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center animate-in fade-in-50">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Category Folder?</h3>
            <p className="text-xs text-slate-600 mb-2">
              Are you sure you want to delete the folder{' '}
              <strong className="text-slate-900">"{categoryToDelete.name}"</strong>?
            </p>
            {categoryToDelete.count > 0 && (
              <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 mb-3">
                Warning: {categoryToDelete.count} document(s) in this folder will also be deleted from your dossier.
              </p>
            )}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setCategoryToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={confirmDeleteCategory}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeletingCategory ? 'Deleting...' : 'Yes, Delete Folder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
