import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === "1";

export default function nextConfig(phase) {
    const localDistDir =
        process.env.NEXT_DIST_DIR ||
        (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next-build");

    return {
    // Keep dev and production build artifacts isolated to avoid chunk corruption
    // when `next dev` and `next build` run in the same workspace.
    // Vercel expects artifacts under ".next" (routes-manifest.json lookup).
    distDir: isVercel ? ".next" : localDistDir,
    // Exclude chrome-extension from Next.js build
    webpack: (config, { isServer }) => {
        config.watchOptions = {
            ...config.watchOptions,
            ignored: /chrome-extension/,
        };
        return config;
    },
    // Exclude chrome-extension from TypeScript compilation
    typescript: {
        ignoreBuildErrors: false,
    },
    // Image configuration for external domains
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
    async headers() {
        return [
            {
                // matching all API routes
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
                ]
            },
            {
                // Prevent Vercel CDN from caching widget.js so settings changes reflect immediately
                source: "/widget.js",
                headers: [
                    { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
                    { key: "Pragma", value: "no-cache" },
                ]
            },
            {
                // Also no-cache widget-related API settings endpoint
                source: "/api/widget-settings",
                headers: [
                    { key: "Cache-Control", value: "no-store, max-age=0" },
                ]
            }
        ]
    }
    };
}
