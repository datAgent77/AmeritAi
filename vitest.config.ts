import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        environment: "node",
        exclude: [
            "node_modules/**",
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
