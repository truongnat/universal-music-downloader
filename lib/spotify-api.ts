import { initYtDlp, ffmpegArgs } from "./youtube-api";

const SPOTIFY_URL_REGEX = /^(?:https?:\/\/)?(?:open\.)?spotify\.com\/(?:embed\/|)(?:track|playlist)\/([a-zA-Z0-9]+)/;

const mapYtDlpResponseToSpotifyItem = (item: any) => ({
    id: item.id,
    title: item.title,
    uploader: item.uploader,
    thumbnail: item.thumbnail,
    duration: item.duration,
    url: item.webpage_url,
    kind: "video",
});

export const searchSpotify = async (query: string) => {
    const yt = await initYtDlp();
    const data = await yt.execPromise([
        `ytsearch10:${query}`,
        ...ffmpegArgs,
        "--dump-json",
    ]);
    return data.split('\n').filter(Boolean).map(line => mapYtDlpResponseToSpotifyItem(JSON.parse(line)));
};

export const getSpotifyTrack = async (url: string) => {
    const yt = await initYtDlp();
    const data = await yt.execPromise([
        url,
        ...ffmpegArgs,
        "--dump-json",
    ]);
    return mapYtDlpResponseToSpotifyItem(JSON.parse(data));
};

export const getSpotifyPlaylist = async (url: string) => {
    const yt = await initYtDlp();
    const data = await yt.execPromise([
        url,
        ...ffmpegArgs,
        "--dump-json",
    ]);
    const playlist = JSON.parse(data);
    return {
        id: playlist.id,
        title: playlist.title,
        uploader: playlist.uploader,
        thumbnail: playlist.thumbnail,
        url: playlist.webpage_url,
        kind: "playlist",
        entries: playlist.entries.map(mapYtDlpResponseToSpotifyItem),
    };
};

export const downloadFromYouTube = async (youtubeUrl: string) => {
    const yt = await initYtDlp();
    const stream = yt.exec([
        youtubeUrl,
        ...ffmpegArgs,
        "-f", "bestaudio[ext=m4a]/bestaudio",
        "-o", "-",
    ]);

    return { stream: stream.stdout, headers: {} };
};
