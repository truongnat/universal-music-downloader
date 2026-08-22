import "server-only";

/**
 * Optional Piped fallback for YouTube audio.
 *
 * Like Invidious, most public Piped instances are rate-limited or dead after
 * YouTube's crackdown, so this module only activates when a working instance
 * is configured via PIPED_BASE_URL. Together with lib/invidious.ts it forms
 * the fallback chain in lib/providers.ts.
 */

export interface PipedAudioFormat {
  url: string;
  ext: string;
  /** Audio bitrate in bits/s when reported */
  bitrate?: number;
}

interface PipedStreamsResponse {
  audioStreams?: Array<{
    url?: string;
    bitrate?: number;
    mimeType?: string;
    format?: string;
    codec?: string;
    quality?: string;
  }>;
}

const baseUrl = (): string | null => {
  const raw = process.env.PIPED_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
};

export function isPipedEnabled(): boolean {
  return baseUrl() !== null;
}

/**
 * From a Piped `audioStreams` array, pick the best browser-compatible stream.
 * m4a/aac wins over webm/opus for <audio> compatibility, then highest bitrate.
 */
export function pickBestPipedAudio(
  streams: PipedStreamsResponse["audioStreams"]
): PipedAudioFormat | null {
  if (!Array.isArray(streams)) return null;

  const usable = streams.filter((s) => typeof s.url === "string" && s.url);
  if (usable.length === 0) return null;

  const isM4a = (s: (typeof usable)[number]) =>
    (s.mimeType ?? s.format ?? "").includes("mp4") ||
    (s.codec ?? "").includes("mp4a");

  const m4a = usable.filter(isM4a);
  const pool = m4a.length > 0 ? m4a : usable;
  const best = pool.reduce((a, b) => (b.bitrate ?? 0) > (a.bitrate ?? 0) ? b : a);

  return {
    url: best.url!,
    ext: isM4a(best) ? "m4a" : "webm",
    bitrate: best.bitrate,
  };
}

/**
 * Ask the configured Piped instance for the best audio stream URL.
 * Returns null on any failure — callers treat that as "provider unavailable".
 */
export async function resolvePipedAudioUrl(
  videoId: string,
  timeoutMs = 10_000
): Promise<PipedAudioFormat | null> {
  const origin = baseUrl();
  if (!origin) return null;

  try {
    const res = await fetch(`${origin}/streams/${encodeURIComponent(videoId)}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[piped] ${origin} responded ${res.status}`);
      return null;
    }

    const data = (await res.json()) as PipedStreamsResponse;
    return pickBestPipedAudio(data.audioStreams);
  } catch (err) {
    console.error("[piped] resolve failed:", err);
    return null;
  }
}
