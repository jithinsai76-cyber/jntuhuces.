'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Show splash screen for 2.5 seconds, then fade out
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500); // Wait for exit animation
        }, 2500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
        >
            <div className="relative">
                {/* Glowing Orb Effect behind logo */}
                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse"></div>

                {/* Logo Image */}
                <motion.img
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                        duration: 1.2,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                    /* eslint-disable-next-line @next/next/no-img-element */
                    src="/dizitalwing-logo.jpg"
                    alt="Dizital Wing"
                    className="relative z-10 w-48 h-48 md:w-64 md:h-64 object-contain rounded-full border border-white/10 shadow-2xl"
                />
            </div>
        </motion.div>
    );
}
