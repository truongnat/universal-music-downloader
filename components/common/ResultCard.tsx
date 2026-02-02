import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    DownloadCloud,
    Clock,
    Copy,
    Check,
    Play,
    Pause,
    Music,
    Youtube,
    User,
    Share,
} from "lucide-react";
import { toast } from "sonner";
import { ShareDialog } from "./ShareDialog";

interface MediaItem {
    id: string;
    url: string;
    title: string;
    thumbnail?: string;
    uploader?: string;
    artist?: string;
    duration?: number;
    kind: "track" | "video" | "playlist";
    genre?: string;
    releaseDate?: string;
}

interface DownloadProgress {
    id: string;
    progress: number;
    status: "downloading" | "completed" | "error";
}

interface ResultCardProps {
    item: MediaItem;
    progress?: DownloadProgress;
    onDownload: (item: MediaItem) => void;
    isDownloadingAll?: boolean;
    activePreviewId?: string | null;
    onPreview?: (item: MediaItem) => void;
    dict?: { common?: { [key: string]: string } };
    source: "soundcloud" | "youtube" | "spotify";
}

export const ResultCard = React.memo(({ item, progress, onDownload, isDownloadingAll, activePreviewId, onPreview, dict, source }: ResultCardProps) => {
    const t = (key: string) => dict?.common?.[key] || key;
    const [isCopied, setIsCopied] = React.useState(false);
    const [isShareOpen, setIsShareOpen] = React.useState(false);

    const isDownloading = progress?.status === "downloading";
    const isCompleted = progress?.status === "completed";
    const isPlaying = activePreviewId === item.id;

    const handlePreview = () => {
        if (onPreview) {
            onPreview(item);
        }
    };

    const formatDuration = (seconds?: number) => {
        if (seconds === undefined) return "";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const SourceIcon = source === 'soundcloud' ? Music : source === 'youtube' ? Youtube : Music;
    const iconColor = source === 'soundcloud' ? 'text-orange-500' : source === 'youtube' ? 'text-red-500' : 'text-green-500';

    return (
        <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative group">
                {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <SourceIcon className={`w-8 h-8 text-muted-foreground ${iconColor}`} />
                    </div>
                )}
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:text-white hover:bg-transparent"
                        onClick={handlePreview}
                        aria-label={isPlaying ? t("stop") : t("preview")}
                    >
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                    </Button>
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate" title={item.title}>{item.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{item.uploader || item.artist || t("unknown_artist")}</span>
                    {item.duration && (
                        <>
                            <span className="mx-1">•</span>
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(item.duration)}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {item.genre && (
                        <>
                            <Music className="w-3 h-3" />
                            <span>{item.genre}</span>
                        </>
                    )}
                    {item.releaseDate && (
                        <>
                            <span className="mx-1">•</span>
                            <span>{new Date(item.releaseDate).toLocaleDateString()}</span>
                        </>
                    )}
                </div>
                {progress && (
                    <div className="mt-2">
                        <Progress value={progress.progress} className="h-1" />
                        <p className="text-xs text-muted-foreground mt-1 text-right">{progress.progress}%</p>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handlePreview}
                    className="hidden sm:flex"
                    title={isPlaying ? t("stop") : t("preview")}
                >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDownload(item)}
                    disabled={isDownloading || isDownloadingAll}
                    title={isCompleted ? t("downloaded") : isDownloading ? t("downloading") : t("download")}
                >
                    {isCompleted ? (
                        <DownloadCloud className="w-5 h-5 text-green-500" />
                    ) : isDownloading ? (
                        <Download className="w-5 h-5 animate-pulse" />
                    ) : (
                        <Download className="w-5 h-5" />
                    )}
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsShareOpen(true)}
                    title={t("share")}
                >
                    <Share className="w-5 h-5" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                        navigator.clipboard.writeText(item.url);
                        toast.success(t("success_copy"));
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                    }}
                    title={t("copy_link")}
                >
                    {isCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
            </div>
            <ShareDialog
                item={item}
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                dict={dict}
            />
        </div>
    );
});

ResultCard.displayName = "ResultCard";
