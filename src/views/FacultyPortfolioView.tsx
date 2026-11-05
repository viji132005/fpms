import React, { useEffect, useState, useRef } from 'react';
import { PortfolioItem } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  FolderGit2,
  Plus,
  Search,
  FileText,
  Trash2,
  Upload,
  Download,
  Eye,
  X,
  FileSpreadsheet,
  CheckCircle2,
  User,
  AlertCircle,
} from 'lucide-react';

export const FacultyPortfolioView: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // In-app Delete Confirmation (no window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Add Record Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    category: 'PUBLICATION',
    title: '',
    academicYear: '2026-27',
    eventDate: new Date().toISOString().split('T')[0],
    details: {} as Record<string, any>,
    evidenceDocUrl: '',
    evidenceDocName: '',
  });

  const categories = [
    { id: 'ALL', label: 'All Records' },
    { id: 'PUBLICATION', label: 'Publications' },
    { id: 'PATENT', label: 'Patents' },
    { id: 'FDP', label: 'FDPs' },
    { id: 'WORKSHOP', label: 'Workshops' },
    { id: 'CONFERENCE', label: 'Conferences' },
    { id: 'SEMINAR', label: 'Seminars' },
    { id: 'CERTIFICATION', label: 'Certifications' },
    { id: 'AWARD', label: 'Awards' },
  ];

  const fetchItems = () => {
    setIsLoading(true);
    let url = '/api/portfolio?';
    if (activeCategory !== 'ALL') url += `category=${activeCategory}&`;

    authFetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch((err) => console.error('Error fetching portfolio items:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, [activeCategory]);

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

  const handleRemoveAttachedFile = () => {
    setFormData((prev) => ({
      ...prev,
      evidenceDocUrl: '',
      evidenceDocName: '',
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const res = await authFetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({
          category: 'PUBLICATION',
          title: '',
          academicYear: '2026-27',
          eventDate: new Date().toISOString().split('T')[0],
          details: {},
          evidenceDocUrl: '',
          evidenceDocName: '',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchItems();
      }
    } catch (err) {
      console.error('Error creating portfolio record:', err);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/portfolio/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        fetchItems();
      }
    } catch (err) {
      console.error('Error deleting portfolio item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadEvidence = (url: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'portfolio_evidence_document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCsv = () => {
    if (filteredItems.length === 0) return;
    const headers = ['Sl. No.', 'Category', 'Title', 'Faculty Name', 'Academic Year', 'Date', 'Details', 'Evidence File'];
    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      `"${item.category}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${(item.facultyName || '').replace(/"/g, '""')}"`,
      `"${item.academicYear}"`,
      `"${item.eventDate}"`,
      `"${JSON.stringify(item.details).replace(/"/g, '""')}"`,
      `"${item.evidenceDocName || (item.evidenceDocUrl ? 'Attached' : 'None')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mit_ise_faculty_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.facultyName && item.facultyName.toLowerCase().includes(q)) ||
      JSON.stringify(item.details).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Academic Portfolio & Evidence Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department of Information Science & Engineering · Maharaja Institute of Technology, Mysore
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {filteredItems.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              title="Export roster for NAAC / NBA Criterion audit"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={() => {
              setFileError('');
              setShowAddModal(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Academic Contribution</span>
          </button>
        </div>
      </div>

      {/* Categories Segmented Control & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search title, DOI, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading portfolio contributions...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No records found for this category.</p>
            <p className="text-slate-400 mt-1">
              Click &ldquo;Add Academic Contribution&rdquo; above to log publications, patents, workshops, or FDP certificates with genuine documentary evidence.
            </p>
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 max-w-3xl">
                {/* Sl. No. badge */}
                <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                  {idx + 1}
                </div>

                <div className="space-y-1.5">
                  {/* Clean unboxed metadata discipline */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-[#7B1113]">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>AY {item.academicYear}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.eventDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {item.status || 'VERIFIED'}
                    </span>
                    {(user?.role === 'ADMIN' || user?.role === 'HOD') && item.facultyName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {item.facultyName}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>

                  {/* Category-specific details preview */}
                  <div className="text-xs text-slate-600 space-y-0.5 pt-0.5">
                    {item.category === 'PUBLICATION' && (
                      <p>
                        <span className="font-semibold text-slate-700">Journal/Conference:</span>{' '}
                        {item.details.journal || 'Peer Reviewed'} ·{' '}
                        <span className="font-semibold text-slate-700">Indexing:</span>{' '}
                        {item.details.indexing || 'Verified'} ·{' '}
                        <span className="font-semibold text-slate-700">DOI:</span>{' '}
                        {item.details.doi || 'N/A'}
                      </p>
                    )}
                    {item.category === 'PATENT' && (
                      <p>
                        <span className="font-semibold text-slate-700">App No:</span>{' '}
                        {item.details.applicationNumber || 'N/A'} ·{' '}
                        <span className="font-semibold text-slate-700">Jurisdiction:</span>{' '}
                        {item.details.jurisdiction || 'Indian Patent Office'} ·{' '}
                        <span className="font-semibold text-slate-700">Status:</span>{' '}
                        {item.details.status || 'Filed'}
                      </p>
                    )}
                    {(item.category === 'FDP' || item.category === 'WORKSHOP' || item.category === 'CONFERENCE' || item.category === 'SEMINAR') && (
                      <p>
                        <span className="font-semibold text-slate-700">Organizer:</span>{' '}
                        {item.details.organizer || 'Academic Body'} ·{' '}
                        <span className="font-semibold text-slate-700">Duration:</span>{' '}
                        {item.details.durationDays ? `${item.details.durationDays} Days` : 'Completed'} ·{' '}
                        <span className="font-semibold text-slate-700">Mode:</span>{' '}
                        {item.details.mode || 'In-Person'}
                      </p>
                    )}
                    {item.category === 'AWARD' && (
                      <p>
                        <span className="font-semibold text-slate-700">Conferring Organization:</span>{' '}
                        {item.details.awardedBy || 'Institutional Council'}
                      </p>
                    )}
                    {item.category === 'CERTIFICATION' && (
                      <p>
                        <span className="font-semibold text-slate-700">Issuing Authority:</span>{' '}
                        {item.details.issuer || 'Professional Body'} ·{' '}
                        <span className="font-semibold text-slate-700">Score/Grade:</span>{' '}
                        {item.details.grade || 'Elite / Completed'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & Evidence */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {item.evidenceDocUrl ? (
                  <>
                    <button
                      onClick={() =>
                        setPreviewDoc({
                          url: item.evidenceDocUrl!,
                          name: item.evidenceDocName || `${item.category.toLowerCase()}_certificate.pdf`,
                          title: item.title,
                          category: item.category,
                        })
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Inspect attached certificate or documentary evidence"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#7B1113]" />
                      <span>View Evidence</span>
                    </button>
                    <button
                      onClick={() =>
                        handleDownloadEvidence(
                          item.evidenceDocUrl!,
                          item.evidenceDocName || `${item.category.toLowerCase()}_evidence.pdf`
                        )
                      }
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Download Attached Document"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No document attached</span>
                )}

                {(user?.role === 'ADMIN' || user?.role === 'HOD' || item.facultyUserId === user?.id) && (
                  <button
                    onClick={() => setDeleteTarget({ id: item.id, title: item.title })}
                    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1"
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

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Add Academic Contribution</h2>
                <p className="text-[11px] text-slate-500">Record research, certifications, or FDP participation</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PUBLICATION">Research Publication</option>
                    <option value="PATENT">Intellectual Property / Patent</option>
                    <option value="FDP">Faculty Development Program (FDP)</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="CONFERENCE">Conference Paper</option>
                    <option value="SEMINAR">Seminar</option>
                    <option value="CERTIFICATION">Professional Certification</option>
                    <option value="AWARD">Honors & Awards</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title / Contribution Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus in Cloud-Edge Environments"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="2026-27">2026-27 (Current)</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Category Fields */}
              {formData.category === 'PUBLICATION' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-800">Publication Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Journal/Conference Name"
                      value={formData.details.journal || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, journal: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Indexing (e.g. Scopus, Web of Science)"
                      value={formData.details.indexing || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, indexing: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="DOI / Paper URL"
                      value={formData.details.doi || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, doi: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Co-authors (if any)"
                      value={formData.details.authors || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, authors: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              )}

              {formData.category === 'PATENT' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-800">Patent Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Application Number"
                      value={formData.details.applicationNumber || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, applicationNumber: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                    <select
                      value={formData.details.status || 'Filed'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, status: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    >
                      <option value="Filed">Filed</option>
                      <option value="Published">Published</option>
                      <option value="Granted">Granted</option>
                    </select>
                  </div>
                </div>
              )}

              {(formData.category === 'FDP' || formData.category === 'WORKSHOP' || formData.category === 'CONFERENCE' || formData.category === 'SEMINAR') && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-800">Program Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Organizer / Host Institution"
                      value={formData.details.organizer || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, organizer: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Duration (in Days)"
                      value={formData.details.durationDays || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, durationDays: Number(e.target.value) },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              )}

              {formData.category === 'CERTIFICATION' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-800">Certification Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Issuing Organization (e.g. NPTEL, AWS)"
                      value={formData.details.issuer || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, issuer: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Score / Grade / Level"
                      value={formData.details.grade || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          details: { ...formData.details, grade: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              )}

              {/* Genuine Documentary Evidence File Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supporting Certificate / Evidence Document (PDF or Image, max 15MB)
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
                      Accepts scanned certificates, signed approvals, or published papers (.pdf, .jpg, .png)
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
                      onClick={handleRemoveAttachedFile}
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
                  disabled={isProcessingFile}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isProcessingFile ? 'Processing...' : 'Save to Portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="truncate pr-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-amber-400">{previewDoc.category}</span>
                  <span>·</span>
                  <span className="truncate">{previewDoc.name}</span>
                </div>
                <h2 className="text-sm font-bold text-white truncate mt-0.5">{previewDoc.title}</h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadEvidence(previewDoc.url, previewDoc.name)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
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
                    onClick={() => handleDownloadEvidence(previewDoc.url, previewDoc.name)}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg inline-flex items-center gap-2"
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
      {/* In-app Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 text-center">
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
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteRecord}
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
