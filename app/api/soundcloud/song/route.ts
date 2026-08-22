
import { NextRequest, NextResponse } from 'next/server';
import { getSoundCloudSong } from '@/lib/soundcloud-api';
import { checkRateLimit, getClientIdentifier, rateLimitedResponse } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  // Rate limit song metadata: 30/min per client
  const rl = checkRateLimit(`sc-song:${getClientIdentifier(req)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Query parameter "url" is required' }, { status: 400 });
  }

  const url = rawUrl.trim();

  // Basic validation to prevent playlist URLs in song endpoint
  if (url.includes("/sets/")) {
    return NextResponse.json({
      error: "Detected a playlist URL. Please use the Playlist tab to download sets/playlists."
    }, { status: 400 });
  }

  try {
    const data = await getSoundCloudSong(url);
    if (!data) {
      return NextResponse.json({ error: 'Error fetching data from SoundCloud' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error getting SoundCloud song' }, { status: 500 });
  }
}
