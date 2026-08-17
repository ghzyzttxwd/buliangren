import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

// v0.6 Stage E：锁住行囊 / 装备 / 使用 / 商店的 UI 契约，不改 v0.5 业务规则。
for (const marker of [
  'bag-page',
  'bag-summary',
  'item-card__head',
  'item-facts',
  'item-action',
  'shop-summary',
  'shop-item-card',
  'shop-price',
  'shop-owned'
]) {
  assert.ok(app.includes(marker), `Stage E UI marker missing: ${marker}`);
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
for (const marker of ['state.player.silver', 'price', 'owned', 'canPurchaseItem', 'purchaseItem']) {
  assert.ok(app.includes(marker), `shop UI contract missing: ${marker}`);
}
for (const hook of ['data-buy-item=', 'data-buy-merchant=', 'data-shop-close']) {
  assert.ok(app.includes(hook), `shop action hook missing: ${hook}`);
}

assert.ok(index.includes('href="./inventory-ui.css"'), 'Stage E stylesheet must be loaded');

console.log('inventory/shop UI smoke passed: hierarchy + real inventory + equipment/use/shop action contracts verified');
