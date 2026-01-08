'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Mail,
    Send,
    Loader2,
    User,
    Search,
    ChevronLeft,
    Users,
    RefreshCw,
    UserPlus,
    Check,
    Bell
} from 'lucide-react';
import * as api from '@/lib/api';
import { type User as UserType, type DirectMessage, type Conversation, type UserSimple, type FriendRequest } from '@/lib/api';

export default function MessagesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<UserType | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Message input
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // User list for new conversation (friends only for regular users)
    const [allUsers, setAllUsers] = useState<UserSimple[]>([]);
    const [showUserPicker, setShowUserPicker] = useState(false);

    // Friend requests
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [showFriendRequests, setShowFriendRequests] = useState(false);
    const [acceptingRequest, setAcceptingRequest] = useState<number | null>(null);

    // Refs for polling and scroll position preservation
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const selectedUserIdRef = useRef<number | null>(null);

    // Keep ref in sync with state for polling callback
    useEffect(() => {
        selectedUserIdRef.current = selectedUserId;
    }, [selectedUserId]);

    useEffect(() => {
        async function fetchData() {
            if (!api.isAuthenticated()) {
                router.push('/login');
                return;
            }

            setIsLoading(true);
            const [currentUser, inbox, requests] = await Promise.all([
                api.getCurrentUser(),
                api.getInbox(),
                api.getPendingRequests()
            ]);

            if (!currentUser) {
                router.push('/login');
                return;
            }

            setUser(currentUser);
            setConversations(inbox);
            setPendingRequests(requests);

            // Fetch friends (getUsersForMessaging returns friends for regular users, all for admins)
            const users = await api.getUsersForMessaging();
            setAllUsers(users.filter(u => u.id !== currentUser.id));

            // Check for user ID in URL params
            const userIdParam = searchParams.get('userId');
            if (userIdParam) {
                const userId = parseInt(userIdParam);
                setSelectedUserId(userId);
                setIsLoadingMessages(true);
                const conversationMessages = await api.getConversation(userId);
                setMessages(conversationMessages);
                setIsLoadingMessages(false);
            }

            setIsLoading(false);
        }

        fetchData();

        // Set up polling for messages every 3 seconds
        pollingRef.current = setInterval(async () => {
            const currentSelectedUserId = selectedUserIdRef.current;
            if (currentSelectedUserId) {
                // Fetch messages for current conversation
                const conversationMessages = await api.getConversation(currentSelectedUserId);
                setMessages(prevMessages => {
                    if (conversationMessages.length !== prevMessages.length) {
                        // Scroll to bottom on new messages
                        setTimeout(() => {
                            if (chatContainerRef.current) {
                                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                            }
                        }, 100);
                        return conversationMessages;
                    }
                    const lastNew = conversationMessages[conversationMessages.length - 1];
                    const lastOld = prevMessages[prevMessages.length - 1];
                    if (lastNew?.id !== lastOld?.id) {
                        setTimeout(() => {
                            if (chatContainerRef.current) {
                                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                            }
                        }, 100);
                        return conversationMessages;
                    }
                    return prevMessages;
                });
            }

            // Also refresh inbox
            const inbox = await api.getInbox();
            setConversations(inbox);

            // Refresh pending requests
            const requests = await api.getPendingRequests();
            setPendingRequests(requests);
        }, 3000);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [router, searchParams]);

    const selectConversation = async (userId: number, userName: string | null) => {
        setSelectedUserId(userId);
        setSelectedUserName(userName);
        setIsLoadingMessages(true);
        setShowUserPicker(false);

        const conversationMessages = await api.getConversation(userId);
        setMessages(conversationMessages);

        // Update unread count
        setConversations(conversations.map(c =>
            c.other_user_id === userId ? { ...c, unread_count: 0 } : c
        ));

        setIsLoadingMessages(false);

        // Scroll to bottom
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedUserId) return;
        const messageToSend = messageText;
        setMessageText(''); // Clear immediately for better UX
        setIsSending(true);

        const newMessage = await api.sendMessage(selectedUserId, messageToSend);
        if (newMessage) {
            setMessages(prev => [...prev, newMessage]);

            // Update conversations list
            const existingConvo = conversations.find(c => c.other_user_id === selectedUserId);
            if (existingConvo) {
                setConversations(conversations.map(c =>
                    c.other_user_id === selectedUserId
                        ? { ...c, last_message: messageToSend, last_message_time: new Date().toISOString() }
                        : c
                ));
            } else {
                setConversations([{
                    other_user_id: selectedUserId,
                    other_user_name: selectedUserName,
                    last_message: messageToSend,
                    last_message_time: new Date().toISOString(),
                    unread_count: 0
                }, ...conversations]);
            }

            // Scroll to bottom
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            }, 100);
        } else {
            // Restore message if send failed
            setMessageText(messageToSend);
            toast.error('You can only message friends. Send a friend request first.');
        }
        setIsSending(false);
    };

    const handleAcceptRequest = async (requestId: number) => {
        setAcceptingRequest(requestId);
        const result = await api.acceptFriendRequest(requestId);
        if (result) {
            setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
            toast.success('Friend request accepted! You can now message each other.');
            // Refresh users list
            const users = await api.getUsersForMessaging();
            setAllUsers(users.filter(u => u.id !== user?.id));
        } else {
            toast.error('Failed to accept friend request');
        }
        setAcceptingRequest(null);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('tr-TR', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 pt-20">
            {/* Header */}
            <header className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg fixed top-16 left-0 right-0 z-20">
                <div className="mx-auto max-w-6xl px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Real-time updates
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Friend Requests Button */}
                            {pendingRequests.length > 0 && (
                                <button
                                    onClick={() => setShowFriendRequests(!showFriendRequests)}
                                    className="relative flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/40 transition-colors font-medium text-sm"
                                >
                                    <Bell className="h-4 w-4" />
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                        {pendingRequests.length}
                                    </span>
                                </button>
                            )}
                            {/* New Conversation Button */}
                            <button
                                onClick={() => setShowUserPicker(!showUserPicker)}
                                className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 font-medium text-sm"
                            >
                                <Users className="h-4 w-4" />
                                New Chat
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-6 mt-16">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="flex gap-6 h-[calc(100vh-220px)]">
                        {/* Sidebar - Conversations List */}
                        <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="font-semibold text-slate-900 dark:text-white">Conversations</h2>
                            </div>

                            {/* Friend Requests Panel */}
                            {showFriendRequests && pendingRequests.length > 0 && (
                                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10">
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                                        <UserPlus className="h-3.5 w-3.5" />
                                        Pending Friend Requests
                                    </p>
                                    <div className="space-y-2">
                                        {pendingRequests.map(req => (
                                            <div key={req.id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
                                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                                    {req.sender_name || 'Unknown User'}
                                                </span>
                                                <button
                                                    onClick={() => handleAcceptRequest(req.id)}
                                                    disabled={acceptingRequest === req.id}
                                                    className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                                >
                                                    {acceptingRequest === req.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Check className="h-3 w-3" />
                                                    )}
                                                    Accept
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* User Picker for New Conversation */}
                            {showUserPicker && (
                                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10">
                                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                                        {user?.is_superuser ? 'Select any user:' : 'Select a friend to message:'}
                                    </p>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {allUsers.length === 0 ? (
                                            <p className="text-xs text-slate-500 px-2">
                                                {user?.is_superuser ? 'No users found' : 'No friends yet. Add friends from the Forum!'}
                                            </p>
                                        ) : (
                                            allUsers.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => selectConversation(u.id, u.name)}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-sm text-slate-700 dark:text-slate-300 transition-colors"
                                                >
                                                    {u.name || u.email}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto">
                                {conversations.length === 0 ? (
                                    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                                        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No conversations yet</p>
                                        <p className="text-xs mt-1">
                                            {user?.is_superuser ? 'Click "New Chat" to start' : 'Add friends from the Forum or accept requests!'}
                                        </p>
                                    </div>
                                ) : (
                                    conversations.map((convo) => (
                                        <button
                                            key={convo.other_user_id}
                                            onClick={() => selectConversation(convo.other_user_id, convo.other_user_name)}
                                            className={`w-full text-left p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedUserId === convo.other_user_id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                                                    <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-slate-900 dark:text-white truncate">
                                                            {convo.other_user_name || 'User'}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {formatTime(convo.last_message_time)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-0.5">
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                                            {convo.last_message}
                                                        </p>
                                                        {convo.unread_count > 0 && (
                                                            <span className="ml-2 px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                                                                {convo.unread_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Chat Window */}
                        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                            {!selectedUserId ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
                                    <div className="text-center">
                                        <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>Select a conversation to start messaging</p>
                                        {!user?.is_superuser && allUsers.length === 0 && (
                                            <p className="text-sm mt-2 text-slate-400">
                                                💡 Tip: Add friends from the Forum to start chatting!
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                        <button
                                            onClick={() => { setSelectedUserId(null); setMessages([]); }}
                                            className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                        >
                                            <ChevronLeft className="h-5 w-5 text-slate-500" />
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                            <User className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                                {selectedUserName || 'User'}
                                            </h3>
                                            <p className="text-xs text-green-500 flex items-center gap-1">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                Live chat
                                            </p>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div
                                        ref={chatContainerRef}
                                        className="flex-1 overflow-y-auto p-4 space-y-3"
                                    >
                                        {isLoadingMessages ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400">
                                                <p>No messages yet. Start the conversation!</p>
                                            </div>
                                        ) : (
                                            messages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${msg.sender_id === user?.id
                                                            ? 'bg-indigo-500 text-white rounded-br-md'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
                                                            }`}
                                                    >
                                                        <p className="text-sm">{msg.content}</p>
                                                        <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-indigo-200' : 'text-slate-400'
                                                            }`}>
                                                            {formatTime(msg.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Message Input */}
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type a message..."
                                                value={messageText}
                                                onChange={(e) => setMessageText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={isSending || !messageText.trim()}
                                                className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {isSending ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Send className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
