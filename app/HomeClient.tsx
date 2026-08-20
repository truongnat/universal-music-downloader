'use client';

import { motion } from "motion/react";
import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Components
import { SoundCloudDownloader } from "@/components/features/soundcloud/SoundCloudDownloader";
import { YouTubeDownloader } from "@/components/features/youtube/YouTubeDownloader";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { Footer } from "@/components/home/Footer";
import { UnifiedControls } from "@/components/home/UnifiedControls";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import dictionary from "@/lib/dictionary.json";

// Hooks
import { useDebounce } from "@/hooks/use-debounce";
import { useServiceDetection } from "@/hooks/use-service-detection";
import { useClientId } from "@/contexts/ClientIdProvider";
import { useQuality } from "@/contexts/QualityProvider";

type DownloadMode = "single" | "playlist";

export default function HomeClient() {
    const dict = dictionary;
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { mp3QualityKbps } = useQuality();

    // Input state
    const [inputValue, setInputValue] = useState("");
    const [submittedUrl, setSubmittedUrl] = useState("");

    // Initial load from query parameter
    useEffect(() => {
        const queryUrl = searchParams.get('url');
        if (queryUrl) {
            const trimmed = queryUrl.trim();
            setInputValue(trimmed);
            setSubmittedUrl(trimmed);
        }
    }, [searchParams]);

    // Update query parameter when URL is submitted
    useEffect(() => {
        const currentUrl = searchParams.get('url');
        if (submittedUrl && submittedUrl !== currentUrl) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('url', submittedUrl);
            router.replace(`${pathname}?${params.toString()}`);
        } else if (!submittedUrl && currentUrl) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('url');
            const query = params.toString();
            router.replace(`${pathname}${query ? `?${query}` : ''}`);
        }
    }, [submittedUrl, pathname, router, searchParams]);

    const debouncedInputValue = useDebounce(inputValue, 250);

    // Service detection (input vs submitted)
    const inputDetection = useServiceDetection(inputValue);
    const submittedDetection = useServiceDetection(submittedUrl);

    const {
        clientId: soundCloudClientId,
        isLoading: isSoundCloudClientIdLoading,
        error: soundCloudClientIdError,
    } = useClientId();

    const handleUnifiedSubmit = useCallback(() => {
        if (!inputValue.trim() || !inputDetection.isValid) return;
        setSubmittedUrl(inputValue.trim());
    }, [inputValue, inputDetection.isValid]);

    // Auto-trigger on debounced input if it looks like a URL
    useEffect(() => {
        const trimmed = debouncedInputValue.trim();
        if (!trimmed) return;
        if (!inputDetection.isValid) return;
        if (trimmed === submittedUrl) return;
        handleUnifiedSubmit();
    }, [debouncedInputValue, inputDetection.isValid, submittedUrl, handleUnifiedSubmit]);

    // Determine if ready to render (for SoundCloud, wait for prefetch)
    const needsSoundCloudClientId =
        submittedDetection.isUrl && submittedDetection.service === "soundcloud";

    const isReady = !needsSoundCloudClientId || soundCloudClientId !== null;

    const isLoading =
        isSoundCloudClientIdLoading &&
        needsSoundCloudClientId;

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Full-page decorative background */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Grid pattern - spans entire page */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }} />

                {/* Gradient orbs */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-brand-orange/15 to-brand-red/15 blur-3xl"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
                    className="absolute top-[40%] -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-brand-red/10 to-brand-orange/10 blur-3xl"
                />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="absolute top-[60%] right-0 w-[500px] h-[500px] rounded-full bg-brand-orange/5 blur-3xl"
                />
            </div>

            <ErrorBoundary>
                <HeroSection
                    title={dict.hero.title}
                    description={dict.hero.description}
                />

                {/* Main App Section */}
                <section className="max-w-4xl mx-auto px-4 pb-16 relative z-10 -mt-4">

                    {/* Unified Controls */}
                    <div className="mb-10">
                        <UnifiedControls
                            inputValue={inputValue}
                            onInputChange={setInputValue}
                            onSubmit={handleUnifiedSubmit}
                            canSubmit={inputDetection.isValid}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Content Area - Show detected service when ready */}
                    <motion.div
                        key={`${submittedDetection.service}-${submittedDetection.mode}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{
                            duration: 0.4,
                            ease: [0.16, 1, 0.3, 1]
                        }}
                        className="min-h-[400px]"
                    >
                        {isReady ? (
                            submittedDetection.service === "soundcloud" ? (
                                <SoundCloudDownloader
                                    hideInput={true}
                                    hideControls={true}
                                    externalQuery={submittedUrl}
                                    externalMode={submittedDetection.mode as DownloadMode}
                                    externalMp3QualityKbps={mp3QualityKbps}
                                />
                            ) : submittedDetection.service === "youtube" ? (
                                <YouTubeDownloader
                                    hideInput={true}
                                    hideControls={true}
                                    externalQuery={submittedUrl}
                                    externalMode={submittedDetection.mode as DownloadMode}
                                    externalMp3QualityKbps={mp3QualityKbps}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                                        <svg className="w-8 h-8 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                        </svg>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-foreground font-medium">
                                            Paste a link to get started
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Supports SoundCloud and YouTube
                                        </p>
                                    </div>
                                </div>
                            )
                        ) : (
                            // Loading/Error state for SoundCloud prefetch
                            <div className="flex flex-col items-center justify-center gap-6 py-16">
                                {soundCloudClientIdError ? (
                                    <>
                                        <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-destructive/10">
                                            <span className="text-destructive text-2xl">⚠</span>
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="text-foreground font-medium">Failed to load SoundCloud</p>
                                            <p className="text-sm text-muted-foreground">{soundCloudClientIdError}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <div className="absolute -inset-4 bg-brand-orange/10 rounded-full blur-xl animate-pulse" />
                                            <div className="relative h-14 w-14 border-4 border-muted border-t-brand-orange rounded-full animate-spin" />
                                        </div>
                                        <div className="text-center space-y-3">
                                            <p className="text-foreground font-medium">Preparing SoundCloud...</p>
                                            <div className="w-64 h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div className="h-full w-1/3 bg-gradient-to-r from-brand-orange to-brand-red animate-[indeterminate_1.2s_ease_infinite]" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </motion.div>
                </section>

                <ErrorBoundary>
                    <FeaturesSection
                        title={dict.features.title}
                        features={dict.features}
                    />
                </ErrorBoundary>

                <Footer text={dict.footer.text} />
            </ErrorBoundary>
        </div>
    );
}
