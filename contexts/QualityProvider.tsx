'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Mp3QualityKbps = 128 | 320;

interface QualityContextType {
  mp3QualityKbps: Mp3QualityKbps;
  setMp3QualityKbps: (quality: Mp3QualityKbps) => void;
}

const QualityContext = createContext<QualityContextType | undefined>(undefined);

const STORAGE_KEY = 'umd_mp3_quality';

export function QualityProvider({ children }: { children: ReactNode }) {
  const [mp3QualityKbps, setMp3QualityKbpsState] = useState<Mp3QualityKbps>(320);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '128' || stored === '320') {
        setMp3QualityKbpsState(parseInt(stored) as Mp3QualityKbps);
      }
    } catch {
      // Ignore storage access errors (private mode, etc.)
    }
  }, []);

  const setMp3QualityKbps = (quality: Mp3QualityKbps) => {
    setMp3QualityKbpsState(quality);
    try {
      localStorage.setItem(STORAGE_KEY, quality.toString());
    } catch {
      // Ignore storage access errors
    }
  };

  return (
    <QualityContext.Provider value={{ mp3QualityKbps, setMp3QualityKbps }}>
      {children}
    </QualityContext.Provider>
  );
}

export function useQuality() {
  const context = useContext(QualityContext);
  if (context === undefined) {
    throw new Error('useQuality must be used within a QualityProvider');
  }
  return context;
}
