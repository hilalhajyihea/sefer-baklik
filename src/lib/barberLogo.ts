const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function logoApiUrl(slug: string) {
  return `/api/barbers/${encodeURIComponent(slug)}/logo?v=${Date.now()}`;
}

export async function readLogoUpload(file: File): Promise<{
  data: Buffer;
  mimeType: string;
}> {
  const type = file.type;
  if (!ALLOWED[type]) {
    throw new Error("פורמט לא נתמך (PNG / JPG / WEBP / SVG)");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("גודל הקובץ חייב להיות עד 2MB");
  }
  const data = Buffer.from(await file.arrayBuffer());
  return { data, mimeType: type };
}
