import React from "react";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, Loader2, Music, Youtube } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import dictionary from "@/lib/dictionary.json";

interface UnifiedControlsProps {
    inputValue: string;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    mp3QualityKbps: 128 | 320;
    onMp3QualityKbpsChange: (quality: 128 | 320) => void;
    canSubmit?: boolean;
    isLoading?: boolean;
}

export function UnifiedControls({
    inputValue,
    onInputChange,
    onSubmit,
    mp3QualityKbps,
    onMp3QualityKbpsChange,
    canSubmit = true,
    isLoading
}: UnifiedControlsProps) {
    const dict = dictionary;

    const getServiceIcon = () => {
        const lower = inputValue.toLowerCase();
        if (lower.includes("soundcloud.com") || lower.includes("on.soundcloud.com")) {
            return (
                <Music className="w-4 h-4 text-muted-foreground animate-in zoom-in duration-300" />
            );
        }
        if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
            return (
                <Youtube className="w-4 h-4 text-muted-foreground animate-in zoom-in duration-300" />
            );
        }
        return <LinkIcon className="w-4 h-4 text-muted-foreground/60" />;
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4">
            <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 transition-all duration-300">
                            {getServiceIcon()}
                        </div>
                        <Input
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            placeholder={dict?.common?.placeholder_unified || "Paste SoundCloud or YouTube URL..."}
                            className="pl-10 pr-16 h-11 text-sm bg-background border-border focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 rounded-lg placeholder:text-muted-foreground/50"
                            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <span className="text-[10px] font-mono font-medium tracking-widest uppercase">
                                    Auto
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground font-mono font-medium tracking-widest uppercase">
                            {(dict as any)?.common?.select_quality || "Quality"}
                        </span>
                        <Select
                            value={mp3QualityKbps.toString()}
                            onValueChange={(v) => onMp3QualityKbpsChange(v === "128" ? 128 : 320)}
                        >
                            <SelectTrigger className="w-[110px] h-10 rounded-lg bg-background border-border text-xs font-mono font-medium">
                                <SelectValue placeholder="320 kbps" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="128">128 kbps</SelectItem>
                                <SelectItem value="320">320 kbps</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {!canSubmit && inputValue.trim().length > 0 && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
                    Only SoundCloud and YouTube links are supported.
                </p>
            )}
            <p className="mt-2 text-center text-[11px] text-muted-foreground/50 font-mono">
                Paste a link — fetch starts automatically.
            </p>
        </div>
    );
}
