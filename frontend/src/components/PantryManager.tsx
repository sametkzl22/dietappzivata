import React, { useState } from 'react';
import { Plus, X, ChefHat } from 'lucide-react';

interface PantryManagerProps {
    items: string[];
    onItemsChange: (items: string[]) => void;
}

export default function PantryManager({ items, onItemsChange }: PantryManagerProps) {
    const [input, setInput] = useState('');

    const addItem = () => {
        const val = input.trim();
        if (val && !items.includes(val)) {
            onItemsChange([...items, val]);
            setInput('');
        }
    };

    const removeItem = (index: number) => {
        onItemsChange(items.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItem();
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-800">My Pantry</h3>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Eggs, Milk, Chicken Breast..."
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <button
                    onClick={addItem}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 active:scale-95 transition-all"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 min-h-[60px] content-start">
                {items.length === 0 && (
                    <p className="w-full text-center text-sm text-slate-400 italic">
                        No items added yet. Add ingredients you have at home!
                    </p>
                )}
                {items.map((item, idx) => (
                    <span
                        key={idx}
                        className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 border border-emerald-100 animate-fadeIn"
                    >
                        {item}
                        <button onClick={() => removeItem(idx)} className="hover:text-red-500 transition-colors">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
}
