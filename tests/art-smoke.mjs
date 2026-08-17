import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ART_ASSETS, ART_STATUS, getArtAsset, getArtFallback, getArtPath } from '../src/art.js';

// v0.7 Stage A/B: lock the art registry, sourcing docs, portrait integration and graceful fallback contract.
assert.ok(fs.existsSync('docs/v0.7美术资源来源表.md'), 'art source registry document missing');
assert.ok(fs.existsSync('assets/art/README.md'), 'art asset directory guide missing');

const required = [
  'player-portrait',
  'chimeng-portrait',
  'nvdi-portrait',
  'player-battle',
  'chimeng-battle',
  'nvdi-battle',
  'enemy-scout-battle',
  'enemy-guard-battle',
  'enemy-blackwuchang-battle',
  'enemy-palace-guard-battle',
  'player-folding-wind-cutin',
  'chimeng-cutin',
  'nvdi-cutin',
  'world-bg',
  'yuzhou-bg',
  'battle-city-bg',
  'battle-wilderness-bg',
  'raojiang-bg',
  'fx-hit',
  'fx-slash',
  'fx-poison',
  'fx-heal',
  'fx-shield',
  'fx-control',
  'fx-cutin-flash'
];

for (const id of required) {
  const entry = getArtAsset(id);
  assert.ok(entry, `missing art registry entry: ${id}`);
  assert.ok(entry.fallback, `art entry must provide graceful fallback: ${id}`);
}

assert.equal(getArtAsset('jiangchen-portrait')?.status, ART_STATUS.deferred, 'Jiangchen art must remain deferred in the first v0.7 production batch');
assert.equal(getArtFallback('player-portrait')?.value, '侠', 'player portrait fallback must preserve current glyph UI');

const portraitIds = ['player-portrait', 'chimeng-portrait', 'nvdi-portrait'];
for (const id of portraitIds) {
  const entry = getArtAsset(id);
  assert.equal(entry?.status, ART_STATUS.ready, `Stage B portrait must be ready: ${id}`);
  assert.ok(entry?.localPath?.endsWith('.webp'), `Stage B portrait should use local WebP: ${id}`);
  assert.ok(fs.existsSync(entry.localPath), `Stage B portrait file missing: ${id} -> ${entry.localPath}`);
  assert.equal(getArtPath(id), entry.localPath, `ready portrait must expose runtime path: ${id}`);
}

for (const entry of Object.values(ART_ASSETS)) {
  if (entry.localPath) {
    assert.ok(!/^https?:\/\//i.test(entry.localPath), `formal art cannot hotlink external URL: ${entry.id}`);
  }
  if (entry.status === ART_STATUS.ready) {
    assert.ok(entry.localPath, `ready art must have localPath: ${entry.id}`);
    assert.ok(fs.existsSync(entry.localPath), `ready art file missing: ${entry.id} -> ${entry.localPath}`);
  }
}

const sources = fs.readFileSync('docs/v0.7美术资源来源表.md', 'utf8');
for (const marker of ['网上找优先', 'reference-only', 'generate-if-needed', 'sourceUrl', 'license', 'localFile']) {
  assert.ok(sources.includes(marker), `art sourcing policy marker missing: ${marker}`);
}

const index = fs.readFileSync('index.html', 'utf8');
const portraitUi = fs.readFileSync('src/portrait-ui.js', 'utf8');
const portraitCss = fs.readFileSync('portrait-art.css', 'utf8');
assert.ok(index.includes('href="./portrait-art.css"'), 'portrait stylesheet must be loaded');
assert.ok(index.includes('src="./src/portrait-ui.js"'), 'portrait UI helper must be loaded');
for (const marker of ['player-portrait', 'chimeng-portrait', 'nvdi-portrait', 'getArtPath', 'data-char']) {
  assert.ok(portraitUi.includes(marker), `portrait UI contract missing: ${marker}`);
}
assert.ok(portraitUi.includes("img.addEventListener('error'"), 'portrait UI must preserve fallback when an image fails');
assert.ok(portraitCss.includes('object-fit: cover'), 'portrait image must have stable crop behavior');
assert.ok(portraitCss.includes('.portrait-art'), 'portrait art CSS missing');

console.log(`art smoke passed: ${Object.keys(ART_ASSETS).length} registered assets + Stage B portraits + fallbacks + no-hotlink sourcing policy verified`);
