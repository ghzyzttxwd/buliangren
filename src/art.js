// v0.7 Stage A/B: centralized art registry.
// UI may consume this registry, but gameplay/state must never depend on an image being available.

export const ART_STATUS = Object.freeze({
  ready: 'ready',
  candidate: 'candidate',
  referenceOnly: 'reference-only',
  generateIfNeeded: 'generate-if-needed',
  deferred: 'deferred'
});

const asset = (id, kind, options = {}) => Object.freeze({
  id,
  kind,
  status: options.status || ART_STATUS.candidate,
  localPath: options.localPath || null,
  fallback: options.fallback || null,
  owner: options.owner || null,
  note: options.note || ''
});

export const ART_ASSETS = Object.freeze({
  // Character portraits
  'player-portrait': asset('player-portrait', 'portrait', {
    status: ART_STATUS.generateIfNeeded,
    fallback: { type: 'character-glyph', value: '侠' },
    owner: 'player',
    note: 'Stage B sourcing complete: legal free wuxia candidates were found, but none matched the project visual direction well enough for final use.'
  }),
  'chimeng-portrait': asset('chimeng-portrait', 'portrait', {
    status: ART_STATUS.generateIfNeeded,
    fallback: { type: 'character-glyph', value: '梦' },
    owner: 'chimeng',
    note: 'Official promotional art is reference-only; no redistributable final portrait license was identified during Stage B sourcing.'
  }),
  'nvdi-portrait': asset('nvdi-portrait', 'portrait', {
    status: ART_STATUS.generateIfNeeded,
    fallback: { type: 'character-glyph', value: '岐' },
    owner: 'nvdi',
    note: 'Official promotional art is reference-only; no redistributable final portrait license was identified during Stage B sourcing.'
  }),
  'jiangchen-portrait': asset('jiangchen-portrait', 'portrait', {
    status: ART_STATUS.deferred,
    fallback: { type: 'character-glyph', value: '臣' },
    owner: 'jiangchen',
    note: 'Not part of the first v0.7 production batch.'
  }),

  // Battle sprites
  'player-battle': asset('player-battle', 'battle-sprite', {
    status: ART_STATUS.generateIfNeeded,
    fallback: { type: 'battle-card', value: '无名少侠' },
    owner: 'player'
  }),
  'chimeng-battle': asset('chimeng-battle', 'battle-sprite', {
    status: ART_STATUS.candidate,
    fallback: { type: 'battle-card', value: '蚩梦' },
    owner: 'chimeng'
  }),
  'nvdi-battle': asset('nvdi-battle', 'battle-sprite', {
    status: ART_STATUS.candidate,
    fallback: { type: 'battle-card', value: '女帝' },
    owner: 'nvdi'
  }),
  'enemy-scout-battle': asset('enemy-scout-battle', 'battle-sprite', {
    status: ART_STATUS.candidate,
    fallback: { type: 'battle-card', value: '玄冥教探子' },
    owner: 'scout'
  }),
  'enemy-guard-battle': asset('enemy-guard-battle', 'battle-sprite', {
    status: ART_STATUS.candidate,
    fallback: { type: 'battle-card', value: '玄冥教力士' },
    owner: 'guard'
  }),
  'enemy-blackwuchang-battle': asset('enemy-blackwuchang-battle', 'battle-sprite', {
    status: ART_STATUS.candidate,
    fallback: { type: 'battle-card', value: '黑无常' },
    owner: 'blackwuchang'
  }),
  'enemy-palace-guard-battle': asset('enemy-palace-guard-battle', 'battle-sprite', {
    status: ART_STATUS.candidate,
    fallback: { type: 'battle-card', value: '焦兰殿禁卫' },
    owner: 'palace_guard'
  }),

  // Ultimate / key skill cut-ins
  'player-folding-wind-cutin': asset('player-folding-wind-cutin', 'cutin', {
    status: ART_STATUS.generateIfNeeded,
    fallback: { type: 'skill-title', value: '折风剑式' },
    owner: 'folding_wind_sword'
  }),
  'chimeng-cutin': asset('chimeng-cutin', 'cutin', {
    status: ART_STATUS.candidate,
    fallback: { type: 'skill-title', value: '蝶影毒镖' },
    owner: 'chimeng'
  }),
  'nvdi-cutin': asset('nvdi-cutin', 'cutin', {
    status: ART_STATUS.candidate,
    fallback: { type: 'skill-title', value: '岐王斩' },
    owner: 'nvdi'
  }),

  // Backgrounds
  'world-bg': asset('world-bg', 'background', {
    status: ART_STATUS.candidate,
    fallback: { type: 'css-background', value: 'world' }
  }),
  'yuzhou-bg': asset('yuzhou-bg', 'background', {
    status: ART_STATUS.candidate,
    fallback: { type: 'css-background', value: 'location' }
  }),
  'battle-city-bg': asset('battle-city-bg', 'background', {
    status: ART_STATUS.candidate,
    fallback: { type: 'css-background', value: 'battle' }
  }),
  'battle-wilderness-bg': asset('battle-wilderness-bg', 'background', {
    status: ART_STATUS.candidate,
    fallback: { type: 'css-background', value: 'battle' }
  }),
  'raojiang-bg': asset('raojiang-bg', 'background', {
    status: ART_STATUS.candidate,
    fallback: { type: 'css-background', value: 'location' }
  }),

  // Reusable effects. The first implementation should prefer CSS/SVG/CC0 assets.
  'fx-hit': asset('fx-hit', 'effect', { status: ART_STATUS.candidate, fallback: { type: 'css-effect', value: 'hit' } }),
  'fx-slash': asset('fx-slash', 'effect', { status: ART_STATUS.candidate, fallback: { type: 'css-effect', value: 'slash' } }),
  'fx-poison': asset('fx-poison', 'effect', { status: ART_STATUS.candidate, fallback: { type: 'css-effect', value: 'poison' } }),
  'fx-heal': asset('fx-heal', 'effect', { status: ART_STATUS.candidate, fallback: { type: 'css-effect', value: 'heal' } }),
  'fx-shield': asset('fx-shield', 'effect', { status: ART_STATUS.candidate, fallback: { type: 'css-effect', value: 'shield' } }),
  'fx-control': asset('fx-control', 'effect', { status: ART_STATUS.candidate, fallback: { type: 'css-effect', value: 'control' } }),
  'fx-cutin-flash': asset('fx-cutin-flash', 'effect', { status: ART_STATUS.candidate, fallback: { type: 'css-effect', value: 'flash' } })
});

export function getArtAsset(id) {
  return ART_ASSETS[id] || null;
}

export function getArtPath(id) {
  const entry = getArtAsset(id);
  return entry?.status === ART_STATUS.ready ? entry.localPath : null;
}

export function getArtFallback(id) {
  return getArtAsset(id)?.fallback || null;
}

export function isArtReady(id) {
  const entry = getArtAsset(id);
  return Boolean(entry && entry.status === ART_STATUS.ready && entry.localPath);
}

export function listArtAssets(kind = null) {
  const entries = Object.values(ART_ASSETS);
  return kind ? entries.filter(entry => entry.kind === kind) : entries;
}
