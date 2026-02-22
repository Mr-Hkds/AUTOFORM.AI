import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Copy, ExternalLink, AlertCircle, CheckCircle, X } from 'lucide-react';
import { FormQuestion, QuestionType } from '../types';

interface AIWeightageBridgeProps {
    questions: FormQuestion[];
    onApplyWeightages: (weightsData: any[]) => void;
    onClose: () => void;
}

export default function AIWeightageBridge({ questions, onApplyWeightages, onClose }: AIWeightageBridgeProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [pasteContent, setPasteContent] = useState('');
    const [parsedData, setParsedData] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Auto-scroll when the component is mounted
        if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    // Filter questions that actually have options
    const questionsWithOptions = questions.filter(q =>
        q.type === QuestionType.MULTIPLE_CHOICE ||
        q.type === QuestionType.CHECKBOXES ||
        q.type === QuestionType.DROPDOWN
    );

    const handleCopyAndOpen = useCallback(async () => {
        if (questions.length === 0) {
            setError("No questions found to analyze.");
            return;
        }

        const promptData = questions.map(q => {
            const base = {
                id: q.id,
                title: q.title,
                type: q.type
            };

            if (q.options && q.options.length > 0) {
                return { ...base, options: q.options.map(o => o.value) };
            }
            return base;
        });

        const prompt = `Act as a data analyst simulating survey responses for a form titled "${questions[0]?.title || 'Survey'}".
I will provide a JSON array of questions.

REQUIREMENTS:
1. For questions with 'options' (MULTIPLE_CHOICE, CHECKBOXES, DROPDOWN): Assign realistic distribution percentages (weightages) to each option based on human behavior. Weights MUST sum exactly to 100.
2. For text-based questions (SHORT_ANSWER, PARAGRAPH): Provide an array of 5-8 diverse, realistic sample responses.
3. If it's a "Name" field, provide appropriate full names.

Format the output as a JSON array of objects, each containing:
- 'id': (string) the original question id
- 'options': (array of objects, ONLY for selection fields) { "value": string, "weight": number }
- 'samples': (array of strings, ONLY for text fields) [ "Sample 1", "Sample 2", ... ]

IMPORTANT: Return ONLY valid JSON. No markdown code blocks, no intro/outro text. Just the raw JSON array.\n\n${JSON.stringify(promptData, null, 2)}`;

        try {
            await navigator.clipboard.writeText(prompt);
            setIsCopied(true);
            setTimeout(() => {
                window.open('https://chatgpt.com', '_blank');
                setStep(2); // Move to paste step
            }, 800);
        } catch (err) {
            setError('Failed to copy to clipboard.');
        }
    }, [questions]);

    const handlePaste = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const rawText = e.target.value;
        setPasteContent(rawText);
        setError(null);
        setParsedData(null);

        if (!rawText.trim()) return;

        try {
            // Strip markdown code blocks if the user accidentally copied them
            const cleanedText = rawText.replace(/```json\n?/gi, '').replace(/```/g, '').trim();

            // Attempt parse
            const parsedData = JSON.parse(cleanedText);

            if (!Array.isArray(parsedData)) {
                throw new Error('Expected an array of questions');
            }

            // Store the parsed data to be confirmed by the user
            setParsedData(parsedData);

        } catch (err: any) {
            setError("We couldn't read that format. Make sure you only pasted the JSON data.");
        }
    }, [onApplyWeightages]);

    return (
        <div ref={containerRef} className="animate-in fade-in slide-in-from-top-4 duration-500 my-6">
            <div className="bg-slate-900/50 border border-indigo-500/30 shadow-[0_0_40px_rgba(79,70,229,0.1)] rounded-2xl w-full overflow-hidden relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)] rounded-xl border border-indigo-500/30">
                            <Sparkles className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">AI Auto-Weight</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Generate realistic distributions instantly</p>
                        </div>
                    </div>

                    {step === 1 ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                                We've generated an optimized prompt with your {questionsWithOptions.length} applicable questions. Copy it, paste it into ChatGPT, and bring the results back here.
                            </p>

                            {error && (
                                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleCopyAndOpen}
                                className={`
                                w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 active:scale-[0.98]
                                ${isCopied
                                        ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-400/50'}
                            `}
                            >
                                {isCopied ? (
                                    <><CheckCircle className="w-5 h-5" /> Copied! Opening ChatGPT...</>
                                ) : (
                                    <><Copy className="w-5 h-5" /> Copy Prompt & Open AI</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    Paste ChatGPT Response Here
                                </label>
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                                >
                                    ← Back to Step 1
                                </button>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={pasteContent}
                                    onChange={handlePaste}
                                    placeholder='[ { "id": "q1", ... } ]'
                                    autoFocus
                                    className={`
                                    w-full h-40 px-4 py-3 rounded-xl border-2 transition-all duration-200 resize-none font-mono text-xs bg-black/40 text-emerald-400
                                    ${error
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/20'
                                            : 'border-slate-700/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'}
                                `}
                                />
                            </div>

                            {/* Error Handling UI */}
                            {error && (
                                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-in fade-in slide-in-from-bottom-2">
                                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <p className="leading-relaxed">{error}</p>
                                </div>
                            )}
                            {!error && pasteContent && !parsedData && (
                                <div className="flex justify-center mt-2">
                                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium animate-pulse">
                                        <Sparkles className="w-4 h-4" /> Processing...
                                    </div>
                                </div>
                            )}

                            {/* Manual Confirmation Button */}
                            {parsedData && (
                                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                                    <button
                                        onClick={() => onApplyWeightages(parsedData)}
                                        className="w-full relative group flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg border border-emerald-400/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    >
                                        <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <CheckCircle className="w-5 h-5 text-white" />
                                        <span className="font-bold text-white uppercase tracking-wider text-sm">
                                            Inject {parsedData.length} Valid Configurations
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer gradient */}
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
            </div>
        </div>
    );
}
