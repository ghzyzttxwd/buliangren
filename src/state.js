const KEY = 'buliangren_jianghuxing_save_v1';

export function defaultState() {
  return {
    version: 1,
    playerName: '无名少侠',
    level: 1,
    exp: 0,
    silver: 120,
    stamina: 40,
    maxStamina: 40,
    party: ['player', 'chimeng'],
    flags: { introSeen:false, scoutDefeated:false, cangbingVisited:false, chapter1Done:false },
    quest: '驿道疑云',
    logs: ['你在渝州醒来。远处的城门下，黑衣人一闪而过。'],
    mastery: { basic_sword:1, qi_burst:1, butterfly_dart:1, miao_heal:1 },
    savedAt: Date.now()
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch { return defaultState(); }
}

export function saveState(state) {
  state.savedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(KEY);
  return defaultState();
}
