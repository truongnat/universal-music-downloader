export interface SpotifyItem {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    uploader: string;
    url: string;
    kind: 'video' | 'playlist';
}

export interface DownloadProgress {
    id: string;
    progress: number;
    status: 'downloading' | 'completed' | 'error';
}
