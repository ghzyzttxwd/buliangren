import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const styles = fs.readFileSync('styles.css', 'utf8');
const responsive = fs.readFileSync('responsive.css', 'utf8');
const worldMap = fs.readFileSync('world-map.css', 'utf8');

// v0.6 阶段 A：只锁住 v0.5.7-stable 的 UI 功能入口与结构，不冻结具体像素布局。
assert.match(index, /<div id="app"><\/div>/, 'root app mount is missing');
for (const href of ['./styles.css', './responsive.css', './world-map.css']) {
  assert.ok(index.includes(`href="${href}"`), `stylesheet not loaded: ${href}`);
}
assert.ok(index.includes('src="./src/app.js"'), 'main app module is missing');

// 五项主导航与五个主页面必须继续存在。
for (const [id, label] of [
  ['world', '江湖'],
  ['party', '队伍'],
  ['skills', '武学'],
  ['bag', '行囊'],
  ['logs', '记录']
]) {
  assert.ok(app.includes(`['${id}'`), `navigation id missing: ${id}`);
  assert.ok(app.includes(`'${label}'`), `navigation label missing: ${label}`);
}
for (const fn of ['worldView', 'partyView', 'skillsView', 'bagView', 'logsView']) {
  assert.ok(app.includes(`function ${fn}(`), `main page renderer missing: ${fn}`);
}

// 顶部四项核心资源信息不能在 UI 重构中丢失。
for (const marker of ['Lv.<b>', '境<b>', '声<b>', '银<b>']) {
  assert.ok(app.includes(marker), `top resource marker missing: ${marker}`);
}

// 功能入口只锁 data-* 契约，不锁 DOM 层级和视觉样式。
const requiredDataHooks = [
  'data-nav=',
  'data-location=',
  'data-quest=',
  'data-event=',
  'data-shop=',
  'data-buy-item=',
  'data-buy-merchant=',
  'data-equip-item=',
  'data-unequip-slot=',
  'data-use-item=',
  'data-study-manual=',
  'data-basic-attack',
  'data-skill=',
  'data-battle-item=',
  'data-battle-finish',
  'data-battle-leave',
  'data-reset'
];
for (const hook of requiredDataHooks) {
  assert.ok(app.includes(hook), `UI action hook missing: ${hook}`);
}

// 关键全局结构仍必须存在，但后续阶段可重新组织内部布局。
for (const selector of ['.app-shell', '.topbar', '.bottom-nav', '.modal', '.sheet', '.toast']) {
  assert.ok(styles.includes(selector), `global UI selector missing from styles.css: ${selector}`);
}
assert.ok(worldMap.includes('.location-list'), 'world map container style is missing');
assert.ok(responsive.includes('.resources'), 'responsive resource layout is missing');

// PWA 手机安全区与固定底栏属于当前已验收能力，重构时不能丢。
assert.ok(styles.includes('safe-area-inset-bottom'), 'bottom safe-area support is missing');
assert.ok(styles.includes('safe-area-inset-top'), 'top safe-area support is missing');
assert.ok(styles.includes('position:fixed') || styles.includes('position: fixed'), 'fixed mobile navigation baseline is missing');

console.log('ui smoke passed: five pages + resources + action hooks + global mobile shell verified');
