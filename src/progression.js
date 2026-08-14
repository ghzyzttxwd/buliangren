export const REALMS = [
  { id: 'unranked', name: '无品', order: 0, cultivationRequired: 0 },
  { id: 'small_star', name: '小星位', order: 1, cultivationRequired: 50 },
  { id: 'middle_star', name: '中星位', order: 2, cultivationRequired: 140 },
  { id: 'great_star', name: '大星位', order: 3, cultivationRequired: 300 },
  { id: 'small_heaven', name: '小天位', order: 4, cultivationRequired: 600 },
  { id: 'middle_heaven', name: '中天位', order: 5, cultivationRequired: 1000 },
  { id: 'great_heaven', name: '大天位', order: 6, cultivationRequired: 1600 },
  { id: 'shenxiao', name: '神霄位', order: 7, cultivationRequired: 2600 }
];

export function getRealm(id) {
  return REALMS.find(realm => realm.id === id) || REALMS[0];
}

export function getRealmName(id) {
  return getRealm(id).name;
}

export function getNextRealm(id) {
  const current = getRealm(id);
  return REALMS.find(realm => realm.order === current.order + 1) || null;
}

export function getBreakthroughInfo(state) {
  const current = getRealm(state.player.realm);
  const next = getNextRealm(current.id);
  if (!next) return { current, next: null, canBreakthrough: false, remaining: 0 };
  const remaining = Math.max(0, next.cultivationRequired - state.player.cultivation);
  return { current, next, canBreakthrough: remaining === 0, remaining };
}

export function tryBreakthrough(state) {
  const info = getBreakthroughInfo(state);
  if (!info.next || !info.canBreakthrough) return { ok: false, info };
  state.player.realm = info.next.id;
  return { ok: true, realm: info.next, info: getBreakthroughInfo(state) };
}

export function expRequiredForNextLevel(level) {
  return 80 + Math.max(0, level - 1) * 45;
}

export function addExperience(state, amount) {
  let gainedLevels = 0;
  state.player.exp += Math.max(0, amount || 0);
  while (state.player.exp >= expRequiredForNextLevel(state.player.level)) {
    state.player.exp -= expRequiredForNextLevel(state.player.level);
    state.player.level += 1;
    gainedLevels += 1;
  }
  return gainedLevels;
}

export function getReputationRank(value = 0) {
  if (value >= 200) return '声名渐起';
  if (value >= 100) return '江湖新秀';
  if (value >= 50) return '小有名气';
  return '无名小卒';
}

export function applyRewards(state, rewards = {}) {
  const result = { levels: 0 };
  if (rewards.silver) state.player.silver = Math.max(0, state.player.silver + rewards.silver);
  if (rewards.exp) result.levels = addExperience(state, rewards.exp);
  if (rewards.cultivation) state.player.cultivation = Math.max(0, state.player.cultivation + rewards.cultivation);
  if (rewards.reputation) state.world.reputation = Math.max(0, state.world.reputation + rewards.reputation);
  if (rewards.learnMartialArt) {
    state.martialArts = state.martialArts || {};
    const current = state.martialArts[rewards.learnMartialArt] || {};
    state.martialArts[rewards.learnMartialArt] = {
      learned: true,
      mastery: Number.isFinite(current.mastery) ? Math.max(1, current.mastery) : 1,
      exp: Number.isFinite(current.exp) ? Math.max(0, current.exp) : 0
    };
  }
  if (rewards.martialArtMastery?.id) {
    const art = state.martialArts?.[rewards.martialArtMastery.id];
    if (art?.learned) {
      const amount = Number.isFinite(rewards.martialArtMastery.amount) ? rewards.martialArtMastery.amount : 1;
      art.mastery = Math.max(1, (Number.isFinite(art.mastery) ? art.mastery : 1) + amount);
    }
  }
  return result;
}
