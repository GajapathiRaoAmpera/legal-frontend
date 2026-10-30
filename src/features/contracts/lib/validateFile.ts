export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

/** UX-only check (the server is authoritative): extension AND MIME, extension wins when file.type is empty. */
export function validateFile(file: File | null): string | null {
  if (!file) return "Choose a .docx or .pdf file.";
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? "";
  const expected = TYPES[ext];
  if (!expected) return "Only .docx and .pdf files are supported.";
  if (file.type && file.type !== expected)
    return `This file's type doesn't match its .${ext} extension.`;
  if (file.size > MAX_UPLOAD_BYTES) return "The file is larger than 25 MB.";
  if (file.size === 0) return "The file is empty.";
  return null;
}
