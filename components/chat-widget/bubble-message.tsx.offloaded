import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface BubbleMessageProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    onClick: () => void;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function BubbleMessage({
    message,
    isVisible,
    onClose,
    onClick,
    position = 'bottom-right'
}: BubbleMessageProps) {
    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                        "absolute z-50 mb-4 max-w-xs",
                        // Position logic relative to the launcher
                        // Assuming launcher is at bottom-0
                        "bottom-[70px]",
                        position === 'bottom-right' && "right-0",
                        position === 'bottom-left' && "left-0",
                        position === 'bottom-center' && "left-1/2 -translate-x-1/2"
                    )}
                >
                    <div
                        className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm p-4 rounded-xl shadow-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                        onClick={onClick}
                    >
                        {/* Close Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="absolute -top-2 -right-2 bg-zinc-200 dark:bg-zinc-800 rounded-full p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <X size={12} />
                        </button>

                        <div className="flex items-start gap-3">
                            {/* Tail for speech bubble effect */}
                            <div className={cn(
                                "absolute -bottom-2 w-4 h-4 bg-white dark:bg-zinc-900 border-b border-r border-zinc-200 dark:border-zinc-800 transform rotate-45",
                                position === 'bottom-right' && "right-6",
                                position === 'bottom-left' && "left-6",
                                position === 'bottom-center' && "left-1/2 -translate-x-1/2"
                            )} />

                            <p className="font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
                                {message}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
