import React, { useEffect, useState } from 'react';
import { FeedPost } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  Rss,
  Plus,
  Heart,
  MessageSquare,
  Calendar,
  X,
  Upload,
  Globe,
  Lock,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pin,
  AlertTriangle,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';

export const AcademicFeedView: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edit Post State
  const [editTarget, setEditTarget] = useState<FeedPost | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    category: 'ACADEMIC_EVENT',
    eventDate: '',
    visibility: 'PUBLIC' as 'PUBLIC' | 'INSTITUTION' | 'PRIVATE',
    mediaUrls: [] as string[],
    durationDays: 0,
    isPinned: false,
  });

  // In-app Delete Confirmation (no window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-image active slide tracking
  const [activeSlide, setActiveSlide] = useState<{ [postId: string]: number }>({});

  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    category: 'ACADEMIC_EVENT',
    eventDate: new Date().toISOString().split('T')[0],
    visibility: 'PUBLIC' as 'PUBLIC' | 'INSTITUTION' | 'PRIVATE',
    mediaUrls: [] as string[],
    durationDays: 0, // 0 = Always Active
    isPinned: false,
  });

  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = () => {
    setIsLoading(true);
    authFetch('/api/feed')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPosts(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Multi-Image Upload via FileReader for Create
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPostForm((prev) => ({
          ...prev,
          mediaUrls: [...prev.mediaUrls, result],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSelectedImage = (index: number) => {
    setPostForm((prev) => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
    }));
  };

  // Multi-Image Upload for Edit
  const handleEditPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setEditForm((prev) => ({
          ...prev,
          mediaUrls: [...prev.mediaUrls, result],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEditImage = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
    }));
  };

  const handleOpenEdit = (post: FeedPost) => {
    const images: string[] =
      (post as any).mediaUrls && (post as any).mediaUrls.length > 0
        ? (post as any).mediaUrls
        : post.mediaUrl
        ? [post.mediaUrl]
        : [];

    setEditTarget(post);
    setEditForm({
      title: post.title,
      content: post.content,
      category: post.category,
      eventDate: post.eventDate,
      visibility: post.visibility,
      mediaUrls: images,
      durationDays: (post as any).durationDays || 0,
      isPinned: !!(post as any).isPinned,
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title || !postForm.content) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await authFetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postForm),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setPostForm({
          title: '',
          content: '',
          category: 'ACADEMIC_EVENT',
          eventDate: new Date().toISOString().split('T')[0],
          visibility: 'PUBLIC',
          mediaUrls: [],
          durationDays: 0,
          isPinned: false,
        });
        setStatusMessage('Post published successfully to the academic feed and campus showcase!');
        fetchPosts();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to publish post.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error publishing post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editForm.title || !editForm.content) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await authFetch(`/api/feed/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditTarget(null);
        setStatusMessage('Post updated successfully!');
        fetchPosts();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to update post.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error updating post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeletePost = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/feed/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        setStatusMessage('Post removed successfully.');
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to delete post.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await authFetch(`/api/feed/${postId}/like`, { method: 'POST' });
      if (res.ok) fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInput[postId];
    if (!text || text.trim().length === 0) return;

    try {
      const res = await authFetch(`/api/feed/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setCommentInput((prev) => ({ ...prev, [postId]: '' }));
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Rss className="w-5 h-5 text-[#7B1113]" />
            <span>Institutional Academic Feed & Photo Gallery</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department events, research milestones, conferences, and student achievements with customizable post duration and clear Public vs Internal campus visibility.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Post</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            &times;
          </button>
        </div>
      )}

      {/* Feed List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading academic feed...</div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          <Rss className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No active posts available.</p>
          <p className="text-slate-400 mt-1">Publish an announcement, photo, or milestone above.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {posts.map((post) => {
            const images: string[] =
              (post as any).mediaUrls && (post as any).mediaUrls.length > 0
                ? (post as any).mediaUrls
                : post.mediaUrl
                ? [post.mediaUrl]
                : [];
            const slideIdx = activeSlide[post.id] || 0;
            const isLiked = user && post.likes.includes(user.id);
            const canManage =
              user?.id === post.authorUserId ||
              user?.role === 'ADMIN' ||
              user?.role === 'HOD';

            return (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#7B1113]/10 text-[#7B1113] flex items-center justify-center font-bold text-xs shrink-0">
                      {post.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{post.authorName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>{post.authorRole}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        {(post as any).durationDays > 0 ? (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-700 font-medium bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>{(post as any).durationDays}d duration</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Always Active
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Visibility Badge */}
                    {post.visibility === 'PUBLIC' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        <Globe className="w-3 h-3" />
                        <span>Public</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        <Lock className="w-3 h-3" />
                        <span>Internal Campus</span>
                      </span>
                    )}

                    {(post as any).isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Pin className="w-3 h-3" />
                        <span>Pinned</span>
                      </span>
                    )}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {post.category.replace(/_/g, ' ')}
                    </span>
                    {canManage && (
                      <div className="flex items-center gap-1 ml-1 border-l pl-2 border-slate-200">
                        <button
                          onClick={() => handleOpenEdit(post)}
                          className="p-1 text-slate-400 hover:text-[#7B1113] rounded transition-colors"
                          title="Edit Post"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: post.id, title: post.title })}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <div className="p-4 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900">{post.title}</h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Multi-Image Slider */}
                  {images.length > 0 && (
                    <div className="relative rounded-lg overflow-hidden bg-slate-900 h-72 group">
                      <img
                        src={images[slideIdx]}
                        alt={`${post.title} - photo ${slideIdx + 1}`}
                        className="w-full h-full object-cover transition-all"
                      />

                      {images.length > 1 && (
                        <>
                          <button
                            onClick={() => handlePrevSlide(post.id, images.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                            title="Previous image"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleNextSlide(post.id, images.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                            title="Next image"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none">
                            {images.map((_, idx) => (
                              <span
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  idx === slideIdx ? 'bg-white w-4' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Post Footer & Social */}
                <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 font-medium transition-colors ${
                        isLiked ? 'text-[#7B1113]' : 'hover:text-slate-800'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      <span>{post.likes.length}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Event Date: {post.eventDate}</span>
                  </div>
                </div>

                {/* Comments Section */}
                {post.comments.length > 0 && (
                  <div className="p-4 bg-slate-50/40 border-t border-slate-100 space-y-2">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="text-xs">
                        <span className="font-semibold text-slate-800 mr-2">
                          {comment.userName}:
                        </span>
                        <span className="text-slate-600">{comment.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment Input */}
                <div className="p-3 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    value={commentInput[post.id] || ''}
                    onChange={(e) =>
                      setCommentInput({ ...commentInput, [post.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment(post.id);
                    }}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    className="p-1.5 text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Rss className="w-4 h-4 text-[#7B1113]" />
                <h2 className="text-sm font-bold text-slate-900">Publish Feed & Gallery Post</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Post Title</label>
                <input
                  type="text"
                  required
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="e.g. National Conference on Quantum Computing 2026"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={postForm.category}
                    onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value="ACADEMIC_EVENT">Academic Event</option>
                    <option value="RESEARCH_MILESTONE">Research Milestone</option>
                    <option value="FACULTY_ACHIEVEMENT">Faculty Achievement</option>
                    <option value="STUDENT_ACTIVITY">Student Activity</option>
                    <option value="INSTITUTIONAL_NOTICE">Department Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Display Duration / Expiry
                  </label>
                  <select
                    value={postForm.durationDays}
                    onChange={(e) =>
                      setPostForm({ ...postForm, durationDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value={0}>Always Active (Permanent Default)</option>
                    <option value={3}>Active for 3 Days (Brief Activity)</option>
                    <option value={7}>Active for 7 Days (1 Week)</option>
                    <option value={15}>Active for 15 Days (Fortnight)</option>
                    <option value={30}>Active for 30 Days (1 Month)</option>
                    <option value={60}>Active for 60 Days (2 Months)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={postForm.eventDate}
                    onChange={(e) => setPostForm({ ...postForm, eventDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Audience Visibility</label>
                  <select
                    value={postForm.visibility}
                    onChange={(e) => setPostForm({ ...postForm, visibility: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value="PUBLIC">Public (Campus-Wide & External Showcase)</option>
                    <option value="INSTITUTION">Internal Campus Only (Staff, HODs & Faculty)</option>
                  </select>
                </div>
              </div>

              {/* Explanatory note for visibility */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Audience Visibility Guide:</p>
                <p>• <strong>Public:</strong> Shows on the public landing page gallery for students, recruiters, and external visitors.</p>
                <p>• <strong>Internal Campus:</strong> Visible only inside FPMS after logging in as authorized staff or faculty.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Content</label>
                <textarea
                  required
                  rows={4}
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  placeholder="Detail the event highlights, participants, outcomes..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Upload Gallery Photos (Multiple Supported for Dynamic Carousel)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />

                {postForm.mediaUrls.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {postForm.mediaUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden">
                        <img src={url} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedImage(idx)}
                          className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {user?.role === 'ADMIN' && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={postForm.isPinned}
                      onChange={(e) => setPostForm({ ...postForm, isPinned: e.target.checked })}
                      className="rounded text-[#7B1113] focus:ring-[#7B1113]"
                    />
                    <span>Pin as Default Permanent Institutional Highlight</span>
                  </label>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#7B1113]" />
                <h2 className="text-sm font-bold text-slate-900">Edit Feed & Gallery Post</h2>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePost} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Post Title</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value="ACADEMIC_EVENT">Academic Event</option>
                    <option value="RESEARCH_MILESTONE">Research Milestone</option>
                    <option value="FACULTY_ACHIEVEMENT">Faculty Achievement</option>
                    <option value="STUDENT_ACTIVITY">Student Activity</option>
                    <option value="INSTITUTIONAL_NOTICE">Department Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Display Duration / Expiry
                  </label>
                  <select
                    value={editForm.durationDays}
                    onChange={(e) =>
                      setEditForm({ ...editForm, durationDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value={0}>Always Active (Permanent Default)</option>
                    <option value={3}>Active for 3 Days (Brief Activity)</option>
                    <option value={7}>Active for 7 Days (1 Week)</option>
                    <option value={15}>Active for 15 Days (Fortnight)</option>
                    <option value={30}>Active for 30 Days (1 Month)</option>
                    <option value={60}>Active for 60 Days (2 Months)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.eventDate}
                    onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Audience Visibility</label>
                  <select
                    value={editForm.visibility}
                    onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value="PUBLIC">Public (Campus-Wide & External Showcase)</option>
                    <option value="INSTITUTION">Internal Campus Only (Staff, HODs & Faculty)</option>
                  </select>
                </div>
              </div>

              {/* Explanatory note for visibility */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Audience Visibility Guide:</p>
                <p>• <strong>Public:</strong> Shows on the public landing page gallery for students, recruiters, and external visitors.</p>
                <p>• <strong>Internal Campus:</strong> Visible only inside FPMS after logging in as authorized staff or faculty.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Content</label>
                <textarea
                  required
                  rows={4}
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Upload More Photos / Manage Gallery
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleEditPhotoSelect}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />

                {editForm.mediaUrls.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {editForm.mediaUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden">
                        <img src={url} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeEditImage(idx)}
                          className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {user?.role === 'ADMIN' && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editForm.isPinned}
                      onChange={(e) => setEditForm({ ...editForm, isPinned: e.target.checked })}
                      className="rounded text-[#7B1113] focus:ring-[#7B1113]"
                    />
                    <span>Pin as Default Permanent Institutional Highlight</span>
                  </label>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal (no window.confirm) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Post?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to remove <strong className="text-slate-800">{deleteTarget.title}</strong>?
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
                onClick={confirmDeletePost}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
