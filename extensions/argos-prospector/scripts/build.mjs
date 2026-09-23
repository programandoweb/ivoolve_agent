import { build, context } from 'esbuild';
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'dist'), { recursive: true });
const svg = await readFile(path.join(root, 'assets/argos.svg'));
for (const size of [16, 32, 48, 128]) {
  await sharp(svg).resize(size, size).png().toFile(path.join(root, 'dist', 'icon-' + size + '.png'));
}
const opts = {
  entryPoints: {
    background: path.join(root, 'src/background.ts'),
    maps: path.join(root, 'src/maps.ts'),
    popup: path.join(root, 'src/popup.ts')
  },
  outdir: path.join(root, 'dist'),
  bundle: true, format: 'esm', target: ['chrome116'], platform: 'browser', logLevel: 'info',
};
if (process.argv.includes('--watch')) {
  const ctx = await context(opts);
  await ctx.watch();
} else await build(opts);
