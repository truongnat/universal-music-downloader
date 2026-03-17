import { Zap, ShieldCheck, Layers } from "lucide-react";

interface FeaturesSectionProps {
    title: string;
    features: {
        speed: { title: string; description: string };
        playlist: { title: string; description: string };
        safe: { title: string; description: string };
    };
}

export function FeaturesSection({ title, features }: FeaturesSectionProps) {
    return (
        <section className="py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h2 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                        {title}
                    </h2>
                    <div className="mt-2 h-px w-12 bg-border" />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <FeatureCard
                        icon={<Zap className="w-4 h-4 text-muted-foreground" />}
                        title={features.speed.title}
                        description={features.speed.description}
                    />
                    <FeatureCard
                        icon={<Layers className="w-4 h-4 text-muted-foreground" />}
                        title={features.playlist.title}
                        description={features.playlist.description}
                    />
                    <FeatureCard
                        icon={<ShieldCheck className="w-4 h-4 text-muted-foreground" />}
                        title={features.safe.title}
                        description={features.safe.description}
                    />
                </div>
            </div>
        </section>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="group p-5 rounded-lg border border-border bg-card hover:border-foreground/20 transition-colors duration-200">
            <div className="mb-4 w-8 h-8 rounded-md border border-border bg-background flex items-center justify-center">
                {icon}
            </div>
            <h3 className="font-mono text-sm font-semibold mb-2 tracking-tight text-foreground">{title}</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
        </div>
    );
}
