import { ITEM_CATALOG } from './data.js';

const CATEGORY_LABELS = Object.freeze({
  equipment: '装备',
  consumable: '消耗品',
  manual: '秘籍',
  fragment: '残卷',
  quest: '剧情道具',
  treasure: '宝物',
  material: '材料',
  unknown: '旧物品'
});

const SLOT_LABELS = Object.freeze({
  weapon: '武器',
  armor: '衣甲',
  accessory: '饰品'
});

const EQUIPMENT_SLOTS = Object.freeze(Object.keys(SLOT_LABELS));
const EQUIPMENT_STAT_KEYS = Object.freeze(['attack', 'defense', 'speed', 'maxHp', 'maxQi']);

const STAT_LABELS = Object.freeze({
  attack: '攻击',
  defense: '防御',
  speed: '速度',
  maxHp: '气血',
  maxQi: '内力'
});

const USE_CONTEXT_LABELS = Object.freeze({
  field: '战斗外',
  battle: '战斗中'
});

const ITEM_CHANGE_LABELS = Object.freeze({
  hp: '气血',
  qi: '内力',
  stamina: '体力'
});

export function getItemCategoryLabel(category) {
  return CATEGORY_LABELS[category] || CATEGORY_LABELS.unknown;
}

export function getSlotLabel(slot) {
  return SLOT_LABELS[slot] || slot || '未知部位';
}

export function getEquippedSlot(state, itemId) {
  const equipment = state?.inventory?.equipment || {};
  return EQUIPMENT_SLOTS.find(slot => equipment[slot] === itemId) || null;
}

export function equipItem(state, itemId, targetSlot = null) {
  const inventory = state?.inventory;
  if (!inventory?.items || !inventory?.equipment) return { ok: false, reason: 'invalid_state' };

  const item = ITEM_CATALOG[itemId];
  if (!item || item.category !== 'equipment') return { ok: false, reason: 'not_equipment' };

  const ownedCount = inventory.items[itemId];
  if (!Number.isFinite(ownedCount) || ownedCount <= 0) return { ok: false, reason: 'not_owned' };

  const slot = targetSlot || item.slot;
  if (!EQUIPMENT_SLOTS.includes(slot)) return { ok: false, reason: 'invalid_slot' };
  if (item.slot !== slot) return { ok: false, reason: 'slot_mismatch' };

  const replacedItemId = inventory.equipment[slot] || null;
  inventory.equipment[slot] = itemId;
  return { ok: true, item, itemId, slot, replacedItemId };
}

export function unequipItem(state, slot) {
  const equipment = state?.inventory?.equipment;
  if (!equipment || !EQUIPMENT_SLOTS.includes(slot)) return { ok: false, reason: 'invalid_slot' };

  const itemId = equipment[slot];
  if (!itemId) return { ok: false, reason: 'empty_slot' };

  equipment[slot] = null;
  return { ok: true, itemId, item: ITEM_CATALOG[itemId] || null, slot };
}

export function getEquipmentStatModifiers(state, itemCatalog = ITEM_CATALOG) {
  const inventory = state?.inventory;
  const equipment = inventory?.equipment || {};
  const items = inventory?.items || {};
  const totals = Object.fromEntries(EQUIPMENT_STAT_KEYS.map(key => [key, 0]));

  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = equipment[slot];
    if (!itemId || !Number.isFinite(items[itemId]) || items[itemId] <= 0) continue;

    const item = itemCatalog?.[itemId];
    if (!item || item.category !== 'equipment' || item.slot !== slot) continue;

    for (const key of EQUIPMENT_STAT_KEYS) {
      const value = item.statModifiers?.[key];
      if (Number.isFinite(value)) totals[key] += value;
    }
  }

  return totals;
}

function contextEffects(item, context) {
  return (Array.isArray(item?.effects) ? item.effects : []).filter(effect => {
    return !Array.isArray(effect.contexts) || effect.contexts.includes(context);
  });
}

function previewEffect(effect, state, target) {
  if (!effect || typeof effect.type !== 'string') return false;

  if (effect.type === 'restoreHpRatio') {
    return Boolean(target && Number.isFinite(target.hp) && Number.isFinite(target.maxHp) && target.maxHp > 0 && target.hp < target.maxHp);
  }

  if (effect.type === 'restoreQiRatio') {
    return Boolean(target && Number.isFinite(target.qi) && Number.isFinite(target.maxQi) && target.maxQi > 0 && target.qi < target.maxQi);
  }

  if (effect.type === 'restoreStamina') {
    const player = state?.player;
    return Boolean(player && Number.isFinite(player.stamina) && Number.isFinite(player.maxStamina) && player.stamina < player.maxStamina);
  }

  return false;
}

function applyEffect(effect, state, target) {
  if (effect.type === 'restoreHpRatio') {
    const maxHp = Math.max(1, target.maxHp);
    const amount = Math.max(1, Math.round(maxHp * Math.max(0, effect.value || 0)));
    const actual = Math.min(amount, Math.max(0, maxHp - target.hp));
    target.hp += actual;
    return actual > 0 ? { type: 'hp', amount: actual } : null;
  }

  if (effect.type === 'restoreQiRatio') {
    const maxQi = Math.max(0, target.maxQi);
    const amount = Math.max(1, Math.round(maxQi * Math.max(0, effect.value || 0)));
    const actual = Math.min(amount, Math.max(0, maxQi - target.qi));
    target.qi += actual;
    return actual > 0 ? { type: 'qi', amount: actual } : null;
  }

  if (effect.type === 'restoreStamina') {
    const player = state.player;
    const amount = Math.max(0, Math.round(effect.value || 0));
    const actual = Math.min(amount, Math.max(0, player.maxStamina - player.stamina));
    player.stamina += actual;
    return actual > 0 ? { type: 'stamina', amount: actual } : null;
  }

  return null;
}

export function canUseConsumableItem(state, itemId, context, target = null) {
  const inventory = state?.inventory;
  if (!inventory?.items) return { ok: false, reason: 'invalid_state' };

  const item = ITEM_CATALOG[itemId];
  if (!item || item.category !== 'consumable') return { ok: false, reason: 'not_consumable' };

  const count = inventory.items[itemId];
  if (!Number.isFinite(count) || count <= 0) return { ok: false, reason: 'empty' };

  if (!Array.isArray(item.useContext) || !item.useContext.includes(context)) {
    return { ok: false, reason: 'wrong_context', item, count };
  }

  const effects = contextEffects(item, context);
  if (!effects.length) return { ok: false, reason: 'no_effect', item, count };
  if (!effects.some(effect => previewEffect(effect, state, target))) {
    return { ok: false, reason: 'no_effect', item, count, effects };
  }

  return { ok: true, item, itemId, context, count, effects };
}

export function useConsumableItem(state, itemId, context, target = null) {
  const check = canUseConsumableItem(state, itemId, context, target);
  if (!check.ok) return check;

  const changes = check.effects
    .map(effect => applyEffect(effect, state, target))
    .filter(Boolean);

  if (!changes.length) return { ...check, ok: false, reason: 'no_effect' };

  const before = state.inventory.items[itemId];
  state.inventory.items[itemId] = Math.max(0, before - 1);

  return {
    ok: true,
    item: check.item,
    itemId,
    context,
    changes,
    remaining: state.inventory.items[itemId]
  };
}

export function formatItemUseChanges(changes = []) {
  return changes
    .filter(change => Number.isFinite(change?.amount) && change.amount > 0)
    .map(change => `${ITEM_CHANGE_LABELS[change.type] || change.type} +${change.amount}`)
    .join(' · ');
}

export function formatStatModifiers(modifiers = {}) {
  return Object.entries(modifiers)
    .filter(([, value]) => Number.isFinite(value) && value !== 0)
    .map(([key, value]) => `${STAT_LABELS[key] || key} ${value > 0 ? '+' : ''}${value}`)
    .join(' · ');
}

export function getUseContextLabel(item = {}) {
  if (!Array.isArray(item.useContext) || !item.useContext.length) return '';
  const contexts = item.useContext.map(id => USE_CONTEXT_LABELS[id] || id).join('、');
  return `可用于：${contexts}`;
}

export function getInventoryEntries(state) {
  const counts = state?.inventory?.items || {};
  return Object.entries(counts)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .map(([id, count]) => {
      const definition = ITEM_CATALOG[id] || {
        id,
        name: id,
        category: 'unknown',
        description: '旧存档中保留的未登记物品。当前不会自动丢弃。',
        stackable: true
      };
      return {
        ...definition,
        count,
        equippedSlot: getEquippedSlot(state, id)
      };
    });
}
