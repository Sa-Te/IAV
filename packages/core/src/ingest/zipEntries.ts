import { unzipSync } from "fflate";

/**
 * ZIP-level helpers: recognising a ZIP, listing entries without inflating them,
 * and deciding what an entry is.
 */

export const MEDIA_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".mp4",
  ".mov",
  ".webm",
  ".m4a",
  ".mp3",
  ".opus",
]);

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".opus": "audio/opus",
};

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}

export function mimeFor(name: string): string {
  return MIME_BY_EXTENSION[extensionOf(name)] ?? "application/octet-stream";
}

export function isMediaEntry(name: string): boolean {
  return MEDIA_EXTENSIONS.has(extensionOf(name));
}

export function isZip(zip: Uint8Array): boolean {
  if (zip.length < 4) return false;
  return (
    (zip[0] === 0x50 && zip[1] === 0x4b && zip[2] === 0x03 && zip[3] === 0x04) ||
    // An empty archive is a valid ZIP: PK\x05\x06
    (zip[0] === 0x50 && zip[1] === 0x4b && zip[2] === 0x05 && zip[3] === 0x06)
  );
}

export function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const only = chunks.length === 1 ? chunks[0] : undefined;
  if (only !== undefined) return only;
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function basenameOf(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

export function dirnameOf(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

/** Enumerates entry names without decompressing anything (the filter runs first). */
export function listNames(zip: Uint8Array): readonly string[] {
  const names: string[] = [];
  unzipSync(zip, {
    filter: (file) => {
      names.push(file.name);
      return false;
    },
  });
  return names;
}
