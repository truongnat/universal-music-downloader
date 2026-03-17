export function Footer({ text }: { text: string }) {
    return (
        <footer className="mt-16 border-t border-border">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="font-mono text-sm font-bold text-foreground">UMD</span>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
                        <a href="#terms" className="hover:text-foreground transition-colors">Terms</a>
                        <a href="#support" className="hover:text-foreground transition-colors">Support</a>
                        <span className="text-border">·</span>
                        <span className="font-mono">© {new Date().getFullYear()} — {text}</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
