import "server-only";

import { unstable_cache, revalidateTag } from "next/cache";
import { scrapeClientId } from "@/lib/scapper-client-id";

export const CLIENT_ID_CACHE_TAG = "soundcloud-client-id";

export const getSoundCloudClientId = unstable_cache(
  async (): Promise<string | null> => {
    return scrapeClientId();
  },
  ["soundcloud-client-id"],
  {
    revalidate: 24 * 60 * 60, // 24 hours
    tags: [CLIENT_ID_CACHE_TAG],
  }
);

/**
 * Force a re-scrape of the client_id and return the fresh value.
 * SoundCloud rotates ids periodically; a stale cached id makes every API call
 * fail (401/403) until the cache expires. Callers use this to recover after
 * exactly one failed attempt instead of staying broken for up to 24h.
 */
export async function refreshSoundCloudClientId(): Promise<string | null> {
  try {
    // "max" = invalidate entries under every cache-life profile.
    revalidateTag(CLIENT_ID_CACHE_TAG, "max");
  } catch (err) {
    // revalidateTag outside a request scope can throw; the scrape below
    // still returns a usable value in that case.
    console.warn("[soundcloud] revalidateTag failed:", err);
  }
  return getSoundCloudClientId();
}
