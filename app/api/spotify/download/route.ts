import { NextRequest, NextResponse } from "next/server";
import { downloadFromYouTube } from "@/lib/spotify-api";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
        const { stream } = await downloadFromYouTube(url);

        const isPreview = searchParams.get("preview") === "true";

        // Return the stream
        const headers = new Headers();
        headers.set("Content-Disposition", `${isPreview ? 'inline' : 'attachment'}; filename="download.mp3"`);
        headers.set("Content-Type", "audio/mpeg");

        // @ts-ignore - Next.js supports passing a Node.js stream or Web ReadableStream
        return new NextResponse(stream as any, { headers });

    } catch (error: any) {
        console.error("Download Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to download track" },
            { status: 500 }
        );
    }
}
