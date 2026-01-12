'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Scan, FileText, CheckCircle, Loader2, Sparkles, AlertCircle, Copy, AlertTriangle, Search } from 'lucide-react';

import { createWorker } from 'tesseract.js';

export default function Scanner() {
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'analyzing' | 'complete'>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [extractedText, setExtractedText] = useState<string>('');
    const [aiSegments, setAiSegments] = useState<{ text: string; isAi: boolean }[]>([]);
    const [aiPercentage, setAiPercentage] = useState(0);
    const [isCopied, setIsCopied] = useState(false);
    const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
    const [pastedText, setPastedText] = useState('');

    // Local OCR State
    const [reasoning, setReasoning] = useState('');

    // --- AI Detection Logic (Paranoid Mode) ---

    // 1. Strict Keyword & Pattern Matching (Expansive Blacklist)
    const checkAIPatterns = (text: string) => {
        const lower = text.toLowerCase();

        // Expanded list of "AI-sounding" phrases and connectors
        const aiPhrases = [
            // Generic AI
            "as an ai language model", "regenerate response", "language model",
            // Academic/Robotic Connectors (AI loves these)
            "it is important to note", "in summary", "in conclusion", "moreover", "furthermore",
            "consequently", "on the other hand", "additionally", "however", "thus", "therefore",
            "significantly", "notably", "crucial to", "essential to", "paramount importance",
            "delves into", "underscore", "emphasize", "comprehensive", "landscape of", "realm of",
            "tapestry", "nuanced", "multifaceted", "pivotal role", "key aspects", "worth noting",
            "by and large", "in essence"
        ];

        let foundCount = 0;
        let foundPhrases: string[] = [];

        aiPhrases.forEach(p => {
            if (lower.includes(p.toLowerCase())) {
                foundCount++;
                foundPhrases.push(p);
            }
        });

        if (foundCount > 0) {
            // Aggressive Scoring: 1 keyword = 65%, 2+ = 95%
            const score = foundCount > 1 ? 98 : 65;
            return {
                score: score,
                reason: `Detected AI-typical phrasing: "${foundPhrases.slice(0, 3).join('", "')}"`
            };
        }
        return { score: 0, reason: "" };
    };

    // 2. Advanced Statistical Analysis (Draconian Tuning)
    const localStatisticalAnalysis = (text: string) => {
        const cleanText = text.replace(/\s+/g, ' ').trim();
        const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
        const words = cleanText.split(' ');

        // 1. Burstiness (SD of Sentence Length)
        const lengths = sentences.map(s => s.split(' ').length);
        const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((a, b) => a + Math.pow(b - avgLen, 2), 0) / lengths.length;
        const burstiness = Math.sqrt(variance);

        // 2. Complexity (Avg Word Length)
        const avgWordLen = words.reduce((a, b) => a + b.length, 0) / words.length;

        let score = 20; // Base Skepticism
        let reasons = [];

        // AI Sweet Spot: Sentences are usually 15-25 words long.
        if (avgLen > 12 && avgLen < 28) {
            score += 20;
            reasons.push("Average sentence length matches AI patterns.");
        }

        // Draconian Burstiness Check
        // Humans are Chaotic (SD > 12). AI is Regular (SD < 10).
        if (burstiness < 6) {
            score += 55; // Huge Penalty for perfect uniformity
            reasons.push("Sentence structure is unnaturally uniform (Robotic).");
        } else if (burstiness < 12) {
            score += 30; // Medium Penalty
            reasons.push("Lacks human-like variation in sentence length.");
        }

        // Vocabulary Check
        if (avgWordLen > 5) {
            score += 10; // AI uses slightly bigger words on average
        }

        return {
            score: Math.min(score, 100),
            reason: reasons.join(' ') || "Text seems robotic."
        };
    };

    // 3. Cloud AI Detection (Multi-Model Consensus)
    const detectAI = async (text: string) => {
        try {
            // Model A: OpenAI RoBERTa (Standard)
            const fetchA = fetch(
                "https://api-inference.huggingface.co/models/openai-community/roberta-base-openai-detector",
                { headers: { "Content-Type": "application/json" }, method: "POST", body: JSON.stringify({ inputs: text.slice(0, 510) }) }
            );

            // Model B: Hello-SimpleAI (ChatGPT Specifc)
            const fetchB = fetch(
                "https://api-inference.huggingface.co/models/Hello-SimpleAI/chatgpt-detector-roberta",
                { headers: { "Content-Type": "application/json" }, method: "POST", body: JSON.stringify({ inputs: text.slice(0, 510) }) }
            );

            const [resA, resB] = await Promise.all([fetchA, fetchB]);

            let maxScore = 0;
            let source = "";

            if (resA.ok) {
                const json = await resA.json();
                const fake = json[0]?.find((x: any) => x.label === 'Fake')?.score || 0;
                if (fake > maxScore) { maxScore = fake; source = "RoBERTa Model"; }
            }
            if (resB.ok) {
                const json = await resB.json();
                const fake = json[0]?.find((x: any) => x.label === 'ChatGPT' || x.label === 'Fake')?.score || 0;
                if (fake > maxScore) { maxScore = fake; source = "ChatGPT Detector"; }
            }

            if (maxScore > 0.5) {
                return {
                    score: Math.round(maxScore * 100),
                    reason: "Deep Learning analysis flagged AI patterns.",
                    source: source
                };
            }

        } catch (e) {
            console.warn("Cloud API failed", e);
        }
        return null; // Fallback
    };

    const performAnalysis = async (text: string) => {
        let aiScore = 0;
        let aiReason = "";

        // 1. Patterns (Instant Catch)
        const patternResult = checkAIPatterns(text);

        // 2. Cloud
        const cloudResult = await detectAI(text);

        // 3. Stats (Paranoid Fallback)
        const statResult = localStatisticalAnalysis(text);

        // Aggrresive "MAX" Logic - If ANY method flags it, IT IS AI.
        // We do not average. We trust the accuser.

        if (patternResult.score > 50) {
            aiScore = patternResult.score;
            aiReason = patternResult.reason;
        } else if (cloudResult && cloudResult.score > statResult.score) {
            aiScore = cloudResult.score;
            aiReason = cloudResult.reason;
        } else {
            // Default to strict stats if cloud misses/fails
            aiScore = statResult.score;
            aiReason = statResult.reason;
        }

        // Final sanity cap / floor
        if (aiScore < 10) aiScore = 15; // "Nothing is 0% AI" philosophy
        if (aiScore > 99) aiScore = 99;

        setAiPercentage(aiScore);
        setReasoning(aiReason);
        setAiSegments([{ text: text, isAi: aiScore > 50 }]);
    };

    // Helper: Convert File to Base64
    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const startScan = async (uploadedFile: File) => {
        setScanStatus('scanning');
        setProgress(10);
        let extracted = "";

        // STRATEGY 1: Hugging Face TrOCR (Microsoft's Handwritten Transformer)
        // Best for handwriting. Uses public free tier.
        try {
            console.log("Attempting TrOCR...");
            const response = await fetch(
                "https://api-inference.huggingface.co/models/microsoft/trocr-base-handwritten",
                {
                    headers: {
                        // No token needed for public inference (low rate limit)
                        "Content-Type": "application/octet-stream"
                    },
                    method: "POST",
                    body: uploadedFile,
                }
            );

            if (response.ok) {
                const result = await response.json();
                if (Array.isArray(result) && result[0]?.generated_text) {
                    extracted = result[0].generated_text;
                    console.log("TrOCR Success");
                    setProgress(100);
                }
            }
        } catch (e) {
            console.warn("TrOCR failed, falling back...", e);
        }

        // STRATEGY 2: OCR.space (Public Demo Key)
        // Solid commercial OCR, restricted to English/Numbers
        if (!extracted || extracted.length < 5) {
            try {
                console.log("Attempting OCR.space...");
                setProgress(40);
                const base64 = await toBase64(uploadedFile);
                const formData = new FormData();
                formData.append("base64Image", base64);
                formData.append("apikey", "helloworld"); // Public demo key
                formData.append("language", "eng");
                formData.append("OCREngine", "2"); // Engine 2 is better for numbers/irregular text

                const res = await fetch("https://api.ocr.space/parse/image", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();

                if (!data.IsErroredOnProcessing && data.ParsedResults?.length > 0) {
                    extracted = data.ParsedResults[0].ParsedText;
                    console.log("OCR.space Success");
                    setProgress(90);
                }
            } catch (e) {
                console.warn("OCR.space failed, falling back...", e);
            }
        }

        // STRATEGY 3: Tesseract.js (Local Fallback)
        // Runs in browser. Least accurate for handwriting, but works offline.
        if (!extracted || extracted.length < 5) {
            try {
                console.log("Attempting Tesseract Fallback...");
                setProgress(60);
                const worker = await createWorker('eng');

                // Optimize Tesseract for single block of text (PSM 6)
                await worker.setParameters({
                    tessedit_pageseg_mode: '6' as any,
                });

                const ret = await worker.recognize(uploadedFile);
                extracted = ret.data.text;
                await worker.terminate();
                setProgress(95);
            } catch (e) {
                console.error("All OCR methods failed", e);
            }
        }

        if (extracted && extracted.trim().length > 0) {
            setExtractedText(extracted);
            await performAnalysis(extracted);
            setScanStatus('complete');
        } else {
            alert("Could not extract text. Please ensure the image is clear and contains readable text.");
            setScanStatus('idle');
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            startScan(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        multiple: false
    });

    const resetScan = () => {
        setFile(null);
        setScanStatus('idle');
        setProgress(0);
        setExtractedText('');
        setAiSegments([]);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(extractedText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handlePasteAnalysis = async () => {
        if (!pastedText.trim()) return;
        setScanStatus('analyzing');

        // Use the same robust analysis engine as the scanner
        setExtractedText(pastedText);
        await performAnalysis(pastedText);

        setScanStatus('complete');
    };

    const searchOnGoogle = () => {
        const query = encodeURIComponent(extractedText.slice(0, 200));
        window.open(`https://www.google.com/search?q=${query}`, '_blank');
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
            {/* Modal Removed */}

            <AnimatePresence mode="wait">
                {scanStatus === 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-3xl mx-auto"
                    >
                        {/* Input Mode Toggles */}
                        <div className="flex justify-center mb-8 gap-4">
                            <button
                                onClick={() => setInputMode('upload')}
                                className={`
                                    px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
                                    ${inputMode === 'upload'
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                        : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                                    }
                                `}
                            >
                                Upload Image
                            </button>
                            <button
                                onClick={() => setInputMode('paste')}
                                className={`
                                    px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
                                    ${inputMode === 'paste'
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                        : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                                    }
                                `}
                            >
                                Paste Text
                            </button>
                        </div>

                        {inputMode === 'upload' ? (
                            <div
                                {...getRootProps()}
                                className={`
                                    relative overflow-hidden rounded-3xl border border-white/10
                                    transition-all duration-300 ease-in-out cursor-pointer h-[400px]
                                    flex flex-col items-center justify-center gap-6 glass-panel group
                                    ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'hover:border-blue-500/50 hover:bg-white/5'}
                                `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <input {...getInputProps()} />
                                <div className="relative z-10 p-6 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/5 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                                    <Upload size={40} className="text-blue-400" />
                                </div>
                                <div className="relative z-10 text-center space-y-2">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                        Assignment Scanner
                                    </h3>
                                    <p className="text-neutral-400 text-sm max-w-sm mx-auto px-4">
                                        OCR & AI Detection
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-panel rounded-3xl border border-white/10 p-1 bg-black/40 backdrop-blur-xl h-[400px] flex flex-col">
                                <textarea
                                    className="w-full h-full bg-transparent border-none outline-none p-6 text-neutral-200 placeholder-neutral-600 resize-none font-mono text-sm"
                                    placeholder="Paste text here..."
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                />
                                <div className="p-4 border-t border-white/5 flex justify-end">
                                    <button
                                        onClick={handlePasteAnalysis}
                                        disabled={!pastedText.trim()}
                                        className="w-full py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-500"
                                    >
                                        Analyze Text
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {(scanStatus === 'scanning' || scanStatus === 'analyzing') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative rounded-3xl overflow-hidden bg-black border border-white/10 h-[600px] flex flex-col items-center justify-center shadow-2xl max-w-4xl mx-auto"
                    >
                        {file && inputMode === 'upload' && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={URL.createObjectURL(file)}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-contain opacity-30 blur-sm scale-110"
                            />
                        )}
                        <div className="absolute inset-0 bg-scan-line animate-scan-y z-10 opacity-70"></div>
                        <div className="z-20 glass-panel p-8 md:p-12 rounded-3xl border border-white/10 text-center max-w-md w-full mx-4 backdrop-blur-xl bg-black/40">
                            <div className="relative w-16 h-16 mx-auto mb-6">
                                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
                                <Scan className="relative z-10 w-full h-full text-blue-400 animate-spin-slow" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Analyzing Document</h3>
                            <p className="text-blue-300/60 mb-8 font-mono text-sm">Checking AI Probability...</p>
                            <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {scanStatus === 'complete' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-6"
                    >
                        <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-green-400">
                                    <CheckCircle size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Analysis Complete</h2>
                            </div>
                            <button
                                onClick={resetScan}
                                className="glass-button px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 hover:bg-white/5"
                            >
                                <Scan size={16} /> New Scan
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                            {/* Left Col: Extracted Text */}
                            <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col h-full">
                                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <FileText size={18} className="text-blue-400" />
                                        Extracted Analysis
                                    </h3>
                                    <button
                                        onClick={copyToClipboard}
                                        className="text-xs text-neutral-400 hover:text-white"
                                    >
                                        {isCopied ? "Copied!" : "Copy Text"}
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1 text-neutral-300 leading-relaxed font-mono text-sm space-y-1">
                                    {aiSegments.map((segment, idx) => (
                                        <span key={idx} className={segment.isAi ? 'text-red-300 bg-red-500/10' : ''}>
                                            {segment.text}{" "}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Right Col: Stats */}
                            <div className="flex flex-col gap-6">
                                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex-1">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-neutral-400 mb-6 uppercase">
                                        <AlertTriangle size={18} className="text-red-400" /> AI Probability
                                    </h4>
                                    <span className="text-7xl font-bold text-white">{aiPercentage}%</span>
                                </div>
                                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex-1">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-neutral-400 mb-6 uppercase">
                                        <CheckCircle size={18} className="text-blue-400" /> Score
                                    </h4>
                                    <span className="text-7xl font-bold text-white">{(10 - (aiPercentage / 20)).toFixed(1)}</span>
                                    <p className="text-neutral-400 mt-4 text-sm">{reasoning}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
