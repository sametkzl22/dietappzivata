'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, isAuthenticated, updateProfile, api, User, setStoredUser, type UserUpdate } from '@/lib/api';
import {
    User as UserIcon, Mail, Ruler, Weight, Activity, Target,
    Calendar, ArrowLeft, Edit2, Save, X, Crown, Sparkles, TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form data matches UserUpdate interface
    const [formData, setFormData] = useState<UserUpdate>({
        name: '',
        height_cm: 0,
        weight_kg: 0,
        age: 0,
        activity_level: 'moderate',
        target_weight_kg: 0
    });

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login');
            return;
        }
        fetchUserData();
    }, [router]);

    const fetchUserData = async () => {
        try {
            const response = await api.get('/users/me');
            setUser(response.data);
            setFormData({
                name: response.data.name || '',
                height_cm: response.data.height_cm || 0,
                weight_kg: response.data.weight_kg || 0,
                age: response.data.age || 0,
                activity_level: response.data.activity_level || 'moderate',
                target_weight_kg: response.data.target_weight_kg || response.data.weight_kg || 0
            });
            // Update local storage too
            setStoredUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            const storedUser = getStoredUser();
            if (storedUser) {
                setUser(storedUser);
                setFormData({
                    name: storedUser.name || '',
                    height_cm: storedUser.height_cm || 0,
                    weight_kg: storedUser.weight_kg || 0,
                    age: storedUser.age || 0,
                    activity_level: storedUser.activity_level || 'moderate',
                    target_weight_kg: (storedUser as any).target_weight_kg || storedUser.weight_kg || 0
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedUser = await updateProfile(formData);
            setUser(updatedUser);
            setEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const calculateBMI = () => {
        if (!user?.height_cm || !user?.weight_kg) return null;
        const heightInMeters = user.height_cm / 100;
        return (user.weight_kg / (heightInMeters * heightInMeters)).toFixed(1);
    };

    const getBMICategory = (bmi: number) => {
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-600' };
        if (bmi < 25) return { label: 'Normal', color: 'text-emerald-600' };
        if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600' };
        return { label: 'Obese', color: 'text-red-600' };
    };

    const getActivityLabel = (level: string) => {
        const labels: Record<string, string> = {
            sedentary: 'Sedentary (little or no exercise)',
            light: 'Lightly Active (1-3 days/week)',
            moderate: 'Moderately Active (3-5 days/week)',
            very: 'Very Active (6-7 days/week)',
            athlete: 'Athlete / Extremely Active',
        };
        // Normalize backend/frontend enum mismatch if any
        if (level === 'lightly_active') return labels.light;
        if (level === 'very_active') return labels.very;
        if (level === 'extremely_active') return labels.athlete;

        return labels[level] || level;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pt-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const bmi = calculateBMI();
    const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pt-20 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back to Dashboard
                    </Link>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                        >
                            <Edit2 className="h-4 w-4" />
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    fetchUserData(); // Reset form
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                <X className="h-4 w-4" />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    {/* Banner */}
                    <div className="h-32 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 relative">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-50"></div>
                    </div>

                    {/* Avatar */}
                    <div className="relative px-6">
                        <div className="absolute -top-16 left-6">
                            <div className={`w-32 h-32 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-xl border-4 border-white ${user.is_superuser
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                }`}>
                                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                            </div>
                            {user.is_superuser && (
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                                    <Crown className="h-4 w-4 text-white" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="pt-20 px-6 pb-6">
                        <div className="flex items-center gap-3 mb-2">
                            {editing ? (
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="text-2xl font-bold text-slate-900 border border-slate-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Your name"
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-slate-900">{user.name || 'No name set'}</h1>
                            )}
                            {user.is_superuser && (
                                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Admin
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {user.email}
                        </p>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    {/* Weight */}
                    <div className="bg-white rounded-xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Weight className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="text-sm text-slate-500">Current Weight</span>
                        </div>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.weight_kg}
                                onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0 })}
                                className="text-2xl font-bold text-slate-900 w-full border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        ) : (
                            <p className="text-2xl font-bold text-slate-900">{user.weight_kg} <span className="text-sm font-normal text-slate-500">kg</span></p>
                        )}
                    </div>

                    {/* Target Weight */}
                    <div className="bg-white rounded-xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-indigo-600" />
                            </div>
                            <span className="text-sm text-slate-500">Target Weight</span>
                        </div>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.target_weight_kg || formData.weight_kg}
                                onChange={(e) => setFormData({ ...formData, target_weight_kg: parseFloat(e.target.value) || 0 })}
                                className="text-2xl font-bold text-slate-900 w-full border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        ) : (
                            <p className="text-2xl font-bold text-slate-900">
                                {(user as any).target_weight_kg || user.weight_kg}
                                <span className="text-sm font-normal text-slate-500"> kg</span>
                            </p>
                        )}
                    </div>

                    {/* Height */}
                    <div className="bg-white rounded-xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Ruler className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-sm text-slate-500">Height</span>
                        </div>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.height_cm}
                                onChange={(e) => setFormData({ ...formData, height_cm: parseFloat(e.target.value) || 0 })}
                                className="text-2xl font-bold text-slate-900 w-full border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        ) : (
                            <p className="text-2xl font-bold text-slate-900">{user.height_cm} <span className="text-sm font-normal text-slate-500">cm</span></p>
                        )}
                    </div>

                    {/* BMI */}
                    <div className="bg-white rounded-xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Target className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="text-sm text-slate-500">BMI</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{bmi || '-'}</p>
                        {bmiCategory && (
                            <p className={`text-xs font-medium ${bmiCategory.color}`}>{bmiCategory.label}</p>
                        )}
                    </div>
                </div>

                {/* Additional Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Activity Level */}
                    <div className="bg-white rounded-xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-orange-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900">Activity Level</h3>
                        </div>
                        {editing ? (
                            <select
                                value={formData.activity_level}
                                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="sedentary">Sedentary (little or no exercise)</option>
                                <option value="light">Lightly Active (1-3 days/week)</option>
                                <option value="moderate">Moderately Active (3-5 days/week)</option>
                                <option value="very">Very Active (6-7 days/week)</option>
                                <option value="athlete">Athlete / Extremely Active</option>
                            </select>
                        ) : (
                            <div>
                                <p className="text-lg font-medium text-slate-900">{getActivityLabel(user.activity_level)}</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Base for TDEE calculation
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Age and Other Details */}
                    <div className="bg-white rounded-xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-rose-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900">Personal Details</h3>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <span className="text-slate-500">Age</span>
                            {editing ? (
                                <input
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                                    className="text-right font-medium text-slate-900 border border-slate-200 rounded px-2 w-20"
                                />
                            ) : (
                                <span className="font-medium text-slate-900">{user.age} years</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-slate-500">Gender</span>
                            <span className="font-medium text-slate-900 capitalize">{user.gender}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <Link
                        href="/pantry"
                        className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 hover:border-emerald-200 hover:shadow-emerald-100/50 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                            <span className="text-2xl">🥗</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">My Pantry</h4>
                            <p className="text-sm text-slate-500">Manage your ingredients</p>
                        </div>
                    </Link>
                    <Link
                        href="/onboarding"
                        className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 hover:border-emerald-200 hover:shadow-emerald-100/50 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200/50">
                            <span className="text-2xl">⚙️</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors">Update Preferences</h4>
                            <p className="text-sm text-slate-500">Dietary needs & goals</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
