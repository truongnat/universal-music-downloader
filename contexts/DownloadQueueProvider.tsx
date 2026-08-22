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
  source: 'soundcloud' | 'youtube' | 'tiktok';
  format: AudioFormat;
  status: DownloadStatus;
  progress: number;
  error?: string;
  retries: number;
  maxRetries: number;
  /** Timestamp before which the queue must not pick this item up (retry backoff) */
  nextAttemptAt?: number;
  filename?: string;
  createdAt: number;
}

interface DownloadQueueContextType {
  queue: DownloadItem[];
  maxParallel: number;
  addToQueue: (item: Omit<DownloadItem, 'id' | 'status' | 'progress' | 'retries' | 'maxRetries' | 'createdAt'>) => string;
  removeFromQueue: (id: string) => void;
  retryItem: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  cancelItem: (id: string) => void;
  getProgress: (id: string) => number;
  getItem: (id: string) => DownloadItem | undefined;
  /** Find the newest queue item for a given source URL (survives page reloads) */
  getByUrl: (url: string) => DownloadItem | undefined;
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
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  // Track which items are actively being fetched to avoid duplicate starts
  const activeDownloadsRef = useRef<Set<string>>(new Set());

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
          nextAttemptAt: undefined, // don't restore stale backoff timers
        }));
        setQueue(restored.filter((item: DownloadItem) => item.status !== 'completed'));
      }
    } catch {}
  }, []);

  // Save to localStorage when queue changes (without blob or large data)
  useEffect(() => {
    try {
      const toSave = queue.map(({ filename, ...rest }) => rest);
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
    activeDownloadsRef.current.delete(id);
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const cancelItem = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    activeDownloadsRef.current.delete(id);
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'cancelled' as const } : item
    ));
    toast.info('Download cancelled');
  }, []);

  const retryItem = useCallback((id: string) => {
    activeDownloadsRef.current.delete(id);
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'queued' as const, progress: 0, error: undefined, retries: 0, nextAttemptAt: undefined } : item
    ));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
    toast.success('Cleared completed downloads');
  }, []);

  const clearAll = useCallback(() => {
    abortControllersRef.current.forEach(controller => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    activeDownloadsRef.current.clear();
    setQueue([]);
    toast.info('Cleared all downloads');
  }, []);

  const getProgress = useCallback((id: string) => {
    return queue.find(item => item.id === id)?.progress ?? 0;
  }, [queue]);

  const getItem = useCallback((id: string) => {
    return queue.find(item => item.id === id);
  }, [queue]);

  const getByUrl = useCallback((url: string) => {
    // Newest first so a re-queued duplicate reflects the latest attempt
    return [...queue].reverse().find(item => item.url === url);
  }, [queue]);

  // Download a single item — uses functional state updates to avoid stale closures
  const downloadItem = useCallback(async (item: DownloadItem) => {
    // Guard: don't start if already active
    if (activeDownloadsRef.current.has(item.id)) return;
    activeDownloadsRef.current.add(item.id);

    const controller = new AbortController();
    abortControllersRef.current.set(item.id, controller);

    setQueue(prev => prev.map(q =>
      q.id === item.id ? { ...q, status: 'downloading' as const, progress: 0 } : q
    ));

    try {
      const downloadUrl = item.source === 'youtube'
        ? `/api/youtube/download?url=${encodeURIComponent(item.url)}&format=${item.format}&title=${encodeURIComponent(item.title)}`
        : item.source === 'tiktok'
          ? `/api/tiktok/download?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}`
          : `/api/soundcloud/download?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}&client_id=`;

      const response = await fetch(downloadUrl, {
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        // Carry rate-limit info into backoff so we respect Retry-After
        let retryAfterMs: number | undefined;
        if (response.status === 429) {
          const ra = response.headers.get('Retry-After');
          const parsed = ra ? Number(ra) * 1000 : NaN;
          retryAfterMs = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 120_000) : undefined;
        }
        throw Object.assign(
          new Error(errorData.error || `HTTP ${response.status}`),
          { status: response.status, retryAfterMs }
        );
      }

      const blob = await response.blob();
      const safeTitle = item.title.replace(/[^a-zA-Z0-9\s\-_()]/g, '_').substring(0, 100);
      const filename = `${safeTitle}.${item.format}`;

      // Trigger download to disk immediately — don't hold blob in memory
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      // Mark completed WITHOUT storing blob
      setQueue(prev => prev.map(q =>
        q.id === item.id ? { ...q, status: 'completed' as const, progress: 100, filename } : q
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

      const errorMsgRaw = error.message || 'Download failed';
      const isRateLimited = error.status === 429;

      // Read current retries from the queue using a ref pattern
      setQueue(prev => {
        const current = prev.find(q => q.id === item.id);
        if (!current) return prev;

        const currentRetries = current.retries + 1;

        if (currentRetries < current.maxRetries) {
          // Rate-limited requests wait for the server's Retry-After; others use exponential backoff
          const baseDelay = isRateLimited && error.retryAfterMs
            ? error.retryAfterMs
            : Math.pow(2, currentRetries) * 1000;
          const delay = Math.min(baseDelay, 120_000);
          toast.warning(
            isRateLimited
              ? `Rate limited — retrying "${item.title}" in ${Math.round(delay / 1000)}s (${currentRetries}/${current.maxRetries})`
              : `Retrying "${item.title}" (${currentRetries}/${current.maxRetries})`
          );

          // Hold the item out of processing until the delay elapses.
          // Clearing nextAttemptAt mutates state, which re-triggers processQueue.
          setTimeout(() => {
            setQueue(q => q.map(i =>
              i.id === item.id && i.nextAttemptAt ? { ...i, nextAttemptAt: undefined } : i
            ));
          }, delay);

          return prev.map(q =>
            q.id === item.id ? {
              ...q,
              status: 'queued' as const,
              progress: 0,
              retries: currentRetries,
              nextAttemptAt: Date.now() + delay,
              error: `${errorMsgRaw} (retry ${currentRetries}/${current.maxRetries})`,
            } : q
          );
        } else {
          toast.error(`Failed to download "${item.title}": ${errorMsgRaw}`);
          return prev.map(q =>
            q.id === item.id ? {
              ...q,
              status: 'error' as const,
              progress: 0,
              error: errorMsgRaw,
              retries: currentRetries,
              nextAttemptAt: undefined,
            } : q
          );
        }
      });
    } finally {
      abortControllersRef.current.delete(item.id);
      activeDownloadsRef.current.delete(item.id);
    }
  }, []);

  // Process queue — uses functional state to avoid stale closures
  // biome-ignore lint/correctness/useExhaustiveDependencies: `queue` is read functionally but its change IS the trigger that starts pending downloads
  useEffect(() => {
    setQueue(prev => {
      const now = Date.now();
      // Skip items waiting out their retry backoff window
      const pendingItems = prev.filter(item =>
        item.status === 'queued' &&
        (!item.nextAttemptAt || item.nextAttemptAt <= now)
      );
      const downloadingCount = prev.filter(item => item.status === 'downloading').length;

      if (pendingItems.length === 0 || downloadingCount >= MAX_PARALLEL_DEFAULT) return prev;

      const slotsAvailable = MAX_PARALLEL_DEFAULT - downloadingCount;
      const itemsToProcess = pendingItems.slice(0, slotsAvailable);

      // Start downloads outside of setState to avoid issues
      // We use queueMicrotask to defer to avoid calling async functions inside setState
      queueMicrotask(() => {
        for (const item of itemsToProcess) {
          downloadItem(item);
        }
      });

      return prev; // Don't modify state in the effect, just trigger downloads
    });
  }, [queue, downloadItem]);

  return (
    <DownloadQueueContext.Provider value={{
      queue,
      maxParallel,
      addToQueue,
      removeFromQueue,
      retryItem,
      clearCompleted,
      clearAll,
      cancelItem,
      getProgress,
      getItem,
      getByUrl,
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
