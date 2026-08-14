import assert from 'node:assert/strict';
import { createBattle, useSkill } from '../src/battle.js';
import { defaultState } from '../src/state.js';

const originalRandom = Math.random;
Math.random = () => 0.5;

try {
  // 阶段 A：1v1 基线。
  const oneVsOne = createBattle(['scout'], ['player']);
  assert.equal(oneVsOne.allies.length, 1, '1v1 should create one ally');
  assert.equal(oneVsOne.enemies.length, 1, '1v1 should create one enemy');
  assert.equal(oneVsOne.status, 'active', 'new battle should be active');
  assert.equal(oneVsOne.round, 1, 'new battle should start at round 1');
  assert.equal(oneVsOne.allies[0].hp, oneVsOne.allies[0].maxHp, 'ally should start at full HP');
  assert.equal(oneVsOne.enemies[0].hp, oneVsOne.enemies[0].maxHp, 'enemy should start at full HP');

  // 阶段 A：2v2 基线。
  const twoVsTwo = createBattle(['scout', 'guard'], ['player', 'chimeng']);
  assert.deepEqual(twoVsTwo.allies.map(x => x.id), ['player', 'chimeng'], 'party order changed unexpectedly');
  assert.equal(twoVsTwo.enemies.length, 2, '2v2 should create two enemies');
  assert.equal(twoVsTwo.allyIndex, 0, 'first ally should act first in v0.3 baseline');

  // 阶段 A：治疗基线。
  const healing = createBattle([], ['player', 'chimeng']);
  healing.allies[0].hp = 40;
  healing.allyIndex = 1;
  const hpBeforeHeal = healing.allies[0].hp;
  useSkill(healing, 'miao_heal');
  assert.ok(healing.allies[0].hp > hpBeforeHeal, 'healing skill did not restore HP');
  assert.ok(healing.log.some(line => line.includes('恢复')), 'healing log missing');

  // 阶段 A：动态武学基线。
  const learned = createBattle(['scout'], ['player'], {
    folding_wind_sword: { learned: true, mastery: 2, exp: 0 }
  });
  assert.ok(learned.allies[0].skills.includes('folding_wind_sword'), 'learned player skill not injected into battle');

  // 阶段 A：胜利基线。
  const winning = createBattle(['scout'], ['player']);
  winning.enemies[0].hp = 1;
  useSkill(winning, 'basic_sword');
  assert.equal(winning.status, 'win', 'battle should end in win after final enemy falls');
  assert.ok(winning.log.includes('敌人已尽数败退。'), 'win log missing');

  // 阶段 A：失败基线。
  const losing = createBattle(['palace_guard'], ['player']);
  losing.allies[0].hp = 1;
  useSkill(losing, 'basic_sword');
  assert.equal(losing.status, 'lose', 'battle should end in lose after all allies fall');
  assert.ok(losing.log.includes('你眼前一黑，只得暂避锋芒。'), 'lose log missing');

  // 阶段 B：等级必须真实改变战斗属性。
  const level1State = defaultState();
  const level6State = defaultState();
  level6State.player.level = 6;
  const level1Player = createBattle([], ['player'], level1State.martialArts, level1State).allies[0];
  const level6Player = createBattle([], ['player'], level6State.martialArts, level6State).allies[0];
  assert.ok(level6Player.maxHp > level1Player.maxHp, 'level did not increase max HP');
  assert.ok(level6Player.attack > level1Player.attack, 'level did not increase attack');
  assert.ok(level6Player.defense > level1Player.defense, 'level did not increase defense');
  assert.ok(level6Player.speed > level1Player.speed, 'level did not increase speed');

  // 阶段 B：同等级突破境界后，战斗属性也必须变化。
  const unrankedState = defaultState();
  unrankedState.player.level = 6;
  unrankedState.player.realm = 'unranked';
  const greatStarState = defaultState();
  greatStarState.player.level = 6;
  greatStarState.player.realm = 'great_star';
  const unrankedPlayer = createBattle([], ['player'], unrankedState.martialArts, unrankedState).allies[0];
  const greatStarPlayer = createBattle([], ['player'], greatStarState.martialArts, greatStarState).allies[0];
  assert.ok(greatStarPlayer.maxHp > unrankedPlayer.maxHp, 'realm did not increase max HP');
  assert.ok(greatStarPlayer.attack > unrankedPlayer.attack, 'realm did not increase attack');
  assert.ok(greatStarPlayer.defense > unrankedPlayer.defense, 'realm did not increase defense');
  assert.ok(greatStarPlayer.speed > unrankedPlayer.speed, 'realm did not increase speed');
  assert.ok(greatStarPlayer.maxQi > unrankedPlayer.maxQi, 'realm did not increase future qi capacity');
  assert.equal(greatStarPlayer.realm, 'great_star', 'realm id not carried into combatant');
  assert.equal(greatStarPlayer.realmOrder, 3, 'realm order not carried into combatant');

  console.log(`battle smoke passed: baseline + dynamic stats; Lv1 HP=${level1Player.maxHp}, Lv6 HP=${level6Player.maxHp}, Lv6大星位 HP=${greatStarPlayer.maxHp}`);
} finally {
  Math.random = originalRandom;
}
