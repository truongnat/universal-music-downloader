import { NextRequest, NextResponse } from "next/server";

/**
 * Shared plumbing for yt-dlp audio download routes.
 *
 * Every yt-dlp download endpoint (YouTube, TikTok, …) needs the same:
 *  - magic-byte sniffing to pick a sane content-type/filename
 *  - a Node→Web ReadableStream bridge with abort + error handling
 *  - RFC 5987 Content-Disposition headers
 * Centralizing it here keeps route files down to their actual business logic.
 */

export function detectAudioContainer(
  chunk: Uint8Array
): { contentType: string; ext: string } {
  const ascii = new TextDecoder().decode(chunk.slice(0, 256));

  // MP4/M4A: look for 'ftyp' within first bytes
  if (ascii.includes("ftyp")) return { contentType: "audio/mp4", ext: "m4a" };

  // WebM/Matroska: EBML header 1A 45 DF A3
  if (
    chunk.length >= 4 &&
    chunk[0] === 0x1a &&
    chunk[1] === 0x45 &&
    chunk[2] === 0xdf &&
    chunk[3] === 0xa3
  ) {
    return { contentType: "audio/webm", ext: "webm" };
  }

  // OGG
  if (ascii.startsWith("OggS")) return { contentType: "audio/ogg", ext: "ogg" };

  // MP3 (ID3 or frame sync)
  if (ascii.startsWith("ID3")) return { contentType: "audio/mpeg", ext: "mp3" };
  if (chunk.length >= 2 && chunk[0] === 0xff && (chunk[1] & 0xe0) === 0xe0) {
    return { contentType: "audio/mpeg", ext: "mp3" };
  }

  return { contentType: "application/octet-stream", ext: "bin" };
}

/** RFC 5987 Content-Disposition with ASCII fallback + UTF-8 filename. */
export function contentDispositionHeader(
  title: string,
  ext: string,
  isPreview: boolean
): string {
  const safeTitle = title
    .replace(/["\\]/g, "")
    .replace(/[^\x20-\x7E]/g, "_"); // non-ASCII → underscore for the fallback param
  const encodedTitle = encodeURIComponent(title);
  const disposition = isPreview ? "inline" : "attachment";
  return `${disposition}; filename="${safeTitle}.${ext}"; filename*=UTF-8''${encodedTitle}.${ext}`;
}

/**
 * Log yt-dlp stderr without spamming progress percentages.
 * Attaches listeners to the underlying child process when exposed by yt-dlp-wrap.
 */
export function attachYtDlpDiagnostics(
  nodeStream: unknown,
  label: string
): void {
  const childProcess = (nodeStream as { ytDlpProcess?: any } | null)
    ?.ytDlpProcess;
  if (!childProcess) return;

  childProcess.stderr?.on("data", (data: unknown) => {
    const message = String(data).trim().toLowerCase();
    const ignorable =
      !message ||
      message.includes("%") ||
      message.includes("ffmpeg not found") ||
      message.includes("unavailable video is hidden");
    if (!ignorable) console.error(`yt-dlp (${label}) stderr: ${message}`);
  });

  childProcess.on("error", (err: unknown) => {
    console.error(`Failed to start yt-dlp (${label}):`, err);
  });

  childProcess.on("close", (code: number | null) => {
    if (code !== 0) console.error(`yt-dlp (${label}) exited with code ${code}`);
  });
}

export interface YtDlpStreamOptions {
  /** Stream returned by yt.execStream(...) */
  nodeStream: NodeJS.ReadableStream & { destroy?: () => void };
  /** Abort signal from the incoming request — kills the yt-dlp process on client disconnect */
  signal: AbortSignal;
  /** Download filename base (no extension; derived from sniffing) */
  title: string;
  /** `inline` for <audio> playback, `attachment` for file save */
  isPreview: boolean;
}

/**
 * Bridge a yt-dlp stdout stream into a Next.js streaming Response.
 *
 * Peeks the first chunk to detect the container format, then pipes the rest.
 * Aborts the child process when the client disconnects mid-stream.
 */
export async function ytDlpStreamResponse(
  req: NextRequest,
  { nodeStream, signal, title, isPreview }: YtDlpStreamOptions
): Promise<NextResponse> {
  // Safety net: if an 'error' fires after the peek below detaches its
  // listeners (e.g. process exits before producing output), an EventEmitter
  // with zero error listeners turns that into a process-level
  // uncaughtException. Keep one permanent logging listener attached.
  nodeStream.on("error", (err: unknown) => {
    console.error("yt-dlp stream error (unhandled):", err);
  });

  // Peek the first chunk so we can set a sane Content-Type before responding.
  const peeked = await new Promise<Uint8Array | null>((resolve, reject) => {
    const cleanup = () => {
      nodeStream.off("data", onData);
      nodeStream.off("error", onError);
      nodeStream.off("end", onEnd);
    };
    const onData = (chunk: Uint8Array) => {
      cleanup();
      resolve(chunk);
    };
    const onError = (err: unknown) => {
      cleanup();
      reject(err);
    };
    const onEnd = () => {
      cleanup();
      resolve(null);
    };

    nodeStream.once("data", onData);
    nodeStream.once("error", onError);
    nodeStream.once("end", onEnd);
  });

  const detected = peeked
    ? detectAudioContainer(peeked)
    : { contentType: "application/octet-stream", ext: "bin" };

  let closed = false;

  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        signal.removeEventListener("abort", onAbort);
        try {
          controller.close();
        } catch {
          /* already errored/closed */
        }
      };

      const fail = (err: unknown) => {
        if (closed) return;
        closed = true;
        signal.removeEventListener("abort", onAbort);
        try {
          controller.error(err);
        } catch {
          /* already closed */
        }
      };

      const onAbort = () => {
        try {
          nodeStream.destroy?.();
        } finally {
          close();
        }
      };

      nodeStream.on("data", (chunk: Uint8Array) => {
        try {
          controller.enqueue(chunk);
        } catch (err) {
          fail(err);
        }
      });
      nodeStream.on("end", close);
      nodeStream.on("close", close);
      nodeStream.on("error", (err: unknown) => {
        console.error("yt-dlp stream error:", err);
        fail(err);
      });

      signal.addEventListener("abort", onAbort);

      if (peeked) {
        try {
          controller.enqueue(peeked);
        } catch (err) {
          fail(err);
        }
      }
    },
    cancel() {
      closed = true; // client walked away — stop buffering
      try {
        nodeStream.destroy?.();
      } catch {
        /* ignore */
      }
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": detected.contentType,
      "Content-Disposition": contentDispositionHeader(
        title,
        detected.ext,
        isPreview
      ),
    },
  });
}
