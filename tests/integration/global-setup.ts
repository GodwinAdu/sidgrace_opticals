import { MongoMemoryServer } from "mongodb-memory-server";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * Vitest globalSetup runs in a DIFFERENT process from the test workers, so an
 * env var set here does not reach them. We boot one in-memory MongoDB for the
 * whole run and hand its URI to the workers by writing a tiny temp file that
 * `setup.ts` reads before importing any app module. The file is removed on
 * teardown along with stopping mongod.
 */
let mongo: MongoMemoryServer | undefined;
const uriFile = join(process.cwd(), ".mms-uri.tmp");

export async function setup() {
    mongo = await MongoMemoryServer.create();
    writeFileSync(uriFile, mongo.getUri(), "utf8");
}

export async function teardown() {
    try {
        rmSync(uriFile, { force: true });
    } catch {
        /* ignore */
    }
    await mongo?.stop();
}
