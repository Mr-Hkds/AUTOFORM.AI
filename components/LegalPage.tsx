import React from 'react';
import { ArrowLeft, ShieldCheck, FileText, RefreshCw, Mail, ExternalLink } from 'lucide-react';
import { LEGAL_CONTENT } from '../utils/legalContent';

interface LegalPageProps {
    type: 'privacy' | 'terms' | 'refund' | 'contact';
    onBack: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
    const data = LEGAL_CONTENT[type];

    const icons = {
        privacy: ShieldCheck,
        terms: FileText,
        refund: RefreshCw,
        contact: Mail
    };

    const Icon = icons[type];

    return (
        <div className="w-full max-w-4xl mx-auto px-6 py-12 animate-fade-in-up">
            {/* Navigation */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-12 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Back to Terminal</span>
            </button>

            {/* Header */}
            <div className="relative mb-16">
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-6 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-2xl">
                        <Icon className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">{data.title}</h1>
                        <p className="text-slate-500 text-xs font-mono mt-2 uppercase tracking-widest">Version Protocol 1.0 // Last Synchronized: {data.lastUpdated}</p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div
                    className="prose prose-invert prose-slate max-w-none 
                        prose-headings:font-serif prose-headings:text-white prose-headings:tracking-tight
                        prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:border-b prose-h3:border-white/5 prose-h3:pb-2
                        prose-p:text-slate-400 prose-p:leading-relaxed prose-p:mb-6
                        prose-ul:text-slate-400 prose-ul:mb-6
                        prose-li:mb-2
                        prose-strong:text-amber-500/90
                    "
                    dangerouslySetInnerHTML={{ __html: data.content }}
                />

                {/* Secure Badge */}
                <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Compliance Verified by Razorpay Security Link</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            Official Documentation
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="mt-12 text-center">
                <p className="text-[10px] text-slate-600 font-mono mb-6 italic">This document is legally binding under the jurisdiction of Indian Digital Service Laws.</p>
                <button
                    onClick={onBack}
                    className="gold-button px-10 py-4 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                    Return to Operational Dashboard
                </button>
            </div>
        </div>
    );
};

export default LegalPage;
