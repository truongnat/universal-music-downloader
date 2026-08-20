import { NextRequest, NextResponse } from "next/server";
import { getSoundCloudClientId } from "@/lib/soundcloud-client-id";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const clientId = await getSoundCloudClientId();
    if (!clientId) {
      return NextResponse.json({ error: "SoundCloud client ID not available" }, { status: 500 });
    }

    // Search SoundCloud API
    const searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=${limit}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`SoundCloud API error: ${response.status}`);
    }

    const data = await response.json();
    
    const results = (data.collection || []).map((item: any) => ({
      id: item.id?.toString() || '',
      title: item.title || 'Unknown',
      thumbnail: item.artwork_url || item.user?.avatar_url || null,
      duration: Math.floor((item.duration || 0) / 1000),
      artist: item.user?.username || 'Unknown',
      url: item.permalink_url || '',
      playbackCount: item.playback_count || 0,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("SoundCloud search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
