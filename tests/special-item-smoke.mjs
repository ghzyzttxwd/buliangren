import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { checkCondition } from '../src/conditions.js';
import { SKILLS } from '../src/data.js';
import {
  canUseManualItem,
  useManualItem,
  isItemSellable,
  getSpecialItemSemantic,
  getInventoryEntries
} from '../src/inventory.js';

const catalog = {
  sword_manual: {
    id: 'sword_manual', name: '折风剑式秘本', category: 'manual', description: '测试秘籍', stackable: false,
    learnMartialArt: 'folding_wind_sword', realmRequirement: 'middle_star', consumeOnUse: true
  },
  sword_fragment: {
    id: 'sword_fragment', name: '无名剑谱残页', category: 'fragment', description: '测试残卷', stackable: true
  },
  story_token: {
    id: 'story_token', name: '剧情信物', category: 'quest', description: '测试剧情物', stackable: false, unique: true
  },
  odd_treasure: {
    id: 'odd_treasure', name: '异宝', category: 'treasure', description: '测试宝物', stackable: false,
    specialEffects: [{ type: 'future_hook', value: 1 }]
  },
  iron_scrap: {
    id: 'iron_scrap', name: '铁料', category: 'material', description: '测试材料', stackable: true
  }
};

function stageState(realm = 'unranked') {
  const state = defaultState();
  state.player.realm = realm;
  state.inventory.items = {
    sword_manual: 1,
    sword_fragment: 2,
    story_token: 1,
    odd_treasure: 1,
    iron_scrap: 3
  };
  state.inventory.equipment = { weapon: null, armor: null, accessory: null };
  delete state.martialArts.folding_wind_sword;
  return state;
}

// manual：境界门槛、学习目标与 consumeOnUse 必须真实生效。
const lowRealm = stageState('small_star');
let manual = canUseManualItem(lowRealm, 'sword_manual', catalog, SKILLS);
assert.equal(manual.ok, false, 'manual ignored realm requirement');
assert.equal(manual.reason, 'realm_requirement', 'manual realm rejection reason mismatch');
assert.equal(lowRealm.inventory.items.sword_manual, 1, 'failed manual use consumed item');

const ready = stageState('middle_star');
manual = useManualItem(ready, 'sword_manual', catalog, SKILLS);
assert.equal(manual.ok, true, 'valid manual could not be studied');
assert.equal(ready.martialArts.folding_wind_sword?.learned, true, 'manual did not learn configured martial art');
assert.equal(ready.martialArts.folding_wind_sword?.mastery, 1, 'learned martial art mastery baseline mismatch');
assert.equal(ready.inventory.items.sword_manual, 0, 'consumeOnUse manual did not reduce inventory');
assert.equal(useManualItem(ready, 'sword_manual', catalog, SKILLS).ok, false, 'empty manual was reused');

const alreadyKnown = stageState('middle_star');
alreadyKnown.martialArts.folding_wind_sword = { learned: true, mastery: 2, exp: 0 };
manual = useManualItem(alreadyKnown, 'sword_manual', catalog, SKILLS);
assert.equal(manual.ok, false, 'already learned manual was consumed again');
assert.equal(manual.reason, 'already_learned', 'already learned rejection reason mismatch');
assert.equal(alreadyKnown.inventory.items.sword_manual, 1, 'already learned manual changed inventory');

// fragment：沿用稳定 hasItem 数量条件，可直接作为事件收集门槛，不做复杂合成树。
const fragmentState = stageState('middle_star');
assert.equal(checkCondition({ type: 'hasItem', item: 'sword_fragment', count: 2 }, fragmentState), true, 'fragment count could not satisfy event condition');
assert.equal(checkCondition({ type: 'hasItem', item: 'sword_fragment', count: 3 }, fragmentState), false, 'fragment collection target ignored quantity');
assert.equal(getSpecialItemSemantic(catalog.sword_fragment)?.kind, 'fragment', 'fragment semantic missing');

// quest：默认不可直接使用 / 出售。
const questSemantic = getSpecialItemSemantic(catalog.story_token);
assert.equal(questSemantic?.usable, false, 'quest item was marked usable');
assert.equal(questSemantic?.sellable, false, 'quest item was marked sellable');
assert.equal(isItemSellable(catalog.story_token), false, 'quest item sell policy mismatch');

// treasure：保留数据驱动独特效果接口；本阶段不要求执行复杂宝物效果。
const treasureSemantic = getSpecialItemSemantic(catalog.odd_treasure);
assert.equal(treasureSemantic?.kind, 'treasure', 'treasure semantic missing');
assert.ok(Array.isArray(catalog.odd_treasure.specialEffects), 'treasure special effect hook missing');

// material：只需正确分类与持有，不提前实现锻造。
const materialSemantic = getSpecialItemSemantic(catalog.iron_scrap);
assert.equal(materialSemantic?.kind, 'material', 'material semantic missing');
const entries = getInventoryEntries(fragmentState, catalog);
assert.equal(entries.find(item => item.id === 'iron_scrap')?.category, 'material', 'material inventory category missing');
assert.equal(entries.find(item => item.id === 'iron_scrap')?.count, 3, 'material ownership count mismatch');

console.log('special item smoke passed: manual + fragment + quest + treasure + material semantics verified');
