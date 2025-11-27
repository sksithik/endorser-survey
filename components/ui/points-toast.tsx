'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type PointsToastProps = {
    points: number;
    message?: string;
    onComplete?: () => void;
};

export function PointsToast({ points, message = 'Points Earned', onComplete }: PointsToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                onComplete?.();
            }, 300); // Wait for exit animation
        }, 3000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    // Use portal to render at the top level, but for simplicity in this setup we can just render fixed.
    // If we want to be safe about z-index and stacking contexts, portal is better, 
    // but let's try a simple fixed position first as it's easier to drop in.

    if (!isVisible) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-500 ease-out animate-in slide-in-from-top-4 fade-in">
            <div className="flex items-center justify-center bg-white/20 rounded-full w-10 h-10 backdrop-blur-sm">
                <span className="text-xl">🏆</span>
            </div>
            <div>
                <h4 className="font-bold text-lg">+{points} Points</h4>
                <p className="text-xs text-white/90 font-medium uppercase tracking-wider">{message}</p>
            </div>
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 pointer-events-none" />
        </div>
    );
}
