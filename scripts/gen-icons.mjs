import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "public/tcf-logo.png";
const OUT = "public/icons";
mkdirSync(OUT, { recursive: true });

async function plainIcon(size, filename) {
  await sharp(SRC).resize(size, size, { fit: "contain", background: "#ffffff" }).png().toFile(`${OUT}/${filename}`);
}

// Maskable: logo scaled to ~60% of canvas, centered, on a white canvas —
// leaves enough safe-zone margin for Android's adaptive-icon cropping.
async function maskableIcon(size, filename) {
  const inner = Math.round(size * 0.6);
  const logo = await sharp(SRC).resize(inner, inner, { fit: "contain", background: "#ffffff" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: "#ffffff" } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(`${OUT}/${filename}`);
}

await plainIcon(192, "icon-192.png");
await plainIcon(512, "icon-512.png");
await plainIcon(180, "apple-touch-icon.png");
await maskableIcon(192, "icon-maskable-192.png");
await maskableIcon(512, "icon-maskable-512.png");

console.log("Icons generated in", OUT);
