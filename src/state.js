import { GAME_VERSION, SAVE_VERSION } from './version.js';

const KEY_V2 = 'buliangren_jianghuxing_save_v2';
const LEGACY_KEY_V1 = 'buliangren_jianghuxing_save_v1';

function martialArt(learned = true, mastery = 1, exp = 0) {
  return { learned, mastery, exp };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value, fallback, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
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

function normalizeRelationships(input, defaults) {
  const relationships = isPlainObject(input) ? deepMerge(defaults, input) : deepMerge({}, defaults);
  for (const [id, fallback] of Object.entries(defaults)) {
    const rel = isPlainObject(relationships[id]) ? relationships[id] : { ...fallback };
    rel.met = rel.met === true;
    rel.affinity = finiteNumber(rel.affinity, fallback.affinity, -100, 100);
    rel.personalFlags = isPlainObject(rel.personalFlags) ? rel.personalFlags : {};
    rel.relationStage = relationStage(rel);
    relationships[id] = rel;
  }
  return relationships;
}

function normalizeMartialArts(input, defaults) {
  const source = isPlainObject(input) ? input : {};
  const result = {};
  for (const [id, value] of Object.entries({ ...defaults, ...source })) {
    const fallback = defaults[id] || martialArt(false, 1, 0);
    const art = isPlainObject(value) ? value : fallback;
    result[id] = {
      learned: art.learned === true,
      mastery: finiteNumber(art.mastery, fallback.mastery ?? 1, 1, 999),
      exp: finiteNumber(art.exp, fallback.exp ?? 0, 0)
    };
  }
  return result;
}

function normalizeInventory(input, defaults) {
  const inventory = isPlainObject(input) ? deepMerge(defaults, input) : deepMerge({}, defaults);
  inventory.items = isPlainObject(inventory.items) ? inventory.items : { ...defaults.items };
  for (const [id, count] of Object.entries(inventory.items)) {
    inventory.items[id] = finiteNumber(count, 0, 0);
  }
  inventory.equipment = isPlainObject(inventory.equipment)
    ? deepMerge(defaults.equipment, inventory.equipment)
    : { ...defaults.equipment };
  return inventory;
}

function normalizeEvents(input, defaults) {
  const events = isPlainObject(input) ? deepMerge(defaults, input) : deepMerge({}, defaults);
  for (const key of ['completed', 'failed', 'active']) {
    events[key] = Array.isArray(events[key])
      ? [...new Set(events[key].filter(value => typeof value === 'string'))]
      : [];
  }
  events.counters = isPlainObject(events.counters) ? events.counters : {};
  return events;
}

function unlock(state, id) {
  if (!state.world.unlockedLocations.includes(id)) state.world.unlockedLocations.push(id);
}

function normalizeV2(raw) {
  const defaults = defaultState();
  const source = isPlainObject(raw) ? raw : {};
  const state = deepMerge(defaults, source);

  state.saveVersion = SAVE_VERSION;
  state.gameVersion = GAME_VERSION;

  state.player = isPlainObject(state.player) ? deepMerge(defaults.player, state.player) : { ...defaults.player };
  state.player.name = typeof state.player.name === 'string' && state.player.name.trim() ? state.player.name : defaults.player.name;
  state.player.level = Math.floor(finiteNumber(state.player.level, defaults.player.level, 1, 999));
  state.player.exp = finiteNumber(state.player.exp, defaults.player.exp, 0);
  state.player.cultivation = finiteNumber(state.player.cultivation, defaults.player.cultivation, 0);
  state.player.realm = typeof state.player.realm === 'string' ? state.player.realm : defaults.player.realm;
  state.player.silver = finiteNumber(state.player.silver, defaults.player.silver, 0);
  state.player.maxStamina = finiteNumber(state.player.maxStamina, defaults.player.maxStamina, 1);
  state.player.stamina = finiteNumber(state.player.stamina, defaults.player.stamina, 0, state.player.maxStamina);

  state.world = isPlainObject(state.world) ? deepMerge(defaults.world, state.world) : deepMerge({}, defaults.world);
  state.world.season = Math.floor(finiteNumber(state.world.season, defaults.world.season, 1, 99));
  state.world.chapter = typeof state.world.chapter === 'string' ? state.world.chapter : defaults.world.chapter;
  state.world.reputation = finiteNumber(state.world.reputation, defaults.world.reputation, 0);
  state.world.quest = typeof state.world.quest === 'string' ? state.world.quest : defaults.world.quest;
  state.world.flags = isPlainObject(state.world.flags) ? state.world.flags : { ...defaults.world.flags };
  state.world.unlockedLocations = Array.isArray(state.world.unlockedLocations)
    ? [...new Set(['yuzhou', ...state.world.unlockedLocations.filter(value => typeof value === 'string')])]
    : ['yuzhou'];

  state.relationships = normalizeRelationships(state.relationships, defaults.relationships);
  state.party = Array.isArray(state.party)
    ? [...new Set(state.party.filter(value => typeof value === 'string'))]
    : [...defaults.party];
  if (!state.party.length) state.party = [...defaults.party];
  state.martialArts = normalizeMartialArts(state.martialArts, defaults.martialArts);
  state.inventory = normalizeInventory(state.inventory, defaults.inventory);
  state.events = normalizeEvents(state.events, defaults.events);
  state.logs = Array.isArray(state.logs)
    ? state.logs.filter(value => typeof value === 'string').slice(0, 30)
    : [...defaults.logs];
  state.meta = isPlainObject(state.meta) ? deepMerge(defaults.meta, state.meta) : { ...defaults.meta };
  state.meta.createdAt = finiteNumber(state.meta.createdAt, defaults.meta.createdAt, 0);
  state.meta.savedAt = finiteNumber(state.meta.savedAt, defaults.meta.savedAt, 0);
  state.meta.playCount = Math.floor(finiteNumber(state.meta.playCount, defaults.meta.playCount, 0));

  if (state.world.flags.scoutDefeated) unlock(state, 'cangbing');
  if (state.world.flags.cangbingGuardDefeated) unlock(state, 'xuanming');
  if (state.world.flags.s1_xuanming_node_done) {
    unlock(state, 'qiguo');
    unlock(state, 'huanyinfang');
  }
  if (state.world.flags.s1_huanyinfang_node_done) unlock(state, 'tongwenguan');
  if (state.world.flags.s1_tongwenguan_node_done) unlock(state, 'longquan');
  if (state.world.flags.chapter1Done) unlock(state, 'qiguo');

  return state;
}

export function migrateSave(raw) {
  if (!isPlainObject(raw)) return defaultState();
  if (raw.saveVersion === SAVE_VERSION || raw.player || raw.world) return normalizeV2(raw);

  const state = defaultState();
  const flags = isPlainObject(raw.flags) ? raw.flags : {};
  const mastery = isPlainObject(raw.mastery) ? raw.mastery : {};

  state.player.name = typeof raw.playerName === 'string' && raw.playerName.trim() ? raw.playerName : state.player.name;
  state.player.level = Math.floor(finiteNumber(raw.level, state.player.level, 1, 999));
  state.player.exp = finiteNumber(raw.exp, state.player.exp, 0);
  state.player.silver = finiteNumber(raw.silver, state.player.silver, 0);
  state.player.stamina = finiteNumber(raw.stamina, state.player.stamina, 0);
  state.player.maxStamina = finiteNumber(raw.maxStamina, state.player.maxStamina, 1);

  state.party = Array.isArray(raw.party) && raw.party.length ? [...raw.party] : state.party;
  state.world.quest = typeof raw.quest === 'string' ? raw.quest : state.world.quest;
  state.world.flags = { ...state.world.flags, ...flags };
  state.world.reputation = (flags.scoutDefeated ? 20 : 0) + (flags.cangbingVisited ? 15 : 0);

  if (flags.scoutDefeated) state.world.unlockedLocations.push('cangbing');
  if (flags.cangbingGuardDefeated) state.world.unlockedLocations.push('xuanming');
  if (flags.chapter1Done) state.world.unlockedLocations.push('qiguo');
  state.world.unlockedLocations = [...new Set(state.world.unlockedLocations)];

  for (const [id, level] of Object.entries(mastery)) {
    state.martialArts[id] = martialArt(true, finiteNumber(level, 1, 1, 999), 0);
  }

  if (Array.isArray(raw.logs) && raw.logs.length) state.logs = raw.logs.filter(value => typeof value === 'string');
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
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(safe));
  } catch (error) {
    console.warn('写入存档失败，本次状态仍保留在内存中。', error);
  }
  return safe;
}

export function resetState() {
  localStorage.removeItem(KEY_V2);
  localStorage.removeItem(LEGACY_KEY_V1);
  return defaultState();
}
