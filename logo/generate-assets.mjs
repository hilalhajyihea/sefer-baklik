/**
 * Generates high-resolution logo assets into LOGO/
 * Run: npx tsx LOGO/generate-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, "sefer-baklik-icon.svg");
const svg = fs.readFileSync(svgPath);

async function renderIcon(size) {
  return sharp(svg, { density: 300 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function writeTransparent(name, size) {
  const out = path.join(__dirname, name);
  await sharp(await renderIcon(size)).toFile(out);
  console.log("wrote", out);
}

async function writeOnBackground(name, size, background, iconRatio = 0.78) {
  const icon = await renderIcon(Math.round(size * iconRatio));
  const out = path.join(__dirname, name);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: icon, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log("wrote", out);
}

async function writePdf() {
  const png2048 = path.join(__dirname, "sefer-baklik-icon-2048.png");
  const out = path.join(__dirname, "sefer-baklik-icon.pdf");
  const page = 842;
  const doc = new PDFDocument({
    size: [page, page],
    margin: 0,
    info: {
      Title: "Sefer BaKlik Logo",
      Author: "Sefer BaKlik",
      Subject: "Brand mark - scissors + click (no text)",
    },
  });
  const stream = fs.createWriteStream(out);
  doc.pipe(stream);
  const logoSize = 520;
  const x = (page - logoSize) / 2;
  const y = (page - logoSize) / 2;
  doc.image(png2048, x, y, { width: logoSize, height: logoSize });
  doc.end();
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  console.log("wrote", out);
}

async function main() {
  await writeTransparent("sefer-baklik-icon-2048.png", 2048);
  await writeTransparent("sefer-baklik-icon-1024.png", 1024);

  await writeOnBackground("sefer-baklik-profile-1080-dark.png", 1080, {
    r: 28,
    g: 23,
    b: 19,
    alpha: 1,
  });
  await writeOnBackground("sefer-baklik-profile-1080-cream.png", 1080, {
    r: 248,
    g: 243,
    b: 236,
    alpha: 1,
  });
  await writeOnBackground("sefer-baklik-post-1080.png", 1080, {
    r: 235,
    g: 228,
    b: 218,
    alpha: 1,
  });

  await writePdf();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
