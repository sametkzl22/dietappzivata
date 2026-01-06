'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminUsers, getStoredUser, toggleUserActive, toggleUserAdmin, AdminStats, AdminUserInfo } from '@/lib/api';
import {
    Users, ChefHat, BarChart3, Shield, Trash2, UserCheck, UserX,
    Crown, RefreshCw, LogOut, Home, Menu, X, ChevronRight
} from 'lucide-react';

type Tab = 'users' | 'recipes' | 'analytics';

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('users');
    const [data, setData] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ is_superuser: boolean; name: string | null } | null>(null);

    useEffect(() => {
        // Check if user is admin
        const user = getStoredUser();
        if (!user) {
            router.push('/login');
            return;
        }
        if (!user.is_superuser) {
            router.push('/dashboard');
            return;
        }
        setCurrentUser(user);
        fetchData();
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        const result = await getAdminUsers();
        if (result) {
            setData(result);
        }
        setLoading(false);
    };

    const handleToggleAdmin = async (userId: number) => {
        await toggleUserAdmin(userId);
        fetchData();
    };

    const handleToggleActive = async (userId: number) => {
        await toggleUserActive(userId);
        fetchData();
    };

    const getBmiStatus = (age: number): { label: string; color: string } => {
        // Placeholder - in real app would calculate from user data
        if (age < 30) return { label: 'Healthy', color: 'text-emerald-400 bg-emerald-400/10' };
        if (age < 50) return { label: 'Normal', color: 'text-yellow-400 bg-yellow-400/10' };
        return { label: 'At Risk', color: 'text-red-400 bg-red-400/10' };
    };

    const menuItems = [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'recipes', label: 'Recipes', icon: ChefHat },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-800/50 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}>
                <div className="flex flex-col h-full p-6">
                    {/* Logo */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Admin Panel</h1>
                                <p className="text-xs text-slate-400">Diet & Fitness</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-slate-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id as Tab);
                                    setSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${activeTab === item.id
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                                {activeTab === item.id && (
                                    <ChevronRight className="h-4 w-4 ml-auto" />
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* User Info & Links */}
                    <div className="space-y-3 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                <Crown className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{currentUser.name || 'Admin'}</p>
                                <p className="text-xs text-emerald-400">Super Admin</p>
                            </div>
                        </div>

                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                        >
                            <Home className="h-5 w-5" />
                            Back to Dashboard
                        </Link>

                        <Link
                            href="/"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-8 overflow-auto">
                {/* Mobile Header */}
                <div className="flex items-center justify-between mb-6 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl bg-white/5 text-white"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                    <div className="w-10" />
                </div>

                {/* Stats Cards */}
                {data && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/5">
                            <p className="text-slate-400 text-sm">Total Users</p>
                            <p className="text-3xl font-bold text-white mt-1">{data.statistics.total_users}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/5">
                            <p className="text-slate-400 text-sm">Active Users</p>
                            <p className="text-3xl font-bold text-emerald-400 mt-1">{data.statistics.active_users}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/5">
                            <p className="text-slate-400 text-sm">Inactive Users</p>
                            <p className="text-3xl font-bold text-red-400 mt-1">{data.statistics.inactive_users}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/5">
                            <p className="text-slate-400 text-sm">Admins</p>
                            <p className="text-3xl font-bold text-yellow-400 mt-1">{data.statistics.admin_users}</p>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                {activeTab === 'users' && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">User Management</h2>
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-slate-400 border-b border-white/5">
                                        <th className="p-4 font-medium">User</th>
                                        <th className="p-4 font-medium">Gender / Age</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium">Role</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center">
                                                <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                                            </td>
                                        </tr>
                                    ) : data?.users.map((user: AdminUserInfo) => {
                                        const status = getBmiStatus(user.age);
                                        return (
                                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${user.is_superuser ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-slate-500 to-slate-600'
                                                            }`}>
                                                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{user.name || 'No Name'}</p>
                                                            <p className="text-sm text-slate-400">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-slate-300 capitalize">{user.gender}</span>
                                                    <span className="text-slate-500 mx-1">•</span>
                                                    <span className="text-slate-400">{user.age} years</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                                                        }`}>
                                                        {user.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${user.is_superuser ? 'bg-yellow-400/10 text-yellow-400' : 'bg-slate-400/10 text-slate-400'
                                                        }`}>
                                                        {user.is_superuser ? <Crown className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                                        {user.is_superuser ? 'Admin' : 'User'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleToggleAdmin(user.id)}
                                                            className="p-2 rounded-lg text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                                                            title="Toggle Admin"
                                                        >
                                                            <Crown className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(user.id)}
                                                            className={`p-2 rounded-lg transition-colors ${user.is_active
                                                                    ? 'text-red-400 hover:bg-red-400/10'
                                                                    : 'text-emerald-400 hover:bg-emerald-400/10'
                                                                }`}
                                                            title={user.is_active ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {data?.users.length === 0 && !loading && (
                            <div className="p-12 text-center">
                                <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400">No users found</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'recipes' && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5 p-12 text-center">
                        <ChefHat className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Recipe Management</h2>
                        <p className="text-slate-400">Coming soon...</p>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5 p-12 text-center">
                        <BarChart3 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Analytics Dashboard</h2>
                        <p className="text-slate-400">Coming soon...</p>
                    </div>
                )}
            </main>
        </div>
    );
}
