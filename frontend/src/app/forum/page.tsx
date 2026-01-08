'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageSquare,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Send,
    Loader2,
    User,
    X
} from 'lucide-react';
import * as api from '@/lib/api';
import { type User as UserType, type ForumPost, type ForumComment } from '@/lib/api';

export default function ForumPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
    const [expandedPostData, setExpandedPostData] = useState<ForumPost | null>(null);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Comment state
    const [commentText, setCommentText] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!api.isAuthenticated()) {
                router.push('/login');
                return;
            }

            setIsLoading(true);
            const [currentUser, forumPosts] = await Promise.all([
                api.getCurrentUser(),
                api.getForumPosts()
            ]);

            if (!currentUser) {
                router.push('/login');
                return;
            }

            setUser(currentUser);
            setPosts(forumPosts);
            setIsLoading(false);
        }

        fetchData();
    }, [router]);

    const handleCreatePost = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        setIsCreating(true);

        const newPost = await api.createForumPost(newTitle, newContent);
        if (newPost) {
            setPosts([newPost, ...posts]);
            setNewTitle('');
            setNewContent('');
            setShowCreateModal(false);
        }
        setIsCreating(false);
    };

    const handleDeletePost = async (postId: number) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        const success = await api.deleteForumPost(postId);
        if (success) {
            setPosts(posts.filter(p => p.id !== postId));
        }
    };

    const handleExpandPost = async (postId: number) => {
        if (expandedPostId === postId) {
            setExpandedPostId(null);
            setExpandedPostData(null);
            return;
        }

        const postData = await api.getForumPost(postId);
        if (postData) {
            setExpandedPostId(postId);
            setExpandedPostData(postData);
        }
    };

    const handleAddComment = async (postId: number) => {
        if (!commentText.trim()) return;
        setIsCommenting(true);

        const comment = await api.addComment(postId, commentText);
        if (comment && expandedPostData) {
            setExpandedPostData({
                ...expandedPostData,
                comments: [...expandedPostData.comments, comment],
                comments_count: expandedPostData.comments_count + 1
            });
            // Update the posts list
            setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
            setCommentText('');
        }
        setIsCommenting(false);
    };

    const canDelete = (postUserId: number) => {
        return user && (user.id === postUserId || user.is_superuser);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Header */}
            <header className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-30">
                <div className="mx-auto max-w-4xl px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Community Forum</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Discuss, share, and connect</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-violet-500 text-white px-4 py-2 rounded-xl hover:bg-violet-600 transition-all shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30 font-medium text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            New Post
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-6 py-8">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <MessageSquare className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No posts yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Be the first to start a discussion!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all hover:shadow-lg"
                            >
                                {/* Post Header */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                                                {post.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                <User className="h-3.5 w-3.5" />
                                                <span>{post.user_name || 'Anonymous'}</span>
                                                <span>•</span>
                                                <span>{formatDate(post.created_at)}</span>
                                            </div>
                                        </div>
                                        {canDelete(post.user_id) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <p className="mt-3 text-slate-600 dark:text-slate-300 line-clamp-3">
                                        {post.content}
                                    </p>

                                    <button
                                        onClick={() => handleExpandPost(post.id)}
                                        className="mt-4 flex items-center gap-2 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm font-medium transition-colors"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        {post.comments_count} Comments
                                        {expandedPostId === post.id ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Expanded Comments Section */}
                                {expandedPostId === post.id && expandedPostData && (
                                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-5">
                                        {/* Comments List */}
                                        <div className="space-y-3 mb-4">
                                            {expandedPostData.comments.length === 0 ? (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                                    No comments yet. Be the first to comment!
                                                </p>
                                            ) : (
                                                expandedPostData.comments.map((comment) => (
                                                    <div
                                                        key={comment.id}
                                                        className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-700"
                                                    >
                                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                                                            <User className="h-3 w-3" />
                                                            <span className="font-medium">{comment.user_name || 'Anonymous'}</span>
                                                            <span>•</span>
                                                            <span>{formatDate(comment.created_at)}</span>
                                                        </div>
                                                        <p className="text-slate-700 dark:text-slate-300 text-sm">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Add Comment */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Write a comment..."
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500"
                                            />
                                            <button
                                                onClick={() => handleAddComment(post.id)}
                                                disabled={isCommenting || !commentText.trim()}
                                                className="px-4 py-2 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {isCommenting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Post Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200 dark:border dark:border-slate-800">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create New Post</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    placeholder="What's on your mind?"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Content
                                </label>
                                <textarea
                                    placeholder="Share your thoughts, questions, or tips..."
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    rows={5}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePost}
                                disabled={isCreating || !newTitle.trim() || !newContent.trim()}
                                className="flex items-center gap-2 px-5 py-2 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
