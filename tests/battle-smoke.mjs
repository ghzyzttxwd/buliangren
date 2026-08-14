import assert from 'node:assert/strict';
import { createBattle, useSkill, basicAttack, getCurrentActor } from '../src/battle.js';
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
  assert.equal(oneVsOne.allies[0].hp, oneVsOne.allies[0].maxHp, 'ally should start at full HP against slower scout');
  assert.equal(oneVsOne.enemies[0].hp, oneVsOne.enemies[0].maxHp, 'enemy should start at full HP before player acts');

  // 阶段 C 后：2v2 的首个行动者按速度，而不是 party 数组顺序。
  const twoVsTwo = createBattle(['scout', 'guard'], ['player', 'chimeng']);
  assert.deepEqual(twoVsTwo.allies.map(x => x.id), ['player', 'chimeng'], 'party membership order changed unexpectedly');
  assert.equal(twoVsTwo.enemies.length, 2, '2v2 should create two enemies');
  assert.equal(getCurrentActor(twoVsTwo)?.id, 'chimeng', 'fastest ally should act first');
  assert.equal(twoVsTwo.allyIndex, 1, 'allyIndex should point to the current fastest ally');

  // 治疗基线：蚩梦仍可治疗当前最低生命的队友。
  const healing = createBattle([], ['player', 'chimeng']);
  healing.allies[0].hp = 40;
  assert.equal(getCurrentActor(healing)?.id, 'chimeng', 'chimeng should be current actor in healing test');
  const hpBeforeHeal = healing.allies[0].hp;
  useSkill(healing, 'miao_heal');
  assert.ok(healing.allies[0].hp > hpBeforeHeal, 'healing skill did not restore HP');
  assert.ok(healing.log.some(line => line.includes('恢复')), 'healing log missing');

  // 动态武学基线：已学会的玩家武学必须注入主角技能列表。
  const learned = createBattle(['scout'], ['player'], {
    folding_wind_sword: { learned: true, mastery: 2, exp: 0 }
  });
  assert.ok(learned.allies[0].skills.includes('folding_wind_sword'), 'learned player skill not injected into battle');

  // 阶段 C：普通攻击是独立动作，不依赖技能表。
  const normalAttackBattle = createBattle(['scout'], ['player']);
  const enemyHpBeforeNormal = normalAttackBattle.enemies[0].hp;
  basicAttack(normalAttackBattle);
  assert.ok(normalAttackBattle.enemies[0].hp < enemyHpBeforeNormal, 'basic attack did not damage enemy');
  assert.ok(normalAttackBattle.log.some(line => line.includes('普通攻击')), 'basic attack log missing');

  // 胜利基线：最后一个敌人倒下后战斗立即进入 win。
  const winning = createBattle(['scout'], ['player']);
  winning.enemies[0].hp = 1;
  basicAttack(winning);
  assert.equal(winning.status, 'win', 'battle should end in win after final enemy falls');
  assert.ok(winning.log.includes('敌人已尽数败退。'), 'win log missing');

  // 失败基线：玩家行动后，敌人按速度队列接续行动并可造成失败。
  const losing = createBattle(['palace_guard'], ['player']);
  losing.allies[0].hp = 1;
  basicAttack(losing);
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

  // 阶段 C：高速敌人必须能先于低速玩家行动。
  const slowState = defaultState();
  const slowVsBlack = createBattle(['blackwuchang'], ['player'], slowState.martialArts, slowState);
  assert.ok(slowVsBlack.allies[0].hp < slowVsBlack.allies[0].maxHp, 'faster enemy did not act before slow player');
  assert.ok(slowVsBlack.log[1]?.includes('黑无常普通攻击'), 'enemy pre-emptive action missing from log');
  assert.equal(getCurrentActor(slowVsBlack)?.id, 'player', 'control should return to player after faster enemy auto-turn');

  // 同一敌人面对更快的 Lv.7 大星位玩家时，不应再获得先手。
  const fastState = defaultState();
  fastState.player.level = 7;
  fastState.player.realm = 'great_star';
  const fastVsBlack = createBattle(['blackwuchang'], ['player'], fastState.martialArts, fastState);
  assert.ok(fastVsBlack.allies[0].speed > fastVsBlack.enemies[0].speed, 'test setup did not make player faster');
  assert.equal(fastVsBlack.allies[0].hp, fastVsBlack.allies[0].maxHp, 'slower enemy acted before faster player');
  assert.equal(getCurrentActor(fastVsBlack)?.id, 'player', 'faster player should own the first action');

  console.log(`battle smoke passed: dynamic stats + speed queue + basic attack; Lv7大星位 speed=${fastVsBlack.allies[0].speed}, 黑无常 speed=${fastVsBlack.enemies[0].speed}`);
} finally {
  Math.random = originalRandom;
}
