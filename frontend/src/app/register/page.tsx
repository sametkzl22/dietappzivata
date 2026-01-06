'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api';
import { Mail, Lock, User, Ruler, Weight, Calendar, Activity, Eye, EyeOff, AlertCircle, ChevronRight, ChevronLeft, Check } from 'lucide-react';

type Step = 'account' | 'body' | 'measurements';

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('account');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        gender: 'male',
        age: 25,
        height_cm: 175,
        weight_kg: 75,
        activity_level: 'moderate',
        waist_cm: 85,
        neck_cm: 38,
        hip_cm: 100,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['age', 'height_cm', 'weight_kg', 'waist_cm', 'neck_cm', 'hip_cm'].includes(name)
                ? parseFloat(value) || 0
                : value
        }));
        setError('');
    };

    const validateStep = (): boolean => {
        if (step === 'account') {
            if (!formData.name || !formData.email || !formData.password) {
                setError('Please fill in all fields');
                return false;
            }
            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters');
                return false;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (!validateStep()) return;
        if (step === 'account') setStep('body');
        else if (step === 'body') setStep('measurements');
    };

    const prevStep = () => {
        if (step === 'body') setStep('account');
        else if (step === 'measurements') setStep('body');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const submitData = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            gender: formData.gender,
            age: formData.age,
            height_cm: formData.height_cm,
            weight_kg: formData.weight_kg,
            activity_level: formData.activity_level,
            waist_cm: formData.waist_cm,
            neck_cm: formData.neck_cm,
            hip_cm: formData.gender === 'female' ? formData.hip_cm : undefined,
        };

        const result = await register(submitData);

        if (result.success) {
            router.push('/dashboard');
        } else {
            setError(result.error || 'Registration failed');
        }

        setLoading(false);
    };

    const steps = [
        { id: 'account', label: 'Account' },
        { id: 'body', label: 'Body Info' },
        { id: 'measurements', label: 'Measurements' },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === step);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 mb-4 shadow-lg shadow-emerald-500/30">
                        <span className="text-3xl">🥗</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
                    <p className="text-slate-400 mt-2">Start your fitness journey today</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((s, idx) => (
                        <React.Fragment key={s.id}>
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all ${idx < currentStepIndex
                                    ? 'bg-emerald-500 text-white'
                                    : idx === currentStepIndex
                                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
                                        : 'bg-white/10 text-slate-400'
                                }`}>
                                {idx < currentStepIndex ? <Check className="h-5 w-5" /> : idx + 1}
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={`w-12 h-1 rounded-full ${idx < currentStepIndex ? 'bg-emerald-500' : 'bg-white/10'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Register Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Step 1: Account */}
                        {step === 'account' && (
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="John Doe"
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Minimum 6 characters"
                                            required
                                            className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Confirm your password"
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Body Info */}
                        {step === 'body' && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Gender</label>
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        >
                                            <option value="male" className="bg-slate-800">Male</option>
                                            <option value="female" className="bg-slate-800">Female</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Age</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <input
                                                type="number"
                                                name="age"
                                                value={formData.age}
                                                onChange={handleChange}
                                                min="10"
                                                max="120"
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Height (cm)</label>
                                        <div className="relative">
                                            <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <input
                                                type="number"
                                                name="height_cm"
                                                value={formData.height_cm}
                                                onChange={handleChange}
                                                min="100"
                                                max="250"
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Weight (kg)</label>
                                        <div className="relative">
                                            <Weight className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <input
                                                type="number"
                                                name="weight_kg"
                                                value={formData.weight_kg}
                                                onChange={handleChange}
                                                min="30"
                                                max="300"
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Activity Level</label>
                                    <div className="relative">
                                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <select
                                            name="activity_level"
                                            value={formData.activity_level}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                                        >
                                            <option value="sedentary" className="bg-slate-800">Sedentary (Office job)</option>
                                            <option value="light" className="bg-slate-800">Light (1-3 days/week)</option>
                                            <option value="moderate" className="bg-slate-800">Moderate (3-5 days/week)</option>
                                            <option value="very" className="bg-slate-800">Very Active (6-7 days/week)</option>
                                            <option value="athlete" className="bg-slate-800">Athlete (2x per day)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Measurements */}
                        {step === 'measurements' && (
                            <div className="space-y-5">
                                <p className="text-sm text-slate-400 text-center">
                                    These measurements help us calculate your body fat percentage accurately.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Waist (cm)</label>
                                        <input
                                            type="number"
                                            name="waist_cm"
                                            value={formData.waist_cm}
                                            onChange={handleChange}
                                            min="50"
                                            max="200"
                                            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Neck (cm)</label>
                                        <input
                                            type="number"
                                            name="neck_cm"
                                            value={formData.neck_cm}
                                            onChange={handleChange}
                                            min="20"
                                            max="60"
                                            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {formData.gender === 'female' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Hip (cm) <span className="text-emerald-400">*Required for females</span></label>
                                        <input
                                            type="number"
                                            name="hip_cm"
                                            value={formData.hip_cm}
                                            onChange={handleChange}
                                            min="60"
                                            max="200"
                                            required
                                            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                )}

                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-sm text-emerald-300">
                                        💡 <strong>Tip:</strong> Measure your waist at the narrowest point (usually at the navel), and your neck just below the larynx.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-3">
                            {step !== 'account' && (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                    Back
                                </button>
                            )}

                            {step !== 'measurements' ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 transition-all"
                                >
                                    Continue
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {loading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="h-5 w-5" />
                                            Create Account
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Login Link */}
                <p className="text-center mt-6 text-slate-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
