import { GAME_VERSION, SAVE_VERSION } from './version.js';

const KEY_V2 = 'buliangren_jianghuxing_save_v2';
const LEGACY_KEY_V1 = 'buliangren_jianghuxing_save_v1';

function martialArt(learned = true, mastery = 1, exp = 0) {
  return { learned, mastery, exp };
}

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

function normalizeRelationships(relationships = {}) {
  for (const rel of Object.values(relationships)) {
    if (!rel || typeof rel !== 'object') continue;
    rel.affinity = Math.max(-100, Math.min(100, Number.isFinite(rel.affinity) ? rel.affinity : 0));
    rel.relationStage = relationStage(rel);
    if (!rel.personalFlags || typeof rel.personalFlags !== 'object' || Array.isArray(rel.personalFlags)) {
      rel.personalFlags = {};
    }
  }
  return relationships;
}

export function defaultState() {
  const now = Date.now();
  return {
    saveVersion: SAVE_VERSION,
    gameVersion: GAME_VERSION,
    player: {
      name: '无名少侠',
      level: 1,
      exp: 0,
      cultivation: 0,
      realm: 'unranked',
      silver: 120,
      stamina: 40,
      maxStamina: 40
    },
    world: {
      season: 1,
      chapter: 's1_prologue',
      reputation: 0,
      quest: '驿道疑云',
      unlockedLocations: ['yuzhou'],
      flags: {
        introSeen: false,
        scoutDefeated: false,
        cangbingVisited: false,
        cangbingGuardDefeated: false,
        chapter1Done: false
      }
    },
    relationships: {
      chimeng: { met: true, affinity: 20, relationStage: 'familiar', personalFlags: {} },
      nvdi: { met: false, affinity: 0, relationStage: 'unknown', personalFlags: {} },
      jiangchen: { met: false, affinity: 0, relationStage: 'unknown', personalFlags: {} }
    },
    party: ['player', 'chimeng'],
    martialArts: {
      basic_sword: martialArt(),
      qi_burst: martialArt(),
      butterfly_dart: martialArt(),
      miao_heal: martialArt()
    },
    inventory: {
      items: { healing_powder: 3, old_coin: 1, cloth_bracer: 1 },
      equipment: { weapon: null, armor: null, accessory: null }
    },
    events: { completed: [], failed: [], active: [], counters: {} },
    logs: ['你在渝州醒来。远处的城门下，黑衣人一闪而过。'],
    meta: { createdAt: now, savedAt: now, playCount: 1 }
  };
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, incoming) {
  if (!isPlainObject(incoming)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) out[key] = [...value];
    else if (isPlainObject(value) && isPlainObject(base[key])) out[key] = deepMerge(base[key], value);
    else if (value !== undefined) out[key] = value;
  }
  return out;
}

function unlock(state, id) {
  if (!state.world.unlockedLocations.includes(id)) state.world.unlockedLocations.push(id);
}

function normalizeV2(raw) {
  const state = deepMerge(defaultState(), raw);
  state.saveVersion = SAVE_VERSION;
  state.gameVersion = GAME_VERSION;
  state.world.unlockedLocations = [...new Set(['yuzhou', ...(state.world.unlockedLocations || [])])];
  if (state.world.flags.scoutDefeated) unlock(state, 'cangbing');
  if (state.world.flags.cangbingGuardDefeated) unlock(state, 'xuanming');
  if (state.world.flags.s1_xuanming_node_done) {
    unlock(state, 'qiguo');
    unlock(state, 'huanyinfang');
  }
  if (state.world.flags.s1_huanyinfang_node_done) unlock(state, 'tongwenguan');
  if (state.world.flags.s1_tongwenguan_node_done) unlock(state, 'longquan');
  if (state.world.flags.chapter1Done) unlock(state, 'qiguo');
  normalizeRelationships(state.relationships);
  return state;
}

export function migrateSave(raw) {
  if (!raw || typeof raw !== 'object') return defaultState();
  if (raw.saveVersion === SAVE_VERSION || raw.player || raw.world) return normalizeV2(raw);

  const state = defaultState();
  const flags = raw.flags || {};
  const mastery = raw.mastery || {};

  state.player.name = raw.playerName || state.player.name;
  state.player.level = Number.isFinite(raw.level) ? raw.level : state.player.level;
  state.player.exp = Number.isFinite(raw.exp) ? raw.exp : state.player.exp;
  state.player.silver = Number.isFinite(raw.silver) ? raw.silver : state.player.silver;
  state.player.stamina = Number.isFinite(raw.stamina) ? raw.stamina : state.player.stamina;
  state.player.maxStamina = Number.isFinite(raw.maxStamina) ? raw.maxStamina : state.player.maxStamina;

  state.party = Array.isArray(raw.party) && raw.party.length ? [...raw.party] : state.party;
  state.world.quest = raw.quest || state.world.quest;
  state.world.flags = { ...state.world.flags, ...flags };
  state.world.reputation = (flags.scoutDefeated ? 20 : 0) + (flags.cangbingVisited ? 15 : 0);

  if (flags.scoutDefeated) state.world.unlockedLocations.push('cangbing');
  if (flags.cangbingGuardDefeated) state.world.unlockedLocations.push('xuanming');
  if (flags.chapter1Done) state.world.unlockedLocations.push('qiguo');
  state.world.unlockedLocations = [...new Set(state.world.unlockedLocations)];

  for (const [id, level] of Object.entries(mastery)) {
    state.martialArts[id] = martialArt(true, Number.isFinite(level) ? level : 1, 0);
  }

  if (Array.isArray(raw.logs) && raw.logs.length) state.logs = [...raw.logs];
  if (Number.isFinite(raw.savedAt)) state.meta.savedAt = raw.savedAt;
  state.logs.unshift('存档已从 Prototype v0.1 自动迁移至 v0.2.0。');

  return normalizeV2(state);
}

export function loadState() {
  try {
    const current = localStorage.getItem(KEY_V2);
    if (current) return normalizeV2(JSON.parse(current));

    const legacy = localStorage.getItem(LEGACY_KEY_V1);
    if (legacy) {
      const migrated = migrateSave(JSON.parse(legacy));
      saveState(migrated);
      return migrated;
    }
  } catch (error) {
    console.warn('读取存档失败，已使用安全默认存档。', error);
  }
  return defaultState();
}

export function saveState(state) {
  const safe = normalizeV2(state);
  safe.meta.savedAt = Date.now();
  localStorage.setItem(KEY_V2, JSON.stringify(safe));
  return safe;
}

export function resetState() {
  localStorage.removeItem(KEY_V2);
  localStorage.removeItem(LEGACY_KEY_V1);
  return defaultState();
}
