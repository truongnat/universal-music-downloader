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
  Clock,
  User,
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
}

interface SearchBarProps {
  onSelect?: (result: SearchResult, source: 'soundcloud' | 'youtube') => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ onSelect, placeholder = "Search for songs...", className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'soundcloud' | 'youtube'>('youtube');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToQueue } = useDownloadQueue();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    // Debounce search
    const timeout = setTimeout(() => search(value, activeTab), 300);
    return () => clearTimeout(timeout);
  };

  const handleTabChange = (tab: 'soundcloud' | 'youtube') => {
    setActiveTab(tab);
    if (query.trim()) {
      search(query, tab);
    }
  };

  const handleSelect = (result: SearchResult) => {
    onSelect?.(result, activeTab);
    setIsOpen(false);
    setQuery('');
  };

  const handleDownload = (result: SearchResult) => {
    addToQueue({
      url: result.url,
      title: result.title,
      thumbnail: result.thumbnail,
      artist: result.artist || result.uploader,
      source: activeTab,
      format: 'mp3',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          placeholder={placeholder}
          className="w-full h-12 pl-12 pr-12 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
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
            <div className="max-h-80 overflow-y-auto">
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
                  {results.map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group"
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
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate">{result.artist || result.uploader}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
