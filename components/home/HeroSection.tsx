interface HeroSectionProps {
    title: string;
    description: string;
}

export function HeroSection({ title, description }: HeroSectionProps) {
    return (
        <section className="pt-24 pb-8 px-4">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground font-mono">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    SoundCloud + YouTube
                </div>
                <h1 className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                    {title}
                </h1>
                <p className="text-muted-foreground max-w-xl leading-relaxed">
                    {description}
                </p>
            </div>
        </section>
    );
}
