'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
    DownloadCloud,
    Youtube,
    PlayCircle,
    ListMusic,
    AlertCircle,
    RotateCcw,
    Search,
    Loader2
} from "lucide-react";

import { useYouTubeDownloader } from "./hooks/useYouTubeDownloader";
import { YouTubeSearchTabContent } from "./YouTubeSearchTabContent";
import { YouTubeSingleTrackTabContent } from "./YouTubeSingleTrackTabContent";
import { YouTubePlaylistTabContent } from "./YouTubePlaylistTabContent";
import { ResultCard } from "@/components/common/ResultCard";
import { AudioPlayer } from "../soundcloud/AudioPlayer";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { AdBanner } from "@/components/common/AdBanner";
import { YouTubeItem } from "./types";

interface YouTubeDownloaderProps {
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

export function YouTubeDownloader({ dict }: YouTubeDownloaderProps) {
    const { state, actions } = useYouTubeDownloader({ dict });
    const t = (key: string) => dict?.common?.[key] || key;

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
            <Card className="backdrop-blur-sm">
                <CardHeader>
                    <div className="flex justify-center items-center">
                        <CardTitle className="flex items-center gap-2">
                            <Youtube className="w-6 h-6 text-red-500" />
                            <span>YouTube MP3 Downloader</span>
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
                                        label: dict?.tabs.search || "Tìm kiếm",
                                        icon: <Search className="w-4 h-4" />,
                                    },
                                    {
                                        id: "single",
                                        label: dict?.tabs.single || "Một bài",
                                        icon: <PlayCircle className="w-4 h-4" />,
                                    },
                                    {
                                        id: "playlist",
                                        label: dict?.tabs.playlist || "Playlist",
                                        icon: <ListMusic className="w-4 h-4" />,
                                    },
                                ]}
                                layoutId="yt-tab-bubble"
                                className="w-full sm:w-auto"
                            />
                        </div>

                        <TabsContent value="search" className="space-y-4">
                            <YouTubeSearchTabContent
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
                            <YouTubeSingleTrackTabContent
                                setItems={actions.setItems}
                                setIsLoading={actions.setIsLoading}
                                setError={actions.setError}
                                isLoading={state.isLoading}
                                dict={dict}
                            />
                        </TabsContent>

                        <TabsContent value="playlist" className="space-y-4">
                            <YouTubePlaylistTabContent
                                setItems={actions.setItems}
                                setIsLoading={actions.setIsLoading}
                                setError={actions.setError}
                                isLoading={state.isLoading}
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
                                onDownload={(item) => actions.handleDownloadSingle(item as YouTubeItem)}
                                isDownloadingAll={state.isDownloadingAll}
                                activePreviewId={state.previewItem?.id}
                                onPreview={(item) => actions.handlePreview(item as YouTubeItem)}
                                source="youtube"
                                dict={dict}
                            />
                        ))}
                        {state.activeTab === "search" && (
                            <div className="flex justify-center pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={actions.handleLoadMore}
                                    className="min-w-[200px]"
                                    disabled={state.isLoading}
                                >
                                    {state.isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {t("loading_more")}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center">
                                            <Search className="w-4 h-4 mr-2" />
                                            {t("load_more")}
                                        </div>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            {state.previewItem && (
                <AudioPlayer
                    src={`/api/youtube/download?url=${encodeURIComponent(state.previewItem.url)}&format=mp3&preview=true`}
                    title={state.previewItem.title}
                    artist={state.previewItem.uploader || "YouTube"}
                    thumbnail={state.previewItem.thumbnail}
                    onClose={() => actions.setPreviewItem(null)}
                />
            )}
        </div>
    );
}
