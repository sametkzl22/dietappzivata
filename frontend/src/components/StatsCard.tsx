'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    colorScheme?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
}

const colorSchemes = {
    emerald: {
        bg: 'bg-emerald-50',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        accent: 'text-emerald-600',
    },
    blue: {
        bg: 'bg-blue-50',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        accent: 'text-blue-600',
    },
    amber: {
        bg: 'bg-amber-50',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        accent: 'text-amber-600',
    },
    rose: {
        bg: 'bg-rose-50',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
        accent: 'text-rose-600',
    },
    slate: {
        bg: 'bg-slate-50',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-600',
        accent: 'text-slate-600',
    },
};

export default function StatsCard({
    icon: Icon,
    label,
    value,
    subValue,
    colorScheme = 'emerald',
}: StatsCardProps) {
    const colors = colorSchemes[colorScheme];

    return (
        <div className={`relative overflow-hidden rounded-2xl ${colors.bg} p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}>
            {/* Background decoration */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/30 blur-2xl" />

            <div className="relative flex items-start justify-between">
                {/* Icon */}
                <div className={`rounded-xl ${colors.iconBg} p-3`}>
                    <Icon className={`h-6 w-6 ${colors.iconColor}`} strokeWidth={2} />
                </div>
            </div>

            {/* Content */}
            <div className="relative mt-4">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                    <p className={`text-3xl font-bold tracking-tight text-slate-900`}>
                        {value}
                    </p>
                    {subValue && (
                        <span className={`text-sm font-medium ${colors.accent}`}>
                            {subValue}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
