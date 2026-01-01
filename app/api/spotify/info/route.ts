import { NextRequest, NextResponse } from "next/server";
import { searchSpotify, getSpotifyTrack, getSpotifyPlaylist } from "@/lib/spotify-api";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, url, type } = body;

        if (type === "search" && query) {
            const data = await searchSpotify(query);
            return NextResponse.json(data);
        }

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        let data;
        if (type === "playlist") {
            data = await getSpotifyPlaylist(url);
        } else {
            data = await getSpotifyTrack(url);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch Spotify info" },
            { status: 500 }
        );
    }
}
