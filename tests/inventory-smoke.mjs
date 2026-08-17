import assert from 'node:assert/strict';
import { defaultState, migrateSave, saveState } from '../src/state.js';
import { checkCondition } from '../src/conditions.js';
import { ITEM_CATALOG, ITEM_CATEGORIES, getItem } from '../src/data.js';
import {
  getInventoryEntries,
  getItemCategoryLabel,
  getSlotLabel,
  getUseContextLabel,
  formatStatModifiers
} from '../src/inventory.js';

const storage = new Map();
globalThis.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};

// 阶段 A：锁住 v0.4.9-stable 的默认 inventory 基线。
const base = defaultState();
assert.deepEqual(base.inventory.items, {
  healing_powder: 3,
  old_coin: 1,
  cloth_bracer: 1
}, 'default inventory item counts changed unexpectedly');
assert.deepEqual(base.inventory.equipment, {
  weapon: null,
  armor: null,
  accessory: null
}, 'default equipment slots changed unexpectedly');

// 旧/已有 v2 状态经 normalize 后，已持有物品和装备槽内容不得丢失。
const carried = migrateSave({
  ...base,
  inventory: {
    items: {
      healing_powder: 2,
      old_coin: 1,
      cloth_bracer: 1,
      legacy_token: 4
    },
    equipment: {
      weapon: 'legacy_blade',
      armor: null,
      accessory: 'legacy_charm'
    }
  }
});
assert.equal(carried.inventory.items.healing_powder, 2, 'existing consumable count was not preserved');
assert.equal(carried.inventory.items.legacy_token, 4, 'unknown existing item was dropped during normalize');
assert.equal(carried.inventory.equipment.weapon, 'legacy_blade', 'weapon slot was not preserved');
assert.equal(carried.inventory.equipment.armor, null, 'armor slot baseline changed');
assert.equal(carried.inventory.equipment.accessory, 'legacy_charm', 'accessory slot was not preserved');

// saveState 也必须经过同一套 normalize，并安全持久化 inventory。
const saved = saveState({
  ...base,
  inventory: {
    items: {
      healing_powder: 1,
      old_coin: 1,
      cloth_bracer: 1,
      saved_token: 3
    },
    equipment: {
      weapon: 'saved_blade',
      armor: null,
      accessory: null
    }
  }
});
assert.equal(saved.inventory.items.saved_token, 3, 'save normalize dropped an existing item');
assert.equal(saved.inventory.equipment.weapon, 'saved_blade', 'save normalize dropped equipped weapon id');
const persisted = JSON.parse(storage.get('buliangren_jianghuxing_save_v2'));
assert.equal(persisted.inventory.items.saved_token, 3, 'persisted save lost inventory data');
assert.equal(persisted.inventory.equipment.weapon, 'saved_blade', 'persisted save lost equipment data');

// hasItem 必须按真实数量与要求数量判断。
assert.equal(checkCondition({ type: 'hasItem', item: 'healing_powder' }, base), true, 'hasItem should pass for owned item');
assert.equal(checkCondition({ type: 'hasItem', item: 'healing_powder', count: 3 }, base), true, 'hasItem should pass at exact count');
assert.equal(checkCondition({ type: 'hasItem', item: 'healing_powder', count: 4 }, base), false, 'hasItem should fail above owned count');
assert.equal(checkCondition({ type: 'hasItem', item: 'missing_item' }, base), false, 'hasItem should fail for missing item');

// 非法负数物品必须在 normalize 时归零，且不能满足 hasItem。
const negative = migrateSave({
  ...base,
  inventory: {
    items: {
      healing_powder: -5,
      old_coin: 1,
      cloth_bracer: 1,
      broken_count: -9
    },
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    }
  }
});
assert.equal(negative.inventory.items.healing_powder, 0, 'negative existing item count was not clamped to zero');
assert.equal(negative.inventory.items.broken_count, 0, 'negative custom item count was not clamped to zero');
assert.equal(checkCondition({ type: 'hasItem', item: 'healing_powder' }, negative), false, 'zero-count item incorrectly satisfied hasItem');

// 阶段 B：统一物品目录必须使用稳定 item id，且 State 已有三件物品都能解析。
for (const [id, item] of Object.entries(ITEM_CATALOG)) {
  assert.equal(item.id, id, `catalog key/id mismatch for ${id}`);
  assert.ok(item.name, `item name missing for ${id}`);
  assert.ok(item.category, `item category missing for ${id}`);
  assert.ok(item.description, `item description missing for ${id}`);
  assert.equal(typeof item.stackable, 'boolean', `stackable flag missing for ${id}`);
}
for (const id of Object.keys(base.inventory.items)) {
  assert.ok(getItem(id), `default inventory item ${id} is missing from item catalog`);
}
assert.equal(getItem('missing_item'), null, 'unknown item id should resolve to null');

// 七类物品语义先固定枚举，具体秘籍/残卷等玩法留到阶段 G。
assert.deepEqual(Object.values(ITEM_CATEGORIES), [
  'equipment', 'consumable', 'manual', 'fragment', 'quest', 'treasure', 'material'
], 'item category enum changed unexpectedly');

// 现有物品必须具备与其类型相符的最小数据。
const powder = getItem('healing_powder');
assert.equal(powder.category, 'consumable', 'healing powder category changed');
assert.ok(powder.useContext.includes('field') && powder.useContext.includes('battle'), 'consumable use contexts missing');
assert.ok(Array.isArray(powder.effects) && powder.effects.length > 0, 'consumable effects missing');
assert.equal(Object.hasOwn(powder, 'count'), false, 'catalog must not store current player-owned count');

const coin = getItem('old_coin');
assert.equal(coin.category, 'quest', 'old coin should be a quest item');
assert.equal(coin.unique, true, 'old coin unique flag missing');

const bracer = getItem('cloth_bracer');
assert.equal(bracer.category, 'equipment', 'cloth bracer should be equipment');
assert.equal(bracer.slot, 'accessory', 'cloth bracer slot changed');
assert.deepEqual(bracer.statModifiers, { defense: 2 }, 'cloth bracer stat modifiers changed');

// 阶段 C：行囊展示模型必须读取真实 State 数量，而不是 catalog 的默认展示数量。
const realInventoryState = migrateSave({
  ...base,
  inventory: {
    items: {
      healing_powder: 1,
      old_coin: 0,
      cloth_bracer: 1,
      legacy_token: 4
    },
    equipment: {
      weapon: null,
      armor: null,
      accessory: 'cloth_bracer'
    }
  }
});
const entries = getInventoryEntries(realInventoryState);
assert.equal(entries.length, 3, 'zero-count item should not appear in real inventory view');
assert.equal(entries.find(item => item.id === 'healing_powder')?.count, 1, 'inventory view ignored real consumable count');
assert.equal(entries.find(item => item.id === 'cloth_bracer')?.equippedSlot, 'accessory', 'inventory view did not expose equipped slot');
assert.equal(entries.find(item => item.id === 'legacy_token')?.count, 4, 'legacy unknown item was hidden from real inventory view');
assert.equal(entries.find(item => item.id === 'legacy_token')?.category, 'unknown', 'legacy unknown item fallback category missing');
assert.equal(getItemCategoryLabel('consumable'), '消耗品', 'category label mismatch');
assert.equal(getSlotLabel('accessory'), '饰品', 'slot label mismatch');
assert.equal(getUseContextLabel(powder), '可用于：战斗外、战斗中', 'use context label mismatch');
assert.equal(formatStatModifiers(bracer.statModifiers), '防御 +2', 'equipment stat text mismatch');

console.log('inventory smoke passed: baseline + catalog + real state-driven inventory view verified');
