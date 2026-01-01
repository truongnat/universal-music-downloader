import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import pLimit from "p-limit";
import { useUrlState } from "@/lib/use-url-state";
import { SpotifyItem, DownloadProgress } from "./types";

const getConcurrencyLimit = () => {
    if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
        return Math.max(1, navigator.hardwareConcurrency - 1);
    }
    return 5; // Default concurrency
};

const limit = pLimit(getConcurrencyLimit());

interface UseSpotifyDownloaderProps {
    dict?: {
        common?: {
            [key: string]: string;
        };
    };
}

export function useSpotifyDownloader({ dict }: UseSpotifyDownloaderProps) {
    const t = useCallback((key: string) => {
        return dict?.common?.[key] || key;
    }, [dict]);

    const { setOnlyQueryParams, getQueryParam } = useUrlState();

    // State
    const [activeTab, setActiveTab] = useState(() => getQueryParam("spotify_tab") || "search");
    const [items, setItems] = useState<SpotifyItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>([]);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const resultsRef = useRef<HTMLDivElement>(null);

    const isAnyLoading = isLoading || isDownloadingAll;

    // Effects
    useEffect(() => {
        setItems([]);
        setError(null);
        setIsLoading(false);
        setDownloadProgress([]);
        setIsDownloadingAll(false);
        setPage(1);
    }, [activeTab]);

    const handleNewResults = useCallback(() => {
        if (resultsRef.current && !isLoading) {
            resultsRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [isLoading]);

    useEffect(() => {
        if (items.length > 0) {
            handleNewResults();
        }
    }, [items.length, handleNewResults]);


    // Handlers
    const handleTabChange = useCallback((value: string) => {
        if (!isAnyLoading) {
            setActiveTab(value);
            setOnlyQueryParams({ spotify_tab: value });
        }
    }, [isAnyLoading, setOnlyQueryParams]);

    const handleDownloadSingle = useCallback(async (item: SpotifyItem) => {
        setDownloadProgress(prev => [...prev.filter(p => p.id !== item.id), { id: item.id, progress: 0, status: "downloading" }]);
        toast.info(`${t("start_download")}: "${item.title}"`);

        try {
            const downloadUrl = `/api/spotify/download?url=${encodeURIComponent(item.url)}&format=mp3`;
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: t("error_download") }));
                throw new Error(errorData.error);
            }

            if (!response.body) {
                throw new Error(t("no_tracks_download"));
            }

            const reader = response.body.getReader();
            const contentLength = response.headers.get("Content-Length");
            const totalLength = contentLength ? parseInt(contentLength, 10) : 0;
            let receivedLength = 0;
            const chunks: Uint8Array[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                if (totalLength) {
                    const progress = Math.round((receivedLength / totalLength) * 100);
                    setDownloadProgress(prev => prev.map(p => p.id === item.id ? { ...p, progress } : p));
                }
            }

            const blob = new Blob(chunks as any, { type: 'audio/mpeg' });
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${item.title}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            setDownloadProgress(prev => prev.map(p => p.id === item.id ? { ...p, status: "completed", progress: 100 } : p));
            toast.success(`${t("success_download")}: "${item.title}"`);
        } catch (err: any) {
            console.error(err);
            toast.error(`${t("error_download")}: "${item.title}" (${err.message})`);
            setDownloadProgress(prev => prev.map(p => p.id === item.id ? { ...p, status: "error" } : p));
        }
    }, [t]);

    const handleDownloadAll = useCallback(async () => {
        const videosToDownload = items.filter(i => {
            if (i.kind !== "video") return false;
            const progress = downloadProgress.find(p => p.id === i.id);
            return !progress || progress.status !== 'completed';
        });

        if (videosToDownload.length === 0) {
            toast.info(t("all_downloaded"));
            return;
        }

        setIsDownloadingAll(true);
        toast.info(t("start_download_count").replace("{count}", videosToDownload.length.toString()));

        const downloadPromises = videosToDownload.map(item =>
            limit(() => handleDownloadSingle(item))
        );

        await Promise.all(downloadPromises);

        setIsDownloadingAll(false);
        toast.success(t("all_downloaded"));
    }, [items, downloadProgress, handleDownloadSingle, t]);


    const getProgress = useCallback((id: string) => {
        return downloadProgress.find(p => p.id === id);
    }, [downloadProgress]);

    const handleLoadMore = useCallback(() => {
        setPage(p => p + 1);
    }, []);

    const handleRetry = useCallback(() => {
        setError(null);
    }, []);


    return {
        state: {
            activeTab,
            items,
            isLoading,
            page,
            downloadProgress,
            isDownloadingAll,
            error,
            isAnyLoading,
            resultsRef,
        },
        actions: {
            setActiveTab: handleTabChange,
            setItems,
            setIsLoading,
            setError,
            setPage,
            handleDownloadSingle,
            handleDownloadAll,
            getProgress,
            handleLoadMore,
            handleRetry,
        }
    };
}
