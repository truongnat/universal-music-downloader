"use client";

import React, { useState } from "react";
import { useDownloadQueue } from "@/contexts/DownloadQueueProvider";
import { useClientId } from "@/contexts/ClientIdProvider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Trash2, Music, User, X, Loader2 } from "lucide-react";
import Image from "next/image";

export const DownloadQueue = () => {
  const { queue, removeFromQueue, clearQueue } = useDownloadQueue();
  const { clientId } = useClientId();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAll = async () => {
    if (!clientId) {
      alert("Client ID is not available. Please try again later.");
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch(`/api/soundcloud/download-zip?clientId=${clientId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tracks: queue }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "soundcloud-tracks.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        clearQueue();
      } else {
        throw new Error("Failed to download tracks");
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("An error occurred while downloading the tracks. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (queue.length === 0) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Download Queue ({queue.length})</CardTitle>
        <Button variant="ghost" size="icon" onClick={clearQueue}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 pr-4">
          <div className="space-y-4">
            {queue.map((track) => (
              <div key={track.id} className="flex items-center space-x-4">
                <Image
                  src={track.artwork_url || "/placeholder.svg"}
                  alt={track.title}
                  width={48}
                  height={48}
                  className="rounded-md"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <User className="mr-1 h-3 w-3" />
                    {track.user?.username || "Unknown Artist"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFromQueue(track.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button className="w-full mt-4" onClick={handleDownloadAll} disabled={isDownloading}>
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download All ({queue.length})
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
