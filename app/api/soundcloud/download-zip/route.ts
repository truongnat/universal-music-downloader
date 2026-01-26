import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import axios from "axios";
import { getDownloadApiPath } from "@/lib/get-api-endpoint";

export async function POST(req: NextRequest) {
  try {
    const { tracks } = await req.json();
    const clientId = req.nextUrl.searchParams.get("clientId");

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return new NextResponse("No tracks provided", { status: 400 });
    }

    if (!clientId) {
      return new NextResponse("Client ID is required", { status: 400 });
    }

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.on("error", (err) => {
      throw err;
    });

    // Stream the ZIP file to the client
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", "attachment; filename=soundcloud-tracks.zip");

    const readableStream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        archive.on("end", () => {
          controller.close();
        });
        archive.on("error", (err) => {
          controller.error(err);
        });
      },
    });

    for (const track of tracks) {
      try {
        const downloadUrl = getDownloadApiPath(track.permalink_url, track.title, clientId);
        const response = await axios.get(downloadUrl, {
          responseType: "stream",
        });
        archive.append(response.data, { name: `${track.title}.mp3` });
      } catch (error) {
        console.error(`Failed to download track: ${track.title}`, error);
      }
    }

    archive.finalize();

    return new NextResponse(readableStream, { headers });
  } catch (error) {
    console.error("Error creating ZIP file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
