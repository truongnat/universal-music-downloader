'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  X,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Music,
  Youtube,
  RotateCcw,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDownloadQueue, DownloadItem } from '@/contexts/DownloadQueueProvider';

export function DownloadQueue() {
  const { queue, clearCompleted, clearAll, cancelItem, retryItem, removeFromQueue } = useDownloadQueue();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const activeCount = queue.filter(item => item.status === 'downloading').length;
  const completedCount = queue.filter(item => item.status === 'completed').length;
  const errorCount = queue.filter(item => item.status === 'error').length;
  const queuedCount = queue.filter(item => item.status === 'queued').length;

  const totalItems = queue.length;
  const hasItems = totalItems > 0;

  if (!hasItems) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-80 max-h-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  Downloads
                </span>
                {activeCount > 0 && (
                  <span className="text-[10px] font-medium text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                    {activeCount} active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border">
              <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                {queuedCount > 0 && <span>{queuedCount} queued</span>}
                {activeCount > 0 && <span className="text-brand-orange">{activeCount} downloading</span>}
                {completedCount > 0 && <span className="text-green-500">{completedCount} done</span>}
                {errorCount > 0 && <span className="text-destructive">{errorCount} failed</span>}
              </div>
              <div className="flex items-center gap-1">
                {completedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={clearCompleted}
                    title="Clear completed"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={clearAll}
                  title="Clear all"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Queue list */}
            <div className="overflow-y-auto max-h-64 p-2 space-y-1.5">
              <AnimatePresence>
                {queue.map((item) => (
                  <DownloadQueueItem
                    key={item.id}
                    item={item}
                    onCancel={cancelItem}
                    onRetry={retryItem}
                    onRemove={removeFromQueue}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300",
          isOpen
            ? "bg-foreground text-background"
            : "bg-gradient-to-r from-brand-orange to-brand-red text-white shadow-brand-orange/30"
        )}
      >
        <Download className="w-5 h-5" />
        
        {/* Badge */}
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
            {totalItems}
          </span>
        )}

        {/* Active indicator */}
        {activeCount > 0 && (
          <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        )}
      </motion.button>
    </div>
  );
}

const DownloadQueueItem = React.memo(function DownloadQueueItem({
  item,
  onCancel,
  onRetry,
  onRemove,
}: {
  item: DownloadItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const statusIcon = () => {
    switch (item.status) {
      case 'queued':
        return <Download className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'downloading':
        return <Loader2 className="w-3.5 h-3.5 text-brand-orange animate-spin" />;
      case 'completed':
        return <Check className="w-3.5 h-3.5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
      case 'cancelled':
        return <X className="w-3.5 h-3.5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.source === 'youtube' ? (
              <Youtube className="w-4 h-4 text-muted-foreground/50" />
            ) : (
              <Music className="w-4 h-4 text-muted-foreground/50" />
            )}
          </div>
        )}
        {/* Source badge */}
        <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/60">
          {item.source === 'youtube' ? (
            <Youtube className="w-2 h-2 text-white" />
          ) : (
            <Music className="w-2 h-2 text-white" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {statusIcon()}
          <span className="text-[10px] text-muted-foreground truncate">
            {item.status === 'downloading' && `${item.progress}%`}
            {item.status === 'queued' && 'Queued'}
            {item.status === 'completed' && 'Done'}
            {item.status === 'error' && (item.error?.substring(0, 30) || 'Error')}
            {item.status === 'cancelled' && 'Cancelled'}
          </span>
        </div>
        {/* Progress bar */}
        {item.status === 'downloading' && (
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              className="h-full bg-gradient-to-r from-brand-orange to-brand-red"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {item.status === 'downloading' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCancel(item.id)}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        {item.status === 'error' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRetry(item.id)}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        )}
        {(item.status === 'completed' || item.status === 'error' || item.status === 'cancelled') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
});
