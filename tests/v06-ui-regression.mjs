import assert from 'node:assert/strict';
import fs from 'node:fs';

// v0.6 Stage I: consolidate all UI/UX regressions before frozen-system regressions.
await import('./ui-smoke.mjs');
await import('./world-map-ui-smoke.mjs');
await import('./party-skills-ui-smoke.mjs');
await import('./inventory-shop-ui-smoke.mjs');
await import('./battle-ui-smoke.mjs');
await import('./feedback-ui-smoke.mjs');
await import('./mobile-responsive-smoke.mjs');

const app = fs.readFileSync('src/app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const combinedCss = [
  'responsive.css',
  'world-map.css',
  'ui-shell.css',
  'party-fix.css',
  'inventory-ui.css',
  'battle-ui.css',
  'feedback-ui.css',
  'mobile-ui.css'
].map(file => fs.readFileSync(file, 'utf8')).join('\n');

const checklist = [
  ['five nav entries', ['world','party','skills','bag','logs'].every(id => app.includes(`['${id}'`))],
  ['top resources', ['Lv.','境','声','银'].every(text => app.includes(text))],
  ['world objective entry', app.includes('data-quest=')],
  ['location entry', app.includes('data-location=')],
  ['party page', app.includes('party-page')],
  ['skills page', app.includes('skills-page')],
  ['bag page', app.includes('bagView')],
  ['equip / unequip', app.includes('data-equip-item=') && app.includes('data-unequip-slot=')],
  ['consumable use', app.includes('data-use-item=')],
  ['shop entry', app.includes('data-shop=')],
  ['shop purchase', app.includes('data-buy-item=')],
  ['battle basic attack', app.includes('data-basic-attack')],
  ['battle skill', app.includes('data-skill=')],
  ['battle item', app.includes('data-battle-item=')],
  ['logs page', app.includes('logsView')],
  ['reset save', app.includes('data-reset')],
  ['modal / sheet', app.includes('class="modal"') && app.includes('class="sheet"')],
  ['bottom nav', app.includes('bottom-nav')],
  ['core UI styles', ['world-map.css','ui-shell.css','inventory-ui.css','battle-ui.css','feedback-ui.css','mobile-ui.css'].every(file => index.includes(file))],
  ['no horizontal-scroll workaround', !/overflow-x\s*:\s*(auto|scroll)/.test(combinedCss)]
];

for (const [name, ok] of checklist) assert.ok(ok, `v0.6 UI total regression failed: ${name}`);
assert.equal(checklist.length, 20, 'Stage I must cover the taskbook 20-point UI checklist');

console.log('v0.6 UI regression passed: A-H UI checks + 20-point Stage I checklist covered');
