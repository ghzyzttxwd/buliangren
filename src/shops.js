import { ITEM_CATALOG } from './data.js';

export const MERCHANTS = Object.freeze({
  yuzhou_apothecary: Object.freeze({
    id: 'yuzhou_apothecary',
    name: '渝州药摊',
    location: 'yuzhou',
    description: '城门附近的小药摊，只卖些寻常江湖伤药。',
    items: Object.freeze([
      Object.freeze({ itemId: 'healing_powder', price: 24 })
    ])
  })
});

export function getMerchant(merchantId, merchantCatalog = MERCHANTS) {
  return merchantCatalog?.[merchantId] || null;
}

export function getMerchantItems(merchantId, itemCatalog = ITEM_CATALOG, merchantCatalog = MERCHANTS) {
  const merchant = getMerchant(merchantId, merchantCatalog);
  if (!merchant) return [];
  return merchant.items
    .map(listing => {
      const item = itemCatalog?.[listing.itemId];
      if (!item) return null;
      const price = Number.isFinite(listing.price) ? Math.max(0, Math.round(listing.price)) : Math.max(0, Math.round(item.price || 0));
      return { ...listing, item, price };
    })
    .filter(Boolean);
}

export function canPurchaseItem(state, merchantId, itemId, quantity = 1, itemCatalog = ITEM_CATALOG, merchantCatalog = MERCHANTS) {
  const merchant = getMerchant(merchantId, merchantCatalog);
  if (!merchant) return { ok: false, reason: 'merchant_missing' };

  const listing = merchant.items.find(entry => entry.itemId === itemId);
  if (!listing) return { ok: false, reason: 'not_sold_here', merchant };

  const item = itemCatalog?.[itemId];
  if (!item) return { ok: false, reason: 'item_missing', merchant };
  if (item.category === 'quest') return { ok: false, reason: 'restricted_item', merchant, item };
  if (item.category === 'treasure' && item.unique === true) return { ok: false, reason: 'restricted_item', merchant, item };

  const count = Math.max(1, Math.floor(Number.isFinite(quantity) ? quantity : 1));
  const unitPrice = Number.isFinite(listing.price) ? Math.max(0, Math.round(listing.price)) : Math.max(0, Math.round(item.price || 0));
  const totalPrice = unitPrice * count;
  const silver = Number.isFinite(state?.player?.silver) ? Math.max(0, state.player.silver) : 0;

  if (silver < totalPrice) {
    return { ok: false, reason: 'insufficient_silver', merchant, item, count, unitPrice, totalPrice, silver };
  }

  return { ok: true, merchant, item, itemId, count, unitPrice, totalPrice, silver };
}

export function purchaseItem(state, merchantId, itemId, quantity = 1, itemCatalog = ITEM_CATALOG, merchantCatalog = MERCHANTS) {
  const check = canPurchaseItem(state, merchantId, itemId, quantity, itemCatalog, merchantCatalog);
  if (!check.ok) return check;

  if (!state.inventory || typeof state.inventory !== 'object') state.inventory = { items: {}, equipment: {} };
  if (!state.inventory.items || typeof state.inventory.items !== 'object') state.inventory.items = {};

  const before = Number.isFinite(state.inventory.items[itemId]) ? Math.max(0, state.inventory.items[itemId]) : 0;
  state.player.silver = Math.max(0, check.silver - check.totalPrice);
  state.inventory.items[itemId] = before + check.count;

  return {
    ok: true,
    merchant: check.merchant,
    item: check.item,
    itemId,
    count: check.count,
    unitPrice: check.unitPrice,
    totalPrice: check.totalPrice,
    remainingSilver: state.player.silver,
    newCount: state.inventory.items[itemId]
  };
}
