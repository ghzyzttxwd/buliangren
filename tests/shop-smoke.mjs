import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { getMerchantItems, canPurchaseItem, purchaseItem } from '../src/shops.js';

const state = defaultState();
const beforeSilver = state.player.silver;
const beforePowder = state.inventory.items.healing_powder;

const listings = getMerchantItems('yuzhou_apothecary');
assert.equal(listings.length, 1, 'merchant product list mismatch');
assert.equal(listings[0].item.id, 'healing_powder', 'merchant did not resolve catalog item');
assert.equal(listings[0].price, 24, 'merchant price mismatch');

let result = purchaseItem(state, 'yuzhou_apothecary', 'healing_powder');
assert.equal(result.ok, true, 'valid purchase failed');
assert.equal(state.player.silver, beforeSilver - 24, 'purchase did not deduct silver');
assert.equal(state.inventory.items.healing_powder, beforePowder + 1, 'purchase did not increase inventory');

const poor = defaultState();
poor.player.silver = 10;
const poorBefore = poor.inventory.items.healing_powder;
result = purchaseItem(poor, 'yuzhou_apothecary', 'healing_powder');
assert.equal(result.ok, false, 'insufficient silver purchase succeeded');
assert.equal(result.reason, 'insufficient_silver', 'insufficient silver rejection reason mismatch');
assert.equal(poor.player.silver, 10, 'failed purchase changed silver');
assert.equal(poor.inventory.items.healing_powder, poorBefore, 'failed purchase changed inventory');

result = purchaseItem(state, 'yuzhou_apothecary', 'old_coin');
assert.equal(result.ok, false, 'item not in merchant list was purchased');
assert.equal(result.reason, 'not_sold_here', 'not-sold-here rejection reason mismatch');

// 即使错误配置到普通商人，也必须拦截剧情道具与唯一宝物。
const restrictedCatalog = {
  story_key: { id: 'story_key', category: 'quest', name: '剧情钥匙', price: 1 },
  unique_treasure: { id: 'unique_treasure', category: 'treasure', name: '唯一宝物', unique: true, price: 1 }
};
const restrictedMerchants = {
  bad_shop: {
    id: 'bad_shop', name: '测试商人', location: 'yuzhou',
    items: [
      { itemId: 'story_key', price: 1 },
      { itemId: 'unique_treasure', price: 1 }
    ]
  }
};
const fakeMerchantState = defaultState();
const originalSilver = fakeMerchantState.player.silver;
result = purchaseItem(fakeMerchantState, 'bad_shop', 'story_key', 1, restrictedCatalog, restrictedMerchants);
assert.equal(result.ok, false, 'quest item was purchased from ordinary merchant');
assert.equal(result.reason, 'restricted_item', 'quest item restriction reason mismatch');
result = purchaseItem(fakeMerchantState, 'bad_shop', 'unique_treasure', 1, restrictedCatalog, restrictedMerchants);
assert.equal(result.ok, false, 'unique treasure was purchased from ordinary merchant');
assert.equal(result.reason, 'restricted_item', 'unique treasure restriction reason mismatch');
assert.equal(fakeMerchantState.player.silver, originalSilver, 'restricted purchase changed silver');
assert.equal(fakeMerchantState.inventory.items.story_key, undefined, 'restricted quest item entered inventory');
assert.equal(fakeMerchantState.inventory.items.unique_treasure, undefined, 'restricted treasure entered inventory');

assert.equal(canPurchaseItem(fakeMerchantState, 'missing_merchant', 'story_key', 1, restrictedCatalog, restrictedMerchants).reason, 'merchant_missing', 'missing merchant guard mismatch');
assert.ok(state.player.silver >= 0, 'silver became negative');
assert.ok(state.inventory.items.healing_powder >= 0, 'inventory became negative');

console.log('shop smoke passed: data list + purchase + silver guard + restricted item policy verified');
