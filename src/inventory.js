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
  return Object.keys(SLOT_LABELS).find(slot => equipment[slot] === itemId) || null;
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
