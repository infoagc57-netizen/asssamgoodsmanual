/**
 * Generates app/icon.png, app/apple-icon.png, app/favicon.ico, and public/icon.png from app/icon.svg
 */
const fs = require("fs");
const path = require("path");

async function main() {
  const sharp = require("sharp");
  const root = path.join(__dirname, "..");
  const svgPath = path.join(root, "scripts", "agc-erp-icon.svg");
  const svg = fs.readFileSync(svgPath);

  await sharp(svg).resize(512, 512).png().toFile(path.join(root, "app", "icon.png"));
  await sharp(svg).resize(180, 180).png().toFile(path.join(root, "app", "apple-icon.png"));
  await sharp(svg).resize(32, 32).png().toFile(path.join(root, "app", "favicon.ico"));
  await sharp(svg).resize(512, 512).png().toFile(path.join(root, "public", "icon.png"));

  console.log("Generated app/icon.png, app/apple-icon.png, app/favicon.ico, public/icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
