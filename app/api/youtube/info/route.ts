import { getYouTubePlaylist, getYouTubeVideo } from "@/lib/youtube-api";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier, rateLimitedResponse } from "@/lib/rate-limit";

type YouTubeInfoRequestBody = {
  url?: string;
  type?: "video" | "playlist";
  start?: number;
  end?: number;
};

export async function POST(req: NextRequest) {
  // Rate limit metadata lookups: yt-dlp invocations are expensive
  const rl = checkRateLimit(`yt-info:${getClientIdentifier(req)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  try {
    const body: YouTubeInfoRequestBody = await req.json();

    const url = typeof body.url === "string" ? body.url.trim() : "";
    const start = typeof body.start === "number" ? body.start : undefined;
    const end = typeof body.end === "number" ? body.end : undefined;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let data: unknown;
    if (body.type === "playlist") {
      data = await getYouTubePlaylist(url, start, end);
    } else {
      data = await getYouTubeVideo(url);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("API Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch YouTube info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method GET not allowed. Use POST." },
    { status: 405 },
  );
}
