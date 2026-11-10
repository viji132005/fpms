import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdfjs worker to local bundled worker or fallback CDN
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PdfCanvasViewerProps {
  url: string;
  originalUrl?: string;
  fileName?: string;
  onErrorFallback?: React.ReactNode;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  url,
  originalUrl,
  fileName = 'Document.pdf',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setRenderError(null);

    const loadPdf = async () => {
      try {
        let loadingTask: any;
        if (url.startsWith('data:')) {
          // Decode data URL to Uint8Array directly for robust in-memory parsing
          const parts = url.split(';base64,');
          if (parts.length === 2) {
            const binaryString = atob(parts[1]);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            loadingTask = pdfjsLib.getDocument({ data: bytes });
          } else {
            loadingTask = pdfjsLib.getDocument({ url });
          }
        } else {
          loadingTask = pdfjsLib.getDocument({ url });
        }

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF.js loading fallback:', err);
        if (!isCancelled) {
          setRenderError(err?.message || 'Could not parse PDF content.');
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.6));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  if (renderError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50 rounded-xl border border-slate-200">
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
        <div>
          <p className="text-sm font-bold text-slate-800">{fileName}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Direct in-browser PDF rendering failed: {renderError}. You can open or download the PDF directly below.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <a
            href={originalUrl || url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] rounded-lg shadow-sm hover:bg-[#600d0f]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </a>
          <a
            href={originalUrl || url}
            download={fileName}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
      {/* Top Toolbar */}
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate max-w-xs">{fileName}</span>
          {totalPages > 0 && (
            <span className="px-2 py-0.5 rounded bg-slate-700 font-mono text-[11px] text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-slate-700 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600 disabled:opacity-40"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600 disabled:opacity-40"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-700 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] font-mono text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={originalUrl || url}
            download={fileName}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[11px] font-semibold transition-colors"
            title="Download PDF file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/90 min-h-[400px]"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#7B1113]" />
            <span className="text-xs">Rendering PDF document...</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-2xl rounded border border-slate-700 max-w-full bg-white"
          />
        )}
      </div>
    </div>
  );
};
