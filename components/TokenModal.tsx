import React, { useState } from 'react';
import { Crown, Zap, Activity, AlertCircle, CheckCircle, Lock, Globe, ShieldCheck } from 'lucide-react';

interface TokenModalProps {
    onClose: () => void;
    onSubmit: (amount: number) => Promise<void>;
    status: 'idle' | 'checking' | 'submitting' | 'success' | 'error' | 'pending_exists';
    message: string;
    currentTokens: number;
}

const TokenModal: React.FC<TokenModalProps> = ({ onClose, onSubmit, status, message, currentTokens }) => {
    const [amount, setAmount] = useState<number>(250);
    const MAX_LIMIT = 500;
    const presets = [100, 250, 500];

    const handleSubmit = () => {
        if (amount >= 1 && amount <= MAX_LIMIT) {
            onSubmit(amount);
        }
    };

    const isLocked = status === 'pending_exists';
    const isSuccess = status === 'success';

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0%,transparent_70%)]" />
                <div className="absolute inset-x-0 top-1/4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
            </div>

            <div
                className="w-full max-w-sm bg-[#050505] border border-[#D4AF37]/20 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden flex flex-col group"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Top Line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-40" />

                {/* Header */}
                <div className="p-8 border-b border-white/5 relative text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 w-8 h-8 flex items-center justify-center text-[#D4AF37]/40 hover:text-[#D4AF37] transition-all bg-white/5 hover:bg-white/10 rounded-full"
                    >
                        ✕
                    </button>

                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-black border border-[#D4AF37]/40 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                            <Crown className="w-7 h-7 text-[#D4AF37]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight uppercase">Get Tokens</h3>
                            <div className="flex items-center justify-center gap-2 mt-1 text-[9px] font-mono text-[#D4AF37]/60 tracking-[0.2em] uppercase">
                                <span>Secure Uplink</span>
                                <div className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse" />
                                <span>Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">

                    {/* ===== REQUEST PENDING STATE ===== */}
                    {isLocked ? (
                        <div className="text-center py-6 space-y-5 animate-fade-in-up">
                            <div className="w-12 h-12 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/5 flex items-center justify-center mx-auto">
                                <Activity className="w-6 h-6 text-[#D4AF37] animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-white font-bold text-sm uppercase tracking-widest">Request Pending</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px] mx-auto uppercase tracking-tighter">
                                    Your token request is being reviewed. Only one request is allowed at a time.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Feedback Alerts */}
                            {(status === 'error' || isSuccess) && (
                                <div className={`p-4 rounded-xl flex items-start gap-3 text-[10px] font-mono uppercase tracking-widest border animate-fade-in-up ${status === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                    }`}>
                                    {status === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                                    <p className="leading-relaxed">{message}</p>
                                </div>
                            )}

                            {/* Selection Grid */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Select Amount</label>
                                    <span className="text-[10px] font-mono text-[#D4AF37]">BAL: {currentTokens}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {presets.map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => setAmount(val)}
                                            disabled={status === 'submitting' || isSuccess}
                                            className={`h-11 rounded-xl font-mono text-sm font-bold transition-all border ${amount === val
                                                    ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                                                    : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                                                } disabled:opacity-30`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Field */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Custom</label>
                                    <span className="text-[8px] font-mono text-slate-700 uppercase">Max {MAX_LIMIT} Units</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max={MAX_LIMIT}
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        disabled={status === 'submitting' || isSuccess}
                                        className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-white focus:border-[#D4AF37]/30 focus:outline-none font-mono text-3xl tracking-tighter disabled:opacity-30"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] uppercase font-mono text-slate-800 tracking-widest pointer-events-none">
                                        Tokens
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-8 pt-0">
                    {isLocked || isSuccess ? (
                        <button
                            onClick={onClose}
                            className="w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5"
                        >
                            Close
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={handleSubmit}
                                disabled={status === 'submitting' || amount < 1 || amount > MAX_LIMIT}
                                className={`w-full py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden ${status === 'submitting'
                                        ? 'bg-slate-900 text-slate-600'
                                        : 'bg-gradient-to-br from-[#D4AF37] to-[#8A6E2F] text-black shadow-lg shadow-amber-900/10'
                                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                                {status === 'submitting' ? (
                                    <>
                                        <Activity className="w-4 h-4 animate-spin" />
                                        <span>Checking...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 fill-black/20" />
                                        <span>Request Tokens</span>
                                    </>
                                )}
                            </button>
                            <p className="text-center font-mono text-[8px] text-slate-700 uppercase tracking-[0.2em]">
                                All requests are subject to manual approval
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </div>
    );
};

export default TokenModal;
