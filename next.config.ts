import type { NextConfig } from "next";

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
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Externalize native/binary packages that can't be bundled
            config.externals = [
                ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
                'ffmpeg-static',
                'fluent-ffmpeg',
            ]
        }
        return config
    },
};

export default nextConfig;
