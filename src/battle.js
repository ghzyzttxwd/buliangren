import { SKILLS } from './data.js';
import { buildPlayerCombatant, buildCompanionCombatant, buildEnemyCombatant } from './combatants.js';

const alive = (x) => x.hp > 0;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function createBattle(enemyIds, partyIds, martialArts = {}, state = null) {
  const allies = partyIds
    .map(id => id === 'player'
      ? buildPlayerCombatant(state, martialArts)
      : buildCompanionCombatant(id, state))
    .filter(Boolean);
  const enemies = enemyIds
    .map((id, i) => buildEnemyCombatant(id, i, state))
    .filter(Boolean);
  return { allies, enemies, allyIndex:0, round:1, log:['战斗开始。'], status:'active' };
}

function damage(attacker, defender, power=1) {
  const variance = .92 + Math.random() * .16;
  const raw = attacker.attack * power * variance - defender.defense * .55;
  return Math.max(1, Math.round(raw));
}

function lowestHpAlly(allies) {
  return [...allies].filter(alive).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
}

export function useSkill(battle, skillId) {
  if (battle.status !== 'active') return battle;
  const actor = battle.allies[battle.allyIndex];
  if (!actor || !alive(actor)) return advanceAlly(battle);
  const skill = SKILLS[skillId];
  if (!skill || !actor.skills.includes(skillId)) return battle;

  if (skill.heal) {
    const target = lowestHpAlly(battle.allies);
    const amount = Math.max(1, Math.round(target.maxHp * skill.heal));
    const actual = Math.min(amount, target.maxHp - target.hp);
    target.hp += actual;
    battle.log.push(`${actor.name}施展【${skill.name}】，${target.name}恢复 ${actual} 点气血。`);
  } else {
    const target = battle.enemies.find(alive);
    if (!target) return finish(battle, 'win');
    const amount = damage(actor, target, skill.power || 1);
    target.hp = Math.max(0, target.hp - amount);
    battle.log.push(`${actor.name}施展【${skill.name}】，对${target.name}造成 ${amount} 点伤害。`);
    if (!alive(target)) battle.log.push(`${target.name}倒下了。`);
  }
  if (!battle.enemies.some(alive)) return finish(battle,'win');
  return advanceAlly(battle);
}

function advanceAlly(battle) {
  let idx = battle.allyIndex + 1;
  while (idx < battle.allies.length && !alive(battle.allies[idx])) idx++;
  if (idx < battle.allies.length) {
    battle.allyIndex = idx;
    return battle;
  }
  enemyTurn(battle);
  if (battle.status !== 'active') return battle;
  battle.round += 1;
  battle.allyIndex = 0;
  while (battle.allyIndex < battle.allies.length && !alive(battle.allies[battle.allyIndex])) battle.allyIndex++;
  return battle;
}

function enemyTurn(battle) {
  for (const enemy of battle.enemies.filter(alive)) {
    const targets = battle.allies.filter(alive);
    if (!targets.length) return finish(battle,'lose');
    const target = pick(targets);
    const amount = damage(enemy, target, 1);
    target.hp = Math.max(0, target.hp - amount);
    battle.log.push(`${enemy.name}攻击${target.name}，造成 ${amount} 点伤害。`);
    if (!alive(target)) battle.log.push(`${target.name}暂时失去战斗能力。`);
  }
  if (!battle.allies.some(alive)) finish(battle,'lose');
}

function finish(battle,status) {
  battle.status = status;
  battle.log.push(status === 'win' ? '敌人已尽数败退。' : '你眼前一黑，只得暂避锋芒。');
  return battle;
}
