import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === "1";

export default function nextConfig(phase) {
    const localDistDir =
        process.env.NEXT_DIST_DIR ||
        (phase === PHASE_DEVELOPMENT_SERVER ? ".next" : ".next-build");

    return {
    // Keep dev and production build artifacts isolated to avoid chunk corruption
    // when `next dev` and `next build` run in the same workspace.
    // Vercel expects artifacts under ".next" (routes-manifest.json lookup).
    distDir: isVercel ? ".next" : localDistDir,
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
            // NOTE: API CORS is intentionally handled in middleware.ts, path-segmented:
            // privileged admin/console/agency APIs are locked to allow-listed origins,
            // while public widget APIs are open WITHOUT credentials. A global "*" +
            // "credentials: true" header here previously applied to every /api route
            // and overrode that segmentation (an invalid + unsafe combination).
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
