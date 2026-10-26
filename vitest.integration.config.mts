import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Integration-test config — SEPARATE from the default `vitest.config.mts` so
 * the fast, dependency-light pure suite (`npx vitest run`) never boots MongoDB.
 *
 * These tests exercise the REAL server-action logic against an in-memory
 * MongoDB (`mongodb-memory-server`). Run them with `npm run test:integration`.
 *
 * `globalSetup` starts the in-memory server and exports its URI; `setupFiles`
 * runs per test-file to set `process.env.MONGODB_URL` BEFORE any app module
 * (which reads it at import time) is loaded, and to connect/disconnect mongoose.
 */
export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/integration/**/*.int.test.ts"],
        globalSetup: ["tests/integration/global-setup.ts"],
        setupFiles: ["tests/integration/setup.ts"],
        // In-memory Mongo + real writes are slower than the pure suite.
        testTimeout: 60000,
        hookTimeout: 120000,
        // Avoid cross-file DB races: one worker, serialized files.
        fileParallelism: false,
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL(".", import.meta.url)),
        },
    },
});
