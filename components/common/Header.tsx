'use client'
import Link from "next/link"
import { History, Music } from "lucide-react"
import { ModeToggle } from "./ModeToggle"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-orange to-brand-red flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground leading-tight">UMD</span>
            <span className="hidden sm:block text-[10px] text-muted-foreground leading-tight">Universal Music Downloader</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/history">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <History className="w-4 h-4" />
            </Button>
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
