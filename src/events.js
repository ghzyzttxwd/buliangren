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

// v0.3 第一季正式内容从新事件 ID 开始。
// v0.2 的测试事件和 skeleton 完成记录仍可留在旧存档中，但不再作为正式内容显示。
export const EVENTS = [
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
