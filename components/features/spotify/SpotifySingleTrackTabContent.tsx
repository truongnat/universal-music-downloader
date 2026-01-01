'use client';
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { SpotifyItem } from "./types";
import { ActionInputBar } from "@/components/common";
import { useUrlState } from "@/lib/use-url-state";

interface SpotifySingleTrackTabContentProps {
    setItems: (items: SpotifyItem[]) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    isLoading: boolean;
    dict?: { common?: { [key: string]: string } };
}

export function SpotifySingleTrackTabContent({
    setItems,
    setIsLoading,
    setError,
    isLoading,
    dict,
}: SpotifySingleTrackTabContentProps) {
    const t = (key: string) => {
        return dict?.common?.[key] || key;
    };
    const { setQueryParam, getQueryParam } = useUrlState();
    const [url, setUrl] = useState(() => getQueryParam("spotify_single_url") || "");

    useEffect(() => {
        setQueryParam("spotify_single_url", url);
    }, [url, setQueryParam]);

    const handleFetch = async () => {
        if (!url.trim()) {
            toast.error(t("enter_keyword"));
            return;
        }

        setIsLoading(true);
        setError(null);
        setItems([]);

        try {
            const res = await fetch("/api/spotify/info", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, type: "single" }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to fetch track");
            }

            const data = await res.json();
            setItems([data]);
            toast.success(`${t("results_found")}: 1`);

        } catch (err: any) {
            console.error(err);
            setError(err.message || t("error"));
            toast.error(t("error"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ActionInputBar
            label="URL Spotify:"
            placeholder="https://open.spotify.com/track/..."
            value={url}
            onChange={setUrl}
            onSubmit={handleFetch}
            disabled={isLoading}
            isLoading={isLoading}
            buttonText={t("search_btn")}
            loadingText={t("searching")}
        />
    );
}
