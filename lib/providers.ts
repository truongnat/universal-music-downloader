import "server-only";

import {
  isInvidiousEnabled,
  resolveInvidiousAudioUrl,
} from "@/lib/invidious";
import { isPipedEnabled, resolvePipedAudioUrl } from "@/lib/piped";

/**
 * YouTube audio fallback chain.
 *
 * Order matters: Invidious proxies media bytes itself (local=true) which is
 * the most reliable shape for streaming through this app; Piped hands out
 * googlevideo/proxied URLs that usually work but expire faster. Both only run
 * when their env var (INVIDIOUS_BASE_URL / PIPED_BASE_URL) is configured, so
 * a bare deployment behaves exactly as before (yt-dlp only).
 */

export type YouTubeFallbackSource = "invidious" | "piped";

export interface FallbackAudioStream {
  url: string;
  ext: string;
  source: YouTubeFallbackSource;
  bitrate?: number;
}

/** Which fallback providers are configured right now (for diagnostics). */
export function enabledFallbackProviders(): YouTubeFallbackSource[] {
  const enabled: YouTubeFallbackSource[] = [];
  if (isInvidiousEnabled()) enabled.push("invidious");
  if (isPipedEnabled()) enabled.push("piped");
  return enabled;
}

/**
 * Try each configured fallback provider in order until one yields a stream.
 * Returns null when nothing is configured or every provider fails — callers
 * treat that as "no fallback available".
 */
export async function resolveFallbackAudio(
  videoId: string
): Promise<FallbackAudioStream | null> {
  if (isInvidiousEnabled()) {
    const audio = await resolveInvidiousAudioUrl(videoId);
    if (audio) {
      return {
        url: audio.url,
        ext: audio.ext,
        source: "invidious",
        bitrate: audio.bitrate,
      };
    }
    console.warn(`[providers] invidious failed for ${videoId}, trying next`);
  }

  if (isPipedEnabled()) {
    const audio = await resolvePipedAudioUrl(videoId);
    if (audio) {
      return {
        url: audio.url,
        ext: audio.ext,
        source: "piped",
        bitrate: audio.bitrate,
      };
    }
    console.warn(`[providers] piped failed for ${videoId}`);
  }

  return null;
}
