import { NextRequest, NextResponse } from "next/server";
import { initYtDlp } from "@/lib/youtube-api";
import { checkRateLimit, getClientIdentifier, rateLimitedResponse } from "@/lib/rate-limit";

interface TikTokInfo {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    uploader: string;
    url: string;
}

export async function GET(req: NextRequest) {
    // Rate limit metadata lookups more generously than downloads
    const rl = checkRateLimit(`tiktok-info:${getClientIdentifier(req)}`, {
        limit: 30,
        windowMs: 60_000,
    });  if (!rl.allowed) return rateLimitedResponse(rl);

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
        const yt = await initYtDlp();
        const json = await yt.execPromise([
            url,
            "--dump-json",
            "--no-playlist",
            "--no-warnings",
            "--no-check-certificates",
        ]);

        const lines = json.split("\n").filter((l: string) => l.trim());
        if (lines.length === 0) {
            throw new Error("No metadata returned for this TikTok URL");
        }

        const meta = JSON.parse(lines[0]);
        const info: TikTokInfo = {
            id: meta.id || "",
            title: meta.title || "TikTok Audio",
            thumbnail: meta.thumbnail || "",
            duration: typeof meta.duration === "number" ? meta.duration : 0,
            uploader: meta.uploader || meta.channel || "TikTok",
            url: meta.webpage_url || url,
        };

        return NextResponse.json(info);
    } catch (error: any) {
        console.error("TikTok info API Error:", error);
        const message = error?.message?.includes("Unsupported URL")
            ? "This link is not a valid TikTok video"
            : error.message || "Failed to fetch TikTok info";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
