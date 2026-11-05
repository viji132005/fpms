import React, { useState, useEffect, useRef } from 'react';
import type { jsPDF as jsPDFType } from 'jspdf';
import * as jspdfNamespace from 'jspdf';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Sparkles,
  FileText,
  Download,
  Bot,
  Send,
  User,
  Copy,
  Check,
  RefreshCw,
  Plus,
  MessageSquare,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Award,
  Users,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Share2,
  Code,
  Terminal,
} from 'lucide-react';

const jsPDF = (jspdfNamespace as any).jsPDF || (jspdfNamespace as any).default || jspdfNamespace;

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  liked?: boolean | null;
}

interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

function fallbackCopy(text: string): void {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  } catch {}
}

/**
 * Lightweight, zero-dependency Markdown renderer for academic assistant responses
 */
const MarkdownBlock: React.FC<{ content: string; onCopyCode?: (code: string) => void }> = ({
  content,
  onCopyCode,
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(code).catch(() => fallbackCopy(code));
      } else {
        fallbackCopy(code);
      }
    } catch {
      fallbackCopy(code);
    }
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
    if (onCopyCode) onCopyCode(code);
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let codeBlockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, '').trim();
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const codeText = codeBuffer.join('\n');
        const currentIdx = codeBlockIndex++;
        elements.push(
          <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>{codeLang || 'text'}</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeText, currentIdx)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedCodeIdx === currentIdx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-slate-900 mt-4 mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B1113]" />
          {line.replace('### ', '')}
        </h3>
      );
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={i} className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-3 mb-1.5 text-slate-700">
          {line.replace('#### ', '')}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200">
          {line.replace('## ', '')}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-3 border-[#7B1113] pl-3 py-1 my-2 bg-amber-50/50 rounded-r text-xs italic text-slate-700">
          {line.replace('> ', '')}
        </blockquote>
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      elements.push(<hr key={i} className="my-3 border-slate-200" />);
      continue;
    }

    // Unordered list
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const itemText = line.trim().replace(/^[-*]\s+/, '');
      elements.push(
        <li key={i} className="ml-4 list-disc text-xs text-slate-700 my-0.5 leading-relaxed">
          <FormatInline text={itemText} />
        </li>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line.trim())) {
      elements.push(
        <li key={i} className="ml-4 list-decimal text-xs text-slate-700 my-0.5 leading-relaxed">
          <FormatInline text={line.trim().replace(/^\d+\.\s+/, '')} />
        </li>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-xs text-slate-700 leading-relaxed my-1">
        <FormatInline text={line} />
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
};

/**
 * Format inline text for bolding, inline code, and highlights
 */
const FormatInline: React.FC<{ text: string }> = ({ text }) => {
  // Simple regex parser for **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 bg-slate-100 text-[#7B1113] rounded font-mono text-[11px] font-semibold border border-slate-200"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

export const AiReportView: React.FC = () => {
  const { profile, department } = useAuth();
  const deptCode = department?.code || 'ISE';
  const deptName = department?.name || 'Information Science and Engineering';

  // Navigation mode
  const [activeMode, setActiveMode] = useState<'chat' | 'formal-report'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ChatGPT Threads State
  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: 'thread-welcome',
      title: 'Academic Appraisal & Mentoring Assistant',
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: `Hello ${profile?.fullName || 'Professor'}! Welcome to your **Institutional Academic GPT** for the Department of ${deptName}.\n\nI am connected directly to your institutional FPMS database records, verified publications, patent files, and assigned student mentees.\n\n### How I can assist you today:\n- **Draft Annual Self-Appraisal Narratives**: Aligned with VTU assessment criteria and API score benchmarks.\n- **NBA Criterion 5 & NAAC Documentation**: Synthesize your teaching-learning innovations and FDPs.\n- **Mentee Progress & Parent Letters**: Generate personalized intervention plans or parental communication logs.\n- **IEEE Conference Abstracts & Proposals**: Formulate structured research outlines from your project topics.\n\nSelect a recommended prompt below or type your question in the message dock!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    },
  ]);

  const [activeThreadId, setActiveThreadId] = useState<string>('thread-welcome');
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Chat Context Switches
  const [includePortfolio, setIncludePortfolio] = useState(true);
  const [includeMentees, setIncludeMentees] = useState(true);

  // Formal Report State
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [useAi, setUseAi] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [editableSummary, setEditableSummary] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages, isChatLoading]);

  // Prompt Starter Templates in 2x2 grid
  const promptStarters = [
    {
      category: 'Annual Appraisal',
      icon: <Award className="w-4 h-4 text-amber-600" />,
      title: 'Draft Annual Self-Appraisal',
      prompt: 'Synthesize my verified publications, patents, and FDP milestones into a formal self-appraisal executive summary for the 2026-27 academic session.',
    },
    {
      category: 'Student Mentorship',
      icon: <Users className="w-4 h-4 text-blue-600" />,
      title: 'Student Mentee Review & Parent Note',
      prompt: 'Review my allocated student mentees and generate a supportive academic progress update draft with parent communication guidance.',
    },
    {
      category: 'NBA / NAAC Accreditation',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      title: 'NBA Criterion 5 Faculty Review',
      prompt: 'Evaluate my teaching-learning and research contributions against NBA Criterion 5 requirements and recommend areas for score improvement.',
    },
    {
      category: 'Research & IEEE Paper',
      icon: <BookOpen className="w-4 h-4 text-purple-600" />,
      title: 'IEEE Conference Abstract Outline',
      prompt: 'Draft a structured research proposal abstract for an IEEE conference on intelligent automated academic governance and balanced student mentoring.',
    },
  ];

  // Quick prompt categories for the sidebar
  const promptCategories = [
    {
      label: 'Self-Appraisal & API Scores',
      prompt: 'Draft my annual self-appraisal summary from my publications and FDPs',
    },
    {
      label: 'NBA Criterion 5 Review',
      prompt: 'Evaluate my portfolio and suggest improvements for NBA Criterion 5',
    },
    {
      label: 'Mentee Progress Letter',
      prompt: 'Review my assigned mentees and draft parent progress updates',
    },
    {
      label: 'Research Paper Abstract',
      prompt: 'Draft an IEEE conference abstract based on my recent research milestones',
    },
    {
      label: 'Question Paper Bloom Taxonomy',
      prompt: 'Formulate 5 Internal Assessment questions mapped to Bloom Taxonomy levels L2-L4 for ISE students',
    },
  ];

  // Start a new chat thread
  const handleCreateNewThread = () => {
    const newId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: 'New Academic Chat',
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `Hello ${profile?.fullName || 'Professor'}! Starting a fresh consultation thread. What would you like to work on—an appraisal writeup, mentee feedback, or research proposal?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
  };

  // Delete chat thread
  const handleDeleteThread = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (threads.length <= 1) {
      handleCreateNewThread();
      return;
    }
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      const remaining = threads.filter((t) => t.id !== threadId);
      setActiveThreadId(remaining[0]?.id || '');
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update active thread with user message & set title if first user message
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThreadId) {
          const isDefaultTitle = t.title === 'New Academic Chat' || t.title === 'Academic Appraisal & Mentoring Assistant';
          const newTitle = isDefaultTitle ? text.slice(0, 36) + (text.length > 36 ? '...' : '') : t.title;
          return {
            ...t,
            title: newTitle,
            updatedAt: new Date().toISOString(),
            messages: [...t.messages, userMsg],
          };
        }
        return t;
      })
    );

    setInputText('');
    setIsChatLoading(true);

    try {
      // Map previous turns for multi-turn conversational context
      const conversationHistory = activeThread.messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await authFetch('/api/reports/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          academicYear,
          conversationHistory,
          includePortfolio,
          includeMentees,
        }),
      });

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'I have analyzed your request based on your portfolio records.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              updatedAt: new Date().toISOString(),
              messages: [...t.messages, botMsg],
            };
          }
          return t;
        })
      );
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I encountered a communication issue connecting to the AI model. Please try submitting again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: [...t.messages, errorMsg],
            };
          }
          return t;
        })
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    } catch {
      fallbackCopy(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLikeMessage = (msgId: string, liked: boolean) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: t.messages.map((m) =>
              m.id === msgId ? { ...m, liked: m.liked === liked ? null : liked } : m
            ),
          };
        }
        return t;
      })
    );
  };

  const handleExportChat = () => {
    const thread = activeThread;
    const exportText = `# Maharaja Institute of Technology, Mysore\n## Faculty Academic Assistant Consultation\nDate: ${new Date().toLocaleDateString()}\nFaculty: ${profile?.fullName || 'Faculty Member'}\n\n` +
      thread.messages
        .map((m) => `### [${m.time}] ${m.sender === 'user' ? 'Faculty' : 'Academic GPT'}:\n${m.text}\n`)
        .join('\n---\n\n');

    const blob = new Blob([exportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MIT_Academic_GPT_${profile?.staffId || 'Chat'}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Formal Report Generation
  const handleGenerateReport = async () => {
    setIsReportLoading(true);
    try {
      const res = await authFetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear,
          useAi,
        }),
      });
      const data = await res.json();
      setReport(data);
      setEditableSummary(data.executiveSummary || '');
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!report) return;

    const doc: jsPDFType = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(123, 17, 19);
    doc.text('MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`DEPARTMENT OF ${deptName.toUpperCase()} (${deptCode})`, 105, 24, { align: 'center' });
    doc.setFontSize(11);
    doc.text('ANNUAL FACULTY PERFORMANCE & PORTFOLIO APPRAISAL', 105, 31, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Assessment Year: ${report.academicYear} | Faculty: ${report.facultyName} (${profile?.designation || 'Faculty'})`, 105, 36, { align: 'center' });

    doc.setDrawColor(123, 17, 19);
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);

    let y = 48;

    // Executive Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EXECUTIVE APPRAISAL SUMMARY & IMPACT', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const summaryLines = doc.splitTextToSize(editableSummary || report.executiveSummary, 180);
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 4.5 + 8;

    // Quantitative Metrics
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('VERIFIED QUANTITATIVE METRICS TABLE', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const metrics = report.statisticalMetrics || {};
    doc.text(`• Research Publications in Indexed Journals/Conferences: ${metrics.totalPublications || 0}`, 18, y);
    y += 5;
    doc.text(`• Intellectual Property & Patents (Filed/Granted): ${metrics.totalPatents || 0}`, 18, y);
    y += 5;
    doc.text(`• Faculty Development Programs & Workshops: ${metrics.totalFdpsAndConferences || 0}`, 18, y);
    y += 5;
    doc.text(`• Institutional Honors & Certifications: ${metrics.totalAwards || 0}`, 18, y);
    y += 10;

    // Sections
    if (Array.isArray(report.sections)) {
      report.sections.forEach((sec: any) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(sec.heading, 14, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        sec.items.forEach((item: string) => {
          const itemLines = doc.splitTextToSize(item, 175);
          doc.text(itemLines, 18, y);
          y += itemLines.length * 3.8 + 2;
        });
        y += 4;
      });
    }

    // Signatures
    if (y > 240) {
      doc.addPage();
      y = 30;
    } else {
      y += 15;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Signature of Faculty Member', 20, y);
    doc.text(`Signature of Head of Department (${deptCode})`, 120, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Date: ____________________', 20, y);
    doc.text('Date: ____________________', 120, y);

    doc.save(`MIT_Mysore_${deptCode}_Faculty_Appraisal_${profile?.staffId || 'Report'}_${report.academicYear}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Mode Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gradient-to-br from-[#7B1113] to-rose-700 text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </span>
            <span>Faculty Academic Assistant</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
              GPT Connected
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Maharaja Institute of Technology, Mysore • Conversational AI intelligence for appraisals, mentee progress, and research.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg self-start">
          <button
            onClick={() => setActiveMode('chat')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeMode === 'chat'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-[#7B1113]" />
            <span>Academic GPT (Chat)</span>
          </button>
          <button
            onClick={() => setActiveMode('formal-report')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeMode === 'formal-report'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Formal Appraisal & PDF</span>
          </button>
        </div>
      </div>

      {/* MODE 1: CHATGPT-STYLE INTERACTIVE ASSISTANT */}
      {activeMode === 'chat' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex h-[720px] overflow-hidden">
          {/* ChatGPT Sidebar */}
          {sidebarOpen && (
            <div className="w-64 sm:w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 transition-all">
              {/* Sidebar Header: New Chat */}
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <button
                  onClick={handleCreateNewThread}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-between transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform" />
                    <span>New Chat</span>
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">
                    ⌘N
                  </span>
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  title="Close sidebar"
                  className="ml-2 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Threads List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  Recent Conversations
                </div>
                {threads.map((t) => {
                  const isActive = t.id === activeThreadId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setActiveThreadId(t.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                        isActive
                          ? 'bg-slate-800 text-white font-medium border border-slate-700/80 shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span className="truncate">{t.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteThread(e, t.id)}
                        title="Delete chat thread"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-400 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {/* Prompt Library Shortcuts */}
                <div className="px-2 pt-4 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  Faculty Templates
                </div>
                {promptCategories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(cat.prompt)}
                    disabled={isChatLoading}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors truncate flex items-center gap-2 disabled:opacity-50"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Model & Security Footer */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Gemini 3.8 Flash</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">MITM-FPMS</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Institutional faculty sandbox. Responses grounded in local ISE database records.
                </p>
              </div>
            </div>
          )}

          {/* ChatGPT Main Chat Area */}
          <div className="flex-1 flex flex-col bg-slate-50/40 relative">
            {/* Chat Area Top Bar */}
            <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    title="Open sidebar"
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors mr-1"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7B1113] to-rose-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  AI
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      MIT Academic GPT
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Session
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <span>{deptName}</span>
                    <span>•</span>
                    <span>{profile?.fullName}</span>
                  </div>
                </div>
              </div>

              {/* Chat Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportChat}
                  title="Export conversation as Markdown"
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Export Chat</span>
                </button>
                <button
                  onClick={() =>
                    setThreads((prev) =>
                      prev.map((t) =>
                        t.id === activeThreadId
                          ? {
                              ...t,
                              messages: [
                                {
                                  id: String(Date.now()),
                                  sender: 'assistant',
                                  text: `Thread reset. How can I assist you with your report or research today?`,
                                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                },
                              ],
                            }
                          : t
                      )
                    )
                  }
                  title="Clear messages in this thread"
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* If single message in thread, show ChatGPT 2x2 Starter Cards */}
              {activeThread.messages.length <= 1 && (
                <div className="my-6 max-w-2xl mx-auto space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7B1113] to-rose-700 text-white flex items-center justify-center mx-auto shadow-md">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      How can Faculty Academic GPT assist you today?
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Choose a starter prompt or ask any question regarding appraisals, accreditation, or student mentorship.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {promptStarters.map((starter, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(starter.prompt)}
                        disabled={isChatLoading}
                        className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-left shadow-xs transition-all hover:shadow-sm group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="p-1 rounded-md bg-slate-100 group-hover:bg-white transition-colors">
                            {starter.icon}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800">
                            {starter.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {starter.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message List */}
              {activeThread.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-3xl mx-auto ${
                    m.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7B1113] to-rose-700 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-1 shadow-xs">
                      AI
                    </div>
                  )}

                  <div className={`space-y-1.5 ${m.sender === 'user' ? 'max-w-[80%]' : 'w-full'}`}>
                    <div
                      className={`rounded-2xl p-4 text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-slate-900 text-white rounded-br-xs shadow-xs ml-auto'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      {m.sender === 'assistant' ? (
                        <MarkdownBlock content={m.text} />
                      ) : (
                        <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div
                      className={`flex items-center gap-3 text-[10px] px-1 ${
                        m.sender === 'user' ? 'justify-end text-slate-400' : 'justify-between text-slate-400'
                      }`}
                    >
                      <span>{m.time}</span>
                      {m.sender === 'assistant' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(m.text, m.id)}
                            className="hover:text-slate-700 flex items-center gap-1 transition-colors"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <div className="h-2.5 w-px bg-slate-200" />

                          <button
                            onClick={() => handleLikeMessage(m.id, true)}
                            title="Helpful response"
                            className={`hover:text-slate-700 transition-colors ${
                              m.liked === true ? 'text-emerald-600 font-bold' : ''
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleLikeMessage(m.id, false)}
                            title="Not helpful"
                            className={`hover:text-slate-700 transition-colors ${
                              m.liked === false ? 'text-rose-600 font-bold' : ''
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {m.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-1 shadow-xs">
                      {profile?.fullName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing / Thinking Animation */}
              {isChatLoading && (
                <div className="flex gap-3 max-w-3xl mx-auto justify-start">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7B1113] to-rose-700 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs">
                    AI
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3.5 text-xs text-slate-500 shadow-xs flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#7B1113] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#7B1113] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#7B1113] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Academic GPT is synthesizing verified portfolio records...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Dock: Context Toggles & Elevated Input */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200/90 shadow-sm space-y-2">
              {/* Context Selector Chips */}
              <div className="max-w-3xl mx-auto flex items-center justify-between text-[11px] px-1 text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Active Grounding:</span>
                  <button
                    type="button"
                    onClick={() => setIncludePortfolio(!includePortfolio)}
                    className={`px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                      includePortfolio
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-medium'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    <Award className="w-3 h-3 text-amber-600" />
                    <span>Portfolio DB Records</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeMentees(!includeMentees)}
                    className={`px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                      includeMentees
                        ? 'bg-blue-50 text-blue-900 border-blue-300 font-medium'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    <Users className="w-3 h-3 text-blue-600" />
                    <span>Allocated Student Mentees</span>
                  </button>
                </div>

                <span className="hidden sm:inline text-slate-400 text-[10px]">
                  Press Enter to send, Shift+Enter for new line
                </span>
              </div>

              {/* Elevated Floating Input Box */}
              <div className="max-w-3xl mx-auto relative flex items-center">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Ask anything (e.g. 'Draft my annual self-appraisal summary', 'Analyze mentee progress', 'Outline IEEE paper')..."
                  className="w-full pl-4 pr-12 py-3 text-xs bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 focus:border-[#7B1113] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#7B1113]/20 transition-all resize-none shadow-xs"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isChatLoading || !inputText.trim()}
                  className={`absolute right-3 bottom-3 p-2 rounded-xl text-white shadow-xs transition-all ${
                    inputText.trim() && !isChatLoading
                      ? 'bg-[#7B1113] hover:bg-[#600d0f] scale-100'
                      : 'bg-slate-300 cursor-not-allowed scale-95'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center text-[10px] text-slate-400 max-w-xl mx-auto pt-0.5">
                Academic GPT references Maharaja Institute of Technology, Mysore verified records. Check critical data before official appraisal submission.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: FORMAL APPRAISAL REPORT & PDF EXPORTER */}
      {activeMode === 'formal-report' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Assessment Academic Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-800"
                >
                  <option value="2026-27">2026-27 (Current Cycle)</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                </select>
              </div>

              <div className="pt-3 sm:pt-0">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={useAi}
                    onChange={(e) => setUseAi(e.target.checked)}
                    className="rounded text-[#7B1113] focus:ring-[#7B1113]"
                  />
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Enable Gemini Synthesis (Grounded in Verified Records)</span>
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isReportLoading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isReportLoading ? (
                <span>Querying DB & Synthesizing...</span>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>Generate Grounded Appraisal Report</span>
                </>
              )}
            </button>
          </div>

          {report && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
              <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                    Maharaja Institute of Technology, Mysore
                  </div>
                  <h2 className="text-base font-bold text-white mt-1">{report.title}</h2>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {report.facultyName} · {report.departmentName}
                  </div>
                </div>

                <button
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Download className="w-4 h-4 text-[#7B1113]" />
                  <span>Download Official PDF</span>
                </button>
              </div>

              <div className="p-6 space-y-6 text-xs text-slate-700">
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                    Executive Appraisal Narrative & Impact
                  </h3>
                  <textarea
                    rows={4}
                    value={editableSummary}
                    onChange={(e) => setEditableSummary(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>

                {report.statisticalMetrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-lg font-bold text-slate-900 tabular-nums">
                        {report.statisticalMetrics.totalPublications}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">Publications</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-lg font-bold text-slate-900 tabular-nums">
                        {report.statisticalMetrics.totalPatents}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">Patents</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-lg font-bold text-slate-900 tabular-nums">
                        {report.statisticalMetrics.totalFdpsAndConferences}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">FDPs / Workshops</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-lg font-bold text-slate-900 tabular-nums">
                        {report.statisticalMetrics.totalAwards}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">Honors & Awards</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
