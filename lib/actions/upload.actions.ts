"use server"

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { withAuth, type User } from "../helpers/auth";

/**
 * File upload with a pluggable storage adapter. The default adapter writes to
 * `public/uploads/<yyyy>/<mm>/` and returns a public `/uploads/...` URL, so the
 * database stores only a small URL instead of a base64 blob. Swap the adapter
 * for S3/GCS later without changing callers.
 */

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED = new Set([
    "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
    "application/pdf",
]);

interface StorageAdapter {
    save(file: File, keyHint: string): Promise<string>; // returns a retrievable URL
}

/** Local-disk adapter (dev / single-host). */
const localDiskAdapter: StorageAdapter = {
    async save(file: File, keyHint: string): Promise<string> {
        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const safeHint = keyHint.replace(/[^a-z0-9-]/gi, "").slice(0, 24);
        const filename = `${safeHint ? safeHint + "-" : ""}${randomUUID()}.${ext}`;

        const dir = path.join(process.cwd(), "public", "uploads", yyyy, mm);
        await mkdir(dir, { recursive: true });

        const bytes = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(dir, filename), bytes);

        return `/uploads/${yyyy}/${mm}/${filename}`;
    },
};

// The active adapter. Point this at an S3 adapter in production if desired.
const storage: StorageAdapter = localDiskAdapter;

/**
 * Upload a single file. `formData` must contain a `file` field; an optional
 * `keyHint` (e.g. patient id) prefixes the stored filename. Returns the URL.
 */
async function _uploadFile(user: User, formData: FormData) {
    if (!user) throw new Error("User not authenticated");

    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    if (file.size <= 0) throw new Error("Empty file");
    if (file.size > MAX_BYTES) throw new Error("File too large (max 15MB)");
    if (file.type && !ALLOWED.has(file.type)) {
        throw new Error("Unsupported file type. Allowed: images and PDF.");
    }

    const keyHint = String(formData.get("keyHint") || "");
    const url = await storage.save(file, keyHint);
    return { url, name: file.name, type: file.type, size: file.size };
}
export const uploadFile = await withAuth(_uploadFile);
