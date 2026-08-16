import assert from 'node:assert/strict';
import {
  createBattle,
  useSkill,
  basicAttack,
  getCurrentActor,
  getSkillQiCost,
  BASIC_ATTACK_QI_RECOVERY,
  calculateDamage,
  getRealmPressure,
  getControlResistance,
  getInitiative
} from '../src/battle.js';
import { getStatus } from '../src/statuses.js';
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
  assert.ok(greatStarPlayer.maxQi > unrankedPlayer.maxQi, 'realm did not increase qi capacity');
  assert.equal(greatStarPlayer.realm, 'great_star', 'realm id not carried into combatant');
  assert.equal(greatStarPlayer.realmOrder, 3, 'realm order not carried into combatant');

  // 阶段 C + E：高速黑无常先手，而且现在会按 AI 使用武学。
  const slowState = defaultState();
  const slowVsBlack = createBattle(['blackwuchang'], ['player'], slowState.martialArts, slowState);
  assert.ok(slowVsBlack.allies[0].hp < slowVsBlack.allies[0].maxHp, 'faster enemy did not act before slow player');
  assert.ok(slowVsBlack.log[1]?.includes('无常鬼爪'), 'black wuchang did not use configured martial art');
  assert.ok(slowVsBlack.enemies[0].qi < slowVsBlack.enemies[0].maxQi, 'enemy martial art did not consume qi');
  assert.equal(getCurrentActor(slowVsBlack)?.id, 'player', 'control should return to player after faster enemy auto-turn');

  // 同一敌人面对更快的 Lv.7 大星位玩家时，不应获得先手。
  const fastState = defaultState();
  fastState.player.level = 7;
  fastState.player.realm = 'great_star';
  const fastVsBlack = createBattle(['blackwuchang'], ['player'], fastState.martialArts, fastState);
  assert.ok(fastVsBlack.allies[0].speed > fastVsBlack.enemies[0].speed, 'test setup did not make player faster');
  assert.equal(fastVsBlack.allies[0].hp, fastVsBlack.allies[0].maxHp, 'slower enemy acted before faster player');
  assert.equal(getCurrentActor(fastVsBlack)?.id, 'player', 'faster player should own the first action');

  // 阶段 D：所有单位开战时必须拥有满内力。
  const qiBattle = createBattle(['scout'], ['player'], fastState.martialArts, fastState);
  const qiPlayer = qiBattle.allies[0];
  assert.ok(qiPlayer.maxQi > 0, 'player max qi missing');
  assert.equal(qiPlayer.qi, qiPlayer.maxQi, 'player should start battle at full qi');
  assert.equal(qiBattle.enemies[0].qi, qiBattle.enemies[0].maxQi, 'enemy should start battle at full qi');

  // 武学必须真实扣除配置的内力。
  const qiBeforeSkill = qiPlayer.qi;
  const skillCost = getSkillQiCost('qi_burst');
  const hpBeforeSkill = qiBattle.enemies[0].hp;
  useSkill(qiBattle, 'qi_burst');
  assert.equal(qiPlayer.qi, qiBeforeSkill - skillCost, 'skill did not deduct configured qi cost');
  assert.ok(qiBattle.enemies[0].hp < hpBeforeSkill, 'skill did not resolve after qi deduction');

  // 普通攻击必须回复固定内力且不超过上限。
  const recoverBattle = createBattle(['scout'], ['player'], fastState.martialArts, fastState);
  const recoverPlayer = recoverBattle.allies[0];
  recoverPlayer.qi = recoverPlayer.maxQi - 15;
  const qiBeforeBasic = recoverPlayer.qi;
  basicAttack(recoverBattle);
  assert.equal(recoverPlayer.qi, qiBeforeBasic + BASIC_ATTACK_QI_RECOVERY, 'basic attack did not recover qi');

  // 内力不足时，玩家技能不得施放、不得扣血、不得推进当前行动者。
  const insufficient = createBattle(['blackwuchang'], ['player'], fastState.martialArts, fastState);
  const insufficientPlayer = insufficient.allies[0];
  const insufficientCost = getSkillQiCost('qi_burst');
  insufficientPlayer.qi = insufficientCost - 1;
  const targetHpBeforeBlockedSkill = insufficient.enemies[0].hp;
  const actorBeforeBlockedSkill = getCurrentActor(insufficient);
  useSkill(insufficient, 'qi_burst');
  assert.equal(insufficientPlayer.qi, insufficientCost - 1, 'blocked skill changed qi');
  assert.equal(insufficient.enemies[0].hp, targetHpBeforeBlockedSkill, 'blocked skill damaged target');
  assert.equal(getCurrentActor(insufficient), actorBeforeBlockedSkill, 'blocked skill advanced turn');
  assert.ok(insufficient.log.at(-1)?.includes('内力不足'), 'blocked skill did not explain insufficient qi');

  // 阶段 E：四类敌人必须携带境界、技能和 AI 数据进入战斗对象。
  const enemyRoster = createBattle(['scout', 'guard', 'blackwuchang', 'palace_guard'], ['player'], fastState.martialArts, fastState);
  const [scout, guard, black, palace] = enemyRoster.enemies;
  assert.equal(scout.realm, 'small_star', 'scout realm missing');
  assert.equal(guard.realm, 'middle_star', 'guard realm missing');
  assert.equal(black.realm, 'great_star', 'black wuchang realm missing');
  assert.equal(palace.realm, 'middle_star', 'palace guard realm missing');
  assert.ok(scout.skills.includes('nether_spike'), 'scout skill missing');
  assert.ok(guard.skills.includes('nether_heavy_palm'), 'guard skill missing');
  assert.ok(black.skills.includes('wuchang_claw'), 'black wuchang skill missing');
  assert.ok(palace.skills.includes('guard_breath'), 'palace guard healing skill missing');

  // 力士的低 skillChance 在固定随机数下应选择普通攻击，形成行为差异。
  const guardAi = createBattle(['guard'], ['player'], fastState.martialArts, fastState);
  basicAttack(guardAi);
  assert.ok(guardAi.log.some(line => line.includes('玄冥教力士普通攻击')), 'guard AI did not fall back to basic attack');

  // 焦兰殿禁卫低血量时应优先使用治疗技能，而不是继续攻击。
  const palaceHeal = createBattle(['palace_guard'], ['player'], fastState.martialArts, fastState);
  palaceHeal.enemies[0].hp = 70;
  const palaceQiBefore = palaceHeal.enemies[0].qi;
  basicAttack(palaceHeal);
  assert.ok(palaceHeal.log.some(line => line.includes('禁军调息')), 'low HP enemy did not choose healing skill');
  assert.ok(palaceHeal.enemies[0].qi < palaceQiBefore, 'enemy healing skill did not consume qi');
  assert.ok(palaceHeal.enemies[0].hp > 70, 'enemy healing skill did not restore enough HP after incoming attack');

  // 敌人内力不足时必须自动退回普通攻击。
  const blackNoQi = createBattle(['blackwuchang'], ['player'], fastState.martialArts, fastState);
  blackNoQi.enemies[0].qi = 0;
  basicAttack(blackNoQi);
  assert.ok(blackNoQi.log.some(line => line.includes('黑无常普通攻击')), 'enemy with insufficient qi did not use basic attack');

  // 阶段 F：同境界时不产生额外压制；高境界输出提高，低境界攻击高境界会被减伤。
  const sameAttacker = { attack: 30, realmOrder: 2 };
  const sameDefender = { defense: 10, realmOrder: 2 };
  const highAttacker = { attack: 30, realmOrder: 5 };
  const lowAttacker = { attack: 30, realmOrder: 0 };
  const highDefender = { defense: 10, realmOrder: 3 };
  const sameDamage = calculateDamage(sameAttacker, sameDefender, 1, 1);
  const pressuredDamage = calculateDamage(highAttacker, sameDefender, 1, 1);
  const suppressedDamage = calculateDamage(lowAttacker, highDefender, 1, 1);
  assert.deepEqual(getRealmPressure(sameAttacker, sameDefender), { delta: 0, damageMultiplier: 1, mitigationMultiplier: 1 }, 'same realm should not create pressure');
  assert.ok(pressuredDamage > sameDamage, 'higher realm did not increase damage');
  assert.ok(suppressedDamage < sameDamage, 'higher realm defender did not reduce incoming damage');

  // 境界只提供轻度先手修正，速度仍然是核心属性。
  const highRealmInitiative = getInitiative({ speed: 15, realmOrder: 3 });
  const lowRealmInitiative = getInitiative({ speed: 16, realmOrder: 0 });
  assert.ok(highRealmInitiative > lowRealmInitiative, 'large realm gap did not affect initiative');
  assert.ok(getInitiative({ speed: 18, realmOrder: 0 }) > highRealmInitiative, 'realm initiative bonus overwhelmed a clearly faster unit');

  // 控制抗性接口先随境界稳定提升，真正控制效果留到阶段 G。
  assert.equal(getControlResistance({ realmOrder: 0 }), 0, 'unranked control resistance should start at zero');
  assert.ok(getControlResistance({ realmOrder: 3 }) > getControlResistance({ realmOrder: 1 }), 'control resistance did not rise with realm');
  assert.ok(black.controlResistance > scout.controlResistance, 'combatants did not carry realm-based control resistance');

  // 阶段 G：蝶影毒镖必须施加中毒，持续回合中造成伤害并正确到期。
  const poisonBattle = createBattle(['guard'], ['chimeng']);
  const poisonTarget = poisonBattle.enemies[0];
  useSkill(poisonBattle, 'butterfly_dart');
  const poisonStatus = getStatus(poisonTarget, 'poisoned');
  assert.ok(poisonStatus, 'poison skill did not apply poison status');
  assert.equal(poisonStatus.type, 'poison', 'poison status type incorrect');
  assert.equal(poisonStatus.source, 'chimeng', 'poison status source missing');
  assert.equal(poisonStatus.duration, 2, 'poison duration did not tick after target turn');
  assert.ok(poisonBattle.log.some(line => line.includes('陷入【中毒】')), 'poison application log missing');
  assert.ok(poisonBattle.log.some(line => line.includes('毒性侵蚀')), 'poison damage log missing');
  basicAttack(poisonBattle);
  assert.equal(getStatus(poisonTarget, 'poisoned')?.duration, 1, 'poison did not continue across turns');
  basicAttack(poisonBattle);
  assert.equal(getStatus(poisonTarget, 'poisoned'), null, 'poison status did not expire');
  assert.ok(poisonBattle.log.some(line => line.includes('【中毒】效果结束')), 'poison expiry log missing');

  // 阶段 G：苗疆灵蛊产生护盾，护盾先于气血承伤，并在持续时间结束后移除。
  const shieldBattle = createBattle(['guard'], ['chimeng']);
  const shieldActor = shieldBattle.allies[0];
  shieldActor.hp = 50;
  useSkill(shieldBattle, 'miao_heal');
  const shieldAfterHeal = getStatus(shieldActor, 'miao_shield');
  assert.ok(shieldAfterHeal, 'healing skill did not apply shield');
  assert.equal(shieldAfterHeal.type, 'shield', 'shield status type incorrect');
  assert.ok(shieldBattle.log.some(line => line.includes('获得【灵蛊护体】')), 'shield application log missing');
  assert.ok(shieldBattle.log.some(line => line.includes('护盾吸收')), 'shield did not absorb incoming damage');
  basicAttack(shieldBattle);
  assert.equal(getStatus(shieldActor, 'miao_shield'), null, 'shield did not expire after configured duration');
  assert.ok(shieldBattle.log.some(line => line.includes('【灵蛊护体】效果结束')), 'shield expiry log missing');

  // 阶段 G：尸祖缚魂丝施加控制后，目标下一次行动必须被跳过并随后解除。
  const controlBattle = createBattle(['guard'], ['jiangchen']);
  const controlledEnemy = controlBattle.enemies[0];
  const allyHpBeforeControl = controlBattle.allies[0].hp;
  useSkill(controlBattle, 'corpse_thread');
  assert.ok(controlBattle.log.some(line => line.includes('受到【缚魂定身】')), 'control skill did not apply control status');
  assert.ok(controlBattle.log.some(line => line.includes('本次行动被跳过')), 'controlled target did not skip its action');
  assert.equal(controlBattle.allies[0].hp, allyHpBeforeControl, 'controlled enemy still dealt damage during skipped action');
  assert.equal(getStatus(controlledEnemy, 'soul_bind'), null, 'one-turn control did not expire after skipped action');
  assert.ok(controlBattle.log.some(line => line.includes('【缚魂定身】效果结束')), 'control expiry log missing');

  // 阶段 H：折风剑式熟练 Lv.2 必须比 Lv.1 有温和但真实的伤害提升。
  const masteryOneState = defaultState();
  masteryOneState.player.level = 6;
  masteryOneState.player.realm = 'middle_star';
  masteryOneState.martialArts.folding_wind_sword = { learned: true, mastery: 1, exp: 0 };
  const masteryOneBattle = createBattle(['guard'], ['player'], masteryOneState.martialArts, masteryOneState);
  const masteryOneTargetHp = masteryOneBattle.enemies[0].hp;
  useSkill(masteryOneBattle, 'folding_wind_sword');
  const masteryOneDamage = masteryOneTargetHp - masteryOneBattle.enemies[0].hp;

  const masteryTwoState = defaultState();
  masteryTwoState.player.level = 6;
  masteryTwoState.player.realm = 'middle_star';
  masteryTwoState.martialArts.folding_wind_sword = { learned: true, mastery: 2, exp: 0 };
  const masteryTwoBattle = createBattle(['guard'], ['player'], masteryTwoState.martialArts, masteryTwoState);
  assert.equal(masteryTwoBattle.allies[0].skillMastery.folding_wind_sword, 2, 'mastery was not carried into combatant');
  const masteryTwoTargetHp = masteryTwoBattle.enemies[0].hp;
  useSkill(masteryTwoBattle, 'folding_wind_sword');
  const masteryTwoDamage = masteryTwoTargetHp - masteryTwoBattle.enemies[0].hp;
  assert.ok(masteryTwoDamage > masteryOneDamage, 'mastery level did not increase martial art damage');
  assert.ok(masteryTwoDamage <= masteryOneDamage * 1.1, 'mastery bonus is too large for one level');

  // 阶段 H：境界不足时即使存档中已经学会武学，也不得施放或推进回合。
  const lowRealmSkillState = defaultState();
  lowRealmSkillState.player.level = 6;
  lowRealmSkillState.player.realm = 'small_star';
  lowRealmSkillState.martialArts.folding_wind_sword = { learned: true, mastery: 2, exp: 0 };
  const realmBlockedBattle = createBattle(['guard'], ['player'], lowRealmSkillState.martialArts, lowRealmSkillState);
  const blockedPlayer = realmBlockedBattle.allies[0];
  const blockedTarget = realmBlockedBattle.enemies[0];
  const blockedQiBefore = blockedPlayer.qi;
  const blockedHpBefore = blockedTarget.hp;
  const blockedActorBefore = getCurrentActor(realmBlockedBattle);
  useSkill(realmBlockedBattle, 'folding_wind_sword');
  assert.equal(blockedPlayer.qi, blockedQiBefore, 'realm-blocked skill consumed qi');
  assert.equal(blockedTarget.hp, blockedHpBefore, 'realm-blocked skill damaged target');
  assert.equal(getCurrentActor(realmBlockedBattle), blockedActorBefore, 'realm-blocked skill advanced turn');
  assert.ok(realmBlockedBattle.log.at(-1)?.includes('境界不足'), 'realm-blocked skill did not explain requirement');

  console.log(`battle smoke passed: dynamic stats + speed + qi + enemy AI + realm pressure + statuses + mastery; 折风Lv1=${masteryOneDamage}, Lv2=${masteryTwoDamage}`);
} finally {
  Math.random = originalRandom;
}
