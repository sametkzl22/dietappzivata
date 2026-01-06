'use client';

import React, { useState, useEffect } from 'react';
import Silhouette from '@/components/Silhouette';
import PantryManager from '@/components/PantryManager';
import { Save, User, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
    const router = useRouter();

    // State
    const [formData, setFormData] = useState({
        name: '',
        gender: 'male' as 'male' | 'female',
        age: 25,
        height: 175,
        weight: 75,
        activity: 'moderate',
        waist: 85,
        neck: 38,
        hip: 100,
    });
    const [pantryItems, setPantryItems] = useState<string[]>([]);
    const [bmi, setBmi] = useState(24.5);

    // Real-time BMI Calculation
    useEffect(() => {
        const h_meters = formData.height / 100;
        if (h_meters > 0) {
            const val = formData.weight / (h_meters * h_meters);
            setBmi(val);
        }
    }, [formData.weight, formData.height]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['name', 'gender', 'activity'].includes(name) ? value : parseFloat(value) || 0
        }));
    };

    const handleSubmit = async () => {
        // TODO: Call API to create user & plan
        console.log("Submitting:", { ...formData, pantryItems });
        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-10 px-4 font-sans">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Your Profile</h1>
                    <p className="text-slate-500 mt-2">Let&apos;s personalize your diet plan based on your body and pantry.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-12">
                    {/* LEFT COLUMN: Inputs */}
                    <div className="md:col-span-8 space-y-6">
                        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                            <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-slate-800">
                                <User className="h-5 w-5 text-emerald-600" /> Physical Details
                            </h3>

                            <div className="grid gap-5 sm:grid-cols-2">
                                {/* Basic Fields */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                                    <input name="name" type="text" className="w-full rounded-xl border-slate-200 p-2.5 border focus:ring-2 focus:ring-emerald-200 outline-none transition-all" onChange={handleChange} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full rounded-xl border-slate-200 p-2.5 border bg-white focus:ring-2 focus:ring-emerald-200 outline-none">
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Height (cm)</label>
                                    <input name="height" type="number" value={formData.height} onChange={handleChange} className="w-full rounded-xl border-slate-200 p-2.5 border focus:ring-2 focus:ring-emerald-200 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Weight (kg)</label>
                                    <input name="weight" type="number" value={formData.weight} onChange={handleChange} className="w-full rounded-xl border-slate-200 p-2.5 border focus:ring-2 focus:ring-emerald-200 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Age</label>
                                    <input name="age" type="number" value={formData.age} onChange={handleChange} className="w-full rounded-xl border-slate-200 p-2.5 border focus:ring-2 focus:ring-emerald-200 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Activity Level</label>
                                    <select name="activity" value={formData.activity} onChange={handleChange} className="w-full rounded-xl border-slate-200 p-2.5 border bg-white focus:ring-2 focus:ring-emerald-200 outline-none">
                                        <option value="sedentary">Sedentary (Office job)</option>
                                        <option value="light">Lightly Active (1-3 days/week)</option>
                                        <option value="moderate">Moderately Active (3-5 days/week)</option>
                                        <option value="very">Very Active</option>
                                        <option value="athlete">Athlete</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Pantry Section */}
                        <PantryManager items={pantryItems} onItemsChange={setPantryItems} />

                        <button
                            onClick={handleSubmit}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.01] active:scale-95"
                        >
                            <Save className="h-5 w-5" />
                            Save Profile & Generate Plan
                        </button>
                    </div>

                    {/* RIGHT COLUMN: Visualizer */}
                    <div className="md:col-span-4">
                        <div className="sticky top-6 flex flex-col items-center space-y-4 rounded-2xl bg-white p-6 shadow-xl shadow-emerald-100/50 border border-emerald-50">
                            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                                <Activity className="h-5 w-5" />
                                <span>Live Body Analysis</span>
                            </div>

                            {/* DYNAMIC SILHOUETTE */}
                            <Silhouette
                                gender={formData.gender}
                                bmi={bmi}
                                heightCm={formData.height}
                            />

                            <div className="w-full space-y-2 text-center pt-2">
                                <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{bmi.toFixed(1)}</p>
                                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Current BMI</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
