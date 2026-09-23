import { build, context } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'dist'), { recursive: true });
const config = { entryPoints: { background: path.join(root,'src/background.ts'), observe: path.join(root,'src/observe.ts'), sidepanel: path.join(root,'src/sidepanel.ts') }, outdir:path.join(root,'dist'), bundle:true, format:'esm', target:['chrome116'], platform:'browser' };
if (process.argv.includes('--watch')) { const ctx=await context(config); await ctx.watch(); } else await build(config);
