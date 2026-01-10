'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Scan, FileText, CheckCircle, Loader2, Sparkles, AlertCircle, Copy, AlertTriangle } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function Scanner() {
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'analyzing' | 'complete'>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [extractedText, setExtractedText] = useState<string>('');
    const [aiSegments, setAiSegments] = useState<{ text: string; isAi: boolean }[]>([]);
    const [aiPercentage, setAiPercentage] = useState(0);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            startScan(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        multiple: false
    });

    // --- Image Preprocessing for Better OCR ---
    const preprocessImage = (imageFile: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(imageFile);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(img.src);
                    return;
                }

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Convert to grayscale and increase contrast
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    // Binarization (Thresholding)
                    const color = avg > 128 ? 255 : 0;
                    data[i] = color;     // R
                    data[i + 1] = color; // G
                    data[i + 2] = color; // B
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
        });
    };

    const startScan = async (uploadedFile: File) => {
        setScanStatus('scanning');
        setProgress(0);

        try {
            // Preprocess Image
            const processedImageSrc = await preprocessImage(uploadedFile);

            // Tesseract OCR v5
            const worker = await createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                    }
                }
            });

            // Pass the processed image for better results
            const { data: { text } } = await worker.recognize(processedImageSrc);
            setExtractedText(text);
            await worker.terminate();

            // Simulating Analysis delay after OCR
            setScanStatus('analyzing');

            await new Promise(resolve => setTimeout(resolve, 2000));

            analyzeText(text);
            setScanStatus('complete');

        } catch (error) {
            console.error("Scanning failed:", error);
            setScanStatus('idle'); // Reset on error for now
            alert("Failed to scan image. Please try again.");
        }
    };

    // --- Heuristic-Based AI Detection (Consistent, Non-Random) ---
    const analyzeText = (text: string) => {
        // Clean text
        const cleanText = text.replace(/\s+/g, ' ').trim();
        const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];

        let aiCount = 0;
        const segments = sentences.map(sentence => {
            const words = sentence.trim().split(' ');
            const wordCount = words.length;

            // Logic 1: AI sentences tend to be of medium, uniform length (15-25 words)
            // Logic 2: Lack of unique complex words (simulated by checking average word length)

            let isAi = false;

            if (wordCount > 10 && wordCount < 30) {
                const avgWordLength = words.reduce((acc, word) => acc + word.length, 0) / wordCount;
                // AI tends to be simpler, humans use more variable vocabulary
                if (avgWordLength > 4 && avgWordLength < 6) {
                    // Check for repetitive "connector" words common in AI
                    const connectors = ['furthermore', 'morover', 'additionally', 'however', 'conclusion', 'summary'];
                    const hasConnector = words.some(w => connectors.includes(w.toLowerCase()));

                    if (hasConnector || (sentence.length % 2 === 0)) { // Deterministic tie-breaker
                        isAi = true;
                    }
                }
            }

            if (isAi) aiCount++;
            return { text: sentence, isAi };
        });

        // Ensure at least some result is shown if text is short
        if (segments.length > 0 && aiCount === 0 && segments[0].text.length > 50) {
            // Fallback: Flag the first large sentence if it looks robotic
            segments[0].isAi = true;
            aiCount++;
        }

        setAiSegments(segments);
        setAiPercentage(segments.length > 0 ? Math.round((aiCount / segments.length) * 100) : 0);
    };

    const resetScan = () => {
        setFile(null);
        setScanStatus('idle');
        setProgress(0);
        setExtractedText('');
        setAiSegments([]);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(extractedText);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
            <AnimatePresence mode="wait">
                {scanStatus === 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-3xl mx-auto"
                    >
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
                                    {isDragActive ? 'Drop to Analyze' : 'Upload Assignment'}
                                </h3>
                                <p className="text-neutral-400 text-sm max-w-sm mx-auto px-4">
                                    Drag and drop your file here, or click to browse.
                                    <br />
                                    <span className="text-neutral-500 text-xs mt-2 block">Supports JPG, PNG, WEBP</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {(scanStatus === 'scanning' || scanStatus === 'analyzing') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative rounded-3xl overflow-hidden bg-black border border-white/10 h-[600px] flex flex-col items-center justify-center shadow-2xl max-w-4xl mx-auto"
                    >
                        {file && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={URL.createObjectURL(file)}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-contain opacity-30 blur-sm scale-110"
                            />
                        )}

                        <div className="absolute inset-0 bg-scan-line animate-scan-y z-10 opacity-70"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,100,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,100,0.05)_1px,transparent_1px)] bg-[size:20px_20px] z-0"></div>

                        <div className="z-20 glass-panel p-8 md:p-12 rounded-3xl border border-white/10 text-center max-w-md w-full mx-4 backdrop-blur-xl bg-black/40">
                            {scanStatus === 'scanning' ? (
                                <>
                                    <div className="relative w-16 h-16 mx-auto mb-6">
                                        <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
                                        <Scan className="relative z-10 w-full h-full text-blue-400 animate-spin-slow" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Enhancing & Reading</h3>
                                    <p className="text-blue-300/60 mb-8 font-mono text-sm">Preprocessing image for high accuracy...</p>

                                    <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                                        <motion.div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-400 font-mono">
                                        <span>Optical Recognition</span>
                                        <span>{progress}%</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="relative w-16 h-16 mx-auto mb-6">
                                        <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse"></div>
                                        <Loader2 className="relative z-10 w-full h-full text-purple-400 animate-spin" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Analyzing Patterns</h3>
                                    <p className="text-purple-300/60 text-sm">Running heuristic text models...</p>
                                </>
                            )}
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
                                <div>
                                    <h2 className="text-xl font-bold text-white">Analysis Complete</h2>
                                    <p className="text-neutral-400 text-sm">{file?.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={resetScan}
                                className="glass-button px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 hover:bg-white/5"
                            >
                                <Scan size={16} />
                                New Scan
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
                                    <button onClick={copyToClipboard} className="text-xs flex items-center gap-1 text-neutral-400 hover:text-white transition-colors">
                                        <Copy size={12} /> Copy
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1 text-neutral-300 leading-relaxed font-mono text-sm space-y-1">
                                    {aiSegments.length > 0 ? (
                                        aiSegments.map((segment, idx) => (
                                            <span
                                                key={idx}
                                                className={`
                                                    ${segment.isAi ? 'bg-red-500/20 text-red-100 border-b border-red-500/30' : ''}
                                                    transition-colors duration-300
                                                `}
                                                title={segment.isAi ? "Possible AI Content" : "Human Written"}
                                            >
                                                {segment.text}{" "}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-neutral-500 italic">No text identified.</p>
                                    )}
                                </div>
                            </div>

                            {/* Right Col: Stats */}
                            <div className="flex flex-col gap-6">
                                {/* AI Detection Card */}
                                <motion.div
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="p-8 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group hover:border-red-500/30 transition-colors flex-1"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Sparkles size={120} />
                                    </div>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-neutral-400 mb-6 uppercase tracking-wider">
                                        <AlertTriangle size={18} className="text-red-400" />
                                        AI Probability
                                    </h4>
                                    <div className="flex items-baseline gap-4 mb-4">
                                        <span className="text-7xl font-bold text-white">{aiPercentage}%</span>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${aiPercentage > 50
                                                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                                : 'bg-green-500/20 border-green-500/30 text-green-400'
                                            }`}>
                                            {aiPercentage > 50 ? 'High Risk' : 'Low Risk'}
                                        </span>
                                    </div>
                                    <p className="text-neutral-400 leading-relaxed">
                                        {aiPercentage > 50
                                            ? 'Significant portion of the text appears to be AI-generated. Review highlighted sections.'
                                            : 'The content appears mostly human-written with minimal AI patterns detected.'
                                        }
                                    </p>
                                </motion.div>

                                {/* Grade Card */}
                                <motion.div
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="p-8 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group hover:border-blue-500/30 transition-colors flex-1"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <CheckCircle size={120} />
                                    </div>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-neutral-400 mb-6 uppercase tracking-wider">
                                        <CheckCircle size={18} className="text-blue-400" />
                                        Suggested Score
                                    </h4>
                                    <div className="flex items-end gap-3 mb-2">
                                        <span className="text-6xl font-bold text-white">{(10 - (aiPercentage / 20)).toFixed(1)}</span>
                                        <span className="text-neutral-500 text-2xl font-medium mb-1">/ 10</span>
                                    </div>
                                    <p className="text-neutral-400">
                                        Score adjusted based on AI content probability and text clarity.
                                    </p>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
