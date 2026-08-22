import { NextRequest, NextResponse } from "next/server";
import { initYtDlp, commonYtDlpArgs, formatYtDlpError } from "@/lib/youtube-api";
import { checkRateLimit, getClientIdentifier, rateLimitedResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limit searches: 20/min per client
  const rl = checkRateLimit(`yt-search:${getClientIdentifier(req)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  const query = req.nextUrl.searchParams.get("q");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const yt = await initYtDlp();

    // Use yt-dlp to search YouTube
    const args = [
      `ytsearch${limit}:${query}`,
      ...commonYtDlpArgs,
      "--dump-json",
      "--flat-playlist",
      "--no-playlist",
    ];

    const metadata = await yt.execPromise(args);
    
    // Parse results - ytsearch returns one result per line
    const results = metadata
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => {
        try {
          const item = JSON.parse(line);
          return {
            id: item.id || item.url?.split('v=')[1] || '',
            title: item.title || 'Unknown',
            thumbnail: item.thumbnail || item.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
            duration: item.duration || 0,
            uploader: item.uploader || item.channel || 'Unknown',
            url: item.webpage_url || item.url || `https://www.youtube.com/watch?v=${item.id}`,
            viewCount: item.view_count || 0,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("YouTube search error:", error);
    return NextResponse.json(
      { error: formatYtDlpError(error) || "Search failed" },
      { status: 500 }
    );
  }
}
