import { NextRequest, NextResponse } from "next/server";
import { downloadFromYouTube } from "@/lib/spotify-api";
import { Readable } from "stream";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
        const { stream, headers } = await downloadFromYouTube(url);

        // Ensure stream is a ReadableStream
        const readableStream = new Readable().wrap(stream);

        return new NextResponse(readableStream as any, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Disposition": `attachment; filename="track.mp3"`,
                ...headers,
            },
        });
    } catch (error: any) {
        console.error("Download Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to download track" },
            { status: 500 }
        );
    }
}
