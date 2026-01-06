'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getStoredUser, logout, isAuthenticated, User } from '@/lib/api';
import {
    Menu, X, Home, LayoutDashboard, ChefHat, User as UserIcon,
    Shield, LogIn, UserPlus, LogOut, ChevronDown, Sparkles
} from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        // Check authentication on mount and pathname change
        if (isAuthenticated()) {
            const storedUser = getStoredUser();
            setUser(storedUser);
        } else {
            setUser(null);
        }
    }, [pathname]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
    };

    // Don't show navbar on login/register pages
    if (pathname === '/login' || pathname === '/register') {
        return null;
    }

    // Don't show on admin page (has its own nav)
    if (pathname === '/admin') {
        return null;
    }

    // Guest navigation links
    const guestLinks = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/#features', label: 'Features', icon: Sparkles },
    ];

    // User navigation links
    const userLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/onboarding', label: 'My Pantry', icon: ChefHat },
        { href: '/onboarding', label: 'Profile', icon: UserIcon },
    ];

    // Admin link
    const adminLink = { href: '/admin', label: 'Admin Panel', icon: Shield };

    const navLinks = user ? userLinks : guestLinks;

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-200/50 border-b border-slate-100'
                : 'bg-white/80 backdrop-blur-md'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:shadow-emerald-300/50 transition-all group-hover:scale-105">
                            <span className="text-xl">🥗</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            NutriPlan
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(link => (
                            <Link
                                key={link.href + link.label}
                                href={link.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${pathname === link.href
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                            >
                                <link.icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        ))}
                        {user?.is_superuser && (
                            <Link
                                href={adminLink.href}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-amber-600 hover:bg-amber-50 transition-all"
                            >
                                <adminLink.icon className="h-4 w-4" />
                                {adminLink.label}
                            </Link>
                        )}
                    </div>

                    {/* Auth Section */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md ${user.is_superuser
                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                            : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                        }`}>
                                        {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                    </div>
                                    <div className="text-left hidden lg:block">
                                        <p className="text-sm font-medium text-slate-900">{user.name || 'User'}</p>
                                        <p className="text-xs text-slate-500">{user.is_superuser ? 'Admin' : 'Member'}</p>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setDropdownOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                                            <div className="p-3 border-b border-slate-100 bg-slate-50">
                                                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                            </div>
                                            <div className="p-2">
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                                                >
                                                    <LayoutDashboard className="h-4 w-4" />
                                                    Dashboard
                                                </Link>
                                                <Link
                                                    href="/onboarding"
                                                    onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                                                >
                                                    <UserIcon className="h-4 w-4" />
                                                    Edit Profile
                                                </Link>
                                                {user.is_superuser && (
                                                    <Link
                                                        href="/admin"
                                                        onClick={() => setDropdownOpen(false)}
                                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-all"
                                                    >
                                                        <Shield className="h-4 w-4" />
                                                        Admin Panel
                                                    </Link>
                                                )}
                                            </div>
                                            <div className="p-2 border-t border-slate-100">
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium transition-all"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200/50 hover:shadow-emerald-300/50 hover:scale-105"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 shadow-xl">
                    <div className="px-4 py-4 space-y-2">
                        {navLinks.map(link => (
                            <Link
                                key={link.href + link.label}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === link.href
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                            >
                                <link.icon className="h-5 w-5" />
                                {link.label}
                            </Link>
                        ))}
                        {user?.is_superuser && (
                            <Link
                                href="/admin"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-amber-600 hover:bg-amber-50 font-medium transition-all"
                            >
                                <Shield className="h-5 w-5" />
                                Admin Panel
                            </Link>
                        )}

                        <div className="pt-4 border-t border-slate-100 space-y-2">
                            {user ? (
                                <>
                                    <div className="flex items-center gap-3 px-4 py-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-md ${user.is_superuser
                                                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                                : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                            }`}>
                                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{user.name || 'User'}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                    >
                                        <LogIn className="h-5 w-5" />
                                        Login
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg transition-all"
                                    >
                                        <UserPlus className="h-5 w-5" />
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
