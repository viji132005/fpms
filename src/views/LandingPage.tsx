import React, { useEffect, useState, useRef } from 'react';
import { CrestLogo } from '../components/CrestLogo.tsx';
import { FeedPost } from '../types/index.ts';
import { authFetch } from '../utils/api.ts';
import {
  Calendar,
  ArrowRight,
  BookOpen,
  Award,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Rss,
  Pin,
  Image as ImageIcon,
  Maximize2,
  X,
  Play,
  Pause,
  Clock,
  Sparkles,
  Zap,
  Heart,
  MessageSquare,
  Flame,
} from 'lucide-react';

interface LandingPageProps {
  onSignInClick: () => void;
}

interface GalleryItem {
  id: string;
  postId: string;
  imageUrl: string;
  title: string;
  content: string;
  category: string;
  eventDate: string;
  authorName: string;
  authorRole: string;
  isPinned?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignInClick }) => {
  const [publicPosts, setPublicPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Gallery state
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);

  // Progress bar animation timer
  const [progress, setProgress] = useState<number>(0);

  // Active slide index per card post
  const [activeSlide, setActiveSlide] = useState<{ [postId: string]: number }>({});

  // Local likes tracking
  const [localLikes, setLocalLikes] = useState<{ [postId: string]: number }>({});
  const [hasLiked, setHasLiked] = useState<{ [postId: string]: boolean }>({});

  useEffect(() => {
    authFetch('/api/feed')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const approved = data.filter((p) => p.visibility === 'PUBLIC' && p.isApproved);
          setPublicPosts(approved);

          // Initialize likes
          const likesMap: { [id: string]: number } = {};
          approved.forEach((p) => {
            likesMap[p.id] = p.likes?.length || 0;
          });
          setLocalLikes(likesMap);

          // Extract all uploaded gallery items dynamically
          const extracted: GalleryItem[] = [];
          approved.forEach((post) => {
            const mediaList: string[] =
              (post as any).mediaUrls && (post as any).mediaUrls.length > 0
                ? (post as any).mediaUrls
                : post.mediaUrl
                ? [post.mediaUrl]
                : [];

            mediaList.forEach((url, uIdx) => {
              extracted.push({
                id: `${post.id}-img-${uIdx}`,
                postId: post.id,
                imageUrl: url,
                title: post.title,
                content: post.content,
                category: post.category,
                eventDate: post.eventDate,
                authorName: post.authorName,
                authorRole: post.authorRole,
                isPinned: !!(post as any).isPinned,
              });
            });
          });

          setGalleryItems(extracted);
        }
      })
      .catch((err) => console.error('Error fetching public feed:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredGallery = galleryItems.filter((item) => {
    if (selectedCategory === 'ALL') return true;
    return item.category === selectedCategory;
  });

  // Animated progress bar & auto-advancing slides with smooth timing
  const slideDuration = 4500;
  useEffect(() => {
    if (!isPlaying || isHovered || filteredGallery.length <= 1) return;

    setProgress(0);
    const stepTime = 50;
    const increment = (stepTime / slideDuration) * 100;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveGalleryIndex((curr) => (curr + 1) % filteredGallery.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepTime);

    return () => clearInterval(progressInterval);
  }, [isPlaying, isHovered, activeGalleryIndex, filteredGallery.length]);

  // Reset index when changing category
  useEffect(() => {
    setActiveGalleryIndex(0);
    setProgress(0);
  }, [selectedCategory]);

  const handlePrevGallery = () => {
    if (filteredGallery.length === 0) return;
    setProgress(0);
    setActiveGalleryIndex((prev) => (prev - 1 + filteredGallery.length) % filteredGallery.length);
  };

  const handleNextGallery = () => {
    if (filteredGallery.length === 0) return;
    setProgress(0);
    setActiveGalleryIndex((prev) => (prev + 1) % filteredGallery.length);
  };

  const handlePrevSlide = (postId: string, total: number) => {
    setActiveSlide((prev) => {
      const current = prev[postId] || 0;
      return { ...prev, [postId]: (current - 1 + total) % total };
    });
  };

  const handleNextSlide = (postId: string, total: number) => {
    setActiveSlide((prev) => {
      const current = prev[postId] || 0;
      return { ...prev, [postId]: (current + 1) % total };
    });
  };

  const handleLikePost = (postId: string) => {
    const isCurrentlyLiked = !!hasLiked[postId];
    setHasLiked((prev) => ({ ...prev, [postId]: !isCurrentlyLiked }));
    setLocalLikes((prev) => ({
      ...prev,
      [postId]: (prev[postId] || 0) + (isCurrentlyLiked ? -1 : 1),
    }));
  };

  const currentGalleryItem = filteredGallery[activeGalleryIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-[#120305] text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-rose-950/40">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          <CrestLogo size="xl" showText={false} className="mb-6 scale-110 drop-shadow-xl" />

          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 tracking-wider uppercase mb-3 bg-white/5 px-3 py-1 rounded-full border border-amber-300/20 backdrop-blur-sm">
            <span>Affiliated to VTU, Belagavi</span>
            <span aria-hidden="true">·</span>
            <span>Approved by AICTE, New Delhi</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight drop-shadow-lg">
            Maharaja Institute of Technology, Mysore
          </h1>

          <p className="mt-4 text-lg sm:text-xl text-rose-100 font-medium max-w-2xl">
            Faculty Portfolio Management System (FPMS)
          </p>

          <p className="mt-3 text-sm text-slate-300 max-w-2xl leading-relaxed">
            Institutional digital governance platform engineered for comprehensive faculty academic portfolios,
            automated mentor allocations, student promotions, departmental workflows, and accreditation-ready appraisal reports.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onSignInClick}
              className="px-6 py-3 text-sm font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 hover:shadow-rose-900/40"
            >
              <span>Access Institutional Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Senior UI/UX Moving Effect 1: Continuous Campus News Ticker */}
      {publicPosts.length > 0 && (
        <div className="bg-[#7B1113] text-white py-2.5 px-4 overflow-hidden border-y border-rose-900/50 shadow-inner flex items-center">
          <div className="flex items-center gap-2 bg-[#600d0f] px-3 py-0.5 rounded-md font-bold text-[11px] tracking-wider uppercase shrink-0 shadow-sm mr-4 z-10 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Campus Pulse</span>
          </div>

          <div className="relative flex-1 overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-marquee cursor-pointer">
              {publicPosts.concat(publicPosts).map((post, pIdx) => (
                <span key={`${post.id}-${pIdx}`} className="inline-flex items-center gap-2 text-xs font-medium mr-10 opacity-90 hover:opacity-100 transition-opacity">
                  <span className="text-amber-200 font-bold font-mono">[{post.category.replace(/_/g, ' ')}]</span>
                  <span>{post.title}</span>
                  <span className="text-rose-200/60 font-mono text-[10px]">({post.eventDate})</span>
                  <span className="text-rose-300/40">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Senior UI/UX Moving Effect 2: Dynamic Live Photo Gallery Showcase */}
      <section className="py-12 bg-slate-950 text-white border-b border-slate-900 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
                <span>Interactive Institutional Gallery</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-rose-400" />
                <span>Campus Activity & Academic Event Showcase</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Dynamic visual highlights uploaded directly by department faculty and leadership.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'ALL', label: 'All Photos' },
                { key: 'ACADEMIC_EVENT', label: 'Events' },
                { key: 'RESEARCH_MILESTONE', label: 'Research' },
                { key: 'FACULTY_ACHIEVEMENT', label: 'Faculty' },
                { key: 'STUDENT_ACTIVITY', label: 'Students' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all transform active:scale-95 ${
                    selectedCategory === cat.key
                      ? 'bg-[#7B1113] text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-400/30'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-500">Loading campus photo showcase...</div>
          ) : filteredGallery.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-12 text-center text-slate-400">
              <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">
                No active gallery photos in this category.
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Department administrators, HODs, and faculty can upload event pictures with customizable durations in the Academic Feed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main Interactive Stage with Moving Progress Indicator & Ken-Burns Zoom Effect */}
              <div
                className="relative rounded-2xl overflow-hidden bg-black aspect-[16/9] sm:aspect-[21/9] max-h-[520px] border border-slate-800/80 shadow-2xl group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {currentGalleryItem && (
                  <div className="relative w-full h-full overflow-hidden">
                    <img
                      src={currentGalleryItem.imageUrl}
                      alt={currentGalleryItem.title}
                      className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105 cursor-pointer"
                      onClick={() => setLightboxImage(currentGalleryItem)}
                      referrerPolicy="no-referrer"
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />

                    {/* Animated Moving Progress Bar at Top */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-white/10 z-20">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-[#7B1113] transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Caption Overlay */}
                    <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 text-white flex flex-col justify-end z-10">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#7B1113] text-white uppercase tracking-wider shadow-sm">
                          {currentGalleryItem.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-300 flex items-center gap-1 font-mono bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          {currentGalleryItem.eventDate}
                        </span>
                        <span className="text-[11px] text-slate-300">
                          • By {currentGalleryItem.authorName} ({currentGalleryItem.authorRole})
                        </span>
                      </div>

                      <h3 className="text-base sm:text-2xl font-extrabold text-white tracking-tight leading-snug drop-shadow-md">
                        {currentGalleryItem.title}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-2 max-w-3xl mt-1.5 leading-relaxed drop-shadow">
                        {currentGalleryItem.content}
                      </p>
                    </div>

                    {/* Top Controls: Counter, Play/Pause, Fullscreen */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                      <div className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-slate-200 border border-white/15">
                        {activeGalleryIndex + 1} / {filteredGallery.length}
                      </div>

                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white border border-white/15 transition-all transform hover:scale-105"
                        title={isPlaying ? 'Pause auto-slide' : 'Play auto-slide'}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setLightboxImage(currentGalleryItem)}
                        className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white border border-white/15 transition-all transform hover:scale-105"
                        title="View Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Prev / Next Navigation Arrows */}
                    {filteredGallery.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrevGallery();
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-[#7B1113] backdrop-blur-md text-white flex items-center justify-center transition-all transform hover:scale-110 shadow-lg border border-white/10 z-20"
                          title="Previous photo"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextGallery();
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-[#7B1113] backdrop-blur-md text-white flex items-center justify-center transition-all transform hover:scale-110 shadow-lg border border-white/10 z-20"
                          title="Next photo"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Moving Thumbnail Strip */}
              {filteredGallery.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {filteredGallery.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setProgress(0);
                        setActiveGalleryIndex(idx);
                      }}
                      className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all transform hover:-translate-y-0.5 ${
                        idx === activeGalleryIndex
                          ? 'border-[#7B1113] scale-105 shadow-lg shadow-rose-950/60 ring-2 ring-rose-500/50'
                          : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={`thumb-${idx}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {idx === activeGalleryIndex && (
                        <div className="absolute inset-0 bg-[#7B1113]/20 pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Institutional Highlights Grid */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col hover:border-[#7B1113]/30 hover:shadow-md transition-all">
              <ShieldCheck className="w-6 h-6 text-[#7B1113] mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Institutional Governance</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Single-department scoped administration for staff designations, mentor-mentee quotas, and RBAC rules.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col hover:border-[#7B1113]/30 hover:shadow-md transition-all">
              <Users className="w-6 h-6 text-[#7B1113] mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Balanced Mentor Allocation</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                College-format 2-column mentee rosters distributing 2nd, 3rd, and 4th year student cohorts evenly.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col hover:border-[#7B1113]/30 hover:shadow-md transition-all">
              <BookOpen className="w-6 h-6 text-[#7B1113] mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Academic Portfolios</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Verified records for Scopus/WoS publications, Indian patents, FDPs, and awards with document evidence.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col hover:border-[#7B1113]/30 hover:shadow-md transition-all">
              <Award className="w-6 h-6 text-[#7B1113] mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Appraisal & Circulars</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Official circular distributions with document attachments and duration-based visibility controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Public Institutional Feed & Interactive Cards Grid */}
      <section className="py-14 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Rss className="w-5 h-5 text-[#7B1113]" />
              <span>Campus Announcements & Academic Feed</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Approved research achievements, conferences, and institutional notices from MIT Mysore.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading campus announcements...</div>
        ) : publicPosts.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            No public announcements currently active.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {publicPosts.map((post) => {
              const images: string[] =
                (post as any).mediaUrls && (post as any).mediaUrls.length > 0
                  ? (post as any).mediaUrls
                  : post.mediaUrl
                  ? [post.mediaUrl]
                  : [];
              const slideIdx = activeSlide[post.id] || 0;
              const likesCount = localLikes[post.id] !== undefined ? localLikes[post.id] : post.likes?.length || 0;
              const isLiked = !!hasLiked[post.id];

              return (
                <article
                  key={post.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {images.length > 0 && (
                      <div className="h-52 w-full bg-slate-900 overflow-hidden relative group/img">
                        <img
                          src={images[slideIdx]}
                          alt={`${post.title} - ${slideIdx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                          referrerPolicy="no-referrer"
                        />

                        {/* Prev / Next controls for multi-image posts */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrevSlide(post.id, images.length);
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all opacity-0 group-hover/img:opacity-100"
                              title="Previous image"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNextSlide(post.id, images.length);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all opacity-0 group-hover/img:opacity-100"
                              title="Next image"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Slide indicators */}
                            <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none">
                              {images.map((_, i) => (
                                <span
                                  key={i}
                                  className={`h-1.5 rounded-full transition-all ${
                                    i === slideIdx ? 'bg-white w-5' : 'bg-white/50 w-1.5'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#7B1113] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {post.category.replace(/_/g, ' ')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {post.eventDate}
                          </span>
                        </div>
                        {(post as any).isPinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <Pin className="w-3 h-3" />
                            <span>Pinned</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 group-hover:text-[#7B1113] transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-700">By: {post.authorName}</span>
                      <span className="font-mono text-[10px] block text-slate-400">{post.authorRole}</span>
                    </div>

                    {/* Interactive Like Counter on Public Feed */}
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        isLiked
                          ? 'bg-rose-50 text-[#7B1113] border border-rose-200 scale-105'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current text-[#7B1113]' : ''}`} />
                      <span className="tabular-nums">{likesCount}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Lightbox Modal for Fullscreen Photo View */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-50"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2.5 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-5xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.imageUrl}
              alt={lightboxImage.title}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
            <div className="mt-4 text-center text-white max-w-2xl">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#7B1113] uppercase tracking-wider">
                {lightboxImage.category.replace(/_/g, ' ')}
              </span>
              <h4 className="font-bold text-base mt-1.5">{lightboxImage.title}</h4>
              <p className="text-xs text-slate-300 mt-1">{lightboxImage.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 text-xs border-t border-slate-900 text-center">
        <p className="font-semibold text-slate-300">Maharaja Institute of Technology, Mysore</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Belagola, Srirangapatna Taluk, Mandya Dist, Karnataka - 571477 · FPMS Institutional System
        </p>
      </footer>
    </div>
  );
};
