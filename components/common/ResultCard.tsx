'use client';

import React from "react";
import Image from "next/image";
import {
  Check,
  Download,
  Loader2,
  Music,
  Pause,
  Play,
  User,
  Youtube,
} from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDownloadQueue } from "@/contexts/DownloadQueueProvider";
import dictionary from "@/lib/dictionary.json";

interface MediaItem {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  uploader?: string;
  artist?: string;
  duration?: number;
  kind: "track" | "video" | "playlist";
}

interface ResultCardProps {
  item: MediaItem;
  mp3QualityKbps?: 128 | 320;
  isDownloadingAll?: boolean;
  activePreviewId?: string | null;
  onPreview?: (item: MediaItem) => void;
  source: "soundcloud" | "youtube";
}

const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hrs > 0
    ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    : `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const ResultCard = React.memo(function ResultCard({
  item,
  mp3QualityKbps,
  isDownloadingAll,
  activePreviewId,
  onPreview,
  source,
}: ResultCardProps) {
  const dict = dictionary;
  const t = (key: string) => (dict as any)?.common?.[key] || key;

  const { addToQueue, getByUrl } = useDownloadQueue();
  // Match by source URL (queue items have generated IDs that differ from media IDs)
  const queueItem = getByUrl(item.url);
  const isDownloading = queueItem?.status === 'downloading';
  const isCompleted = queueItem?.status === 'completed';
  const isQueued = queueItem?.status === 'queued';
  const isPlaying = activePreviewId === item.id;
  const canPreview = typeof onPreview === "function";

  const handlePreview = () => {
    if (!canPreview) return;
    onPreview(item);
  };

  const thumbnailContent = (
    <>
      {item.thumbnail ? (
        <Image
          src={item.thumbnail}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 96px"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Music className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}

      {canPreview && (
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            className="p-3 rounded-full bg-card shadow-xl"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-foreground" />
            ) : (
              <Play className="w-5 h-5 text-foreground ml-0.5" />
            )}
          </motion.div>
        </div>
      )}

      {/* Source badge */}
      <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-card shadow-sm border border-border">
        {source === "youtube" ? (
          <Youtube className="w-3.5 h-3.5 text-brand-red" />
        ) : (
          <Music className="w-3.5 h-3.5 text-brand-orange" />
        )}
      </div>

      {/* Duration badge */}
      {typeof item.duration === "number" && item.duration > 0 && (
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-xs font-medium text-white">
          {formatDuration(item.duration)}
        </div>
      )}
    </>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-border/80 hover:shadow-md transition-all duration-300"
    >
      {/* Thumbnail */}
      {canPreview ? (
        <button
          type="button"
          className={cn(
            "relative w-full sm:w-24 aspect-square rounded-xl overflow-hidden shrink-0 shadow-sm cursor-pointer transition-transform duration-300 group-hover:scale-[1.02]"
          )}
          onClick={handlePreview}
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
          disabled={isDownloadingAll}
        >
          {thumbnailContent}
        </button>
      ) : (
        <div className="relative w-full sm:w-24 aspect-square rounded-xl overflow-hidden shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-[1.02]">
          {thumbnailContent}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <h4
          className="font-semibold text-base leading-snug truncate text-foreground"
          title={item.title}
        >
          {item.title}
        </h4>

        <div className="flex flex-wrap items-center gap-2">
          {/* Artist/Uploader */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[180px] truncate">
              {item.uploader || item.artist || t("unknown_artist")}
            </span>
          </div>

          {/* Quality badge */}
          {mp3QualityKbps && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {mp3QualityKbps}kbps
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-row sm:flex-col lg:flex-row items-center gap-2 shrink-0 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
        {canPreview && (
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreview}
            className="h-10 w-10 rounded-xl border-border hover:bg-muted"
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
            disabled={isDownloadingAll}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
        )}

        <Button
          onClick={() => {
            if (!isDownloading && !isCompleted && !isQueued) {
              addToQueue({
                url: item.url,
                title: item.title,
                thumbnail: item.thumbnail,
                artist: item.uploader || item.artist,
                source,
                format: 'mp3',
              });
            }
          }}
          disabled={isDownloading || isDownloadingAll || isQueued}
          className={cn(
            "h-10 px-5 rounded-xl font-medium text-sm transition-all duration-300 flex-1 sm:flex-none",
            isCompleted
              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20"
              : isQueued
                ? "bg-muted text-foreground hover:bg-muted/80"
                : "bg-gradient-to-r from-brand-orange to-brand-red text-white hover:shadow-md hover:shadow-brand-orange/20"
          )}
        >
          {isDownloading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="tabular-nums">{queueItem?.progress ?? 0}%</span>
            </div>
          ) : isCompleted ? (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Done</span>
            </div>
          ) : isQueued ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4" />
              <span>Queued</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>Download</span>
            </div>
          )}
        </Button>
      </div>

      {/* Download progress bar */}
      {isDownloading && (
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
});
