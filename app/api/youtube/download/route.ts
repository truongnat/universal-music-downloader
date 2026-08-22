import { NextRequest, NextResponse } from "next/server";
import { initYtDlp, commonYtDlpArgs } from "@/lib/youtube-api";
import { checkRateLimit, getClientIdentifier, rateLimitedResponse } from "@/lib/rate-limit";
import { ytDlpStreamResponse, attachYtDlpDiagnostics } from "@/lib/yt-dlp-stream";
import { extractYouTubeVideoId } from "@/lib/invidious";
import { resolveFallbackAudio } from "@/lib/providers";

export async function GET(req: NextRequest) {
  // Rate limit downloads: 10/min per client (yt-dlp spawns are expensive)
  const rl = checkRateLimit(`yt-download:${getClientIdentifier(req)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const title = req.nextUrl.searchParams.get("title") || "download";
  const isPreview = req.nextUrl.searchParams.get("preview") === "true";

  // Primary path: yt-dlp direct extraction
  try {
    const yt = await initYtDlp();

    // -o - writes to stdout; --no-playlist forces a single item even if a
    // playlist URL is passed; prefer audio-only formats with sane fallbacks.
    const args = [
      url,
      "--no-playlist",
      "-o",
      "-",
      "-f",
      "bestaudio[ext=m4a]/bestaudio/best",
      ...commonYtDlpArgs,
    ];

    const nodeStream = yt.execStream(args);
    attachYtDlpDiagnostics(nodeStream, "youtube");

    return await ytDlpStreamResponse(req, {
      nodeStream,
      signal: req.signal,
      title,
      isPreview,
    });
  } catch (error: unknown) {
    console.error("yt-dlp path failed, considering Invidious fallback:", error);

    // Fallback path: configured provider chain (Invidious → Piped), active
    // only when INVIDIOUS_BASE_URL / PIPED_BASE_URL are set. Streams the
    // instance's copy of the audio straight through — no yt-dlp involved.
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      const audio = await resolveFallbackAudio(videoId);
      if (audio) {
        try {
          const upstream = await fetch(audio.url, { signal: req.signal });
          if (upstream.ok && upstream.body) {
            console.log(
              `[providers] streaming ${videoId} via ${audio.source} (${audio.ext})`
            );
            return new NextResponse(upstream.body, {
              headers: {
                "Content-Type":
                  upstream.headers.get("content-type") ?? "audio/mp4",
                "X-Served-By": audio.source,
                "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${encodeURIComponent(title)}.${audio.ext}"`,
              },
            });
          }
          console.error(`[providers] media fetch failed: ${upstream.status}`);
        } catch (err) {
          console.error("[providers] media stream error:", err);
        }
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to download",
      },
      { status: 500 }
    );
  }
}
