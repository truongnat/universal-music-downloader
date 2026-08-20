"use client";

import React, { useRef } from "react";
import { Link as LinkIcon, Loader2, Music, Youtube, ArrowRight, Clipboard, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import dictionary from "@/lib/dictionary.json";
import { useQuality } from "@/contexts/QualityProvider";

interface UnifiedControlsProps {
    inputValue: string;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    canSubmit?: boolean;
    isLoading?: boolean;
}

export function UnifiedControls({
    inputValue,
    onInputChange,
    onSubmit,
    canSubmit = true,
    isLoading
}: UnifiedControlsProps) {
    const dict = dictionary;
    const { mp3QualityKbps, setMp3QualityKbps } = useQuality();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasPasted, setHasPasted] = React.useState(false);

    const getServiceInfo = () => {
        const lower = inputValue.toLowerCase();
        if (lower.includes("soundcloud.com") || lower.includes("on.soundcloud.com")) {
            return { icon: <Music className="w-4 h-4" />, label: "SoundCloud", color: "text-brand-orange", iconBg: "bg-brand-orange/10" };
        }
        if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
            return { icon: <Youtube className="w-4 h-4" />, label: "YouTube", color: "text-brand-red", iconBg: "bg-brand-red/10" };
        }
        return null;
    };

    const serviceInfo = getServiceInfo();
    const hasValue = inputValue.trim().length > 0;
    const isActive = hasValue && canSubmit;

    // Handle paste from clipboard
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                onInputChange(text);
                setHasPasted(true);
                setTimeout(() => setHasPasted(false), 2000);
            }
        } catch {
            // Clipboard API not available
        }
    };

    // Clear input
    const handleClear = () => {
        onInputChange("");
        inputRef.current?.focus();
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
                {/* Main search bar */}
                <div className="relative group">
                    {/* Subtle glow on hover */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-brand-orange/10 via-brand-red/10 to-brand-orange/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* Container */}
                    <div className="
                        relative rounded-2xl border border-border/60 shadow-lg shadow-black/5 overflow-hidden transition-shadow duration-300
                        hover:shadow-xl hover:shadow-black/8
                    ">
                        {/* Subtle inner gradient for depth */}
                        <div className="absolute inset-0 bg-gradient-to-b from-card to-card/95 pointer-events-none" />
                        {/* Input row */}
                        <div className="relative flex items-center gap-2 p-2.5">
                            {/* Service icon / Search icon */}
                            <div className="flex items-center justify-center w-12 h-12 shrink-0">
                                <AnimatePresence mode="wait">
                                    {serviceInfo ? (
                                        <motion.div
                                            key={serviceInfo.label}
                                            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
                                            transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
                                            className={`w-10 h-10 rounded-xl ${serviceInfo.iconBg} flex items-center justify-center ${serviceInfo.color}`}
                                        >
                                            {serviceInfo.icon}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="link"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-muted-foreground/50"
                                        >
                                            <LinkIcon className="w-5 h-5" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Input field */}
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => onInputChange(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isActive) {
                                        onSubmit();
                                    }
                                    if (e.key === 'Escape') {
                                        handleClear();
                                    }
                                }}
                                placeholder={dict?.common?.placeholder_unified || "Paste a SoundCloud or YouTube link..."}
                                className="flex-1 h-12 text-base bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground/40 text-foreground"
                                autoComplete="off"
                                spellCheck={false}
                            />

                            {/* Right side actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Service badge */}
                                <AnimatePresence>
                                    {serviceInfo && hasValue && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10, width: 0 }}
                                            animate={{ opacity: 1, x: 0, width: "auto" }}
                                            exit={{ opacity: 0, x: -10, width: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${serviceInfo.color} ${serviceInfo.iconBg} overflow-hidden whitespace-nowrap`}
                                        >
                                            {serviceInfo.icon}
                                            <span>{serviceInfo.label}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Clear button */}
                                <AnimatePresence>
                                    {hasValue && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            onClick={handleClear}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </motion.button>
                                    )}
                                </AnimatePresence>

                                {/* Paste button */}
                                {!hasValue && (
                                    <button
                                        onClick={handlePaste}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                        {hasPasted ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-green-500" />
                                                <span className="text-green-500">Pasted</span>
                                            </>
                                        ) : (
                                            <>
                                                <Clipboard className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Paste</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Submit button */}
                                <motion.button
                                    whileHover={isActive ? { scale: 1.05 } : {}}
                                    whileTap={isActive ? { scale: 0.95 } : {}}
                                    onClick={onSubmit}
                                    disabled={!isActive || isLoading}
                                    className={`
                                        h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0
                                        ${isActive
                                            ? 'bg-gradient-to-r from-brand-orange to-brand-red text-white shadow-md shadow-brand-orange/20 hover:shadow-lg hover:shadow-brand-orange/30'
                                            : 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-4 h-4" />
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar: quality + hint */}
                    <div className="flex items-center justify-between mt-3 px-2">
                        {/* Quality segmented control */}
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] text-muted-foreground/60 font-medium tracking-wide uppercase">Quality</span>
                            <div className="flex items-center bg-muted/80 rounded-xl p-1 border border-border/50">
                                {([128, 320] as const).map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setMp3QualityKbps(q)}
                                        className={
                                            `relative px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                                mp3QualityKbps === q
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground/70'
                                            }`
                                        }
                                    >
                                        {mp3QualityKbps === q && (
                                            <motion.div
                                                layoutId="quality-pill"
                                                className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/80"
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10">{q} kbps</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right side: error, hint, or shortcut */}
                        <div className="flex items-center">
                            {hasValue && !canSubmit ? (
                                <motion.p
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xs text-destructive font-medium"
                                >
                                    Unsupported link
                                </motion.p>
                            ) : isActive ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hidden sm:flex items-center gap-1.5"
                                >
                                    <span className="text-[11px] text-muted-foreground/50">Press</span>
                                    <kbd className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground border border-border">
                                        Enter ↵
                                    </kbd>
                                </motion.div>
                            ) : (
                                <p className="text-[11px] text-muted-foreground/50 hidden sm:block">
                                    Tracks & playlists • Auto-detect
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
