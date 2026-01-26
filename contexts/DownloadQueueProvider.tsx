"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { SoundCloudTrack } from "@/types/soundcloud";

interface DownloadQueueContextType {
  queue: SoundCloudTrack[];
  addToQueue: (track: SoundCloudTrack) => void;
  removeFromQueue: (trackId: number) => void;
  clearQueue: () => void;
  isInQueue: (trackId: number) => boolean;
}

const DownloadQueueContext = createContext<DownloadQueueContextType | undefined>(
  undefined
);

export const DownloadQueueProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [queue, setQueue] = useState<SoundCloudTrack[]>([]);

  const addToQueue = (track: SoundCloudTrack) => {
    setQueue((prevQueue) => [...prevQueue, track]);
  };

  const removeFromQueue = (trackId: number) => {
    setQueue((prevQueue) => prevQueue.filter((track) => track.id !== trackId));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const isInQueue = (trackId: number) => {
    return queue.some((track) => track.id === trackId);
  };

  return (
    <DownloadQueueContext.Provider
      value={{ queue, addToQueue, removeFromQueue, clearQueue, isInQueue }}
    >
      {children}
    </DownloadQueueContext.Provider>
  );
};

export const useDownloadQueue = () => {
  const context = useContext(DownloadQueueContext);
  if (context === undefined) {
    throw new Error("useDownloadQueue must be used within a DownloadQueueProvider");
  }
  return context;
};
