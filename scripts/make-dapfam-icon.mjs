/**
 * Generate a Dapfam-branded icon set from an inline SVG monogram.
 *
 * Output:
 *   app/favicon.ico            (multi-size: 16,32,48,64,128,256)
 *   app/icon.png               (512, used by Next for PWA/apple icon)
 *   public/dapfam-icon.png     (512, general use)
 *   scripts/medira.ico ->      (overwritten with the Dapfam ico so the
 *                               client installer ships the new icon)
 *
 * Uses `sharp` (already in node_modules) to rasterize the SVG, then writes a
 * minimal ICO container (PNG-compressed entries, supported by Windows Vista+).
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Teal brand gradient matching the app theme. A rounded-square badge with a
// bold "D" monogram and a small tooth accent dot.
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#0891b2"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="240" height="240" rx="52" fill="url(#g)"/>
  <path d="M86 70h44c38 0 62 23 62 58s-24 58-62 58H86V70zm44 92c20 0 32-13 32-34s-12-34-32-34h-10v68h10z"
        fill="#ffffff"/>
  <circle cx="178" cy="84" r="12" fill="#ffffff" opacity="0.9"/>
</svg>`;

const PNG = (size) => sharp(Buffer.from(svg(size))).resize(size, size).png().toBuffer();

/** Build a minimal ICO file from an array of {size, pngBuffer}. */
function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const bodies = [];
  entries.forEach((e, i) => {
    const b = e.png;
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 0); // width (0 = 256)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(b.length, o + 8); // size of image data
    dir.writeUInt32LE(offset, o + 12); // offset of image data
    offset += b.length;
    bodies.push(b);
  });

  return Buffer.concat([header, dir, ...bodies]);
}

async function main() {
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const entries = [];
  for (const size of icoSizes) {
    entries.push({ size, png: await PNG(size) });
  }
  const ico = buildIco(entries);

  writeFileSync(join(root, "app", "favicon.ico"), ico);
  writeFileSync(join(root, "scripts", "medira.ico"), ico); // client installer ships this
  writeFileSync(join(root, "app", "icon.png"), await PNG(512));
  writeFileSync(join(root, "public", "dapfam-icon.png"), await PNG(512));

  console.log("Dapfam icons written:");
  console.log("  app/favicon.ico (16-256)");
  console.log("  app/icon.png (512)");
  console.log("  public/dapfam-icon.png (512)");
  console.log("  scripts/medira.ico (for client installer)");
}

main().catch((e) => { console.error(e); process.exit(1); });
