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
