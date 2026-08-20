'use client';
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { SingleTrackTabContent } from "./SingleTrackTabContent";
import { PlaylistTabContent } from "./PlaylistTabContent";
import { AudioPlayer } from "./AudioPlayer";
import { getDownloadApiPath } from "@/lib/get-api-endpoint";

import { useSoundCloudDownloader } from "./hooks/useSoundCloudDownloader";
import { SoundCloudTabs } from "./_components/SoundCloudTabs";
import { SoundCloudStatus } from "./_components/SoundCloudStatus";
import { SoundCloudResults } from "./_components/SoundCloudResults";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import dictionary from "@/lib/dictionary.json";
import { useQuality } from "@/contexts/QualityProvider";

interface SoundCloudDownloaderProps {
  hideInput?: boolean;
  hideControls?: boolean;
  externalQuery?: string;
  externalMode?: 'single' | 'playlist';
  externalMp3QualityKbps?: 128 | 320;
}

export function SoundCloudDownloader({ hideInput, hideControls, externalQuery, externalMode }: SoundCloudDownloaderProps) {
  const dict = dictionary;
  const { state, actions } = useSoundCloudDownloader();
  const { mp3QualityKbps } = useQuality();
  const t = (key: string) => (dict as any)?.common?.[key] || key;

  const effectiveTab = externalMode ?? state.activeTab;

  // Sync external mode to active tab
  React.useEffect(() => {
    if (externalMode && externalMode !== state.activeTab) {
      actions.setActiveTab(externalMode);
    }
  }, [externalMode, state.activeTab, actions.setActiveTab]);

  return (
    <div className="w-full max-w-4xl mx-auto p-2 space-y-4">
      {!hideControls && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border border-border p-5 rounded-2xl">
          <h2 className="text-xl font-bold flex items-center gap-3 text-foreground">
            <span className="w-3 h-3 bg-brand-orange rounded-full animate-pulse" />
            SoundCloud Downloader
          </h2>

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
      )}

      {/* If inputs are hidden, we don't need Tabs UI, but we still need the content 
          rendered based on activeTab to handle the fetching logic.
      */}
      {hideInput ? (
        effectiveTab === "playlist" ? (
          <PlaylistTabContent
            setTracks={actions.setTracks}
            setIsLoading={actions.setIsLoading}
            setError={actions.setError}
            isLoading={state.isLoading}
            isAnyLoading={state.isAnyLoading}
            clientId={state.clientId}
            hideInput={hideInput}
            externalQuery={externalQuery}
          />
        ) : (
          <SingleTrackTabContent
            setTracks={actions.setTracks}
            setIsLoading={actions.setIsLoading}
            setError={actions.setError}
            isLoading={state.isLoading}
            isAnyLoading={state.isAnyLoading}
            clientId={state.clientId}
            hideInput={hideInput}
            externalQuery={externalQuery}
          />
        )
      ) : (
        <SoundCloudTabs
          activeTab={state.activeTab}
          onTabChange={actions.setActiveTab}
          hideTabsList={hideInput}
        >
          <TabsContent value="single" className="mt-0">
            <SingleTrackTabContent
              setTracks={actions.setTracks}
              setIsLoading={actions.setIsLoading}
              setError={actions.setError}
              isLoading={state.isLoading}
              isAnyLoading={state.isAnyLoading}
              clientId={state.clientId}
              hideInput={hideInput}
              externalQuery={externalQuery}
            />
          </TabsContent>
          <TabsContent value="playlist" className="mt-0">
            <PlaylistTabContent
              setTracks={actions.setTracks}
              setIsLoading={actions.setIsLoading}
              setError={actions.setError}
              isLoading={state.isLoading}
              isAnyLoading={state.isAnyLoading}
              clientId={state.clientId}
              hideInput={hideInput}
              externalQuery={externalQuery}
            />
          </TabsContent>
        </SoundCloudTabs>
      )}

      <SoundCloudStatus
        isLoading={state.isLoading}
        error={state.error}
        tracksLength={state.tracks.length}
        isAnyLoading={state.isAnyLoading}
        onRetry={actions.handleRetry}
      />

      <SoundCloudResults
        ref={state.resultsRef}
        tracks={state.tracks}
        isDownloadingAll={state.isDownloadingAll}
        isAnyLoading={state.isAnyLoading}
        mp3QualityKbps={mp3QualityKbps}
        onDownloadAll={actions.handleDownloadAll}
        onDownloadSingle={actions.handleDownloadSingle}
        getProgress={actions.getProgressForTrack}
        previewItem={state.previewItem}
        onPreview={actions.handlePreview}
      />

      {state.previewItem && state.clientId && (
        <AudioPlayer
          src={getDownloadApiPath(state.previewItem.url, state.previewItem.title, state.clientId) + "&preview=true"}
          title={state.previewItem.title}
          artist={state.previewItem.artist || 'SoundCloud'}
          thumbnail={state.previewItem.thumbnail}
          onClose={() => actions.setPreviewItem(null)}
          disableSeek={true}
        />
      )}
    </div>
  );
}
