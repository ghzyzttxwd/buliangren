// v0.5 阶段 I：装备与物品系统总回归入口。
// 按任务书将 A-H 的 inventory 相关验证统一收束到一个 CI smoke 中。

await import('./inventory-smoke.mjs');
await import('./item-use-smoke.mjs');
await import('./special-item-smoke.mjs');
await import('./shop-smoke.mjs');

console.log('v0.5 inventory regression passed: 18-point inventory/equipment/item/shop checklist covered');
