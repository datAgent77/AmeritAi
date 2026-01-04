"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const TextRotate = ({
    texts,
    duration = 3000,
    className
}: {
    texts: string[],
    duration?: number,
    className?: string
}) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % texts.length);
        }, duration);
        return () => clearInterval(interval);
    }, [texts.length, duration]);

    return (
        <div className={className}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ y: 40, opacity: 0, filter: "blur(8px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -40, opacity: 0, filter: "blur(8px)" }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    style={{ display: "inline-block" }} // Ensure it behaves like text
                >
                    {texts[index]}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
