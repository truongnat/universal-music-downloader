import { NextRequest, NextResponse } from "next/server";
import { initYtDlp } from "@/lib/youtube-api";
import { checkRateLimit, getClientIdentifier, rateLimitedResponse } from "@/lib/rate-limit";
import { ytDlpStreamResponse, attachYtDlpDiagnostics } from "@/lib/yt-dlp-stream";

export async function GET(req: NextRequest) {
  // Rate limit: downloads are expensive (spawn yt-dlp + stream media)
  const rl = checkRateLimit(`tiktok-download:${getClientIdentifier(req)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const yt = await initYtDlp();

    // TikTok needs no cookies or YouTube extractor hacks
    const args = [
      url,
      "-o",
      "-",
      "-f",
      "bestaudio[ext=m4a]/bestaudio/best",
      "--no-playlist",
      "--no-warnings",
      "--no-check-certificates",
    ];

    const nodeStream = yt.execStream(args);
    attachYtDlpDiagnostics(nodeStream, "tiktok");

    return ytDlpStreamResponse(req, {
      nodeStream,
      signal: req.signal,
      title: req.nextUrl.searchParams.get("title") || "tiktok-audio",
      isPreview: req.nextUrl.searchParams.get("preview") === "true",
    });
  } catch (error: unknown) {
    console.error("TikTok download API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to download TikTok audio",
      },
      { status: 500 }
    );
  }
}
