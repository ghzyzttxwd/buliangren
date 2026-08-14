import { checkConditions } from './conditions.js';
import { applyRewards } from './progression.js';

const VALID_CATEGORIES = new Set(['main', 'side', 'hidden', 'character', 'encounter']);

function relationStage(rel = {}) {
  if (!rel.met) return 'unknown';
  const value = Number.isFinite(rel.affinity) ? rel.affinity : 0;
  if (value >= 70) return 'close';
  if (value >= 45) return 'trusted';
  if (value >= 20) return 'familiar';
  if (value >= 0) return 'acquainted';
  if (value >= -40) return 'cold';
  return 'hostile';
}

function eventList(state, key) {
  if (!state.events) state.events = { completed: [], failed: [], active: [], counters: {} };
  if (!Array.isArray(state.events[key])) state.events[key] = [];
  return state.events[key];
}

function addUnique(array, value) {
  if (!array.includes(value)) array.push(value);
}

function removeValue(array, value) {
  const index = array.indexOf(value);
  if (index >= 0) array.splice(index, 1);
}

function ensureCounters(state) {
  if (!state.events) state.events = { completed: [], failed: [], active: [], counters: {} };
  if (!state.events.counters || typeof state.events.counters !== 'object' || Array.isArray(state.events.counters)) {
    state.events.counters = {};
  }
  return state.events.counters;
}

// v0.3 第一季正式内容使用正式事件 ID。
// v0.2 的测试事件和 skeleton 完成记录可以继续留在旧存档中，但不再作为正式内容显示。
export const EVENTS = [
  // ---------------------------------------------------------------------------
  // 阶段 B：序章 / 渝州篇
  // ---------------------------------------------------------------------------
  {
    id: 's1_yuzhou_formal_dark_current',
    season: 1,
    category: 'main',
    location: 'yuzhou',
    title: '渝州暗潮',
    desc: '城外盘查突然加严。玄冥教的人似乎在追踪另一批刚入江湖的年轻人。',
    retryOnFail: true,
    conditions: [
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_dark_current' }
    ],
    action: { type: 'battle', enemies: ['scout'] },
    rewards: { silver: 40, exp: 20, cultivation: 5, reputation: 15 },
    effects: [
      { type: 'setQuest', value: '渝州风声' },
      { type: 'setChapter', value: 's1_yuzhou' }
    ],
    log: '你击退一名在商路上横行的玄冥教探子，也确认这场大规模搜查真正追逐的另有其人。',
    failureLog: '玄冥教探子人数占优，你暂时退回渝州，准备另寻机会。'
  },
  {
    id: 's1_yuzhou_formal_inn_rumor',
    season: 1,
    category: 'side',
    location: 'yuzhou',
    title: '客栈里的风声',
    desc: '商旅都在议论城外的盘查。有人提到，玄冥教正在寻找一对年轻江湖人。',
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_dark_current' },
      { type: 'reputationGte', value: 15 },
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_inn_rumor' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 8, reputation: 5 },
    effects: [],
    log: '你从几拨商旅的说法里拼出同一件事：玄冥教的搜查目标是一对刚刚踏入江湖的年轻人。'
  },
  {
    id: 's1_yuzhou_formal_road_relief',
    season: 1,
    category: 'side',
    location: 'yuzhou',
    title: '封路后的商队',
    desc: '玄冥教封路搜人，一支商队被困在城外。帮他们脱身，也许能换来些江湖名声。',
    retryOnFail: true,
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_dark_current' },
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_road_relief' }
    ],
    action: { type: 'battle', enemies: ['scout'] },
    rewards: { silver: 35, exp: 18, cultivation: 5, reputation: 10 },
    effects: [],
    log: '你替受困商队赶走了拦路的玄冥教探子。渝州来往的商旅开始记住你的名号。',
    failureLog: '你没能冲开玄冥教的封锁，只得先让商队退回安全处。'
  },
  {
    id: 's1_yuzhou_formal_training',
    season: 1,
    category: 'encounter',
    location: 'yuzhou',
    title: '城外练功',
    desc: '趁江湖风波尚未逼到眼前，找一处僻静地打熬筋骨。本阶段只有前五次能获得有效进益。',
    repeatable: true,
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_dark_current' },
      { type: 'counterLt', key: 's1_yuzhou_training_uses', value: 5 }
    ],
    action: { type: 'instant' },
    rewards: { cultivation: 5, exp: 4 },
    effects: [
      { type: 'incrementCounter', key: 's1_yuzhou_training_uses', value: 1 }
    ],
    log: '你在渝州城外静心练了一阵，气息比先前凝实了一分。'
  },
  {
    id: 's1_yuzhou_formal_chimeng_01',
    season: 1,
    category: 'character',
    location: 'yuzhou',
    title: '蚩梦的判断',
    desc: '蚩梦观察了几日，觉得玄冥教这次闹出的动静远比追你们两个人更大。',
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_dark_current' },
      { type: 'affinityGte', character: 'chimeng', value: 20 },
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_chimeng_01' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 5 },
    effects: [
      { type: 'changeAffinity', character: 'chimeng', value: 5 },
      { type: 'setPersonalFlag', character: 'chimeng', key: 'recognized_bigger_hunt', value: true }
    ],
    log: '蚩梦判断玄冥教真正盯上的另有其人。你们决定先看清这场风波，再决定卷进去多深。'
  },
  {
    id: 's1_yuzhou_formal_hidden_black_token',
    season: 1,
    category: 'hidden',
    location: 'yuzhou',
    title: '沟渠里的黑牌',
    desc: '雨后沟渠里露出一角乌黑木牌。只有在名声尚未传开时，你才有机会安静追查这条不起眼的线索。',
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_dark_current' },
      { type: 'cultivationGte', value: 10 },
      { type: 'reputationLte', value: 25 },
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_hidden_black_token' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 8, cultivation: 8 },
    effects: [
      { type: 'setFlag', key: 'found_yuzhou_black_token', value: true }
    ],
    log: '你从一块不起眼的黑牌上确认：玄冥教在渝州周边布置了不止一条搜查路线。这条发现没有惊动任何人。'
  },
  {
    id: 's1_yuzhou_formal_crossing',
    season: 1,
    category: 'main',
    location: 'yuzhou',
    title: '被追逐的年轻人',
    desc: '你的名声让更多消息主动找上门。玄冥教真正追逐的年轻人，终于从传闻变成近在眼前的江湖风波。',
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_dark_current' },
      { type: 'reputationGte', value: 30 },
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_crossing' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 25, cultivation: 5, reputation: 10 },
    effects: [
      { type: 'setQuest', value: '追查剑庐方向' }
    ],
    log: '你在一场外围追逐中确认了玄冥教的真正目标。那名年轻人与同行很快脱离视线，而你只来得及处理追兵留下的余波。'
  },
  {
    id: 's1_yuzhou_formal_night_watch',
    season: 1,
    category: 'side',
    location: 'yuzhou',
    title: '城门夜巡',
    desc: '那场追逐之后仍有玄冥教散兵在城外搜人。城门附近的百姓不敢夜行。',
    retryOnFail: true,
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_crossing' },
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_night_watch' }
    ],
    action: { type: 'battle', enemies: ['scout'] },
    rewards: { silver: 25, exp: 15, cultivation: 5, reputation: 5 },
    effects: [],
    log: '你清掉了城门外一拨仍在搜人的玄冥教散兵。第二天，关于剑庐方向大战的消息开始传来。',
    failureLog: '城外搜人的玄冥教散兵比预想中难缠，你暂时退回城内。'
  },
  {
    id: 's1_yuzhou_formal_swordhut_aftershock',
    season: 1,
    category: 'main',
    location: 'yuzhou',
    title: '剑庐火光',
    desc: '剑庐方向传来大战后的消息。玄冥教高手已经介入，那名被追逐的年轻人也从公开视线中消失。',
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_crossing' },
      { type: 'reputationGte', value: 45 },
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_swordhut_aftershock' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 25, reputation: 5 },
    effects: [
      { type: 'unlockLocation', id: 'cangbing' },
      { type: 'setQuest', value: '谷外封路' }
    ],
    log: '你赶到时，剑庐的核心战斗早已结束。留下的痕迹表明，玄冥教高手曾在这里围攻目标，而重伤者随后被另一股隐藏力量带走。'
  },
  {
    id: 's1_yuzhou_formal_cangbing_outer',
    season: 1,
    category: 'main',
    location: 'cangbing',
    title: '谷外封路',
    desc: '线索最终停在藏兵谷外围。谷内有人刻意封住消息，你能确认局势已经被更深的一股力量接手。',
    conditions: [
      { type: 'eventCompleted', event: 's1_yuzhou_formal_swordhut_aftershock' },
      { type: 'locationUnlocked', location: 'cangbing' },
      { type: 'reputationGte', value: 50 },
      { type: 'eventNotCompleted', event: 's1_yuzhou_formal_cangbing_outer' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 20, reputation: 5 },
    effects: [
      { type: 'unlockLocation', id: 'xuanming' },
      { type: 'setFlag', key: 's1_stage_b_complete', value: true },
      { type: 'setQuest', value: '玄冥暗流' },
      { type: 'setChapter', value: 's1_xuanming' }
    ],
    log: '你止步于藏兵谷外围，没有闯入那场不属于你的核心会面。江湖另一边，玄冥教的行动却正在继续扩大。阶段 B 至此收束。'
  },

  // ---------------------------------------------------------------------------
  // 阶段 C：玄冥教篇
  // 原作锚点：搜捕由黑白无常层级升级到五大阎君，并进一步牵动冥帝朱友珪；
  // 玩家只介入外围压力、情报与局部冲突，不改写玄冥教核心人物的既定命运。
  // ---------------------------------------------------------------------------
  {
    id: 's1_xuanming_formal_hunt_escalates',
    season: 1,
    category: 'main',
    location: 'xuanming',
    title: '搜捕升级',
    desc: '剑庐一战之后，玄冥教沿途盘查明显换了层级。普通探子退到外围，更强的人开始接手追踪。',
    conditions: [
      { type: 'flagTrue', key: 's1_stage_b_complete' },
      { type: 'locationUnlocked', location: 'xuanming' },
      { type: 'eventNotCompleted', event: 's1_xuanming_formal_hunt_escalates' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 18, reputation: 5 },
    effects: [
      { type: 'setQuest', value: '查清玄冥教的新动向' }
    ],
    log: '你确认玄冥教已经不再把这场追捕当作普通江湖纠纷：封路、眼线和传令都换了更高规格。'
  },
  {
    id: 's1_xuanming_formal_road_pressure',
    season: 1,
    category: 'side',
    location: 'xuanming',
    title: '驿路封查',
    desc: '玄冥教扩大搜捕后，一条商旅驿路被反复盘查。当地人开始主动找你帮忙。',
    retryOnFail: true,
    conditions: [
      { type: 'eventCompleted', event: 's1_xuanming_formal_hunt_escalates' },
      { type: 'eventNotCompleted', event: 's1_xuanming_formal_road_pressure' }
    ],
    action: { type: 'battle', enemies: ['scout'] },
    rewards: { silver: 30, exp: 18, cultivation: 5, reputation: 8 },
    effects: [],
    log: '你赶走一拨借搜查之名勒索商旅的玄冥教外围人马。更多人开始把玄冥教的压力与你的名号联系起来。',
    failureLog: '这条驿路上的玄冥教人手比预料得多，你先把商旅疏散，再另找机会。'
  },
  {
    id: 's1_xuanming_formal_trace_routes',
    season: 1,
    category: 'encounter',
    location: 'xuanming',
    title: '沿线探查',
    desc: '避开正面冲突，沿玄冥教传令路线摸清外围动向。本阶段最多获得三次有效收获。',
    repeatable: true,
    conditions: [
      { type: 'eventCompleted', event: 's1_xuanming_formal_hunt_escalates' },
      { type: 'counterLt', key: 's1_xuanming_trace_uses', value: 3 }
    ],
    action: { type: 'instant' },
    rewards: { exp: 5, cultivation: 3, reputation: 2 },
    effects: [
      { type: 'incrementCounter', key: 's1_xuanming_trace_uses', value: 1 }
    ],
    log: '你沿玄冥教外围路线探查了一阵，摸清几处哨点和传令规律，也没有惊动真正的高手。'
  },
  {
    id: 's1_xuanming_formal_realm_breakthrough',
    season: 1,
    category: 'side',
    location: 'xuanming',
    title: '硬闯封锁',
    desc: '一名玄冥教力士守住山口。达到小星位后，你可以选择直接打穿这处外围封锁。',
    retryOnFail: true,
    conditions: [
      { type: 'eventCompleted', event: 's1_xuanming_formal_hunt_escalates' },
      { type: 'realmGte', value: 'small_star' },
      { type: 'eventNotCompleted', event: 's1_xuanming_formal_realm_breakthrough' }
    ],
    action: { type: 'battle', enemies: ['guard'] },
    rewards: { silver: 45, exp: 28, cultivation: 8, reputation: 8 },
    effects: [
      { type: 'setFlag', key: 'broke_xuanming_outer_blockade', value: true }
    ],
    log: '你正面击退守在山口的玄冥教力士。此事很快传开，但你没有继续深入玄冥教核心据点。',
    failureLog: '玄冥教力士守势沉重，你退回外围重新观察。这里不是非闯不可的路。'
  },
  {
    id: 's1_xuanming_formal_hidden_conflicting_orders',
    season: 1,
    category: 'hidden',
    location: 'xuanming',
    title: '两套号令',
    desc: '渝州那块不起眼的黑牌终于派上用场：同一条玄冥教传令线上，竟出现了两套彼此冲突的暗号。',
    conditions: [
      { type: 'eventCompleted', event: 's1_xuanming_formal_hunt_escalates' },
      { type: 'flagTrue', key: 'found_yuzhou_black_token' },
      { type: 'cultivationGte', value: 20 },
      { type: 'eventNotCompleted', event: 's1_xuanming_formal_hidden_conflicting_orders' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 12, cultivation: 8 },
    effects: [
      { type: 'setFlag', key: 'noticed_xuanming_internal_fracture', value: true }
    ],
    log: '黑牌上的旧暗号与新传令互相矛盾。你只能确认玄冥教内部并非铁板一块，却还不知道真正原因。'
  },
  {
    id: 's1_xuanming_formal_five_judges_pressure',
    season: 1,
    category: 'main',
    location: 'xuanming',
    title: '阎君压境',
    desc: '玄冥教对目标的追捕已经由外围探子升级到更高层级。五大阎君的名号开始频繁出现在江湖消息里。',
    conditions: [
      { type: 'eventCompleted', event: 's1_xuanming_formal_hunt_escalates' },
      { type: 'reputationGte', value: 65 },
      { type: 'eventNotCompleted', event: 's1_xuanming_formal_five_judges_pressure' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 25, reputation: 5 },
    effects: [
      { type: 'setQuest', value: '玄冥教内斗的迹象' }
    ],
    log: '你确认玄冥教的追捕层级已经升级。与此同时，黑白无常与阎君一系彼此提防的迹象也越来越明显。'
  },
  {
    id: 's1_xuanming_formal_internal_clue_known',
    season: 1,
    category: 'hidden',
    location: 'xuanming',
    title: '暗号互证',
    desc: '你把渝州黑牌上的旧暗号与近期传令对照，终于能确认：玄冥教内部存在不止一条彼此牵制的行动线。',
    conditions: [
      { type: 'eventCompleted', event: 's1_xuanming_formal_five_judges_pressure' },
      { type: 'flagTrue', key: 'found_yuzhou_black_token' },
      { type: 'eventNotCompleted', event: 's1_xuanming_formal_internal_clue_known' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 10 },
    effects: [
      { type: 'setFlag', key: 'xuanming_internal_routes_compared', value: true }
    ],
    log: '前后两批暗号终于对上了：玄冥教内部正在互相防备。你仍看不清谁在替谁办事，因此没有贸然揭底。'
  },
  {
    id: 's1_xuanming_formal_internal_clue_unknown',
    season: 1,
    category: 'side',
    location: 'xuanming',
    title: '街巷异样',
    desc: '你没有掌握更早的暗号，只能从近期动向判断：玄冥教内部的人似乎也在互相监视。',
    conditions: [
      { type: 'eventCompleted', event: 's1_xuanming_formal_five_judges_pressure' },
      { type: 'flagFalse', key: 'found_yuzhou_black_token' },
      { type: 'eventNotCompleted', event: 's1_xuanming_formal_internal_clue_unknown' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 6 },
    effects: [],
    log: '没有旧线索可供比对，你只能从近期的尾随和换岗判断玄冥教内部不太平。更深的原因仍藏在暗处。'
  },
  {
    id: 's1_xuanming_formal_underworld_emperor_enters',
    season: 1,
    category: 'main',
    location: 'xuanming',
    title: '冥帝入局',
    desc: '追捕持续升级，玄冥教内部的争斗也不再只是下属之间的私怨。冥帝朱友珪开始真正把目光投向这场棋局。',
    conditions: [
      { type: 'eventCompleted', event: 's1_xuanming_formal_five_judges_pressure' },
      { type: 'reputationGte', value: 75 },
      { type: 'eventNotCompleted', event: 's1_xuanming_formal_underworld_emperor_enters' }
    ],
    action: { type: 'instant' },
    rewards: { exp: 30, cultivation: 8, reputation: 8 },
    effects: [
      { type: 'setFlag', key: 's1_stage_c_complete', value: true },
      { type: 'unlockLocation', id: 'qiguo' },
      { type: 'unlockLocation', id: 'huanyinfang' },
      { type: 'setQuest', value: '幻音坊介入' },
      { type: 'setChapter', value: 's1_huanyinfang' }
    ],
    log: '玄冥教的搜捕与内斗已经上升到更高层级。与此同时，另一股势力也开始围绕李星云与龙泉剑重新部署。玄冥教篇至此收束。'
  }
];

export function getEvent(id) {
  return EVENTS.find(event => event.id === id) || null;
}

export function validateEventDefinition(event) {
  if (!event?.id || !event?.location || !event?.title) return false;
  if (!VALID_CATEGORIES.has(event.category)) return false;
  if (!Array.isArray(event.conditions)) return false;
  if (!event.action?.type) return false;
  return true;
}

export function getAvailableEvents(state, locationId) {
  return EVENTS.filter(event => {
    if (!validateEventDefinition(event)) return false;
    if (event.location !== locationId) return false;
    if (!event.repeatable && eventList(state, 'completed').includes(event.id)) return false;
    if (eventList(state, 'failed').includes(event.id) && !event.retryOnFail) return false;
    return checkConditions(event.conditions || [], state);
  });
}

function applyEffect(state, effect) {
  switch (effect.type) {
    case 'setFlag':
      state.world.flags[effect.key] = effect.value;
      break;
    case 'unlockLocation':
      if (!state.world.unlockedLocations.includes(effect.id)) state.world.unlockedLocations.push(effect.id);
      break;
    case 'setQuest':
      state.world.quest = effect.value;
      break;
    case 'setChapter':
      state.world.chapter = effect.value;
      break;
    case 'setSeason':
      state.world.season = effect.value;
      break;
    case 'changeAffinity': {
      const rel = state.relationships?.[effect.character];
      if (rel) {
        rel.affinity = Math.max(-100, Math.min(100, rel.affinity + effect.value));
        rel.relationStage = relationStage(rel);
      }
      break;
    }
    case 'setCharacterMet': {
      const rel = state.relationships?.[effect.character];
      if (rel) {
        rel.met = effect.value !== false;
        rel.relationStage = relationStage(rel);
      }
      break;
    }
    case 'setPersonalFlag': {
      const rel = state.relationships?.[effect.character];
      if (rel) {
        rel.personalFlags = rel.personalFlags || {};
        rel.personalFlags[effect.key] = effect.value;
      }
      break;
    }
    case 'addItem':
      state.inventory.items[effect.item] = (state.inventory.items[effect.item] || 0) + (effect.count || 1);
      break;
    case 'removeItem':
      state.inventory.items[effect.item] = Math.max(0, (state.inventory.items[effect.item] || 0) - (effect.count || 1));
      break;
    case 'incrementCounter': {
      const counters = ensureCounters(state);
      const current = Number.isFinite(counters[effect.key]) ? counters[effect.key] : 0;
      const amount = Number.isFinite(effect.value) ? effect.value : 1;
      counters[effect.key] = Math.max(0, current + amount);
      break;
    }
  }
}

export function beginEvent(state, eventId) {
  const event = getEvent(eventId);
  if (!event || !validateEventDefinition(event)) return { ok: false, event };
  if (!event.repeatable && eventList(state, 'completed').includes(event.id)) return { ok: false, event };
  if (eventList(state, 'failed').includes(event.id) && !event.retryOnFail) return { ok: false, event };
  if (!checkConditions(event.conditions || [], state)) return { ok: false, event };
  addUnique(eventList(state, 'active'), event.id);
  return { ok: true, event };
}

export function completeEvent(state, eventId) {
  const event = getEvent(eventId);
  if (!event || !validateEventDefinition(event)) return { ok: false, event: event || null, levels: 0 };
  if (!event.repeatable && eventList(state, 'completed').includes(event.id)) return { ok: false, event, levels: 0 };
  if (!checkConditions(event.conditions || [], state)) return { ok: false, event, levels: 0 };

  const rewardsResult = applyRewards(state, event.rewards || {});
  for (const effect of event.effects || []) applyEffect(state, effect);
  removeValue(eventList(state, 'active'), event.id);
  removeValue(eventList(state, 'failed'), event.id);
  if (!event.repeatable) addUnique(eventList(state, 'completed'), event.id);
  if (event.log) state.logs.unshift(event.log);
  state.logs = state.logs.slice(0, 30);
  return { ok: true, event, levels: rewardsResult.levels };
}

export function failEvent(state, eventId) {
  const event = getEvent(eventId);
  if (!event || !validateEventDefinition(event)) return { ok: false, event: event || null };
  removeValue(eventList(state, 'active'), event.id);
  addUnique(eventList(state, 'failed'), event.id);
  if (event.failureLog) state.logs.unshift(event.failureLog);
  state.logs = state.logs.slice(0, 30);
  return { ok: true, event };
}
