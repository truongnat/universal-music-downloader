'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Music,
  Youtube,
  Loader2,
  X,
  Play,
  User,
  Eye,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDownloadQueue } from '@/contexts/DownloadQueueProvider';

interface SearchResult {
  id: string;
  title: string;
  thumbnail?: string;
  duration: number;
  artist?: string;
  uploader?: string;
  url: string;
  viewCount?: number;
}

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({ placeholder = "Search for songs...", className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'soundcloud' | 'youtube'>('youtube');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { addToQueue } = useDownloadQueue();

  const search = useCallback(async (q: string, source: 'soundcloud' | 'youtube') => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = source === 'youtube'
        ? `/api/youtube/search?q=${encodeURIComponent(q)}&limit=8`
        : `/api/soundcloud/search?q=${encodeURIComponent(q)}&limit=8`;

      const response = await fetch(endpoint);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cleanup timeouts and event listeners on unmount
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(true);
    setSelectedIndex(-1);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(value, activeTab), 300);
  }, [search, activeTab]);

  const handleTabChange = useCallback((tab: 'soundcloud' | 'youtube') => {
    setActiveTab(tab);
    setSelectedIndex(-1);
    if (query.trim()) {
      search(query, tab);
    }
  }, [query, search]);

  const handleDownload = useCallback((result: SearchResult) => {
    addToQueue({
      url: result.url,
      title: result.title,
      thumbnail: result.thumbnail,
      artist: result.artist || result.uploader,
      source: activeTab,
      format: 'mp3',
    });
  }, [addToQueue, activeTab]);

  const handleDownloadAll = useCallback(() => {
    results.forEach((result) => {
      addToQueue({
        url: result.url,
        title: result.title,
        thumbnail: result.thumbnail,
        artist: result.artist || result.uploader,
        source: activeTab,
        format: 'mp3',
      });
    });
  }, [results, addToQueue, activeTab]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || (!query.trim() && !isLoading)) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev < results.length - 1 ? prev + 1 : 0;
          // Scroll selected item into view
          const el = resultsRef.current?.querySelector(`[data-index="${next}"]`);
          el?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : results.length - 1;
          const el = resultsRef.current?.querySelector(`[data-index="${next}"]`);
          el?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          e.preventDefault();
          handleDownload(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, query, isLoading, results, selectedIndex, handleDownload]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count?: number) => {
    if (!count) return null;
    if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-12 pl-12 pr-12 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setSelectedIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {isOpen && (query.trim() || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Service tabs */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => handleTabChange('youtube')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  activeTab === 'youtube'
                    ? "text-brand-red border-b-2 border-brand-red"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Youtube className="w-4 h-4" />
                YouTube
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('soundcloud')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  activeTab === 'soundcloud'
                    ? "text-brand-orange border-b-2 border-brand-orange"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Music className="w-4 h-4" />
                SoundCloud
              </button>
            </div>

            {/* Results list */}
            <div ref={resultsRef} className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {/* Queue All button */}
                  {results.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      className="w-full flex items-center justify-center gap-2 py-2 mb-1 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Queue all {results.length} results
                    </button>
                  )}

                  {results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      data-index={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer group transition-colors",
                        index === selectedIndex
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        setSelectedIndex(index);
                        handleDownload(result);
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {result.thumbnail ? (
                          <img
                            src={result.thumbnail}
                            alt={result.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {activeTab === 'youtube' ? (
                              <Youtube className="w-5 h-5 text-muted-foreground/50" />
                            ) : (
                              <Music className="w-5 h-5 text-muted-foreground/50" />
                            )}
                          </div>
                        )}
                        {/* Duration badge */}
                        {result.duration > 0 && (
                          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[10px] font-medium text-white">
                            {formatDuration(result.duration)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="truncate">{result.artist || result.uploader}</span>
                          </div>
                          {result.viewCount && result.viewCount > 0 && (
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{formatViewCount(result.viewCount)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(result);
                          }}
                          className="h-8 px-3 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red text-white text-xs font-medium flex items-center gap-1.5 hover:shadow-md transition-shadow"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Get
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Keyboard hint */}
            {results.length > 0 && (
              <div className="flex items-center justify-center gap-3 py-2 border-t border-border text-[10px] text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  <ArrowDown className="w-3 h-3" />
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 text-[9px] font-mono">↵</kbd>
                  queue
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 text-[9px] font-mono">esc</kbd>
                  close
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
