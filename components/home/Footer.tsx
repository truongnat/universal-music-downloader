import { Heart, Music, Github, Twitter } from "lucide-react";

export function Footer({ text }: { text: string }) {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-red flex items-center justify-center shadow-md shadow-brand-orange/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">UMD</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <a href="#privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#support" className="hover:text-foreground transition-colors">
              Support
            </a>
            <span className="text-border">·</span>
            <a href="#github" className="hover:text-foreground transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="#twitter" className="hover:text-foreground transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
          </div>

          {/* Copyright */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <span>© {new Date().getFullYear()}</span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              {text}
              <Heart className="w-3 h-3 text-brand-red fill-brand-red" />
            </span>
          </div>
        </div>

        {/* Bottom text */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/50">
            Free tool for personal use. Not affiliated with SoundCloud or YouTube.
          </p>
        </div>
      </div>
    </footer>
  );
}
