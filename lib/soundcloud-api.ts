import "server-only";

import {
  Soundcloud,
  SoundcloudPlaylist,
  SoundcloudTrack,
} from "soundcloud.ts";
import {
  getSoundCloudClientId,
  refreshSoundCloudClientId,
} from "@/lib/soundcloud-client-id";

const soundcloudInstance = async (clientId?: string) => {
  const id = clientId ?? (await getSoundCloudClientId());
  if (!id) {
    throw new Error("Client ID not found");
  }
  return new Soundcloud(id);
};

/**
 * Run an operation against the SoundCloud API, retrying exactly once with a
 * freshly scraped client_id if it fails. A stale cached client_id is by far
 * the most common SoundCloud failure mode — without this, every track/playlist
 * call stays broken for up to 24h until the cache expires.
 */
async function withClientRetry<T>(
  op: (clientId: string, sc: Soundcloud) => Promise<T>
): Promise<T> {
  const firstId = await getSoundCloudClientId();
  if (!firstId) throw new Error("SoundCloud client_id unavailable");

  try {
    return await op(firstId, await soundcloudInstance(firstId));
  } catch (err) {
    console.warn("[soundcloud] attempt failed; refreshing client_id:", err);
    const freshId = await refreshSoundCloudClientId();
    if (!freshId || freshId === firstId) throw err;
    return await op(freshId, await soundcloudInstance(freshId));
  }
}

export const getSoundCloudSong = async (
  trackUrl: string
): Promise<SoundcloudTrack | null> => {
  try {
    const trackInfo = await withClientRetry((_, sc) => sc.tracks.get(trackUrl));
    if (!trackInfo) {
      console.error("SoundCloud song API error: empty response");
      return null;
    }
    return trackInfo;
  } catch (error) {
    console.error("Error getting SoundCloud song:", error);
    return null;
  }
};

export const getSoundCloudPlaylist = async (
  playlistUrl: string
): Promise<SoundcloudPlaylist | null> => {
  try {
    const playlistInfo = await withClientRetry((_, sc) =>
      sc.playlists.get(playlistUrl)
    );
    if (!playlistInfo) {
      console.error("SoundCloud playlist API error: empty response");
      return null;
    }
    return playlistInfo;
  } catch (error) {
    console.error("Error getting SoundCloud playlist:", error);
    return null;
  }
};

/**
 * Resolve a direct, single-file audio URL for a SoundCloud track.
 * Prefers the highest-quality progressive (single-file MP3) transcoding so
 * downloads are seekable and playable without HLS segment stitching.
 *
 * `clientId` (from the client's prefetch) is tried first; on failure the
 * server retries with its own — refreshed — client_id.
 */
const resolveStreamUrl = async (url: string, id: string): Promise<string | null> => {
  const sc = await soundcloudInstance(id);
  const track = await sc.tracks.get(url);
  if (!track || track.kind !== "track") {
    throw new Error("URL is not a valid track");
  }

  const transcodings = track.media?.transcodings ?? [];
  const progressives = transcodings.filter(
    (t: any) =>
      t.format?.protocol === "progressive" &&
      typeof t.url === "string" &&
      t.format?.mime_type?.includes("mpeg")
  );
  if (progressives.length === 0) {
    throw new Error("No progressive stream available");
  }

  // "hq" (128kbps MP3) is the best progressive tier SoundCloud offers.
  const best = progressives.find((t: any) => t.quality === "hq") ?? progressives[0];

  const res = await fetch(`${best.url}?client_id=${id}`);
  if (!res.ok) {
    throw new Error(`Stream authorize failed: ${res.status}`);
  }
  const data = await res.json();
  return data.url ?? null;
};

export const getStreamSongUrl = async (
  url: string,
  clientId?: string
): Promise<string | null> => {
  if (clientId) {
    try {
      return await resolveStreamUrl(url, clientId);
    } catch (err) {
      console.warn("[soundcloud] client-provided id failed; retrying fresh:", err);
    }
  }
  try {
    return await withClientRetry((id) => resolveStreamUrl(url, id));
  } catch (error) {
    console.error("Error streaming SoundCloud song:", error);
    return null;
  }
};
