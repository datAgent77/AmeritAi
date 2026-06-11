import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    // The app's tsconfig sets jsx:"preserve" (required by Next.js). Vite 8
    // (rolldown/oxc) honors that and stops transforming JSX during tests, which
    // breaks any test importing a .tsx component. Force the automatic JSX runtime
    // via the oxc transformer so JSX is transformed regardless of tsconfig.
    // (NOTE: this Vite uses `oxc`, not `esbuild`, for transforms.)
    oxc: {
        jsx: { runtime: "automatic" },
    },
    test: {
        environment: "node",
        // Dummy Firebase client config so lib/firebase.ts (now env-driven) can
        // initialize during tests without a real .env. Test-only; not used at runtime.
        env: {
            NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyTestKeyForVitestEnvOnly000000000",
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test-project.firebaseapp.com",
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
            NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test-project.appspot.com",
            NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
            NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:testappid",
        },
        exclude: [
            "node_modules/**",
            ".next/**",
            ".next-build/**",
            "test-results/**",
            "tmp-widget-check.spec.ts",
        ],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, ".")
        }
    }
});
