import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ART_ASSETS, ART_STATUS, getArtAsset, getArtFallback, getArtPath } from '../src/art.js';

// v0.7 Stage A: lock the art registry, sourcing docs and graceful fallback contract.
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
assert.equal(getArtAsset('player-portrait')?.status, ART_STATUS.generateIfNeeded, 'original player portrait should be generated only when needed');
assert.equal(getArtPath('player-portrait'), null, 'non-ready art must not expose a runtime path');
assert.equal(getArtFallback('player-portrait')?.value, '侠', 'player portrait fallback must preserve current glyph UI');

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

console.log(`art smoke passed: ${Object.keys(ART_ASSETS).length} registered assets + fallbacks + no-hotlink sourcing policy verified`);
