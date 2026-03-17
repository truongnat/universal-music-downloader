'use client'
import { ModeToggle } from "./ModeToggle"

export function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-sm text-foreground">UMD</span>
          <span className="hidden sm:block text-xs text-muted-foreground">Universal Music Downloader</span>
        </div>
        <ModeToggle />
      </div>
    </header>
  )
}
