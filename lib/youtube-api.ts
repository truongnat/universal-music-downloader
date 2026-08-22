import YtdlpWrap from "yt-dlp-wrap";
import path from "path";
import fs from "fs";
import os from "os";

// Ensure we have a place to store the binary
const getBinaryPath = () => {
    // Vercel / serverless environments often only allow writing to /tmp
    if (process.env.VERCEL || process.platform !== 'win32') {
        return path.join(os.tmpdir(), 'yt-dlp');
    }
    return path.join(process.cwd(), 'bin', 'yt-dlp.exe');
};

// Re-download the binary when older than this so long-lived deployments
// pick up yt-dlp fixes for YouTube's constant API changes.
const BINARY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isBinaryStale = (binaryPath: string): boolean => {
    try {
        const stat = fs.statSync(binaryPath);
        return Date.now() - stat.mtimeMs > BINARY_MAX_AGE_MS;
    } catch {
        return false;
    }
};

const downloadBinary = async (binaryPath: string): Promise<void> => {
    console.log(`Downloading yt-dlp to ${binaryPath}...`);
    await YtdlpWrap.downloadFromGithub(binaryPath);
    // On Linux/Mac, ensure it is executable
    if (process.platform !== 'win32') {
        fs.chmodSync(binaryPath, '755');
    }
};

export const initYtDlp = async () => {
    const binaryPath = getBinaryPath();

    // Ensure directory exists if it's local bin
    const dir = path.dirname(binaryPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(binaryPath)) {
        try {
            await downloadBinary(binaryPath);
        } catch (e) {
            console.error("Failed to download yt-dlp", e);
            throw e;
        }
    } else if (isBinaryStale(binaryPath)) {
        // Refresh in place; keep the old binary if the download fails so the
        // app degrades to "possibly stale" instead of "hard down".
        try {
            await downloadBinary(binaryPath);
        } catch (e) {
            console.error("yt-dlp refresh failed, using existing binary", e);
        }
    }

    return new YtdlpWrap(binaryPath);
};

/**
 * Cookies are optional (used for age-restricted/member content).
 * Resolve order: YTDLP_COOKIES_PATH env → ./cookies.txt next to the project.
 * The arg is only passed when the file actually exists, so fresh clones and
 * serverless deploys don't break on a missing file.
 */
const resolveCookiesArgs = (): string[] => {
    const candidates = [
        process.env.YTDLP_COOKIES_PATH,
        path.join(process.cwd(), "cookies.txt"),
    ].filter((p): p is string => Boolean(p));
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) return ["--cookies", candidate];
        } catch {
            // unreadable path — skip
        }
    }
    return [];
};

export const commonYtDlpArgs = [
    "--no-check-certificates",
    "--js-runtime", "node",
    "--prefer-free-formats",
    "--no-warnings",
    // NOTE: do NOT pin youtube:player_client here.
    // A previously-pinned list (web,android_vr,tv_downgraded) went stale and
    // only exposed muxed format 18, which YouTube 403-blocks on datacenter
    // IPs. yt-dlp's maintained defaults select working audio-only formats
    // (e.g. 140). If a specific client is ever needed again, make it
    // env-overridable instead of hardcoding:
    ...(process.env.YTDLP_EXTRACTOR_ARGS
        ? ["--extractor-args", process.env.YTDLP_EXTRACTOR_ARGS]
        : []),
    ...resolveCookiesArgs()
];

export const formatYtDlpError = (error: any): string => {
    const rawMessage = error instanceof Error ? error.message : String(error);

    // Extract YouTube specific error message if present
    // Format usually: ERROR: [youtube] ID: YouTube said: ...
    const ytMatch = rawMessage.match(/YouTube said: (.*)/);
    if (ytMatch && ytMatch[1]) {
        let ytError = ytMatch[1].trim();
        // Remove any trailing "Stderr:" or similar technical suffixes
        ytError = ytError.split("Stderr:")[0].split(". Stderr:")[0].trim();
        return `YouTube Error: ${ytError}`;
    }

    if (rawMessage.includes("The playlist does not exist")) {
        return "The YouTube playlist does not exist. Please check the URL.";
    }

    if (rawMessage.includes("Incomplete YouTube ID")) {
        return "Invalid YouTube URL or ID.";
    }

    // Default to a cleaner version of the error message if it's too technical
    if (rawMessage.includes("Command failed")) {
        // Try to find the actual error in the message
        const lines = rawMessage.split('\n');
        const errorLine = lines.find(line => line.includes('ERROR:'));
        if (errorLine) {
            return errorLine.replace(/ERROR:\s*\[[^\]]+\]\s*[\w-]+:\s*/, '').replace('ERROR:', '').trim();
        }
    }

    return rawMessage;
};

const isUnavailableYouTubeTitle = (title: unknown) => {
    if (typeof title !== "string") return true;
    const trimmed = title.trim();
    if (!trimmed) return true;
    return (
        /^\[(private|deleted|unavailable) video\]$/i.test(trimmed) ||
        /^(private|deleted|unavailable) video$/i.test(trimmed)
    );
};

const filterYouTubeEntries = (entries: unknown[]) => {
    return entries.filter((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const v = entry as any;
        if (typeof v.id !== "string" || !v.id) return false;
        if (v.is_private) return false;
        if (isUnavailableYouTubeTitle(v.title)) return false;
        const availability = typeof v.availability === "string" ? v.availability.toLowerCase() : "";
        if (
            availability &&
            (availability.includes("private") ||
                availability.includes("deleted") ||
                availability.includes("unavailable"))
        ) {
            return false;
        }
        return true;
    });
};

export interface YouTubeVideo {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    uploader: string;
    url: string;
    formats: any[];
}

export interface YouTubePlaylist {
    id: string;
    title: string;
    thumbnail: string;
    uploader: string;
    url: string;
    entries: YouTubeVideo[];
}

export const getYouTubeInfo = async (url: string): Promise<YouTubeVideo | YouTubePlaylist | null> => {
    try {
        const yt = await initYtDlp();
        const metadata = await yt.execPromise([
            url,
            ...commonYtDlpArgs,
            "--dump-json",
            "--no-playlist", // Default to single video if ambiguous, but we might want to detect
            "--flat-playlist", // For playlists, don't get info for every video immediately if it's huge
        ]);

        const json = JSON.parse(metadata);
        // Remove private and deleted videos if this is a playlist response
        if (json.entries && Array.isArray(json.entries)) {
            json.entries = filterYouTubeEntries(json.entries);
        }
        return json;
    } catch (error) {
        console.error("Error fetching YouTube info:", error);
        return null;
    }
};

export const getYouTubeVideo = async (url: string): Promise<any> => {
    try {
        const yt = await initYtDlp();
        const metadata = await yt.execPromise([
            url,
            ...commonYtDlpArgs,
            "--dump-json",
            "--no-playlist"
        ]);
        return JSON.parse(metadata);
    } catch (error) {
        console.error("Error getting YouTube video:", error);
        throw new Error(formatYtDlpError(error));
    }
}

export const getYouTubePlaylist = async (url: string, start?: number, end?: number): Promise<any> => {
    try {
        const yt = await initYtDlp();
        const args = [
            url,
            ...commonYtDlpArgs,
            "--dump-single-json",
            "--flat-playlist"
        ];

        if (start) args.push("--playlist-start", start.toString());
        if (end) args.push("--playlist-end", end.toString());

        const metadata = await yt.execPromise(args);
        const data = JSON.parse(metadata);
        if (data.entries && Array.isArray(data.entries)) {
            data.entries = filterYouTubeEntries(data.entries);
        }
        return data;
    } catch (error) {
        console.error("Error getting YouTube playlist:", error);
        throw new Error(formatYtDlpError(error));
    }
}

export const getYouTubeStream = async (url: string): Promise<any> => {
    try {
        const yt = await initYtDlp();
        const metadata = await yt.execPromise([
            url,
            ...commonYtDlpArgs,
            "--dump-json"
        ]);
        const info = JSON.parse(metadata);
        return info;
    } catch (error) {
        console.error("Error getting stream:", error);
        throw new Error(formatYtDlpError(error));
    }
}

export const deleteVideoFile = async (filePath: string): Promise<void> => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`Deleted video file: ${filePath}`);
        } else {
            console.warn(`File not found, cannot delete: ${filePath}`);
        }
    } catch (err) {
        console.error(`Error deleting video file ${filePath}:`, err);
        throw err;
    }
};
