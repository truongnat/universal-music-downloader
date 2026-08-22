import "server-only";

/**
 * Optional Invidious fallback for YouTube audio.
 *
 * Public Invidious instances have disabled their APIs (verified 2026-08:
 * 401/403/"Endpoint disabled" across all healthy instances), so this module
 * only activates when a SELF-HOSTED instance is configured via
 * INVIDIOUS_BASE_URL. Self-hosted Invidious has full API access plus its own
 * po_token/session machinery, making it a solid plan-B when yt-dlp's direct
 * extraction gets blocked again.
 */

export interface InvidiousAudioFormat {
  /** Direct (or instance-proxied when local=true) media URL */
  url: string;
  itag: number;
  ext: string;
  /** Audio bitrate in bits/s when reported */
  bitrate?: number;
}

interface InvidiousVideoResponse {
  videoId?: string;
  title?: string;
  adaptiveFormats?: Array<{
    itag?: string | number;
    url?: string;
    type?: string;
    bitrate?: string | number;
    audioQuality?: string;
  }>;
}

/** Preferred audio-only itags, best first. 140 = m4a 128k, 251/250/249 = opus. */
const PREFERRED_ITAGS = [140, 251, 250, 249];

const baseUrl = (): string | null => {
  const raw = process.env.INVIDIOUS_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
};

export function isInvidiousEnabled(): boolean {
  return baseUrl() !== null;
}

/** Parse a YouTube URL into its 11-char video id, or null. */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = parsed.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * From an Invidious `adaptiveFormats` array, pick the best audio-only stream.
 * Prefers known-good itags (m4a for browser compatibility), then falls back to
 * any `audio/` MIME entry by bitrate.
 */
export function pickBestAudioFormat(
  formats: InvidiousVideoResponse["adaptiveFormats"],
): InvidiousAudioFormat | null {
  if (!Array.isArray(formats)) return null;

  const audioOnly = formats.filter(
    (f) => typeof f.url === "string" && f.url && f.type?.startsWith("audio/")
  );
  if (audioOnly.length === 0) return null;

  for (const itag of PREFERRED_ITAGS) {
    const match = audioOnly.find((f) => Number(f.itag) === itag);
    if (match) {
      return {
        url: match.url!,
        itag,
        ext: itag === 140 ? "m4a" : "webm",
        bitrate: Number(match.bitrate) || undefined,
      };
    }
  }

  // No preferred itag — highest-bitrate audio wins
  const best = audioOnly.reduce((a, b) =>
    (Number(b.bitrate) || 0) > (Number(a.bitrate) || 0) ? b : a
  );
  const isM4a = best.type?.includes("mp4") ?? false;
  return {
    url: best.url!,
    itag: Number(best.itag) || 0,
    ext: isM4a ? "m4a" : "webm",
    bitrate: Number(best.bitrate) || undefined,
  };
}

/**
 * Ask the configured Invidious instance for the best audio stream URL.
 * Uses `local=true` so the instance proxies the media bytes itself instead of
 * handing us a googlevideo URL that may be IP-locked to the instance.
 * Returns null on any failure — callers treat that as "fallback unavailable".
 */
export async function resolveInvidiousAudioUrl(
  videoId: string,
  timeoutMs = 10_000
): Promise<InvidiousAudioFormat | null> {
  const origin = baseUrl();
  if (!origin) return null;

  try {
    const res = await fetch(
      `${origin}/api/v1/videos/${encodeURIComponent(videoId)}?local=true`,
      {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
      }
    );
    if (!res.ok) {
      console.error(`[invidious] ${origin} responded ${res.status}`);
      return null;
    }

    const data = (await res.json()) as InvidiousVideoResponse;
    return pickBestAudioFormat(data.adaptiveFormats);
  } catch (err) {
    console.error("[invidious] resolve failed:", err);
    return null;
  }
}
