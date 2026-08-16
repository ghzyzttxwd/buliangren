import { SKILLS } from './data.js';
import { buildPlayerCombatant, buildCompanionCombatant, buildEnemyCombatant } from './combatants.js';

const alive = unit => unit?.hp > 0;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const BASIC_ATTACK_QI_RECOVERY = 10;

function allUnits(battle) {
  return [...battle.allies, ...battle.enemies];
}

function teamFor(battle, actor) {
  return actor?.side === 'enemy' ? battle.enemies : battle.allies;
}

function opponentsFor(battle, actor) {
  return actor?.side === 'enemy' ? battle.allies : battle.enemies;
}

export function getRealmDelta(attacker, defender) {
  return (attacker?.realmOrder || 0) - (defender?.realmOrder || 0);
}

export function getRealmPressure(attacker, defender) {
  const delta = clamp(getRealmDelta(attacker, defender), -5, 5);
  const damageMultiplier = 1 + Math.max(0, delta) * 0.06;
  const mitigationMultiplier = 1 - Math.max(0, -delta) * 0.05;
  return {
    delta,
    damageMultiplier: Math.min(1.3, damageMultiplier),
    mitigationMultiplier: Math.max(0.75, mitigationMultiplier)
  };
}

export function getControlResistance(unit) {
  return Math.min(0.45, Math.max(0, unit?.realmOrder || 0) * 0.06);
}

export function getInitiative(unit) {
  return (unit?.speed || 0) + Math.max(0, unit?.realmOrder || 0) * 0.6;
}

function compareTurnOrder(a, b) {
  const initiativeDiff = getInitiative(b) - getInitiative(a);
  if (Math.abs(initiativeDiff) > 0.0001) return initiativeDiff;
  if (a.side !== b.side) return a.side === 'ally' ? -1 : 1;
  return (a._battleOrder || 0) - (b._battleOrder || 0);
}

function rebuildTurnOrder(battle) {
  battle.turnOrder = allUnits(battle).filter(alive).sort(compareTurnOrder);
  battle.turnIndex = 0;
  syncAllyIndex(battle);
  return battle;
}

function syncAllyIndex(battle) {
  const actor = getCurrentActor(battle);
  battle.allyIndex = actor?.side === 'ally' ? battle.allies.indexOf(actor) : -1;
}

export function getCurrentActor(battle) {
  if (!battle || battle.status !== 'active') return null;
  return battle.turnOrder?.[battle.turnIndex] || null;
}

export function getSkillQiCost(skillId) {
  const cost = SKILLS[skillId]?.qiCost;
  return Number.isFinite(cost) ? Math.max(0, Math.round(cost)) : 0;
}

export function canUseSkill(actor, skillId) {
  if (!actor || !alive(actor)) return false;
  if (!actor.skills?.includes(skillId) || !SKILLS[skillId]) return false;
  return (actor.qi ?? 0) >= getSkillQiCost(skillId);
}

export function createBattle(enemyIds, partyIds, martialArts = {}, state = null) {
  const allies = partyIds
    .map(id => id === 'player'
      ? buildPlayerCombatant(state, martialArts)
      : buildCompanionCombatant(id, state))
    .filter(Boolean)
    .map((unit, index) => ({ ...unit, controlResistance: getControlResistance(unit), _battleOrder: index }));
  const enemies = enemyIds
    .map((id, i) => buildEnemyCombatant(id, i, state))
    .filter(Boolean)
    .map((unit, index) => ({ ...unit, controlResistance: getControlResistance(unit), _battleOrder: allies.length + index }));

  const battle = {
    allies,
    enemies,
    allyIndex: 0,
    turnOrder: [],
    turnIndex: 0,
    round: 1,
    log: ['战斗开始。'],
    status: 'active'
  };

  rebuildTurnOrder(battle);
  return resolveEnemyTurns(battle);
}

export function calculateDamage(attacker, defender, power = 1, variance = null) {
  const rolledVariance = Number.isFinite(variance) ? variance : .92 + Math.random() * .16;
  const baseRaw = attacker.attack * power * rolledVariance - defender.defense * .55;
  const pressure = getRealmPressure(attacker, defender);
  const scaled = baseRaw * pressure.damageMultiplier * pressure.mitigationMultiplier;
  return Math.max(1, Math.round(scaled));
}

function realmPressureNote(attacker, defender) {
  const delta = getRealmDelta(attacker, defender);
  if (delta >= 2) return '，境界压制生效';
  if (delta <= -2) return '，受到境界压制';
  return '';
}

function lowestHpUnit(units) {
  return [...units]
    .filter(alive)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
}

function firstAlive(units) {
  return units.find(alive);
}

function finish(battle, status) {
  battle.status = status;
  battle.allyIndex = -1;
  battle.log.push(status === 'win' ? '敌人已尽数败退。' : '你眼前一黑，只得暂避锋芒。');
  return battle;
}

function checkBattleEnd(battle) {
  if (!battle.enemies.some(alive)) return finish(battle, 'win');
  if (!battle.allies.some(alive)) return finish(battle, 'lose');
  return battle;
}

function restoreQi(actor, amount = BASIC_ATTACK_QI_RECOVERY) {
  if (!actor || !Number.isFinite(actor.maxQi)) return 0;
  const before = Number.isFinite(actor.qi) ? actor.qi : 0;
  actor.qi = Math.min(actor.maxQi, before + Math.max(0, amount));
  return actor.qi - before;
}

function applyBasicAttack(battle, actor) {
  if (!actor || !alive(actor)) return battle;
  const targets = opponentsFor(battle, actor).filter(alive);
  const target = actor.side === 'ally' ? firstAlive(targets) : pick(targets);
  if (!target) return checkBattleEnd(battle);

  const amount = calculateDamage(actor, target, 1);
  target.hp = Math.max(0, target.hp - amount);
  const recovered = restoreQi(actor);
  battle.log.push(`${actor.name}普通攻击${target.name}，造成 ${amount} 点伤害${realmPressureNote(actor, target)}${recovered > 0 ? `，回复 ${recovered} 点内力` : ''}。`);
  if (!alive(target)) {
    battle.log.push(actor.side === 'ally' ? `${target.name}倒下了。` : `${target.name}暂时失去战斗能力。`);
  }
  return checkBattleEnd(battle);
}

function applySkillAction(battle, actor, skillId) {
  const skill = SKILLS[skillId];
  if (!skill || !actor?.skills?.includes(skillId)) return battle;

  const qiCost = getSkillQiCost(skillId);
  if (!canUseSkill(actor, skillId)) return battle;
  actor.qi = Math.max(0, (actor.qi ?? 0) - qiCost);

  if (skill.heal) {
    const target = lowestHpUnit(teamFor(battle, actor));
    if (!target) return battle;
    const amount = Math.max(1, Math.round(target.maxHp * skill.heal));
    const actual = Math.min(amount, target.maxHp - target.hp);
    target.hp += actual;
    battle.log.push(`${actor.name}施展【${skill.name}】，消耗 ${qiCost} 内力，${target.name}恢复 ${actual} 点气血。`);
  } else {
    const targets = opponentsFor(battle, actor).filter(alive);
    const target = actor.side === 'ally' ? firstAlive(targets) : pick(targets);
    if (!target) return checkBattleEnd(battle);
    const amount = calculateDamage(actor, target, skill.power || 1);
    target.hp = Math.max(0, target.hp - amount);
    battle.log.push(`${actor.name}施展【${skill.name}】，消耗 ${qiCost} 内力，对${target.name}造成 ${amount} 点伤害${realmPressureNote(actor, target)}。`);
    if (!alive(target)) {
      battle.log.push(actor.side === 'ally' ? `${target.name}倒下了。` : `${target.name}暂时失去战斗能力。`);
    }
  }

  return checkBattleEnd(battle);
}

function chooseEnemyAction(battle, actor) {
  const profile = actor.aiProfile || {};
  const usable = (actor.skills || []).filter(skillId => canUseSkill(actor, skillId));
  const healingSkills = usable.filter(skillId => SKILLS[skillId]?.heal);
  const offensiveSkills = usable.filter(skillId => !SKILLS[skillId]?.heal);
  const lowest = lowestHpUnit(teamFor(battle, actor));
  const healThreshold = Number.isFinite(profile.healThreshold) ? profile.healThreshold : 0.35;

  if (healingSkills.length && lowest && lowest.hp / lowest.maxHp <= healThreshold) {
    return { type: 'skill', skillId: healingSkills[0] };
  }

  const skillChance = Number.isFinite(profile.skillChance) ? profile.skillChance : 0.5;
  if (offensiveSkills.length && Math.random() < skillChance) {
    return { type: 'skill', skillId: pick(offensiveSkills) };
  }

  return { type: 'basic' };
}

function advanceTurnPointer(battle) {
  if (battle.status !== 'active') return battle;
  battle.turnIndex += 1;

  while (battle.status === 'active') {
    while (battle.turnIndex < battle.turnOrder.length && !alive(battle.turnOrder[battle.turnIndex])) {
      battle.turnIndex += 1;
    }
    if (battle.turnIndex < battle.turnOrder.length) break;

    battle.round += 1;
    rebuildTurnOrder(battle);
    if (!battle.turnOrder.length) return checkBattleEnd(battle);
    break;
  }

  syncAllyIndex(battle);
  return battle;
}

function resolveEnemyTurns(battle) {
  while (battle.status === 'active') {
    const actor = getCurrentActor(battle);
    if (!actor) {
      checkBattleEnd(battle);
      if (battle.status !== 'active') return battle;
      rebuildTurnOrder(battle);
      continue;
    }
    if (actor.side === 'ally') {
      syncAllyIndex(battle);
      return battle;
    }

    const action = chooseEnemyAction(battle, actor);
    if (action.type === 'skill') applySkillAction(battle, actor, action.skillId);
    else applyBasicAttack(battle, actor);

    if (battle.status !== 'active') return battle;
    advanceTurnPointer(battle);
  }
  return battle;
}

function finishAllyAction(battle) {
  if (battle.status !== 'active') return battle;
  advanceTurnPointer(battle);
  return resolveEnemyTurns(battle);
}

export function basicAttack(battle) {
  if (battle?.status !== 'active') return battle;
  const actor = getCurrentActor(battle);
  if (!actor || actor.side !== 'ally' || !alive(actor)) return battle;

  applyBasicAttack(battle, actor);
  if (battle.status !== 'active') return battle;
  return finishAllyAction(battle);
}

export function useSkill(battle, skillId) {
  if (battle?.status !== 'active') return battle;
  const actor = getCurrentActor(battle);
  if (!actor || actor.side !== 'ally' || !alive(actor)) return battle;
  const skill = SKILLS[skillId];
  if (!skill || !actor.skills.includes(skillId)) return battle;

  if (!canUseSkill(actor, skillId)) {
    battle.log.push(`${actor.name}内力不足，无法施展【${skill.name}】。`);
    return battle;
  }

  applySkillAction(battle, actor, skillId);
  if (battle.status !== 'active') return battle;
  return finishAllyAction(battle);
}
