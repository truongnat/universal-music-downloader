'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  History,
  Music,
  Youtube,
  Trash2,
  Download,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: string;
  title: string;
  thumbnail?: string;
  artist?: string;
  source: 'soundcloud' | 'youtube' | 'tiktok';
  filename?: string;
  downloadedAt: number;
}

const HISTORY_KEY = 'umd_download_history';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Download History</h1>
              <p className="text-sm text-muted-foreground">
                {history.length} download{history.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* History list */}
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No downloads yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your download history will appear here
            </p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-brand-orange to-brand-red text-white">
                <Download className="w-4 h-4 mr-2" />
                Start Downloading
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-border/80 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.source === 'youtube' ? (
                        <Youtube className="w-5 h-5 text-muted-foreground/50" />
                      ) : (
                        <Music className="w-5 h-5 text-muted-foreground/50" />
                      )}
                    </div>
                  )}
                  {/* Source badge */}
                  <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/60">
                    {item.source === 'youtube' ? (
                      <Youtube className="w-2.5 h-2.5 text-white" />
                    ) : (
                      <Music className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.artist || 'Unknown'}</span>
                    {item.filename && (
                      <>
                        <span>•</span>
                        <span className="font-mono">{item.filename}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(item.downloadedAt)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
