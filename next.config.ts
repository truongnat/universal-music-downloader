import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    experimental: {},
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'i.ytimg.com' },
            { protocol: 'https', hostname: 'i1.sndcdn.com' },
            { protocol: 'https', hostname: 'i.scdn.co' },
            { protocol: 'https', hostname: 'mosaic.scdn.co' },
            { protocol: 'https', hostname: 'lineup-images.scdn.co' },
            { protocol: 'https', hostname: '**.sndcdn.com' },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
                ],
            },
        ];
    },
    logging: {
        fetches: { fullUrl: true },
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    webpack: (config) => {
        // soundcloud.ts imports ffmpeg-static at module level.
        // We use ffmpeg-wasm (client-side) instead — stub it out entirely.
        config.resolve.alias = {
            ...config.resolve.alias,
            'ffmpeg-static': path.resolve('./lib/ffmpeg-static-stub.js'),
            'fluent-ffmpeg': path.resolve('./lib/ffmpeg-static-stub.js'),
        }
        return config
    },
};

export default nextConfig;
