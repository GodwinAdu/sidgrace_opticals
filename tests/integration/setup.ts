import { beforeAll, afterAll, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";

/**
 * Per-file setup. CRITICAL ordering: `lib/mongoose.ts` reads
 * `process.env.MONGODB_URL` at module-import time, so it must be set BEFORE any
 * app module is imported. Vitest evaluates `setupFiles` before the test module,
 * so reading the globalSetup-provided URI here (from the temp file written by
 * `global-setup.ts`) and assigning the env var is early enough.
 */
const uriFile = join(process.cwd(), ".mms-uri.tmp");
process.env.MONGODB_URL = readFileSync(uriFile, "utf8").trim();
// Placeholder secrets so any module reading them at import time never crashes
// (auth is mocked in the tests, so these are never used to verify a token).
process.env.TOKEN_SECRET_KEY = process.env.TOKEN_SECRET_KEY || "test-secret";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test-refresh";

beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URL as string, { dbName: "SidGrace" });
    }
});

afterEach(async () => {
    const { collections } = mongoose.connection;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
});
