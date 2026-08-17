import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('mobile-ui.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

for (const width of [320, 360, 390, 430, 520]) {
  assert.ok(css.includes(`max-width: ${width}px`), `Stage H breakpoint missing: ${width}px`);
}

for (const marker of [
  'overflow-x: hidden',
  'min-height: 44px',
  'env(safe-area-inset-bottom',
  'max-height: 92dvh',
  'overflow-y: auto',
  'overflow-wrap: anywhere',
  '.bottom-nav',
  '.resources',
  '.sheet',
  '.location-list',
  '.battle-actions',
  '.character-card',
  '.skill-card',
  '.item-card'
]) {
  assert.ok(css.includes(marker), `Stage H mobile contract missing: ${marker}`);
}

assert.ok(index.includes('href="./mobile-ui.css"'), 'Stage H stylesheet must load after other UI styles');
assert.ok(!/min-width\s*:\s*[6-9]\d{2}px/.test(css), 'mobile UI must not introduce large fixed minimum widths');
assert.ok(!/overflow-x\s*:\s*(auto|scroll)/.test(css), 'Stage H must not use horizontal scrolling as a layout workaround');

console.log('mobile responsive smoke passed: 320/360/390/430/520 + safe-area + touch + no-horizontal-scroll contracts verified');
