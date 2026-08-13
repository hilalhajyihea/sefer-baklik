/**
 * Rasterize transparent Salon Sami header logo to PNG.
 * Run: node logo/sami/render-transparent-png.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, "option-b-header-transparent.svg");
const outPath = path.join(__dirname, "option-b-header-transparent.png");
const publicOut = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "sami",
  "option-b-header-transparent.png",
);

const svg = fs.readFileSync(svgPath);

const png = await sharp(svg, { density: 300 })
.resize({
        width: 840,
        height: 280,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
  .png()
  .toBuffer();

fs.writeFileSync(outPath, png);
fs.mkdirSync(path.dirname(publicOut), { recursive: true });
fs.writeFileSync(publicOut, png);
console.log("wrote", outPath);
console.log("wrote", publicOut);
console.log("bytes", png.length);
