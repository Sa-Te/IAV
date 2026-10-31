/**
 * Instagram archives export UTF-8 text but the backend decodes them as ISO-8859-1,
 * storing each original byte as a Latin-1 Unicode code point. This reverses that:
 * treat each char's code point as a raw byte, then re-decode as UTF-8.
 */
export function fixInstagramEncoding(text: string | null | undefined): string {
  if (!text) return "";
  try {
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0) & 0xff);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return text;
  }
}
