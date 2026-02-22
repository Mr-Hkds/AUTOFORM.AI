import React, { useMemo, useCallback, useState } from 'react';
import { Settings, CheckCircle, ArrowLeft, Crown, AlertCircle, Target, ShieldCheck, Zap, Sparkles, Command, RotateCcw, Bot, ChevronDown } from 'lucide-react';
import { FormAnalysis, FormQuestion, QuestionType, User } from '../types';
import QuestionCard from './QuestionCard';
import { generateAIPrompt } from '../utils/parsingUtils';
import AIWeightageBridge from './AIWeightageBridge';

// --- LOCAL BADGE ---
const Badge = ({ children, color = "obsidian" }: { children?: React.ReactNode, color?: "obsidian" | "gold" | "premium" }) => {
    const styles = {
        obsidian: "bg-white/5 text-slate-400 border-white/5",
        gold: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        premium: "bg-gradient-to-r from-amber-500/10 to-purple-500/10 text-amber-100 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.2em] font-semibold border backdrop-blur-md ${styles[color]}`}>
            {children}
        </span>
    );
};

interface Step2DashboardProps {
    analysis: FormAnalysis;
    setAnalysis: React.Dispatch<React.SetStateAction<FormAnalysis | null>>;
    user: User | null;
    targetCount: number;
    setTargetCount: (val: number) => void;
    speedMode: 'auto' | 'manual';
    setSpeedMode: (mode: 'auto' | 'manual') => void;
    delayMin: number;
    setDelayMin: (val: number) => void;
    nameSource: 'auto' | 'indian' | 'custom';
    setNameSource: (src: 'auto' | 'indian' | 'custom') => void;
    customNamesRaw: string;
    setCustomNamesRaw: (val: string) => void;
    customResponses: Record<string, string>;
    setCustomResponses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleCompile: () => void;
    reset: () => void;
    setShowPricing: (show: boolean) => void;
    setShowRecommendationModal: (show: boolean) => void;
    checkBalanceAndRedirect: (val: number) => void;
    isLaunching: boolean;
    error: string | null;
}

const Step2Dashboard = React.memo((props: Step2DashboardProps) => {
    const {
        analysis,
        setAnalysis,
        user,
        targetCount,
        setTargetCount,
        speedMode,
        setSpeedMode,
        delayMin,
        setDelayMin,
        nameSource,
        setNameSource,
        customNamesRaw,
        setCustomNamesRaw,
        customResponses,
        setCustomResponses,
        handleCompile,
        reset,
        setShowPricing,
        setShowRecommendationModal,
        checkBalanceAndRedirect,
        isLaunching,
        error
    } = props;

    const [questionSearch, setQuestionSearch] = useState('');
    const [customCountActive, setCustomCountActive] = useState(false);
    const [showWeightageAI, setShowWeightageAI] = useState(false);
    const [showManualTuning, setShowManualTuning] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    // AI Auto-Weight Handler (Now Unified)
    const handleApplyAIWeightages = useCallback((combinedData: any[]) => {
        setAnalysis(prev => {
            if (!prev) return prev;
            const newQuestions = [...prev.questions];

            combinedData.forEach(aiItem => {
                const qIndex = newQuestions.findIndex(q => q.id === aiItem.id);
                if (qIndex === -1) return;

                // Handle Weights
                if (aiItem.options && Array.isArray(aiItem.options)) {
                    const optMap = new Map(aiItem.options.map((o: any) => [o.value, o.weight]));
                    newQuestions[qIndex] = {
                        ...newQuestions[qIndex],
                        options: newQuestions[qIndex].options.map(opt => ({
                            ...opt,
                            weight: optMap.has(opt.value) ? Number(optMap.get(opt.value)) : opt.weight
                        }))
                    };
                }

                // Handle Text Samples (Inject into customResponses state)
                if (aiItem.samples && Array.isArray(aiItem.samples)) {
                    setCustomResponses(prevSamples => ({
                        ...prevSamples,
                        [aiItem.id]: aiItem.samples.join(', ')
                    }));
                }
            });

            return { ...prev, questions: newQuestions };
        });

        setShowWeightageAI(false);
    }, [setAnalysis, setCustomResponses]);

    // Update Single Question Handler
    const handleQuestionUpdate = useCallback((updatedQuestion: FormQuestion) => {
        setAnalysis(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                questions: prev.questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q)
            } as FormAnalysis;
        });
    }, [setAnalysis]);

    const handleCustomResponseChange = useCallback((qId: string, val: string) => {
        setCustomResponses(prev => ({ ...prev, [qId]: val }));
    }, [setCustomResponses]);

    const filteredQuestions = useMemo(() => {
        return analysis.questions.filter(q => {
            if (!questionSearch) return true;
            return q.title.toLowerCase().includes(questionSearch.toLowerCase());
        });
    }, [analysis.questions, questionSearch]);

    // AI Data Injection Helpers
    const relevantTextFields = useMemo(() => analysis.questions.filter(q =>
        (q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.PARAGRAPH) &&
        !q.title.toLowerCase().includes('name')
    ), [analysis.questions]);

    const hasAITab = relevantTextFields.length > 0;
    const hasRequiredAI = relevantTextFields.some(q => q.required);

    const presets = [5, 10, 25, 50, 75, 100];
    const isPreset = presets.includes(targetCount);

    const speedLabel = delayMin === 0 ? 'Warp' : delayMin === 100 ? 'Intensive' : delayMin === 500 ? 'Efficient' : 'Realistic';

    return (
        <section className="w-full animate-fade-in-up pb-28">

            {/* BACK NAVIGATION */}
            <div className="mb-5">
                <button
                    onClick={reset}
                    className="group flex items-center gap-2 text-xs text-slate-500 hover:text-white font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Home
                </button>
            </div>

            {/* HEADER: Title + Badges */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2 tracking-tight truncate">{analysis.title}</h2>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Badge color="obsidian">{analysis.questions.length} Fields</Badge>
                        <Badge color="gold">AI Optimized</Badge>
                        {user && (user.tokens || 0) < targetCount && (
                            <button
                                onClick={() => setShowPricing(true)}
                                className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1.5"
                            >
                                <Crown className="w-3 h-3" />
                                Refill tokens
                            </button>
                        )}
                    </div>
                </div>

                {analysis.description && (
                    <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed italic border-l border-white/10 pl-3 hidden lg:block">
                        {analysis.description}
                    </p>
                )}
            </div>

            {/* ERROR DISPLAY */}
            {error && (
                <div className="mb-6 flex items-center gap-3 text-red-200 bg-red-950/80 border border-red-500/30 px-6 py-4 rounded-xl text-sm font-medium backdrop-blur-xl shadow-xl">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                </div>
            )}

            {/* ─────────────────────────────────────── */}
            {/* SECTION 1: RESPONSE COUNT (Inline)      */}
            {/* ─────────────────────────────────────── */}
            <div className="glass-panel p-5 rounded-xl mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                        <Target className="w-4 h-4 text-emerald-500" />
                        Responses
                    </div>
                    <button
                        onClick={() => setShowRecommendationModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all active:scale-95"
                    >
                        <ShieldCheck className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Guide</span>
                    </button>
                </div>

                {/* PRESET PILLS */}
                <div className="flex flex-wrap gap-2">
                    {presets.map(preset => (
                        <button
                            key={preset}
                            onClick={() => {
                                checkBalanceAndRedirect(preset);
                                setTargetCount(preset);
                                setCustomCountActive(false);
                            }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-mono font-bold transition-all duration-200 active:scale-95 border ${targetCount === preset && !customCountActive
                                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/10'
                                }`}
                        >
                            {preset}
                        </button>
                    ))}

                    {/* CUSTOM PILL */}
                    <button
                        onClick={() => setCustomCountActive(true)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-mono font-bold transition-all duration-200 active:scale-95 border ${customCountActive || (!isPreset && !isNaN(targetCount))
                            ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/10'
                            }`}
                    >
                        Custom:
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={customCountActive || !isPreset ? (isNaN(targetCount) ? '' : targetCount) : ''}
                            placeholder="—"
                            onClick={(e) => { e.stopPropagation(); setCustomCountActive(true); }}
                            onChange={(e) => {
                                setCustomCountActive(true);
                                if (e.target.value === '') {
                                    setTargetCount(NaN);
                                    return;
                                }
                                const val = Math.min(Number(e.target.value), 100);
                                checkBalanceAndRedirect(val);
                                setTargetCount(val);
                            }}
                            className="w-10 bg-transparent text-center outline-none font-mono font-bold placeholder:text-current/40 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </button>
                </div>

                {/* TOKEN WARNING */}
                {user && targetCount > (user.tokens || 0) && (
                    <div className="mt-4 bg-red-900/40 text-red-200 text-xs px-4 py-3 rounded-xl border border-red-500/30 animate-fade-in flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Insufficient Tokens (Current: {user.tokens})
                        </span>
                        <button
                            onClick={() => setShowPricing(true)}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-red-400 transition-colors"
                        >
                            Upgrade
                        </button>
                    </div>
                )}
            </div>

            {/* ─────────────────────────────────────── */}
            {/* SECTION 2: AI SETUP CARD                */}
            {/* ─────────────────────────────────────── */}
            {!showWeightageAI ? (
                <div className="relative group overflow-hidden rounded-2xl border border-indigo-500/20 bg-[#050505] p-6 shadow-2xl transition-all hover:border-indigo-500/40 mb-6">
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-purple-500/[0.03] pointer-events-none" />
                    <div className="absolute -inset-x-20 -inset-y-20 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent rotate-45 pointer-events-none group-hover:translate-x-[200%] duration-1000 transition-transform" />

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 w-full">
                        <div className="flex items-center gap-5 text-center sm:text-left flex-1 min-w-0">
                            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.1)] border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Sparkles className="w-7 h-7 text-indigo-400" />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <h4 className="text-xl font-bold text-white tracking-tight leading-none">Intelligent Setup Wizard</h4>
                                <p className="text-sm text-slate-400 leading-snug pr-4">
                                    Generate distributions and text response samples with AI.
                                </p>
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-auto">
                            <button
                                onClick={() => {
                                    setShowWeightageAI(true);
                                    setShowManualTuning(false);
                                }}
                                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] border border-indigo-400/30 flex items-center justify-center gap-3 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] hover:translate-x-[100%] duration-700 transition-transform pointer-events-none" />
                                <Bot className="w-4 h-4 shrink-0" />
                                Start AI Wizard
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-6">
                    <AIWeightageBridge
                        questions={analysis.questions}
                        onApplyWeightages={handleApplyAIWeightages}
                        onClose={() => setShowWeightageAI(false)}
                    />
                </div>
            )}

            {/* ─────────────────────────────────────── */}
            {/* SECTION 3: ADVANCED MANUAL TUNING        */}
            {/* ─────────────────────────────────────── */}
            <div className="border-t border-white/5 pt-2 mb-6">
                <button
                    onClick={() => setShowManualTuning(!showManualTuning)}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:text-slate-300 transition-colors">
                            <Settings className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <h5 className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors tracking-wide">
                                Advanced Manual Tuning
                            </h5>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Manually adjust sliders and add custom response variants.
                            </p>
                        </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${showManualTuning ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* ADVANCED MANUAL TUNING CONTENT */}
            {showManualTuning && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6 pb-6">
                    {/* Search Field */}
                    <div className="relative">
                        <Command className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={questionSearch}
                            onChange={(e) => setQuestionSearch(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                        />
                    </div>

                    {/* Question Cards  */}
                    <div className="space-y-4">
                        {filteredQuestions.map((q, idx) => (
                            <QuestionCard
                                key={q.id}
                                index={idx}
                                question={q}
                                onUpdate={handleQuestionUpdate}
                                customResponse={customResponses[q.id]}
                                onCustomResponseChange={(val) => handleCustomResponseChange(q.id, val)}
                                nameSource={nameSource}
                                setNameSource={setNameSource}
                                customNamesRaw={customNamesRaw}
                                setCustomNamesRaw={setCustomNamesRaw}
                            />
                        ))}
                    </div>

                    {filteredQuestions.length === 0 && questionSearch && (
                        <div className="text-center py-16 text-slate-500">
                            <p className="text-sm">No fields matching "{questionSearch}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* ─────────────────────────────────────── */}
            {/* SECTION 4: ADVANCED SETTINGS (Speed)    */}
            {/* ─────────────────────────────────────── */}
            <div className="border-t border-white/5 pt-2 mb-6">
                <button
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:text-slate-300 transition-colors">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <h5 className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors tracking-wide">
                                Speed Settings
                            </h5>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Interaction speed and safety settings.
                            </p>
                        </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {showAdvancedSettings && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6 pb-6">

                    {/* INTERACTION SPEED */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                                <Zap className="w-4 h-4 text-amber-500" />
                                Interaction Speed
                            </div>
                            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${delayMin === 0
                                ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20'
                                : delayMin <= 100
                                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                    : delayMin <= 500
                                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                }`}>
                                {speedLabel} ({delayMin}ms)
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { mode: 'auto' as const, delay: null, label: 'Best Choice', desc: 'Recommended', color: 'emerald' },
                                { mode: 'manual' as const, delay: 1000, label: 'Steady', desc: 'Human-like', color: 'amber' },
                                { mode: 'manual' as const, delay: 0, label: 'Warp Drive', desc: '0 Latency', color: 'fuchsia' },
                            ].map(opt => {
                                const isActive = opt.mode === 'auto'
                                    ? speedMode === 'auto'
                                    : speedMode === 'manual' && (opt.delay === 0 ? delayMin === 0 : delayMin >= 1000);

                                const colorMap: Record<string, string> = {
                                    emerald: isActive ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.1)]' : '',
                                    amber: isActive ? 'bg-amber-500/15 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.1)]' : '',
                                    fuchsia: isActive ? 'bg-fuchsia-500/15 border-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.1)]' : '',
                                };

                                return (
                                    <button
                                        key={opt.label}
                                        onClick={() => {
                                            if (opt.mode === 'auto') {
                                                setSpeedMode('auto');
                                            } else {
                                                setSpeedMode('manual');
                                                setDelayMin(opt.delay!);
                                            }
                                        }}
                                        className={`flex flex-col items-center py-4 px-2 rounded-xl border transition-all duration-200 active:scale-95 ${isActive
                                            ? colorMap[opt.color]
                                            : 'bg-white/[0.03] border-white/5 text-slate-500 hover:bg-white/[0.06] hover:border-white/10 hover:text-slate-300'
                                            }`}
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-wider mb-1">{opt.label}</span>
                                        <span className="text-[8px] opacity-60">{opt.desc}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {speedMode === 'auto' && (
                            <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/5 px-3 py-2 rounded-lg border border-emerald-500/10">
                                <CheckCircle className="w-3 h-3" />
                                Speed will be automatically optimized for safety
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECURITY NOTE */}
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-[10px] text-red-200/60 leading-relaxed font-mono flex items-start gap-2 mb-6">
                <ShieldCheck className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                <span>To maintain account integrity, avoid exceeding 100 responses per hour per IP address.</span>
            </div>

            {/* STICKY LAUNCH BAR */}
            <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in-up">
                <div className="max-w-5xl mx-auto px-4 pb-4">
                    <div className="relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 px-5 py-3.5 flex items-center justify-between gap-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.03] via-transparent to-amber-500/[0.03] pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10 min-w-0">
                            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                                <span className="truncate max-w-[180px] font-medium text-slate-300">{analysis.title}</span>
                                <span className="text-slate-600">·</span>
                                <span className="font-mono text-amber-400 font-bold">{isNaN(targetCount) ? '—' : targetCount}</span>
                                <span>responses</span>
                                <span className="text-slate-600">·</span>
                                <span className={`font-mono ${delayMin === 0 ? 'text-fuchsia-400' : delayMin <= 500 ? 'text-amber-400' : 'text-emerald-400'}`}>{speedMode === 'auto' ? 'Auto' : speedLabel}</span>
                            </div>
                            <button onClick={reset} className="text-slate-500 hover:text-white transition-colors sm:border-l sm:border-white/5 sm:pl-3">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative flex-shrink-0 z-10">
                            <div className="absolute -inset-2 rounded-2xl blur-xl bg-emerald-500/30 animate-pulse" />
                            <button
                                onClick={handleCompile}
                                disabled={isLaunching}
                                className={`relative group flex items-center gap-2.5 px-6 py-3 rounded-xl shadow-2xl transition-all duration-300 ${isLaunching
                                    ? 'scale-95 brightness-75 bg-emerald-600/50 cursor-wait'
                                    : 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 hover:scale-[1.03] active:scale-[0.97] border border-emerald-300/50 shadow-[0_0_30px_rgba(52,211,153,0.4)]'
                                    }`}
                            >
                                <Zap className="w-5 h-5 text-emerald-950 fill-emerald-950 drop-shadow-md" />
                                <span className="text-sm tracking-wider font-extrabold uppercase text-emerald-950 drop-shadow-md">Launch Mission</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
});

export default Step2Dashboard;
