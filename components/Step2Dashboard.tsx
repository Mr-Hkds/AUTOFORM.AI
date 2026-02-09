import React, { useMemo, useCallback } from 'react';
import { Settings, CheckCircle, ArrowRight, Crown, AlertCircle, Target, ShieldCheck, Zap, Sparkles, Command, ExternalLink, Activity, RotateCcw } from 'lucide-react';
import { FormAnalysis, FormQuestion, QuestionType, User } from '../types';
import QuestionCard from './QuestionCard';
import TagInput from './TagInput';
import { generateAIPrompt } from '../utils/parsingUtils';

// Re-using Badge from App if not exported? 
// Ideally should export Badge from a shared place. 
// For now, I'll inline a simple Badge or assume it's passed or available. 
// I'll define local Badge to avoid broken ref.
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
    aiPromptData: string;
    setAiPromptData: (val: string) => void;
    parsingError: string | null;
    setParsingError: (val: string | null) => void;
    handleCompile: () => void;
    handleAIInject: () => void;
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
        aiPromptData,
        setAiPromptData,
        parsingError,
        setParsingError,
        handleCompile,
        handleAIInject,
        reset,
        setShowPricing,
        setShowRecommendationModal,
        checkBalanceAndRedirect,
        isLaunching,
        error
    } = props;

    const [questionSearch, setQuestionSearch] = React.useState('');

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

    return (
        <section className="w-full animate-fade-in-up">
            {/* Progress Indicator */}
            <div className="mb-6 flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Analyzed</span>
                </div>
                <div className="w-12 h-0.5 bg-gradient-to-r from-emerald-500 to-amber-500" />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-amber-400 flex items-center justify-center animate-pulse">
                        <span className="text-xs font-black text-white">2</span>
                    </div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Configure</span>
                </div>
                <div className="w-12 h-0.5 bg-white/10" />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center">
                        <span className="text-xs font-black text-white/40">3</span>
                    </div>
                    <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Launch</span>
                </div>
            </div>

            {/* Instruction Banner */}
            <div className="mb-6 glass-panel p-4 rounded-xl border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-500/10 to-transparent animate-fade-in-up">
                <div className="flex items-start gap-3">
                    <div className="bg-emerald-500/20 p-2 rounded-lg">
                        <ArrowRight className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">Ready for Launch?</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">Review your settings below, then click the vibrant <span className="text-emerald-400 font-semibold">"Launch Mission"</span> button to begin.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-white mb-2 tracking-tight">{analysis.title}</h2>
                    <div className="flex gap-3">
                        <Badge color="obsidian">{analysis.questions.length} Fields</Badge>
                        <Badge color="gold">Algorithm Optimized</Badge>
                        {user && (user.tokens || 0) < targetCount && (
                            <button
                                onClick={() => setShowPricing(true)}
                                className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse ml-1"
                            >
                                <Crown className="w-3 h-3" />
                                Low on tokens? Refill
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-3">
                        <button onClick={reset} className="glass-panel px-6 py-3 rounded-lg text-slate-400 text-sm hover:text-white transition">
                            Cancel
                        </button>
                        <div className="relative">
                            <div className="absolute -inset-2 bg-emerald-500/10 rounded-2xl blur-xl animate-pulse group-hover:bg-emerald-500/20 transition-colors" />
                            <button
                                onClick={handleCompile}
                                disabled={isLaunching}
                                className={`relative group flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-emerald-500/90 to-teal-600/90 rounded-xl shadow-lg border border-emerald-400/20 transition-all duration-200 ${isLaunching ? 'scale-95 brightness-75' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/20 rounded-md border border-white/10">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">Ready</span>
                                </div>
                                <div className="bg-black/15 p-2 rounded-lg group-hover:bg-black/25 transition-colors">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex flex-col items-start flex-1">
                                    <span className="text-[10px] font-semibold text-emerald-100/70 uppercase tracking-wide">Ready to Start</span>
                                    <span className="text-base font-bold text-white uppercase tracking-wide">Launch Mission</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 flex items-center gap-3 text-red-200 bg-red-950/80 border border-red-500/30 px-6 py-4 rounded-xl text-sm font-medium backdrop-blur-xl shadow-xl">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CONFIGURATION SIDEBAR */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-xl space-y-8">
                        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                            <Settings className="w-4 h-4 text-amber-500" /> Runtime Config
                        </div>

                        <div className="mt-4 mb-4">
                            <label className="block text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-emerald-500" />
                                    Number of Responses
                                </span>
                                <button
                                    onClick={() => setShowRecommendationModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all active:scale-95"
                                >
                                    <ShieldCheck className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Academic Guide</span>
                                </button>
                            </label>

                            <div className="flex flex-col gap-6">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setTargetCount(Math.max(1, (targetCount || 0) - 10))}
                                        className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-2xl transition-all active:scale-90 border border-slate-700"
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={isNaN(targetCount) ? '' : targetCount}
                                        onChange={(e) => {
                                            if (e.target.value === '') {
                                                setTargetCount(NaN);
                                                return;
                                            }
                                            const val = Math.min(Number(e.target.value), 30);
                                            checkBalanceAndRedirect(val);
                                            setTargetCount(val);
                                        }}
                                        className="flex-1 h-14 bg-slate-900/50 border-2 border-slate-700 rounded-2xl text-center text-amber-400 font-mono font-bold text-2xl focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                                    />
                                    <button
                                        onClick={() => {
                                            const newVal = Math.min(30, (targetCount || 0) + 10);
                                            checkBalanceAndRedirect(newVal);
                                            setTargetCount(newVal);
                                        }}
                                        className="w-14 h-14 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 flex items-center justify-center font-bold text-2xl transition-all active:scale-90 border border-amber-500/30"
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="grid grid-cols-5 gap-2">
                                    {[5, 10, 15, 20, 30].map((preset) => (
                                        <button
                                            key={preset}
                                            onClick={() => {
                                                checkBalanceAndRedirect(preset);
                                                setTargetCount(preset);
                                            }}
                                            className={`py-3 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 border ${targetCount === preset
                                                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border-slate-700'
                                                }`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

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

                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-200/80 leading-relaxed font-mono">
                            <span className="text-red-400 font-bold block mb-1 flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3" />
                                SYSTEM SECURITY PROTOCOL
                            </span>
                            To maintain account integrity, avoid exceeding 100 responses per hour per IP address.
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-white uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" /> Interaction Speed
                        </div>
                        <div className="flex items-center gap-2">
                            {speedMode === 'auto' && (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                    AUTO-OPTIMIZED
                                </span>
                            )}
                            <span className={`font-mono ${delayMin === 0 ? 'text-fuchsia-400' : delayMin <= 100 ? 'text-red-400' : delayMin <= 500 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {delayMin === 0 ? 'Warp' : delayMin === 100 ? 'Intensive' : delayMin === 500 ? 'Efficient' : 'Realistic'} ({delayMin}ms)
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setSpeedMode('auto')}
                            className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all active:scale-95 col-span-1 ${speedMode === 'auto'
                                ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg'
                                : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10'
                                }`}
                        >
                            <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">Best Choice</span>
                            <span className="text-[7px] opacity-60 text-center leading-tight">Recommended</span>
                        </button>
                        <button
                            onClick={() => { setSpeedMode('manual'); setDelayMin(1000); }}
                            className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all active:scale-95 ${speedMode === 'manual' && delayMin >= 1000
                                ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg'
                                : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10'
                                }`}
                        >
                            <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">Steady</span>
                            <span className="text-[7px] opacity-60 text-center leading-tight">Human-Like</span>
                        </button>
                        <button
                            onClick={() => { setSpeedMode('manual'); setDelayMin(0); }}
                            className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all active:scale-95 ${speedMode === 'manual' && delayMin === 0
                                ? 'bg-fuchsia-500/20 border-fuchsia-500 text-white shadow-lg'
                                : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10'
                                }`}
                        >
                            <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">Warp Drive</span>
                            <span className="text-[7px] opacity-60 text-center leading-tight">0 Latency</span>
                        </button>
                    </div>

                </div>

                {/* MAIN DASHBOARD (Questions & AI) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Name Source Selection */}
                    {analysis.questions.some(q => q.title.toLowerCase().includes('name')) && (
                        <div className="glass-panel p-6 rounded-xl space-y-4 border-l-2 border-l-amber-500/50 bg-amber-500/[0.02]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                                    <Command className="w-4 h-4 text-amber-500" /> Identity Generator Configuration
                                </div>
                                <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded">REQUIRED CONFIGURATION</span>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'auto', label: 'AI Auto', desc: 'Contextual selection' },
                                    { id: 'indian', label: 'Indian DB', desc: 'Regional names' },
                                    { id: 'custom', label: 'Manual List', desc: 'User specified' }
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setNameSource(opt.id as any)}
                                        className={`text-[10px] font-mono group relative overflow-hidden flex flex-col items-center py-4 rounded-xl border transition-all ${nameSource === opt.id
                                            ? 'bg-amber-500/20 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                                            : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10'
                                            }`}
                                    >
                                        {nameSource === opt.id && <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500" />}
                                        <span className="font-bold tracking-widest uppercase mb-1">{opt.label}</span>
                                        <span className="opacity-50 text-[8px] tracking-tight">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>

                            {nameSource === 'custom' && (
                                <TagInput
                                    value={customNamesRaw}
                                    onChange={(val) => setCustomNamesRaw(val)}
                                    placeholder="Enter names and press Enter or Comma..."
                                />
                            )}
                        </div>
                    )}

                    {/* AI DATA INJECTION */}
                    {relevantTextFields.length > 0 && (
                        <div className={`glass-panel p-6 rounded-xl space-y-4 border-l-2 relative overflow-hidden ${parsingError ? 'border-red-500 bg-red-500/5' : relevantTextFields.some(q => q.required) ? 'border-amber-500/50' : 'border-emerald-500/50'}`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                                    <Sparkles className="w-4 h-4 text-emerald-500" /> AI Data Injection
                                    {relevantTextFields.some(q => q.required) ? (
                                        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded ml-2 border border-amber-500/20 shadow-sm animate-pulse">REQUIRED CONFIGURATION</span>
                                    ) : (
                                        <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded ml-2 border border-emerald-500/20 shadow-sm opacity-80">OPTIONAL CONFIGURATION</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        const prompt = generateAIPrompt(analysis.title, analysis.description, analysis.questions, targetCount);
                                        navigator.clipboard.writeText(prompt);
                                        window.open('https://chatgpt.com', '_blank');
                                        alert("System: Prompt copied to clipboard. Redirecting to ChatGPT for data synthesis.");
                                    }}
                                    className="gold-button px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                >
                                    <ExternalLink className="w-4 h-4" /> Synchronize with ChatGPT
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Protocol Instructions
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                           ## Protocol Instructions

1. Click Synchronise with ChatGPT (prompt is auto-copied).
2. Paste the prompt into ChatGPT and run it.
3. Copy the generated JSON exactly.
4. Paste it into the box below.
5. Click Inject Synthesized Data to process the data.
                                    </div>
                                    <button
                                        onClick={handleAIInject}
                                        className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-emerald-400/20"
                                    >
                                        <Activity className="w-4 h-4" /> Inject Synthesized Data
                                    </button>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={aiPromptData}
                                        onChange={(e) => {
                                            setAiPromptData(e.target.value);
                                            if (parsingError) setParsingError(null);
                                        }}
                                        placeholder='Paste JSON response here...'
                                        className={`w-full h-full min-h-[150px] bg-[#020617] border-2 rounded-2xl p-4 text-xs text-white font-mono focus:outline-none transition-all resize-none shadow-inner ${parsingError ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-emerald-500/50'}`}
                                    />
                                    {parsingError && (
                                        <div className="absolute bottom-4 right-4 text-[10px] text-red-400 font-bold bg-black/90 px-3 py-1.5 rounded-lg backdrop-blur border border-red-500/30 shadow-xl">
                                            {parsingError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                    {/* DATA PREVIEW / DEMOGRAPHICS */}
                    <div className="glass-panel p-1 rounded-xl flex flex-col h-[600px] border-t border-t-white/10 relative">
                        <div className="absolute top-0 inset-x-0 bg-amber-500/10 border-b border-amber-500/10 p-2 flex items-center justify-center gap-2 text-[10px] text-amber-300 font-mono z-20 backdrop-blur-sm">
                            <Activity className="w-3 h-3 text-amber-400" />
                            <span>Data Synthesis & Distribution Control</span>
                        </div>

                        <div className="px-6 py-4 mt-12 border-b border-white/5 flex flex-col gap-4 bg-white/[0.02]">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Field Distributions</span>
                                <div className="relative group">
                                    <Settings className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="relative">
                                    <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search fields (e.g. 'Age', 'Experience')..."
                                        value={questionSearch}
                                        onChange={(e) => setQuestionSearch(e.target.value)}
                                        className="w-full bg-[#050505] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-[10px] text-white font-mono focus:border-amber-500/50 outline-none transition-all"
                                    />
                                </div>

                                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                                    <Settings className="w-4 h-4 text-amber-500 mt-0.5" />
                                    <p className="text-[10px] text-amber-200/70 leading-relaxed font-sans">
                                        <strong>System Guidance:</strong> You may adjust the weightage percentages below to maintain a realistic distribution. Ensure the total for each field equals 100% for optimal consistency.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {filteredQuestions.map((q, idx) => (
                                <QuestionCard
                                    key={q.id}
                                    index={idx}
                                    question={q}
                                    onUpdate={handleQuestionUpdate}
                                    customResponse={customResponses[q.id]}
                                    onCustomResponseChange={(val) => handleCustomResponseChange(q.id, val)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
});

export default Step2Dashboard;
