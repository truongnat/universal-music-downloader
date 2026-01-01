'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
    DownloadCloud,
    ListMusic,
    AlertCircle,
    RotateCcw,
    Search,
    Loader2,
    Music,
    PlayCircle
} from "lucide-react";
import { ResultCard } from "@/components/common/ResultCard";
import { AdBanner } from "@/components/common/AdBanner";
import { SpotifyItem } from "./types";
import { useSpotifyDownloader } from "./hooks/useSpotifyDownloader";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { SpotifySearchTabContent } from "./SpotifySearchTabContent";
import { SpotifySingleTrackTabContent } from "./SpotifySingleTrackTabContent";
import { SpotifyPlaylistTabContent } from "./SpotifyPlaylistTabContent";

interface SpotifyDownloaderProps {
    dict?: {
        tabs: {
            search: string;
            single: string;
            playlist: string;
        },
        common?: {
            [key: string]: string;
        }
    }
}

export function SpotifyDownloader({ dict }: SpotifyDownloaderProps) {
    const { state, actions } = useSpotifyDownloader({ dict });
    const t = (key: string) => dict?.common?.[key] || key;

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
            <Card className="backdrop-blur-sm">
                <CardHeader>
                    <div className="flex justify-center items-center">
                        <CardTitle className="flex items-center gap-2">
                            <Music className="w-6 h-6 text-green-500" />
                            <span>Spotify MP3 Downloader</span>
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={state.activeTab} onValueChange={actions.setActiveTab}>
                        <div>
                            <AnimatedTabs
                                activeTab={state.activeTab}
                                onTabChange={actions.setActiveTab}
                                tabs={[
                                    {
                                        id: "search",
                                        label: dict?.tabs.search || "Search",
                                        icon: <Search className="w-4 h-4" />,
                                    },
                                    {
                                        id: "single",
                                        label: dict?.tabs.single || "Single",
                                        icon: <PlayCircle className="w-4 h-4" />,
                                    },
                                    {
                                        id: "playlist",
                                        label: dict?.tabs.playlist || "Playlist",
                                        icon: <ListMusic className="w-4 h-4" />,
                                    },
                                ]}
                                layoutId="spotify-tab-bubble"
                                className="w-full sm:w-auto"
                            />
                        </div>

                        <TabsContent value="search" className="space-y-4">
                            <SpotifySearchTabContent
                                setItems={actions.setItems}
                                setIsLoading={actions.setIsLoading}
                                setError={actions.setError}
                                isLoading={state.isLoading}
                                page={state.page}
                                onLoadMore={actions.handleLoadMore}
                                dict={dict}
                            />
                        </TabsContent>

                        <TabsContent value="single" className="space-y-4">
                            <SpotifySingleTrackTabContent
                                setItems={actions.setItems}
                                setIsLoading={actions.setIsLoading}
                                setError={actions.setError}
                                isLoading={state.isLoading}
                                dict={dict}
                            />
                        </TabsContent>

                        <TabsContent value="playlist" className="space-y-4">
                            <SpotifyPlaylistTabContent
                                setItems={actions.setItems}
                                setIsLoading={actions.setIsLoading}
                                setError={actions.setError}
                                isLoading={state.isLoading}
                                dict={dict}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AdBanner />

            {state.isLoading && state.items.length === 0 && (
                <Card>
                    <CardContent className="py-10 flex items-center justify-center">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{t("downloading")}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {state.error && (
                <Card className="border-destructive/50">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <AlertCircle className="w-12 h-12 text-destructive" />
                            <div>
                                <h3 className="text-destructive mb-2">{t("error")}</h3>
                                <p className="text-muted-foreground">{state.error}</p>
                            </div>
                            <Button
                                onClick={actions.handleRetry}
                                variant="outline"
                                disabled={state.isLoading}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                {t("retry")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {state.items.length > 0 && (
                <Card ref={state.resultsRef}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{t("results")} ({state.items.length})</CardTitle>
                        {state.items.filter(i => i.kind === "video").length > 1 && (
                            <Button onClick={actions.handleDownloadAll} disabled={state.isDownloadingAll} variant="outline">
                                {state.isDownloadingAll ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {t("downloading_all")}
                                    </>
                                ) : (
                                    <>
                                        <DownloadCloud className="w-4 h-4 mr-2" />
                                        {t("download_all")}
                                    </>
                                )}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {state.items.map((item) => (
                            <ResultCard
                                key={item.id}
                                item={item}
                                progress={actions.getProgress(item.id)}
                                onDownload={(item) => actions.handleDownloadSingle(item as SpotifyItem)}
                                isDownloadingAll={state.isDownloadingAll}
                                source="spotify"
                                dict={dict}
                            />
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
