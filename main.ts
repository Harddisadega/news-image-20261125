// news-image-20261125 — entry program (Node 22, standard library only).
// The poster for Wednesday 25 November 2026 ships in this repository as
// entry.png. This program checks it against the bounty limits (a genuine
// PNG, at most 1 MiB, at most 1024 by 1024 pixels) and copies it to the
// output directory. It uses no network and writes the same bytes on
// every run.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const posterPath = join(repoRoot, "entry.png");
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const outPath = join(outDir, "entry.png");

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_BYTES = 1024 * 1024;
const MAX_SIDE = 1024;

function reject(reason) {
  throw new Error(`entry.png rejected: ${reason}`);
}

function inspect(bytes) {
  if (bytes.length === 0) reject("the file is empty");
  const isPng = PNG_MAGIC.every((byte, index) => bytes[index] === byte);
  if (!isPng) reject("the first 8 bytes are not the PNG signature");
  if (bytes.length > MAX_BYTES) {
    reject(`${bytes.length} bytes is over the ${MAX_BYTES} byte limit`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width === 0 || height === 0) reject("the image has a zero side");
  if (width > MAX_SIDE || height > MAX_SIDE) {
    reject(`the image is ${width}x${height}, over the ${MAX_SIDE}x${MAX_SIDE} limit`);
  }
  return { width, height };
}

if (!existsSync(posterPath)) reject(`poster not found at ${posterPath}`);

const poster = readFileSync(posterPath);
const { width, height } = inspect(poster);

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, poster);

// Read the output back and confirm it is byte-identical to the poster
// in the repository, so a partial or corrupted write cannot slip through.
const writtenBack = readFileSync(outPath);
if (!writtenBack.equals(poster)) {
  reject("read-back mismatch: the output differs from the poster");
}

const digest = createHash("sha256").update(poster).digest("hex");
console.log(`ok: ${outPath} — ${width}x${height}, ${poster.length} bytes, sha256=${digest}`);
