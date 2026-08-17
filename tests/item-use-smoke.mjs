import assert from 'node:assert/strict';
import { defaultState, migrateSave, saveState } from '../src/state.js';
import { getItem } from '../src/data.js';
import { createBattle, getCurrentActor, useBattleItem } from '../src/battle.js';
import {
  canUseConsumableItem,
  useConsumableItem,
  formatItemUseChanges
} from '../src/inventory.js';

const storage = new Map();
globalThis.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};

const powder = getItem('healing_powder');
assert.ok(powder.useContext.includes('field'), 'healing powder lost field use context');
assert.ok(powder.useContext.includes('battle'), 'healing powder lost battle use context');
assert.ok(powder.effects.some(effect => effect.type === 'restoreStamina' && effect.contexts?.includes('field')), 'field stamina effect missing');
assert.ok(powder.effects.some(effect => effect.type === 'restoreHpRatio' && effect.contexts?.includes('battle')), 'battle HP effect missing');

// 阶段 F：战斗外使用必须产生通用 effect、数量 -1，并能正常保存。
const fieldState = migrateSave(defaultState());
fieldState.player.stamina = 20;
fieldState.inventory.items.healing_powder = 2;

const fieldCheck = canUseConsumableItem(fieldState, 'healing_powder', 'field');
assert.equal(fieldCheck.ok, true, 'field consumable should be usable when stamina is missing');
const fieldResult = useConsumableItem(fieldState, 'healing_powder', 'field');
assert.equal(fieldResult.ok, true, 'field consumable use failed');
assert.equal(fieldState.player.stamina, 30, 'field consumable did not restore stamina');
assert.equal(fieldState.inventory.items.healing_powder, 1, 'field consumable did not decrement inventory');
assert.equal(formatItemUseChanges(fieldResult.changes), '体力 +10', 'field effect summary mismatch');

const persistedField = saveState(fieldState);
assert.equal(persistedField.inventory.items.healing_powder, 1, 'saved field use lost remaining item count');
assert.equal(persistedField.player.stamina, 30, 'saved field use lost restored stamina');

// 满资源时不能白白吃药，也不能扣数量。
persistedField.player.stamina = persistedField.player.maxStamina;
const beforeFullFieldCount = persistedField.inventory.items.healing_powder;
const fullFieldResult = useConsumableItem(persistedField, 'healing_powder', 'field');
assert.equal(fullFieldResult.ok, false, 'full field resource incorrectly consumed item');
assert.equal(fullFieldResult.reason, 'no_effect', 'full field resource rejection reason mismatch');
assert.equal(persistedField.inventory.items.healing_powder, beforeFullFieldCount, 'no-effect field use decremented inventory');

// 数量为 0 时不能使用，也不能出现负数。
persistedField.inventory.items.healing_powder = 0;
const emptyFieldResult = useConsumableItem(persistedField, 'healing_powder', 'field');
assert.equal(emptyFieldResult.ok, false, 'zero-count field consumable was usable');
assert.equal(emptyFieldResult.reason, 'empty', 'zero-count field rejection reason mismatch');
assert.equal(persistedField.inventory.items.healing_powder, 0, 'zero-count field consumable became negative');

// 战斗内：物品恢复当前行动角色气血、扣真实库存，并占用一次行动。
const battleState = migrateSave(defaultState());
battleState.party = ['player'];
battleState.inventory.items.healing_powder = 2;
let battle = createBattle(['scout'], battleState.party, battleState.martialArts, battleState);
let actor = getCurrentActor(battle);
assert.equal(actor?.id, 'player', 'battle item fixture did not stop on player turn');
actor.hp = Math.max(1, actor.hp - 50);
const damagedHp = actor.hp;
const itemRound = battle.round;

const battleUse = useBattleItem(battle, battleState, 'healing_powder');
assert.equal(battleUse.result.ok, true, 'battle consumable use failed');
battle = battleUse.battle;
assert.equal(battleState.inventory.items.healing_powder, 1, 'battle consumable did not decrement real inventory');
assert.ok(battle.allies[0].hp > damagedHp, 'battle consumable did not restore current actor HP');
assert.ok(battle.round > itemRound || getCurrentActor(battle) !== actor, 'battle consumable did not consume the current action');
assert.ok(battle.log.some(line => line.includes('使用【止血散】')), 'battle item use was not logged');

// 战斗中资源已满时不扣物品、不吃掉行动。
const fullBattleState = migrateSave(defaultState());
fullBattleState.party = ['player'];
fullBattleState.inventory.items.healing_powder = 1;
let fullBattle = createBattle(['scout'], fullBattleState.party, fullBattleState.martialArts, fullBattleState);
const fullActor = getCurrentActor(fullBattle);
const fullRound = fullBattle.round;
const fullBattleUse = useBattleItem(fullBattle, fullBattleState, 'healing_powder');
assert.equal(fullBattleUse.result.ok, false, 'full-HP battle actor incorrectly consumed item');
assert.equal(fullBattleUse.result.reason, 'no_effect', 'full-HP battle rejection reason mismatch');
assert.equal(fullBattleState.inventory.items.healing_powder, 1, 'full-HP battle use decremented inventory');
assert.equal(fullBattleUse.battle.round, fullRound, 'failed battle item use consumed an action');
assert.equal(getCurrentActor(fullBattleUse.battle), fullActor, 'failed battle item use changed current actor');

// 战斗中库存耗尽后不能无限继续使用。
const emptyBattleState = migrateSave(defaultState());
emptyBattleState.party = ['player'];
emptyBattleState.inventory.items.healing_powder = 0;
let emptyBattle = createBattle(['scout'], emptyBattleState.party, emptyBattleState.martialArts, emptyBattleState);
getCurrentActor(emptyBattle).hp -= 30;
const emptyRound = emptyBattle.round;
const emptyBattleUse = useBattleItem(emptyBattle, emptyBattleState, 'healing_powder');
assert.equal(emptyBattleUse.result.ok, false, 'zero-count battle consumable was usable');
assert.equal(emptyBattleUse.result.reason, 'empty', 'zero-count battle rejection reason mismatch');
assert.equal(emptyBattleState.inventory.items.healing_powder, 0, 'zero-count battle consumable became negative');
assert.equal(emptyBattleUse.battle.round, emptyRound, 'failed zero-count item use consumed an action');

console.log('item use smoke passed: field + battle consumables + depletion verified');
