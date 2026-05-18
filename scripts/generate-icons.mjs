import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'assets/leaf.svg');
const buildDir = resolve(root, 'build');
const pngPath = resolve(buildDir, 'icon.png');
const icoPath = resolve(buildDir, 'icon.ico');

async function main() {
  if (!existsSync(buildDir)) await mkdir(buildDir, { recursive: true });

  const svg = await readFile(svgPath);

  await sharp(svg).resize(512, 512).png().toFile(pngPath);
  console.log('wrote', pngPath);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = await Promise.all(
    sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer())
  );
  const ico = await pngToIco(buffers);
  await writeFile(icoPath, ico);
  console.log('wrote', icoPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
