import { CHARACTERS, ENEMIES, SKILLS } from './data.js';
import { getRealm } from './progression.js';

const clone = value => JSON.parse(JSON.stringify(value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const round1 = value => Math.round(value * 10) / 10;

function learnedPlayerSkills(martialArts = {}) {
  return Object.entries(martialArts)
    .filter(([id, art]) => art?.learned === true && SKILLS[id]?.playerLearnable === true)
    .map(([id]) => id);
}

function realmStats(realmId) {
  const realm = getRealm(realmId);
  return {
    realm: realm.id,
    realmOrder: realm.order,
    hpMultiplier: 1 + realm.order * 0.06,
    combatMultiplier: 1 + realm.order * 0.05,
    speedBonus: realm.order * 0.4,
    qiBonus: realm.order * 18
  };
}

export function buildPlayerCombatant(state = null, martialArts = {}) {
  const base = clone(CHARACTERS.player);
  const player = state?.player || {};
  const level = Math.max(1, Math.floor(finite(player.level, base.level || 1)));
  const levelDelta = Math.max(0, level - (base.level || 1));
  const realm = realmStats(player.realm || 'unranked');
  const learned = learnedPlayerSkills(martialArts);

  const baseHp = base.maxHp + levelDelta * 14;
  const baseAttack = base.attack + levelDelta * 2;
  const baseDefense = base.defense + levelDelta * 1.2;
  const baseSpeed = base.speed + levelDelta * 0.35;

  const maxHp = Math.round(baseHp * realm.hpMultiplier);
  const attack = Math.round(baseAttack * realm.combatMultiplier);
  const defense = Math.round(baseDefense * realm.combatMultiplier);
  const speed = round1(baseSpeed + realm.speedBonus);
  const maxQi = Math.round(60 + level * 4 + realm.qiBonus);

  return {
    ...base,
    level,
    realm: realm.realm,
    realmOrder: realm.realmOrder,
    maxHp,
    hp: maxHp,
    attack,
    defense,
    speed,
    maxQi,
    qi: maxQi,
    statuses: [],
    skills: [...new Set([...(base.skills || []), ...learned])],
    side: 'ally'
  };
}

export function buildCompanionCombatant(characterId, state = null) {
  const source = CHARACTERS[characterId];
  if (!source) return null;
  const base = clone(source);
  const realm = realmStats(base.realm || 'unranked');
  const level = Math.max(1, Math.floor(finite(base.level, 1)));
  const maxQi = Math.round(finite(base.maxQi, 60 + level * 4 + realm.qiBonus));

  return {
    ...base,
    realm: realm.realm,
    realmOrder: realm.realmOrder,
    maxQi,
    qi: maxQi,
    statuses: [],
    hp: base.maxHp,
    side: 'ally'
  };
}

export function buildEnemyCombatant(enemyId, index = 0, context = null) {
  const source = ENEMIES[enemyId];
  if (!source) return null;
  const base = clone(source);
  const realm = realmStats(base.realm || 'unranked');
  const level = Math.max(1, Math.floor(finite(base.level, 1)));
  const maxQi = Math.round(finite(base.maxQi, 40 + level * 3 + realm.qiBonus));

  return {
    ...base,
    uid: `${enemyId}_${index}`,
    realm: realm.realm,
    realmOrder: realm.realmOrder,
    maxQi,
    qi: maxQi,
    statuses: [],
    hp: base.maxHp,
    side: 'enemy'
  };
}
