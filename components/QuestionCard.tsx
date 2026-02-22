import React, { useCallback } from 'react';
import { RotateCcw, ArrowRight, CheckCircle, Command, Zap } from 'lucide-react';
import { FormQuestion, QuestionType } from '../types';
import TagInput from './TagInput';

interface QuestionCardProps {
    question: FormQuestion;
    index: number;
    onUpdate: (updatedQuestion: FormQuestion) => void;
    customResponse: string;
    onCustomResponseChange: (val: string) => void;
    // Name Generator Props
    nameSource?: 'auto' | 'indian' | 'custom';
    setNameSource?: (src: 'auto' | 'indian' | 'custom') => void;
    customNamesRaw?: string;
    setCustomNamesRaw?: (val: string) => void;
}

const QuestionCard = React.memo(({
    question: q,
    onUpdate,
    customResponse,
    onCustomResponseChange,
    nameSource,
    setNameSource,
    customNamesRaw,
    setCustomNamesRaw
}: QuestionCardProps) => {

    const [localOptions, setLocalOptions] = React.useState(q.options);
    const [showCustomPool, setShowCustomPool] = React.useState(false);

    // Sync local state when question prop changes
    React.useEffect(() => {
        setLocalOptions(q.options);
    }, [q.options]);

    const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, oIdx: number) => {
        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
        const options = [...localOptions];

        options[oIdx] = { ...options[oIdx], weight: val };
        const remaining = 100 - val;
        const otherIndices = options.map((_, i) => i).filter(i => i !== oIdx);

        if (otherIndices.length > 0) {
            const sumOthers = otherIndices.reduce((sum, i) => sum + (options[i].weight || 0), 0);
            if (sumOthers > 0) {
                otherIndices.forEach(i => {
                    options[i] = {
                        ...options[i],
                        weight: Math.round((options[i].weight! / sumOthers) * remaining)
                    };
                });
            } else {
                const equalShare = Math.floor(remaining / otherIndices.length);
                otherIndices.forEach(i => {
                    options[i] = { ...options[i], weight: equalShare };
                });
            }

            const currentSum = options.reduce((sum, opt) => sum + (opt.weight || 0), 0);
            const diff = 100 - currentSum;
            if (diff !== 0) {
                const adjustIdx = otherIndices[0];
                options[adjustIdx].weight = (options[adjustIdx].weight || 0) + diff;
            }
        }

        setLocalOptions(options);
        const timeoutId = (window as any)[`timeout_${q.id}`];
        if (timeoutId) clearTimeout(timeoutId);
        (window as any)[`timeout_${q.id}`] = setTimeout(() => {
            onUpdate({ ...q, options });
        }, 300);
    }, [q, localOptions, onUpdate]);

    const isBalanced = localOptions.reduce((sum, opt) => sum + (opt.weight || 0), 0) === 100;

    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 group ${isBalanced ? 'bg-white/[0.02] border-white/5' : 'bg-amber-500/[0.02] border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
            } hover:border-white/20`}>

            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate" title={q.title}>
                        {q.title}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono uppercase tracking-[0.1em] border border-white/5">
                            {q.type.replace('_', ' ')}
                        </span>
                        {q.required && (
                            <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-widest">Required</span>
                        )}
                        {isBalanced && (
                            <span className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
                                <CheckCircle className="w-2.5 h-2.5" /> Balanced
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {/* Text Fields: Manual Tag Input Toggle */}
                {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.PARAGRAPH) && (
                    <div className="space-y-4">
                        {/* Name Generator Options (Contextual) */}
                        {q.title.toLowerCase().includes('name') && setNameSource && (
                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <Command className="w-3 h-3 text-amber-500" />
                                    Name Database
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'auto', label: 'AI Auto' },
                                        { id: 'indian', label: 'Indian' },
                                        { id: 'custom', label: 'Manual' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setNameSource(opt.id as any)}
                                            className={`py-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${nameSource === opt.id
                                                ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                                : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {nameSource === 'custom' && setCustomNamesRaw && (
                                    <TagInput
                                        value={customNamesRaw || ''}
                                        onChange={setCustomNamesRaw}
                                        placeholder="Enter manual names..."
                                    />
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setShowCustomPool(!showCustomPool)}
                            className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest"
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${customResponse ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                            {showCustomPool ? 'Hide Data Samples' : customResponse ? 'Edit Data Samples' : 'Add Sample Responses'}
                            <ArrowRight className={`w-3 h-3 transition-transform duration-300 ${showCustomPool ? 'rotate-90' : ''}`} />
                        </button>

                        {showCustomPool && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 mt-2 bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <Zap className="w-3 h-3 text-amber-500" />
                                        Sample Pool
                                    </span>
                                </div>
                                <TagInput
                                    value={customResponse || ''}
                                    onChange={onCustomResponseChange}
                                    placeholder={q.type === QuestionType.PARAGRAPH ? "Provide sample paragraphs..." : "Enter unique responses..."}
                                    isParagraph={q.type === QuestionType.PARAGRAPH}
                                />
                                <p className="text-[10px] text-slate-500 leading-relaxed italic opacity-60">
                                    AI will rotate through these values to ensure diversity.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Option Based Fields: Slim Sliders */}
                {localOptions.length > 0 && localOptions.map((opt, oIdx) => (
                    <div key={oIdx} className="group/item">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-400 group-hover/item:text-slate-200 transition-colors truncate max-w-[75%]" title={opt.value}>
                                {opt.value}
                            </span>
                            <span className="text-amber-400 font-mono font-bold tabular-nums">
                                {opt.weight || 0}%
                            </span>
                        </div>

                        <div className="relative h-1 w-full bg-slate-800/50 rounded-full overflow-hidden">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={opt.weight || 0}
                                onChange={(e) => handleSliderChange(e, oIdx)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                                style={{ width: `${opt.weight || 0}%` }}
                            />
                        </div>
                    </div>
                ))}

                {q.type === QuestionType.LINEAR_SCALE && (
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                            <span>Linear Scale</span>
                            <span>{localOptions.length > 0 ? `${localOptions[0].value} - ${localOptions[localOptions.length - 1].value}` : 'No Range'}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default QuestionCard;
