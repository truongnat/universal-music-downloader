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
    Loader2
} from "lucide-react";

import { useYouTubeDownloader } from "./hooks/useYouTubeDownloader";
import { YouTubeSingleTrackTabContent } from "./YouTubeSingleTrackTabContent";
import { YouTubePlaylistTabContent } from "./YouTubePlaylistTabContent";
import { ResultCard } from "@/components/common/ResultCard";
import { AudioPlayer } from "../soundcloud/AudioPlayer";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { YouTubeItem } from "./types";
import dictionary from "@/lib/dictionary.json";
import { Badge } from "@/components/ui/badge";
import { useQuality } from "@/contexts/QualityProvider";

interface YouTubeDownloaderProps {
    hideInput?: boolean;
    hideControls?: boolean;
    externalQuery?: string;
    externalMode?: 'single' | 'playlist';
    externalMp3QualityKbps?: 128 | 320;
}

export function YouTubeDownloader({ hideInput, hideControls, externalQuery, externalMode }: YouTubeDownloaderProps) {
    const dict = dictionary;
    const { state, actions } = useYouTubeDownloader();
    const { mp3QualityKbps } = useQuality();
    const t = (key: string) => (dict as any)?.common?.[key] || key;

    const effectiveTab = externalMode ?? state.activeTab;

    React.useEffect(() => {
        if (externalMode && externalMode !== state.activeTab) {
            actions.setActiveTab(externalMode);
        }
    }, [externalMode, state.activeTab, actions.setActiveTab]);

    const tabContents = (
        <>
            <TabsContent value="single" className="space-y-4">
                <YouTubeSingleTrackTabContent
                    setItems={actions.setItems}
                    setIsLoading={actions.setIsLoading}
                    setError={actions.setError}
                    isLoading={state.isLoading}
                    hideInput={hideInput}
                    externalQuery={externalQuery}
                />
            </TabsContent>

            <TabsContent value="playlist" className="space-y-4">
                <YouTubePlaylistTabContent
                    setItems={actions.setItems}
                    setIsLoading={actions.setIsLoading}
                    setError={actions.setError}
                    isLoading={state.isLoading}
                    hideInput={hideInput}
                    externalQuery={externalQuery}
                />
            </TabsContent>
        </>
    );

    const activeContent =
        effectiveTab === "playlist" ? (
            <YouTubePlaylistTabContent
                setItems={actions.setItems}
                setIsLoading={actions.setIsLoading}
                setError={actions.setError}
                isLoading={state.isLoading}
                hideInput={hideInput}
                externalQuery={externalQuery}
            />
        ) : (
            <YouTubeSingleTrackTabContent
                setItems={actions.setItems}
                setIsLoading={actions.setIsLoading}
                setError={actions.setError}
                isLoading={state.isLoading}
                hideInput={hideInput}
                externalQuery={externalQuery}
            />
        );

    return (
        <div className="w-full max-w-4xl mx-auto p-2 space-y-4">
            {!hideControls && (
                <Card className="bg-card border-border">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <CardTitle className="flex items-center gap-3 text-foreground">
                                <div className="p-2 rounded-xl bg-brand-red/10">
                                    <Youtube className="w-5 h-5 text-brand-red" />
                                </div>
                                <span>YouTube Downloader</span>
                            </CardTitle>

                            <div className="flex items-center gap-4">
                                <Badge
                                    variant={state.isAnyLoading ? "outline" : "secondary"}
                                    className="h-7 px-3"
                                >
                                    {state.isAnyLoading ? (
                                        <span className="flex items-center gap-1.5">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            FFmpeg Loading
                                        </span>
                                    ) : "FFmpeg Ready"}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={state.activeTab} onValueChange={actions.setActiveTab}>
                            {!hideInput && (
                                <div>
                                    <AnimatedTabs
                                        activeTab={state.activeTab}
                                        onTabChange={actions.setActiveTab}
                                        tabs={[
                                            {
                                                id: "single",
                                                label: (dict as any).youtube.tabs.single || "Single",
                                                icon: <PlayCircle className="w-4 h-4" />,
                                            },
                                            {
                                                id: "playlist",
                                                label: (dict as any).youtube.tabs.playlist || "Playlist",
                                                icon: <ListMusic className="w-4 h-4" />,
                                            },
                                        ]}
                                        layoutId="yt-tab-bubble"
                                        className="w-full sm:w-auto"
                                    />
                                </div>
                            )}

                            {tabContents}
                        </Tabs>
                    </CardContent>
                </Card>
            )}

            {hideControls && activeContent}

            {state.isLoading && state.items.length === 0 && (
                <Card className="bg-card border-border">
                    <CardContent className="py-8">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute -inset-2 bg-brand-red/10 rounded-xl blur-lg animate-pulse" />
                                <div className="relative h-12 w-12 rounded-xl bg-brand-red/10 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-brand-red" />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold tracking-tight text-foreground">Fetching info…</p>
                                <p className="text-xs text-muted-foreground truncate">{t("downloading")}</p>
                            </div>
                        </div>

                        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-1/3 bg-gradient-to-r from-brand-red to-brand-orange animate-[indeterminate_1.2s_ease_infinite]" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {state.error && (
                <Card className="bg-destructive/5 border-destructive/20">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <div>
                                <h3 className="text-destructive font-semibold mb-2">{t("error")}</h3>
                                <p className="text-muted-foreground max-w-md">{state.error}</p>
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
                <Card ref={state.resultsRef} className="bg-card border-border">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <CardTitle className="text-foreground">{t("results")} ({state.items.length})</CardTitle>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                            {state.items.filter(i => i.kind === "video").length > 1 && (
                                <Button
                                    onClick={actions.handleDownloadAll}
                                    disabled={state.isDownloadingAll}
                                    className="bg-gradient-to-r from-brand-red to-brand-orange text-white hover:shadow-lg hover:shadow-brand-red/20 transition-all duration-300"
                                >
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
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {state.items.map((item) => (
                            <ResultCard
                                key={item.id}
                                item={item}
                                mp3QualityKbps={mp3QualityKbps}
                                isDownloadingAll={state.isDownloadingAll}
                                activePreviewId={state.previewItem?.id}
                                onPreview={(item) => actions.handlePreview(item as YouTubeItem)}
                                source="youtube"
                            />
                        ))}
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
                    disableSeek={true}
                />
            )}
        </div>
    );
}
