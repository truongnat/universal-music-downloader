import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { SpotifyItem } from "./types";
import { ActionInputBar } from "@/components/common";
import { useUrlState } from "@/lib/use-url-state";

interface SpotifySearchTabContentProps {
    setItems: (items: SpotifyItem[] | ((prev: SpotifyItem[]) => SpotifyItem[])) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    isLoading: boolean;
    page?: number;
    onLoadMore?: () => void;
    dict?: { common?: { [key: string]: string } };
}

export function SpotifySearchTabContent({
    setItems,
    setIsLoading,
    setError,
    isLoading,
    page = 1,
    dict,
}: SpotifySearchTabContentProps) {
    const t = (key: string) => {
        return dict?.common?.[key] || key;
    };
    const { setQueryParam, getQueryParam } = useUrlState();
    const [query, setQuery] = useState(() => getQueryParam("spotify_q") || "");
    const currentSearch = useRef(query);
    const currentPage = useRef(1);

    useEffect(() => {
        const urlQuery = getQueryParam("spotify_q");
        if (urlQuery && urlQuery !== currentSearch.current) {
            setQuery(urlQuery);
        }
    }, [getQueryParam]);

    useEffect(() => {
        const urlQuery = getQueryParam("spotify_q");
        if (urlQuery && page === 1) {
            if (query) handleSearch(false);
        }
    }, []);

    useEffect(() => {
        if (page > 1 && page > currentPage.current) {
            currentPage.current = page;
            handleSearch(true);
        } else if (page === 1) {
            currentPage.current = 1;
        }
    }, [page]);

    const handleSearch = async (isLoadMore = false) => {
        if (!query.trim()) {
            toast.error(t("enter_keyword"));
            return;
        }

        setIsLoading(true);
        setError(null);

        if (!isLoadMore) {
            setItems([]);
            setQueryParam("spotify_q", query);
            currentSearch.current = query;
            currentPage.current = 1;
        }

        try {
            const res = await fetch("/api/spotify/info", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, type: "search" }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to search");
            }

            const data = await res.json();

            if (data.length === 0) {
                if (!isLoadMore) toast.warning(`${t("no_results_for")} "${query}"`);
            } else {
                if (isLoadMore) {
                    setItems((prev) => {
                        const existingIds = new Set(prev.map(item => item.id));
                        const uniqueNewItems = data.filter((item: SpotifyItem) => !existingIds.has(item.id));
                        return [...prev, ...uniqueNewItems];
                    });
                } else {
                    setItems(data);
                    toast.success(`${t("results_found")}: ${data.length}`);
                }
            }

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
            label={t("search_btn") + " Spotify:"}
            placeholder={t("search_placeholder")}
            value={query}
            onChange={setQuery}
            onSubmit={() => handleSearch(false)}
            disabled={isLoading}
            isLoading={isLoading}
            buttonText={t("search_btn")}
            loadingText={t("searching")}
        />
    );
}
