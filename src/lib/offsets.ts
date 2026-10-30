// API_CONTRACT: offsets are half-open [start, end) and the backend normalizes text (NFC, astral → U+FFFD),
// so they equal JS UTF-16 indexes. The mapper only clamps out-of-range values (ARCHITECTURE §12).
export function makeOffsetMapper(text: string): (offset: number) => number {
  return (offset) => Math.min(Math.max(0, offset), text.length);
}
