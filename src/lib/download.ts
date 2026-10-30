// eslint-disable-next-line no-control-regex -- stripping control chars is the point
const UNSAFE = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

export function sanitizeFilename(name: string): string {
  const clean = name.replace(UNSAFE, "_").trim().replace(/^\.+/, "_");
  return clean.slice(0, 120) || "download";
}

/** RFC 6266: prefer filename* (UTF-8, percent-encoded), then filename, else fallback. Always sanitized. */
export function parseContentDisposition(header: string | null, fallback: string): string {
  if (header) {
    const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
    if (star?.[2]) {
      try {
        return sanitizeFilename(decodeURIComponent(star[2].trim().replace(/^"|"$/g, "")));
      } catch {
        // malformed percent-encoding: fall through to filename=
      }
    }
    const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
    const value = plain?.[2] ?? plain?.[1];
    if (value) return sanitizeFilename(value.trim());
  }
  return sanitizeFilename(fallback);
}

/** Blob → temporary <a download> attached to the DOM (Safari needs that) → revoke. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "contract";
