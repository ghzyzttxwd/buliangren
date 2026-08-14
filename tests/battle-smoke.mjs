import assert from 'node:assert/strict';
import { createBattle, useSkill } from '../src/battle.js';

const originalRandom = Math.random;
Math.random = () => 0.5;

try {
  // 1v1 基线：当前战斗对象结构与初始状态。
  const oneVsOne = createBattle(['scout'], ['player']);
  assert.equal(oneVsOne.allies.length, 1, '1v1 should create one ally');
  assert.equal(oneVsOne.enemies.length, 1, '1v1 should create one enemy');
  assert.equal(oneVsOne.status, 'active', 'new battle should be active');
  assert.equal(oneVsOne.round, 1, 'new battle should start at round 1');
  assert.equal(oneVsOne.allies[0].hp, oneVsOne.allies[0].maxHp, 'ally should start at full HP');
  assert.equal(oneVsOne.enemies[0].hp, oneVsOne.enemies[0].maxHp, 'enemy should start at full HP');

  // 2v2 基线：队伍顺序和敌人数必须保持一致。
  const twoVsTwo = createBattle(['scout', 'guard'], ['player', 'chimeng']);
  assert.deepEqual(twoVsTwo.allies.map(x => x.id), ['player', 'chimeng'], 'party order changed unexpectedly');
  assert.equal(twoVsTwo.enemies.length, 2, '2v2 should create two enemies');
  assert.equal(twoVsTwo.allyIndex, 0, 'first ally should act first in v0.3 baseline');

  // 治疗基线：蚩梦治疗当前最低生命的队友。
  const healing = createBattle([], ['player', 'chimeng']);
  healing.allies[0].hp = 40;
  healing.allyIndex = 1;
  const hpBeforeHeal = healing.allies[0].hp;
  useSkill(healing, 'miao_heal');
  assert.ok(healing.allies[0].hp > hpBeforeHeal, 'healing skill did not restore HP');
  assert.ok(healing.log.some(line => line.includes('恢复')), 'healing log missing');

  // 动态武学基线：已学会的玩家武学必须注入主角技能列表。
  const learned = createBattle(['scout'], ['player'], {
    folding_wind_sword: { learned: true, mastery: 2, exp: 0 }
  });
  assert.ok(learned.allies[0].skills.includes('folding_wind_sword'), 'learned player skill not injected into battle');

  // 胜利基线：最后一个敌人倒下后战斗立即进入 win。
  const winning = createBattle(['scout'], ['player']);
  winning.enemies[0].hp = 1;
  useSkill(winning, 'basic_sword');
  assert.equal(winning.status, 'win', 'battle should end in win after final enemy falls');
  assert.ok(winning.log.includes('敌人已尽数败退。'), 'win log missing');

  // 失败基线：我方全灭后进入 lose。
  const losing = createBattle(['palace_guard'], ['player']);
  losing.allies[0].hp = 1;
  useSkill(losing, 'basic_sword');
  assert.equal(losing.status, 'lose', 'battle should end in lose after all allies fall');
  assert.ok(losing.log.includes('你眼前一黑，只得暂避锋芒。'), 'lose log missing');

  console.log('battle baseline smoke passed: 1v1, 2v2, heal, learned skill, win, lose');
} finally {
  Math.random = originalRandom;
}
