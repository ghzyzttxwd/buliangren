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

export const EVENTS = [
  {
    id: 's1_yuzhou_scout',
    season: 1,
    category: 'main',
    location: 'yuzhou',
    title: '驿道疑云',
    desc: '城南驿道发现玄冥教踪迹。',
    retryOnFail: true,
    conditions: [{ type: 'flagFalse', key: 'scoutDefeated' }],
    action: { type: 'battle', enemies: ['scout'] },
    rewards: { silver: 60, exp: 35, cultivation: 10, reputation: 20 },
    effects: [
      { type: 'setFlag', key: 'scoutDefeated', value: true },
      { type: 'unlockLocation', id: 'cangbing' },
      { type: 'setQuest', value: '旧谷暗号' },
      { type: 'setChapter', value: 's1_yuzhou' }
    ],
    log: '你与蚩梦击退玄冥教探子，搜到指向藏兵谷的旧暗号。',
    failureLog: '你暂时没能拿下玄冥教探子，只得先退回渝州整顿。'
  },
  {
    id: 's1_yuzhou_training',
    season: 1,
    category: 'encounter',
    location: 'yuzhou',
    title: '城外练功',
    desc: '寻一处僻静之地打熬筋骨，积蓄修为。',
    repeatable: true,
    conditions: [],
    action: { type: 'instant' },
    rewards: { cultivation: 5, exp: 4 },
    effects: [],
    log: '你在渝州城外练了一阵功，气息比先前凝实了几分。'
  },
  {
    id: 's1_yuzhou_rumor',
    season: 1,
    category: 'side',
    location: 'yuzhou',
    title: '客栈传闻',
    desc: '你的名声传开后，客栈里有人主动谈起玄冥教的异动。',
    conditions: [
      { type: 'reputationGte', value: 20 },
      { type: 'eventNotCompleted', event: 's1_yuzhou_rumor' }
    ],
    action: { type: 'instant' },
    rewards: { cultivation: 5 },
    effects: [{ type: 'setFlag', key: 'heard_xuanming_rumor', value: true }],
    log: '你从客栈行商口中听到：近日有玄冥教高手往西而去。'
  },
  {
    id: 's1_chimeng_chat_01',
    season: 1,
    category: 'character',
    location: 'yuzhou',
    title: '蚩梦的试探',
    desc: '蚩梦似乎有话想说，却故意绕着弯子。',
    conditions: [
      { type: 'affinityGte', character: 'chimeng', value: 20 },
      { type: 'eventNotCompleted', event: 's1_chimeng_chat_01' }
    ],
    action: { type: 'instant' },
    rewards: {},
    effects: [{ type: 'changeAffinity', character: 'chimeng', value: 5 }],
    log: '你没有拆穿蚩梦拐弯抹角的试探，她对你的态度明显亲近了一些。'
  },
  {
    id: 's1_chimeng_chat_02',
    season: 1,
    category: 'character',
    location: 'yuzhou',
    title: '蚩梦的认真话',
    desc: '经过上一次交谈，蚩梦终于愿意把真正担心的事情告诉你。',
    conditions: [
      { type: 'eventCompleted', event: 's1_chimeng_chat_01' },
      { type: 'affinityGte', character: 'chimeng', value: 25 },
      { type: 'eventNotCompleted', event: 's1_chimeng_chat_02' }
    ],
    action: { type: 'instant' },
    rewards: {},
    effects: [
      { type: 'changeAffinity', character: 'chimeng', value: 5 },
      { type: 'setPersonalFlag', character: 'chimeng', key: 'shared_real_concern', value: true }
    ],
    log: '蚩梦收起玩笑，第一次认真向你说起自己真正担心的事。你们之间的信任更深了一层。'
  },
  {
    id: 's1_cangbing_mark',
    season: 1,
    category: 'main',
    location: 'cangbing',
    title: '石壁旧印',
    desc: '调查石壁上的不良人暗记。',
    conditions: [
      { type: 'locationUnlocked', location: 'cangbing' },
      { type: 'flagFalse', key: 'cangbingVisited' }
    ],
    action: { type: 'instant' },
    rewards: { silver: 30, reputation: 5 },
    effects: [
      { type: 'setFlag', key: 'cangbingVisited', value: true },
      { type: 'setChapter', value: 's1_xuanming' }
    ],
    log: '你在藏兵谷石壁发现不良人暗记。蚩梦认出其中藏着一个“岐”字。'
  },
  {
    id: 's1_cangbing_guard',
    season: 1,
    category: 'encounter',
    location: 'cangbing',
    title: '深入谷口',
    desc: '玄冥教力士守在谷口深处。',
    retryOnFail: true,
    conditions: [
      { type: 'locationUnlocked', location: 'cangbing' },
      { type: 'flagFalse', key: 'cangbingGuardDefeated' }
    ],
    action: { type: 'battle', enemies: ['guard'] },
    rewards: { silver: 90, exp: 55, cultivation: 15, reputation: 15 },
    effects: [{ type: 'setFlag', key: 'cangbingGuardDefeated', value: true }],
    log: '你击退藏兵谷口的玄冥教力士。',
    failureLog: '玄冥教力士守势沉重，你暂时退回谷外。'
  },
  {
    id: 's1_hidden_stranger',
    season: 1,
    category: 'hidden',
    location: 'yuzhou',
    title: '山道上的陌生人',
    desc: '一名看不出深浅的陌生人站在山道尽头。',
    conditions: [
      { type: 'realmGte', value: 'small_star' },
      { type: 'reputationLte', value: 40 },
      { type: 'eventNotCompleted', event: 's1_hidden_stranger' }
    ],
    action: { type: 'instant' },
    rewards: { cultivation: 20 },
    effects: [{ type: 'setFlag', key: 'met_hidden_stranger', value: true }],
    log: '陌生人只与你过了一招便收手，临走前说：“星位，不过是入门。”'
  },
  {
    id: 's1_hidden_abandoned_post',
    season: 1,
    category: 'hidden',
    location: 'yuzhou',
    title: '废驿下的铜牌',
    desc: '听过客栈传闻后，你在城西废驿发现了一块被泥土掩住的旧铜牌。',
    conditions: [
      { type: 'flagTrue', key: 'heard_xuanming_rumor' },
      { type: 'realmGte', value: 'small_star' },
      { type: 'eventNotCompleted', event: 's1_hidden_abandoned_post' }
    ],
    action: { type: 'instant' },
    rewards: { cultivation: 10 },
    effects: [
      { type: 'addItem', item: 'old_coin', count: 1 },
      { type: 'setFlag', key: 'found_abandoned_post_token', value: true }
    ],
    log: '你在废驿梁柱下翻出一块旧铜牌，纹路与玄冥教近期的行踪似乎有关。'
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
