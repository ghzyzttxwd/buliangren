import assert from 'node:assert/strict';
import { defaultState, migrateSave, saveState } from '../src/state.js';
import { checkCondition } from '../src/conditions.js';

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

console.log('inventory smoke passed: default counts + equipment slots + normalize + hasItem + non-negative counts verified');
