'use client';

import { useState } from 'react';
import Scanner from '@/components/Scanner';
import SplashScreen from '@/components/SplashScreen';

export default function Home() {
    const [showSplash, setShowSplash] = useState(true);

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden bg-black text-white selection:bg-blue-500/30">

            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

            {/* Animated Background */}
            <div className="fixed inset-0 w-full h-full pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent"></div>
                <div className="absolute -top-[20%] left-[20%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-float"></div>
                <div className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] animate-float-delayed"></div>
                <div className="absolute bottom-0 w-full h-[500px] bg-gradient-to-t from-black via-black to-transparent"></div>

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_70%,transparent_100%)]"></div>
            </div>

            {/* Header */}
            <nav className="z-50 w-full px-6 py-6 flex items-center justify-between glass-panel sticky top-0 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/dizitalwing-logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                    <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">DizitalWing</span>
                </div>
                <div className="text-sm text-neutral-400">v2.0</div>
            </nav>

            {/* Hero Section */}
            <div className="relative z-10 flex flex-col items-center mt-20 mb-16 px-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6 animate-fade-in-up">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Live AI Detection
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-500 drop-shadow-2xl">
                    Check Assignments <br />
                    <span className="text-blue-500">In Seconds</span>
                </h1>

                <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed mb-8">
                    Advanced AI-powered analysis for your handwritten and digital assignments.
                    Detect AI content, extract text, and get instant grading feedback.
                </p>

            </div>

            {/* Scanner Section */}
            <div className="z-10 w-full px-4 mb-24">
                <Scanner />
            </div>

            {/* Footer */}
            <footer className="z-10 w-full py-8 text-center text-neutral-600 text-sm border-t border-white/5 bg-black">
                <p>&copy; 2026 DizitalWing</p>
            </footer>

        </main>
    );
}
