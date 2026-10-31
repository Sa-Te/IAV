/**
 * Media type detection by magic bytes (AGENTS.md: never classify by extension
 * alone). The export contains files with no extension at all, and a `.jpg` that
 * is really a PNG would be a lie either way.
 */

export type DetectedMime = string;

const BY_SIGNATURE: readonly {
  readonly test: (b: Uint8Array) => boolean;
  readonly mime: string;
}[] = [
  { test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, mime: "image/jpeg" },
  {
    test: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a,
    mime: "image/png",
  },
  {
    // RIFF....WEBP
    test: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
    mime: "image/webp",
  },
  {
    // ISO base media: ....ftyp at offset 4
    test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
    mime: "video/mp4",
  },
  {
    test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
    mime: "image/gif",
  },
];

const BY_EXTENSION: Readonly<Record<string, DetectedMime>> = {
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

/**
 * Magic bytes first; the extension is only a tie-break for formats we cannot
 * sniff (audio containers, HEIC) and a last-resort octet-stream.
 */
export function detectMime(bytes: Uint8Array, name: string): DetectedMime {
  for (const signature of BY_SIGNATURE) {
    if (signature.test(bytes)) return signature.mime;
  }
  const dot = name.lastIndexOf(".");
  const extension = dot <= 0 ? "" : name.slice(dot).toLowerCase();
  return BY_EXTENSION[extension] ?? "application/octet-stream";
}
