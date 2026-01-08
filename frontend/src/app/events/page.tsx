'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Calendar,
    Plus,
    MapPin,
    Users,
    Loader2,
    X,
    Check,
    Clock,
    User,
    Info,
    RefreshCw,
    Image
} from 'lucide-react';
import * as api from '@/lib/api';
import { type User as UserType, type CommunityEvent } from '@/lib/api';

export default function EventsPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [events, setEvents] = useState<CommunityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedEventId, setExpandedEventId] = useState<number | null>(null);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Join state
    const [joiningEventId, setJoiningEventId] = useState<number | null>(null);

    // Info banner state
    const [showInfoBanner, setShowInfoBanner] = useState(true);

    // Polling ref
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        async function fetchData() {
            if (!api.isAuthenticated()) {
                router.push('/login');
                return;
            }

            setIsLoading(true);
            const [currentUser, eventsList] = await Promise.all([
                api.getCurrentUser(),
                api.getEvents()
            ]);

            if (!currentUser) {
                router.push('/login');
                return;
            }

            setUser(currentUser);
            setEvents(eventsList);
            setIsLoading(false);
        }

        fetchData();

        // Set up polling every 30 seconds
        pollingRef.current = setInterval(async () => {
            const eventsList = await api.getEvents();
            setEvents(eventsList);
        }, 30000);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [router]);

    const handleCreateEvent = async () => {
        if (!newTitle.trim() || !newDate) return;
        setIsCreating(true);

        const newEvent = await api.createEvent(newTitle, newDescription, newDate, newLocation, newImageUrl || undefined);
        if (newEvent) {
            setEvents([newEvent, ...events]);
            setNewTitle('');
            setNewDescription('');
            setNewDate('');
            setNewLocation('');
            setNewImageUrl('');
            setShowCreateModal(false);
            toast.success('Event created successfully!');
        } else {
            toast.error('Failed to create event');
        }
        setIsCreating(false);
    };

    const handleJoinEvent = async (eventId: number) => {
        setJoiningEventId(eventId);
        const success = await api.joinEvent(eventId);
        if (success) {
            setEvents(events.map(e => {
                if (e.id === eventId && user) {
                    return {
                        ...e,
                        participant_count: e.participant_count + 1,
                        participants: [...e.participants, {
                            user_id: user.id,
                            user_name: user.name,
                            joined_at: new Date().toISOString()
                        }]
                    };
                }
                return e;
            }));
            toast.success('You joined the event!');
        } else {
            toast.error('Failed to join event');
        }
        setJoiningEventId(null);
    };

    const handleLeaveEvent = async (eventId: number) => {
        setJoiningEventId(eventId);
        const success = await api.leaveEvent(eventId);
        if (success && user) {
            setEvents(events.map(e => {
                if (e.id === eventId) {
                    return {
                        ...e,
                        participant_count: e.participant_count - 1,
                        participants: e.participants.filter(p => p.user_id !== user.id)
                    };
                }
                return e;
            }));
            toast.success('You left the event');
        } else {
            toast.error('Failed to leave event');
        }
        setJoiningEventId(null);
    };

    const isUserJoined = (event: CommunityEvent) => {
        return user && event.participants.some(p => p.user_id === user.id);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatShortDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            day: date.getDate(),
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            time: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const isValidImageUrl = (url: string) => {
        if (!url) return false;
        try {
            new URL(url);
            return url.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null || url.includes('unsplash.com') || url.includes('pexels.com') || url.includes('images.google.com');
        } catch {
            return false;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 pt-20">
            {/* Header */}
            <header className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg fixed top-16 left-0 right-0 z-20">
                <div className="mx-auto max-w-5xl px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Community Events</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3" />
                                    Auto-refreshes every 30s
                                </p>
                            </div>
                        </div>
                        {user?.is_superuser && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 font-medium text-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Create Event
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-8 mt-16">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    </div>
                ) : (
                    <>
                        {/* Info Banner for Non-Admins */}
                        {!user?.is_superuser && showInfoBanner && (
                            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        <strong>ℹ️ Community events are curated by our admins.</strong> Join an event to participate and connect with other members!
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowInfoBanner(false)}
                                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors"
                                >
                                    <X className="h-4 w-4 text-blue-500" />
                                </button>
                            </div>
                        )}

                        {events.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <Calendar className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">No upcoming events</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">
                                    {user?.is_superuser ? 'Create the first event!' : 'Check back later for new events.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {events.map((event) => {
                                    const dateInfo = formatShortDate(event.date);
                                    const joined = isUserJoined(event);

                                    return (
                                        <div
                                            key={event.id}
                                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all"
                                        >
                                            {/* Event Cover Image */}
                                            {event.image_url ? (
                                                <div className="relative h-40 w-full overflow-hidden">
                                                    <img
                                                        src={event.image_url}
                                                        alt={event.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                    <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl p-2 text-center shadow-lg">
                                                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{dateInfo.day}</span>
                                                        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">{dateInfo.month}</span>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="flex">
                                                {/* Date Badge (only if no image) */}
                                                {!event.image_url && (
                                                    <div className="w-20 flex-shrink-0 bg-gradient-to-br from-emerald-400 to-teal-500 p-4 flex flex-col items-center justify-center text-white">
                                                        <span className="text-2xl font-bold">{dateInfo.day}</span>
                                                        <span className="text-sm font-medium uppercase">{dateInfo.month}</span>
                                                        <span className="text-xs mt-1 opacity-80">{dateInfo.time}</span>
                                                    </div>
                                                )}

                                                {/* Event Content */}
                                                <div className={`flex-1 p-4 ${event.image_url ? 'w-full' : ''}`}>
                                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                        {event.title}
                                                    </h3>

                                                    {event.image_url && (
                                                        <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                            <Clock className="h-4 w-4" />
                                                            <span>{dateInfo.time}</span>
                                                        </div>
                                                    )}

                                                    {event.location && (
                                                        <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                            <MapPin className="h-4 w-4" />
                                                            <span>{event.location}</span>
                                                        </div>
                                                    )}

                                                    {event.description && (
                                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                                                            {event.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between mt-4">
                                                        <button
                                                            onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                                                            className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                                        >
                                                            <Users className="h-4 w-4" />
                                                            {event.participant_count} Going
                                                        </button>

                                                        {joined ? (
                                                            <button
                                                                onClick={() => handleLeaveEvent(event.id)}
                                                                disabled={joiningEventId === event.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                                                            >
                                                                {joiningEventId === event.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="h-4 w-4" />
                                                                )}
                                                                Joined
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleJoinEvent(event.id)}
                                                                disabled={joiningEventId === event.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium transition-colors disabled:opacity-50"
                                                            >
                                                                {joiningEventId === event.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Plus className="h-4 w-4" />
                                                                )}
                                                                Join
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Participants */}
                                            {expandedEventId === event.id && (
                                                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                                        Who's Going
                                                    </h4>
                                                    {event.participants.length === 0 ? (
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                                            No one has joined yet. Be the first!
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {event.participants.map((p) => (
                                                                <div
                                                                    key={p.user_id}
                                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 text-sm"
                                                                >
                                                                    <User className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span className="text-slate-700 dark:text-slate-300">
                                                                        {p.user_name || 'Anonymous'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Create Event Modal (Admin Only) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200 dark:border dark:border-slate-800">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create New Event</h3>
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
                                    Event Title *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Morning Yoga Session"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    placeholder="Describe the event..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Date & Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., City Park"
                                        value={newLocation}
                                        onChange={(e) => setNewLocation(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <Image className="h-4 w-4 inline mr-1" />
                                    Cover Image URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/image.jpg"
                                    value={newImageUrl}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                {/* Image Preview */}
                                {newImageUrl && isValidImageUrl(newImageUrl) && (
                                    <div className="mt-2 relative h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <img
                                            src={newImageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
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
                                onClick={handleCreateEvent}
                                disabled={isCreating || !newTitle.trim() || !newDate}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Create Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
