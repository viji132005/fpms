import React, { useEffect, useState } from 'react';
import { StaffProfile, PortfolioItem } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Folder,
  FolderOpen,
  ArrowLeft,
  User,
  Eye,
  Download,
  Trash2,
  FileText,
  Search,
  CheckCircle2,
  X,
  GraduationCap,
} from 'lucide-react';

export const DepartmentPortfolioView: React.FC = () => {
  const { user, department } = useAuth();
  const deptId = department?.id || 'dept-ise';
  const deptCode = department?.code || 'ISE';
  const deptName = department?.name || 'Department';

  const [facultyList, setFacultyList] = useState<StaffProfile[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<StaffProfile | null>(null);
  const [facultyItems, setFacultyItems] = useState<PortfolioItem[]>([]);
  const [facultyItemsLoading, setFacultyItemsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    name: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    authFetch(`/api/staff?departmentId=${encodeURIComponent(deptId)}&type=teaching`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StaffProfile[]) => {
        if (Array.isArray(data)) setFacultyList(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [deptId]);

  const handleSelectFaculty = (fac: StaffProfile) => {
    setSelectedFaculty(fac);
    setFacultyItemsLoading(true);
    authFetch(`/api/portfolio?facultyUserId=${encodeURIComponent(fac.userId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PortfolioItem[]) => {
        if (Array.isArray(data)) setFacultyItems(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setFacultyItemsLoading(false));
  };

  const handleDownloadEvidence = (url: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'evidence_document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredFaculty = facultyList.filter(
    (f) =>
      f.fullName.toLowerCase().includes(search.toLowerCase()) ||
      f.designation.toLowerCase().includes(search.toLowerCase()) ||
      f.staffId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#7B1113]" />
              <span>Department Faculty Portfolio Dossiers</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-[#7B1113] border border-rose-200">
              Dept: {deptCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department of {deptName} • Folder format view of verified academic contributions per faculty member.
          </p>
        </div>

        {selectedFaculty && (
          <button
            onClick={() => setSelectedFaculty(null)}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to All Faculty Folders</span>
          </button>
        )}
      </div>

      {/* VIEW 1: FACULTY FOLDER GRID */}
      {!selectedFaculty ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select a faculty folder to inspect contributions:
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search faculty name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-56 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading faculty folders...</div>
          ) : filteredFaculty.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              No faculty found matching search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFaculty.map((fac) => (
                <div
                  key={fac.id}
                  onClick={() => handleSelectFaculty(fac)}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-[#7B1113] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 group-hover:bg-[#7B1113]/10 text-amber-600 group-hover:text-[#7B1113] flex items-center justify-center transition-colors">
                        <Folder className="w-6 h-6 fill-current" />
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">{fac.staffId}</span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#7B1113] transition-colors leading-tight">
                      {fac.fullName}
                    </h3>
                    <div className="text-[11px] text-slate-500 mt-1">{fac.designation}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {fac.qualification || 'M.Tech'}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-[#7B1113]">
                    <span>Open Portfolio Dossier</span>
                    <span className="text-slate-400 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: DRILL-DOWN INTO SELECTED FACULTY PORTFOLIO */
        <div className="space-y-5">
          {/* Faculty Header Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#7B1113] text-white flex items-center justify-center font-bold text-base shadow-sm">
                {selectedFaculty.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedFaculty.fullName}</h2>
                <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5 flex-wrap">
                  <span>{selectedFaculty.designation}</span>
                  <span>•</span>
                  <span className="font-mono">{selectedFaculty.staffId}</span>
                  <span>•</span>
                  <span>{selectedFaculty.qualification}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px]">{(selectedFaculty as any).user?.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-50 text-[#7B1113] border border-rose-200">
                {facultyItems.length} Verified Records
              </span>
            </div>
          </div>

          {/* Items List */}
          {facultyItemsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading portfolio records...</div>
          ) : facultyItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No portfolio contributions recorded yet.</p>
              <p className="text-slate-400 mt-1">This faculty member has not uploaded research or certificates for this session.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {facultyItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B1113] px-2 py-0.5 bg-rose-50 rounded border border-rose-200">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-500">AY {item.academicYear} · {item.eventDate}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                      <div className="text-[11px] text-slate-600">
                        {item.category === 'PUBLICATION' && (
                          <span>Journal: {item.details?.journal || 'Peer Reviewed'} · Indexing: {item.details?.indexing || 'Verified'}</span>
                        )}
                        {item.category === 'PATENT' && (
                          <span>App No: {item.details?.applicationNumber || 'N/A'} · Status: {item.details?.status || 'Filed'}</span>
                        )}
                        {(item.category === 'FDP' || item.category === 'WORKSHOP') && (
                          <span>Organizer: {item.details?.organizer || 'Academic Body'} · Mode: {item.details?.mode || 'Offline'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Evidence Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {item.evidenceDocUrl ? (
                      <>
                        <button
                          onClick={() =>
                            setPreviewDoc({
                              url: item.evidenceDocUrl!,
                              name: item.evidenceDocName || 'evidence.pdf',
                              title: item.title,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#7B1113]" />
                          <span>View Proof</span>
                        </button>
                        <button
                          onClick={() =>
                            handleDownloadEvidence(
                              item.evidenceDocUrl!,
                              item.evidenceDocName || `${item.category.toLowerCase()}_proof.pdf`
                            )
                          }
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download Evidence"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No document attached</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* In-app Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7B1113]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{previewDoc.title}</h3>
                  <span className="text-[10px] text-slate-500 font-mono">{previewDoc.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadEvidence(previewDoc.url, previewDoc.name)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[450px]">
              {previewDoc.url.startsWith('data:image/') ||
              previewDoc.name.match(/\.(png|jpe?g|webp|gif)$/i) ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow border border-slate-200 bg-white"
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
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
