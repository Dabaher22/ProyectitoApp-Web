#!/usr/bin/env node
// Fast build using esbuild — builds in ~3 min vs 33 min with Vite/Rollup
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

const DIST = './dist/assets';
mkdirSync(DIST, { recursive: true });

await esbuild.build({
  entryPoints: ['./src/main.tsx'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  outdir: DIST,
  define: { 'process.env.NODE_ENV': '"production"' },
  jsx: 'automatic',
  jsxImportSource: 'react',
});

// Content-hash rename (browser cache busting)
function hashFile(fp) {
  return createHash('sha256').update(readFileSync(fp)).digest('hex').slice(0, 8);
}

const jsIn  = `${DIST}/main.js`;
const cssIn = `${DIST}/main.css`;

const jsHash  = hashFile(jsIn);
const jsOut   = `index-${jsHash}.js`;

let cssLink = '';
try {
  const cssHash = hashFile(cssIn);
  const cssOut  = `index-${cssHash}.css`;
  renameSync(cssIn, `${DIST}/${cssOut}`);
  cssLink = `\n    <link rel="stylesheet" href="/assets/${cssOut}" />`;
} catch {}

renameSync(jsIn, `${DIST}/${jsOut}`);

writeFileSync('./dist/index.html', `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Proyectito</title>
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Proyectito" />
    <meta name="theme-color" content="#1A1A1A" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />${cssLink}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${jsOut}"></script>
  </body>
</html>`);

// Copy service worker and other root-level public files to dist/
const rootPublicFiles = ['firebase-messaging-sw.js', 'manifest.json'];
for (const f of rootPublicFiles) {
  if (existsSync(`./public/${f}`)) copyFileSync(`./public/${f}`, `./dist/${f}`);
}

const size = (readFileSync(`${DIST}/${jsOut}`).length / 1024).toFixed(0);
console.log(`✓ dist/assets/${jsOut} (${size}KB)`);
