import React from 'react';
import { Dumbbell, Clock, Flame, Repeat, Info } from 'lucide-react';
import { Exercise } from '@/lib/api';

interface ExerciseCardProps {
    exercise: Exercise;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-bl-3xl -mr-4 -mt-4 opacity-50" />

            <div className="relative">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Dumbbell className="h-5 w-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 line-clamp-1">{exercise.name}</h4>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                        <Flame className="h-3 w-3" />
                        {exercise.calories_burned}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{exercise.duration_minutes} min</span>
                    </div>
                    {(exercise.sets || exercise.reps) && (
                        <div className="flex items-center gap-1.5">
                            <Repeat className="h-3.5 w-3.5 text-slate-400" />
                            <span>{exercise.sets ? `${exercise.sets}` : ''} {exercise.reps ? `x ${exercise.reps}` : ''}</span>
                        </div>
                    )}
                </div>

                {exercise.instructions && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500 italic flex gap-1">
                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {exercise.instructions}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExerciseCard;
