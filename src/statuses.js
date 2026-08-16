const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function statusList(unit) {
  if (!Array.isArray(unit.statuses)) unit.statuses = [];
  return unit.statuses;
}

function sourceId(source) {
  return source?.uid || source?.id || source?.name || 'unknown';
}

export function getStatus(unit, statusId) {
  return statusList(unit).find(status => status.id === statusId) || null;
}

export function getControlStatus(unit) {
  return statusList(unit).find(status => status.type === 'control' && status.duration > 0) || null;
}

export function applyStatus(target, effect = {}, source = null, random = Math.random) {
  if (!target || target.hp <= 0 || !effect.id || !effect.type) return { applied: false, reason: 'invalid' };

  const baseChance = Number.isFinite(effect.chance) ? clamp(effect.chance, 0, 1) : 1;
  const resistance = effect.type === 'control' ? clamp(target.controlResistance || 0, 0, 0.9) : 0;
  const effectiveChance = baseChance * (1 - resistance);
  if (random() >= effectiveChance) return { applied: false, reason: 'resisted', effectiveChance };

  const list = statusList(target);
  const existing = list.find(status => status.id === effect.id);
  const duration = Math.max(1, Math.round(effect.duration || 1));
  const maxStacks = Math.max(1, Math.round(effect.maxStacks || 1));
  const amount = Number.isFinite(effect.amount)
    ? Math.max(0, Math.round(effect.amount))
    : Number.isFinite(effect.amountRatio)
      ? Math.max(1, Math.round((target.maxHp || 1) * effect.amountRatio))
      : 0;

  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
    existing.source = sourceId(source);
    if (effect.type === 'poison') {
      existing.stacks = Math.min(maxStacks, (existing.stacks || 1) + 1);
      existing.potency = Math.max(existing.potency || 0, effect.potency || 0.04);
    }
    if (effect.type === 'shield') {
      const cap = Math.max(1, Math.round((target.maxHp || 1) * 0.5));
      existing.amount = Math.min(cap, Math.max(0, existing.amount || 0) + amount);
    }
    return { applied: true, refreshed: true, status: existing, effectiveChance };
  }

  const status = {
    id: effect.id,
    name: effect.name || effect.id,
    type: effect.type,
    duration,
    source: sourceId(source),
    stacks: 1
  };
  if (effect.type === 'poison') status.potency = effect.potency || 0.04;
  if (effect.type === 'shield') status.amount = amount;
  list.push(status);
  return { applied: true, refreshed: false, status, effectiveChance };
}

export function absorbShield(target, incomingDamage) {
  let remaining = Math.max(0, Math.round(incomingDamage || 0));
  let absorbed = 0;
  const shields = statusList(target).filter(status => status.type === 'shield' && status.amount > 0 && status.duration > 0);

  for (const shield of shields) {
    if (remaining <= 0) break;
    const blocked = Math.min(remaining, shield.amount);
    shield.amount -= blocked;
    remaining -= blocked;
    absorbed += blocked;
  }

  target.statuses = statusList(target).filter(status => !(status.type === 'shield' && status.amount <= 0));
  return { hpDamage: remaining, absorbed };
}

export function resolveTurnEndStatuses(unit) {
  if (!unit || unit.hp <= 0) return { poisonDamage: 0, expired: [] };

  const list = statusList(unit);
  let poisonDamage = 0;
  for (const status of list) {
    if (status.type !== 'poison' || status.duration <= 0) continue;
    const perStack = Math.max(1, Math.round((unit.maxHp || 1) * (status.potency || 0.04)));
    poisonDamage += perStack * Math.max(1, status.stacks || 1);
  }

  if (poisonDamage > 0) unit.hp = Math.max(0, unit.hp - poisonDamage);

  const expired = [];
  for (const status of list) {
    status.duration -= 1;
    if (status.duration <= 0) expired.push(status.name);
  }
  unit.statuses = list.filter(status => status.duration > 0 && !(status.type === 'shield' && status.amount <= 0));

  return { poisonDamage, expired };
}
