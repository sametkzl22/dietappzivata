import React from 'react';

interface SilhouetteProps {
    gender: 'male' | 'female';
    bmi: number;
    heightCm: number;
}

// --- Renk ve Kategori Yardımcı Fonksiyonları ---
const getBmiCategory = (bmi: number): 'underweight' | 'normal' | 'overweight' | 'obese' => {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
};

const getColor = (category: string): string => {
    switch (category) {
        case 'underweight': return '#3b82f6'; // Blue
        case 'normal': return '#10b981';      // Green
        case 'overweight': return '#eab308';  // Yellow/Amber
        case 'obese': return '#ef4444';       // Red
        default: return '#94a3b8';
    }
};

const getLabel = (category: string): string => {
    switch (category) {
        case 'underweight': return 'Zayıf';
        case 'normal': return 'Normal';
        case 'overweight': return 'Fazla Kilolu';
        case 'obese': return 'Obez';
        default: return '';
    }
};

// --- Inline SVG İkonları (Profesyonel Görünümlü) ---
const BodyIcons = {
    male: {
        underweight: (color: string) => (
            <svg viewBox="0 0 24 64" fill={color} className="h-full w-auto transition-colors duration-500"><path d="M12,2 C14,2 15.5,3.5 15.5,5.5 C15.5,7.5 14,9 12,9 C10,9 8.5,7.5 8.5,5.5 C8.5,3.5 10,2 12,2 Z M9,11 L15,11 L16,17 C16.2,18 15.5,19 14.5,19 L14,19 L14,33 L15.5,33 C16,33 16.5,33.5 16.5,34 C16.5,34.5 16,35 15.5,35 L13.5,35 L13.5,62 C13.5,63 12.8,63.5 12,63.5 C11.2,63.5 10.5,63 10.5,62 L10.5,35 L8.5,35 C8,35 7.5,34.5 7.5,34 C7.5,33.5 8,33 8.5,33 L10,33 L10,19 L9.5,19 C8.5,19 7.8,18 8,17 L9,11 Z" /></svg>
        ),
        normal: (color: string) => (
            <svg viewBox="0 0 24 64" fill={color} className="h-full w-auto transition-colors duration-500"><path d="M12,1.5 C14.5,1.5 16.5,3.5 16.5,6 C16.5,8.5 14.5,10.5 12,10.5 C9.5,10.5 7.5,8.5 7.5,6 C7.5,3.5 9.5,1.5 12,1.5 Z M8,13 L16,13 C17,13 18,13.8 18.2,14.8 L19,20 C19.2,21 18.5,22 17.5,22 L16.5,22 L16,36 L17.5,36 C18,36 18.5,36.5 18.5,37 C18.5,37.5 18,38 17.5,38 L14.5,38 L14.5,62 C14.5,63 13.8,63.5 13,63.5 C12.2,63.5 11.5,63 11.5,62 L11.5,38 L9.5,38 L9.5,62 C9.5,63 8.8,63.5 8,63.5 C7.2,63.5 6.5,63 6.5,62 L6.5,38 L3.5,38 C3,38 2.5,37.5 2.5,37 C2.5,36.5 3,36 3.5,36 L5,36 L4.5,22 L3.5,22 C2.5,22 1.8,21 2,20 L2.8,14.8 C3,13.8 4,13 5,13 L8,13 Z" /></svg>
        ),
        overweight: (color: string) => (
            <svg viewBox="0 0 24 64" fill={color} className="h-full w-auto transition-colors duration-500"><path d="M12,1 C14.8,1 17,3.2 17,6 C17,8.8 14.8,11 12,11 C9.2,11 7,8.8 7,6 C7,3.2 9.2,1 12,1 Z M7,14 L17,14 C18.5,14 19.8,15.2 20,16.8 L21,23 C21.2,24.5 20,25.5 18.5,25.5 L17.5,25.5 L17,38 L18.5,38 C19.5,38 20,38.5 20,39.5 C20,40.5 19.5,41 18.5,41 L15,41 L15,61.5 C15,62.8 14,63.5 13,63.5 C12,63.5 11,62.8 11,61.5 L11,41 L9,41 L9,61.5 C9,62.8 8,63.5 7,63.5 C6,63.5 5,62.8 5,61.5 L5,41 L1.5,41 C0.5,41 0,40.5 0,39.5 C0,38.5 0.5,38 1.5,38 L3,38 L2.5,25.5 L1.5,25.5 C0,25.5 -1.2,24.5 -1,23 L0,16.8 C0.2,15.2 1.5,14 3,14 L7,14 Z" transform="translate(2,0)" /></svg>
        ),
        obese: (color: string) => (
            <svg viewBox="0 0 24 64" fill={color} className="h-full w-auto transition-colors duration-500"><path d="M12,0.5 C15,0.5 17.5,3 17.5,6 C17.5,9 15,11.5 12,11.5 C9,11.5 6.5,9 6.5,6 C6.5,3 9,0.5 12,0.5 Z M6,15 L18,15 C20,15 21.5,16.5 22,18.5 L23.5,26 C23.8,28 22.5,29.5 20.5,29.5 L19,29.5 L18.5,40 L20,40 C21,40 21.5,40.8 21.5,42 C21.5,43.2 21,44 20,44 L16,44 L16,61 C16,62.5 15,63.5 13.5,63.5 C12,63.5 11,62.5 11,61 L11,44 L9,44 L9,61 C9,62.5 8,63.5 6.5,63.5 C5,63.5 4,62.5 4,61 L4,44 L0,44 C-1,44 -1.5,43.2 -1.5,42 C-1.5,40.8 -1,40 0,40 L1.5,40 L1,29.5 L-0.5,29.5 C-2.5,29.5 -3.8,28 -3.5,26 L-2,18.5 C-1.5,16.5 0,15 2,15 L6,15 Z" transform="translate(4,0)" /></svg>
        )
    },
    female: {
        underweight: (color: string) => (
            <svg viewBox="0 0 24 64" fill={color} className="h-full w-auto transition-colors duration-500"><path d="M12,2 C14,2 15.5,3.5 15.5,5.5 C15.5,7.5 14,9 12,9 C10,9 8.5,7.5 8.5,5.5 C8.5,3.5 10,2 12,2 Z M9.5,11 L14.5,11 C15.5,11 16.2,11.8 16.5,12.8 L17,15 C17.5,17 17.5,19 17,21 C16.5,23 15.5,24.5 15.5,26.5 L16,33 L17.5,33 C18,33 18.5,33.5 18.5,34 C18.5,34.5 18,35 17.5,35 L15.5,35 L15.5,62 C15.5,63 14.8,63.5 14,63.5 C13.2,63.5 12.5,63 12.5,62 L12.5,38 L11.5,38 L11.5,62 C11.5,63 10.8,63.5 10,63.5 C9.2,63.5 8.5,63 8.5,62 L8.5,35 L6.5,35 C6,35 5.5,34.5 5.5,34 C5.5,33.5 6,33 6.5,33 L8,33 L8.5,26.5 C8.5,24.5 7.5,23 7,21 C6.5,19 6.5,17 7,15 L7.5,12.8 C7.8,11.8 8.5,11 9.5,11 Z" /></svg>
        ),
        normal: (color: string) => (
            <svg viewBox="0 0 24 64" fill={color} className="h-full w-auto transition-colors duration-500"><path d="M12,1.5 C14.5,1.5 16.5,3.5 16.5,6 C16.5,8.5 14.5,10.5 12,10.5 C9.5,10.5 7.5,8.5 7.5,6 C7.5,3.5 9.5,1.5 12,1.5 Z M8.5,13 L15.5,13 C16.8,13 17.8,14 18.2,15.2 L19,18 C19.5,20 19.5,22 19,24 C18.5,26.5 17,28 17,30 L17.5,36 L19,36 C19.5,36 20,36.5 20,37 C20,37.5 19.5,38 19,38 L16.5,38 L16.5,62 C16.5,63 15.8,63.5 15,63.5 C14.2,63.5 13.5,63 13.5,62 L13.5,39 L10.5,39 L10.5,62 C10.5,63 9.8,63.5 9,63.5 C8.2,63.5 7.5,63 7.5,62 L7.5,38 L5,38 C4.5,38 4,37.5 4,37 C4,36.5 4.5,36 5,36 L6.5,36 L7,30 C7,28 5.5,26.5 5,24 C4.5,22 4.5,20 5,18 L5.8,15.2 C6.2,14 7.2,13 8.5,13 Z" /></svg>
        ),
        overweight: (color: string) => (
            <svg viewBox="0 0 24 64" fill={color} className="h-full w-auto transition-colors duration-500"><path d="M12,1 C14.8,1 17,3.2 17,6 C17,8.8 14.8,11 12,11 C9.2,11 7,8.8 7,6 C7,3.2 9.2,1 12,1 Z M7.5,14 L16.5,14 C18,14 19.5,15.2 20,17 L21,21 C21.5,23.5 21.5,26 20.5,28.5 C19.5,31.5 18,33 18,35 L18.5,39 L20,39 C20.8,39 21.5,39.5 21.5,40.5 C21.5,41.5 20.8,42 20,42 L17,42 L17,61.5 C17,62.8 16,63.5 14.5,63.5 C13,63.5 12,62.8 12,61.5 L12,43 L10,43 L10,61.5 C10,62.8 9,63.5 7.5,63.5 C6,63.5 5,62.8 5,61.5 L5,42 L2,42 C1.2,42 0.5,41.5 0.5,40.5 C0.5,39.5 1.2,39 2,39 L3.5,39 L4,35 C4,33 2.5,31.5 1.5,28.5 C0.5,26 0.5,23.5 1,21 L2,17 C2.5,15.2 4,14 5.5,14 L7.5,14 Z" transform="translate(1,0)" /></svg>
        ),
        obese: (color: string) => (
            <svg viewBox="0 0 24 64" fill={color} className="h-full w-auto transition-colors duration-500"><path d="M12,0.5 C15,0.5 17.5,3 17.5,6 C17.5,9 15,11.5 12,11.5 C9,11.5 6.5,9 6.5,6 C6.5,3 9,0.5 12,0.5 Z M6.5,15 L17.5,15 C19.5,15 21.5,16.5 22.5,19 L23.5,24 C24,27 24,30 23,33 C22,36.5 20,38 20,40 L20.5,42 L22,42 C23,42 23.5,42.8 23.5,44 C23.5,45.2 23,46 22,46 L18,46 L18,61 C18,62.5 17,63.5 15,63.5 C13,63.5 12,62.5 12,61 L12,47 L10,47 L10,61 C10,62.5 9,63.5 7,63.5 C5,63.5 4,62.5 4,61 L4,46 L0,46 C-1,46 -1.5,45.2 -1.5,44 C-1.5,42.8 -1,42 0,42 L1.5,42 L2,40 C2,38 0,36.5 -1,33 C-2,30 -2,27 -1.5,24 L-0.5,19 C0.5,16.5 2.5,15 4.5,15 L6.5,15 Z" transform="translate(3,0)" /></svg>
        )
    }
};

export default function Silhouette({ gender, bmi, heightCm }: SilhouetteProps) {
    const category = getBmiCategory(bmi);
    const color = getColor(category);
    const label = getLabel(category);

    // Boya göre hafif dikey ölçekleme (Realistik görünüm için)
    const scaleY = Math.max(0.92, Math.min(1.08, heightCm / 175));

    // Doğru SVG'yi seç
    const SvgIcon = BodyIcons[gender][category];

    return (
        <div className="relative flex h-96 w-56 items-end justify-center rounded-[2rem] bg-gradient-to-b from-slate-50 to-slate-100 p-8 shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50 transition-all">

            {/* SVG Konteyneri (Animasyonlu) */}
            <div
                className="h-full w-auto transition-transform duration-700 ease-in-out will-change-transform"
                style={{
                    transform: `scaleY(${scaleY})`,
                    transformOrigin: 'bottom center'
                }}
            >
                {/* Seçilen SVG'yi render et ve rengi uygula */}
                {SvgIcon(color)}
            </div>

            {/* Durum Etiketi */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold shadow-sm backdrop-blur-sm transition-all duration-500`}
                style={{ backgroundColor: color + '15', color: color, boxShadow: `0 4px 12px ${color}30` }}>
                {label}
            </div>
        </div>
    );
}
