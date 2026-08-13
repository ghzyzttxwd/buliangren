import { checkConditions } from './conditions.js';
import { applyRewards } from './progression.js';

export const EVENTS = [
  {
    id: 's1_yuzhou_scout',
    season: 1,
    category: 'main',
    location: 'yuzhou',
    title: '驿道疑云',
    desc: '城南驿道发现玄冥教踪迹。',
    conditions: [{ type: 'flagFalse', key: 'scoutDefeated' }],
    action: { type: 'battle', enemies: ['scout'] },
    rewards: { silver: 60, exp: 35, cultivation: 10, reputation: 20 },
    effects: [
      { type: 'setFlag', key: 'scoutDefeated', value: true },
      { type: 'unlockLocation', id: 'cangbing' },
      { type: 'setQuest', value: '旧谷暗号' },
      { type: 'setChapter', value: 's1_yuzhou' }
    ],
    log: '你与蚩梦击退玄冥教探子，搜到指向藏兵谷的旧暗号。'
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
    conditions: [
      { type: 'locationUnlocked', location: 'cangbing' },
      { type: 'flagFalse', key: 'cangbingGuardDefeated' }
    ],
    action: { type: 'battle', enemies: ['guard'] },
    rewards: { silver: 90, exp: 55, cultivation: 15, reputation: 15 },
    effects: [{ type: 'setFlag', key: 'cangbingGuardDefeated', value: true }],
    log: '你击退藏兵谷口的玄冥教力士。'
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
  }
];

export function getEvent(id) {
  return EVENTS.find(event => event.id === id) || null;
}

export function getAvailableEvents(state, locationId) {
  return EVENTS.filter(event => {
    if (event.location !== locationId) return false;
    if (!event.repeatable && state.events.completed.includes(event.id)) return false;
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
    case 'changeAffinity': {
      const rel = state.relationships?.[effect.character];
      if (rel) rel.affinity = Math.max(-100, Math.min(100, rel.affinity + effect.value));
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

export function completeEvent(state, eventId) {
  const event = getEvent(eventId);
  if (!event) return { ok: false, event: null, levels: 0 };
  if (!event.repeatable && state.events.completed.includes(event.id)) return { ok: false, event, levels: 0 };

  const rewardsResult = applyRewards(state, event.rewards || {});
  for (const effect of event.effects || []) applyEffect(state, effect);
  if (!event.repeatable) state.events.completed.push(event.id);
  if (event.log) state.logs.unshift(event.log);
  state.logs = state.logs.slice(0, 30);
  return { ok: true, event, levels: rewardsResult.levels };
}
