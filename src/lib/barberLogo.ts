import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function logoPublicDir(slug: string) {
  return path.join(process.cwd(), "public", "uploads", "barbers", slug);
}

export function logoPublicUrl(slug: string, ext: string) {
  return `/uploads/barbers/${slug}/logo.${ext}`;
}

export function absoluteFromPublicUrl(logoUrl: string) {
  const clean = logoUrl.split("?")[0] || "";
  if (!clean.startsWith("/uploads/barbers/")) return null;
  return path.join(process.cwd(), "public", clean.replace(/^\//, ""));
}

export async function saveBarberLogo(input: {
  slug: string;
  file: File;
}): Promise<{ logoUrl: string }> {
  const type = input.file.type;
  const ext = ALLOWED[type];
  if (!ext) {
    throw new Error("פורמט לא נתמך (PNG / JPG / WEBP / SVG)");
  }
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) {
    throw new Error("גודל הקובץ חייב להיות עד 2MB");
  }

  const dir = logoPublicDir(input.slug);
  await mkdir(dir, { recursive: true });

  // Clear previous logo variants
  for (const e of Object.values(ALLOWED)) {
    try {
      await unlink(path.join(dir, `logo.${e}`));
    } catch {
      /* missing is fine */
    }
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const filePath = path.join(dir, `logo.${ext}`);
  await writeFile(filePath, buffer);

  // Cache-bust so browsers refresh after replace
  const logoUrl = `${logoPublicUrl(input.slug, ext)}?v=${Date.now()}`;
  return { logoUrl };
}

export async function removeBarberLogoFile(logoUrl: string | null | undefined) {
  if (!logoUrl) return;
  const abs = absoluteFromPublicUrl(logoUrl);
  if (!abs) return;
  try {
    await unlink(abs);
  } catch {
    /* missing is fine */
  }
}
