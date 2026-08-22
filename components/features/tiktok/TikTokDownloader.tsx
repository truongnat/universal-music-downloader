'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { AlertCircle, Download, Loader2, Music, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDownloadQueue } from "@/contexts/DownloadQueueProvider";
import dictionary from "@/lib/dictionary.json";

interface TikTokInfo {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    uploader: string;
    url: string;
}

interface TikTokDownloaderProps {
    externalQuery?: string;
}

type Phase = "idle" | "loading" | "ready" | "error";

export function TikTokDownloader({ externalQuery }: TikTokDownloaderProps) {
    const t = (key: string) =>
        ((dictionary as any)?.common?.[key] as string) || key;

    const { addToQueue, getByUrl } = useDownloadQueue();
    const [info, setInfo] = useState<TikTokInfo | null>(null);
    const [phase, setPhase] = useState<Phase>("idle");
    const [error, setError] = useState<string | null>(null);
    const lastFetchedRef = useRef<string>("");

    const fetchInfo = useCallback(async (url: string) => {
        setPhase("loading");
        setError(null);
        try {
            const res = await fetch(
                `/api/tiktok/info?url=${encodeURIComponent(url)}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch info");
            setInfo(data);
            setPhase("ready");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load TikTok");
            setPhase("error");
        }
    }, []);

    // Auto-fetch when external query changes
    useEffect(() => {
        const url = externalQuery?.trim();
        if (!url || !url.includes("tiktok.com")) return;
        if (url === lastFetchedRef.current) return;
        lastFetchedRef.current = url;
        void fetchInfo(url);
    }, [externalQuery, fetchInfo]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (phase === "loading") {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
                <div className="relative">
                    <div className="absolute -inset-4 bg-[#25F4EE]/10 rounded-full blur-xl animate-pulse" />
                    <div className="relative h-14 w-14 border-4 border-muted border-t-[#25F4EE] rounded-full animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Fetching TikTok audio…</p>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="flex flex-col items-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <div>
                    <h3 className="text-destructive font-semibold mb-2">{t("error")}</h3>
                    <p className="text-muted-foreground max-w-md text-sm">{error}</p>
                </div>
                <Button variant="outline" onClick={() => externalQuery && fetchInfo(externalQuery)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t("retry")}
                </Button>
            </div>
        );
    }

    if (!info) return null;

    const queueItem = info ? getByUrl(info.url) : undefined;
    const status = queueItem?.status;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="group relative flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-border/80 hover:shadow-md transition-all"
        >
            {/* Thumbnail */}
            <div className="relative w-full sm:w-28 aspect-square rounded-xl overflow-hidden shrink-0 bg-muted shadow-sm">
                {info.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={info.thumbnail}
                        alt={info.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                )}
                {/* TikTok badge */}
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-[10px] font-bold tracking-wide">
                    <span className="text-[#25F4EE]">Tik</span>
                    <span className="text-[#FE2C55]">Tok</span>
                </div>
                {info.duration > 0 && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[11px] font-medium text-white tabular-nums">
                        {formatDuration(info.duration)}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left w-full sm:w-auto">
                <h4 className="font-semibold text-base leading-snug line-clamp-2 text-foreground" title={info.title}>
                    {info.title}
                </h4>
                <p className="text-sm text-muted-foreground truncate">
                    @{info.uploader}
                </p>
            </div>

            {/* Action */}
            <div className="shrink-0 w-full sm:w-auto">
                <Button
                    onClick={() =>
                        addToQueue({
                            url: info.url,
                            title: info.title,
                            thumbnail: info.thumbnail,
                            artist: `@${info.uploader}`,
                            source: "tiktok",
                            format: "mp3",
                        })
                    }
                    disabled={status === "downloading" || status === "queued"}
                    className={
                        status === "completed"
                            ? "w-full h-11 px-6 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20"
                            : status === "queued" || status === "downloading"
                                ? "w-full h-11 px-6 rounded-xl bg-muted text-muted-foreground"
                                : "w-full h-11 px-6 rounded-xl bg-gradient-to-r from-brand-orange to-brand-red text-white hover:shadow-lg hover:shadow-brand-orange/20 transition-all"
                    }
                >
                    {status === "downloading" ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {queueItem?.progress ?? 0}%
                        </>
                    ) : status === "queued" ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2" />
                            Queued
                        </>
                    ) : status === "completed" ? (
                        <>
                            ✓ Done
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4 mr-2" />
                            Download Audio
                        </>
                    )}
                </Button>
            </div>

            {/* Progress bar */}
            {status === "downloading" && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-muted rounded-b-2xl overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${queueItem?.progress ?? 0}%` }}
                        className="h-full bg-gradient-to-r from-brand-orange to-brand-red"
                    />
                </div>
            )}
        </motion.div>
    );
}
