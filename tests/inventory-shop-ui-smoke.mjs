import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('inventory-ui.css', 'utf8');

// v0.6 Stage E：锁住行囊 / 装备 / 使用 / 商店的 UI 契约，不改 v0.5 业务规则。
for (const marker of ['function bagView(', 'function shopModal(', 'item-card', 'item-head', 'item-title', 'item-count', 'item-meta']) {
  assert.ok(app.includes(marker), `Stage E UI structure missing: ${marker}`);
}

// 行囊必须继续消费真实 inventory 数据与 v0.5 公开接口。
for (const marker of [
  'getInventoryEntries(state)',
  'formatStatModifiers(item.statModifiers)',
  'getUseContextLabel(item)',
  'getSpecialItemSemantic(item)'
]) {
  assert.ok(app.includes(marker), `inventory UI data contract missing: ${marker}`);
}

// 装备 / 卸下 / 使用 / 研读入口必须保留。
for (const hook of [
  'data-equip-item=',
  'data-unequip-slot=',
  'data-use-item=',
  'data-study-manual='
]) {
  assert.ok(app.includes(hook), `inventory action hook missing: ${hook}`);
}

// 商店必须继续展示当前银两、单价、持有量，并保留购买契约。
for (const marker of ['state.player.silver', '价格：${price} 银', '持有 ×${owned}', 'canPurchaseItem', 'purchaseItem']) {
  assert.ok(app.includes(marker), `shop UI contract missing: ${marker}`);
}
for (const hook of ['data-buy-item=', 'data-buy-merchant=', 'data-shop-close']) {
  assert.ok(app.includes(hook), `shop action hook missing: ${hook}`);
}

// Stage E 只重排视觉层级，操作按钮保持 >=44px，并禁止横向滚动依赖。
for (const selector of ['main.page > .inventory-list', '.item-card', '.item-head', '.item-title', '.item-meta', '.sheet > .inventory-list']) {
  assert.ok(css.includes(selector), `Stage E CSS selector missing: ${selector}`);
}
assert.ok(css.includes('min-height: 46px'), 'inventory/shop actions must retain phone-sized touch targets');
assert.ok(!/\.inventory-list[^}]*overflow-x\s*:\s*(auto|scroll)/s.test(css), 'inventory/shop UI must not require horizontal scrolling');
assert.ok(index.includes('href="./inventory-ui.css"'), 'Stage E stylesheet must be loaded');

console.log('inventory/shop UI smoke passed: real inventory + equipment/use/shop contracts + mobile hierarchy verified');
