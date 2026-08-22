
import { NextRequest, NextResponse } from 'next/server';
import { getSoundCloudPlaylist } from '@/lib/soundcloud-api';
import { checkRateLimit, getClientIdentifier, rateLimitedResponse } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  // Rate limit playlist metadata: 20/min per client
  const rl = checkRateLimit(`sc-playlist:${getClientIdentifier(req)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Query parameter "url" is required' }, { status: 400 });
  }

  const url = rawUrl.trim();

  try {
    const data = await getSoundCloudPlaylist(url);
    if (!data) {
      return NextResponse.json({ error: 'Error fetching data from SoundCloud' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error getting SoundCloud playlist' }, { status: 500 });
  }
}
