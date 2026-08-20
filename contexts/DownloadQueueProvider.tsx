'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

export type DownloadStatus = 'queued' | 'downloading' | 'completed' | 'error' | 'cancelled';
export type AudioFormat = 'mp3' | 'flac' | 'wav' | 'ogg' | 'm4a';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  artist?: string;
  source: 'soundcloud' | 'youtube';
  format: AudioFormat;
  status: DownloadStatus;
  progress: number;
  error?: string;
  retries: number;
  maxRetries: number;
  blob?: Blob;
  filename?: string;
  createdAt: number;
}

interface DownloadQueueContextType {
  queue: DownloadItem[];
  isProcessing: boolean;
  maxParallel: number;
  addToQueue: (item: Omit<DownloadItem, 'id' | 'status' | 'progress' | 'retries' | 'maxRetries' | 'createdAt'>) => string;
  removeFromQueue: (id: string) => void;
  retryItem: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  cancelItem: (id: string) => void;
  getProgress: (id: string) => number;
  getItem: (id: string) => DownloadItem | undefined;
  setMaxParallel: (n: number) => void;
}

const STORAGE_KEY = 'umd_download_queue';
const HISTORY_KEY = 'umd_download_history';
const MAX_PARALLEL_DEFAULT = 3;
const MAX_RETRIES = 2;
const MAX_HISTORY = 100;

const DownloadQueueContext = createContext<DownloadQueueContextType | undefined>(undefined);

function generateId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function DownloadQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DownloadItem[]>([]);
  const [maxParallel, setMaxParallel] = useState(MAX_PARALLEL_DEFAULT);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Reset any in-progress items to queued
        const restored = parsed.map((item: DownloadItem) => ({
          ...item,
          status: item.status === 'downloading' ? 'queued' : item.status,
          progress: item.status === 'downloading' ? 0 : item.progress,
        }));
        setQueue(restored.filter((item: DownloadItem) => item.status !== 'completed'));
      }
    } catch {}
  }, []);

  // Save to localStorage when queue changes
  useEffect(() => {
    try {
      // Only save non-blob data
      const toSave = queue.map(({ blob, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [queue]);

  const addToQueue = useCallback((item: Omit<DownloadItem, 'id' | 'status' | 'progress' | 'retries' | 'maxRetries' | 'createdAt'> & { format?: AudioFormat }) => {
    const id = generateId();
    const newItem: DownloadItem = {
      ...item,
      id,
      format: item.format || 'mp3',
      status: 'queued',
      progress: 0,
      retries: 0,
      maxRetries: MAX_RETRIES,
      createdAt: Date.now(),
    };
    setQueue(prev => [...prev, newItem]);
    toast.success(`Added "${item.title}" to queue`, { duration: 2000 });
    return id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const cancelItem = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'cancelled' as const } : item
    ));
    toast.info('Download cancelled');
  }, []);

  const retryItem = useCallback((id: string) => {
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'queued' as const, progress: 0, error: undefined } : item
    ));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
    toast.success('Cleared completed downloads');
  }, []);

  const clearAll = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    setQueue([]);
    toast.info('Cleared all downloads');
  }, []);

  const getProgress = useCallback((id: string) => {
    return queue.find(item => item.id === id)?.progress ?? 0;
  }, [queue]);

  const getItem = useCallback((id: string) => {
    return queue.find(item => item.id === id);
  }, [queue]);

  // Process queue - download items
  const processQueue = useCallback(async () => {
    if (isProcessing) return;

    const pendingItems = queue.filter(item => item.status === 'queued');
    const downloadingCount = queue.filter(item => item.status === 'downloading').length;

    if (pendingItems.length === 0 || downloadingCount >= maxParallel) return;

    setIsProcessing(true);

    const slotsAvailable = maxParallel - downloadingCount;
    const itemsToProcess = pendingItems.slice(0, slotsAvailable);

    for (const item of itemsToProcess) {
      // Start download in background
      downloadItem(item);
    }

    setIsProcessing(false);
  }, [queue, maxParallel, isProcessing]);

  const downloadItem = async (item: DownloadItem) => {
    const controller = new AbortController();
    abortControllersRef.current.set(item.id, controller);

    setQueue(prev => prev.map(q =>
      q.id === item.id ? { ...q, status: 'downloading' as const, progress: 0 } : q
    ));

    try {
      const downloadUrl = item.source === 'youtube'
        ? `/api/youtube/download?url=${encodeURIComponent(item.url)}&format=${item.format}&title=${encodeURIComponent(item.title)}`
        : `/api/soundcloud/download?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}&client_id=`;

      const response = await fetch(downloadUrl, {
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const safeTitle = item.title.replace(/[^a-zA-Z0-9\s\-_()]/g, '_').substring(0, 100);
      const filename = `${safeTitle}.${item.format}`;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setQueue(prev => prev.map(q =>
        q.id === item.id ? { ...q, status: 'completed' as const, progress: 100, blob, filename } : q
      ));

      // Save to history
      try {
        const historyItem = {
          id: item.id,
          title: item.title,
          thumbnail: item.thumbnail,
          artist: item.artist,
          source: item.source,
          filename,
          downloadedAt: Date.now(),
        };
        const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const updated = [historyItem, ...existing].slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {}

      toast.success(`Downloaded "${item.title}"`, { duration: 3000 });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: 'cancelled' as const } : q
        ));
        return;
      }

      const errorMsg = error.message || 'Download failed';
      const currentRetries = item.retries + 1;

      if (currentRetries < item.maxRetries) {
        // Auto-retry with exponential backoff
        const delay = Math.pow(2, currentRetries) * 1000;
        setQueue(prev => prev.map(q =>
          q.id === item.id ? {
            ...q,
            status: 'queued' as const,
            progress: 0,
            retries: currentRetries,
            error: `${errorMsg} (retry ${currentRetries}/${item.maxRetries})`,
          } : q
        ));

        setTimeout(() => {
          retryItem(item.id);
        }, delay);

        toast.warning(`Retrying "${item.title}" (${currentRetries}/${item.maxRetries})`);
      } else {
        setQueue(prev => prev.map(q =>
          q.id === item.id ? {
            ...q,
            status: 'error' as const,
            progress: 0,
            error: errorMsg,
            retries: currentRetries,
          } : q
        ));
        toast.error(`Failed to download "${item.title}": ${errorMsg}`);
      }
    } finally {
      abortControllersRef.current.delete(item.id);
    }
  };

  // Process queue periodically
  useEffect(() => {
    processQueue();
  }, [queue, processQueue]);

  return (
    <DownloadQueueContext.Provider value={{
      queue,
      isProcessing,
      maxParallel,
      addToQueue,
      removeFromQueue,
      retryItem,
      clearCompleted,
      clearAll,
      cancelItem,
      getProgress,
      getItem,
      setMaxParallel,
    }}>
      {children}
    </DownloadQueueContext.Provider>
  );
}

export function useDownloadQueue() {
  const context = useContext(DownloadQueueContext);
  if (context === undefined) {
    throw new Error('useDownloadQueue must be used within a DownloadQueueProvider');
  }
  return context;
}
