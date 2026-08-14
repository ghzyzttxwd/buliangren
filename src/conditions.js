import { getRealm } from './progression.js';

function list(state, key) {
  return Array.isArray(state?.events?.[key]) ? state.events[key] : [];
}

export function checkCondition(condition, state) {
  const c = condition || {};
  switch (c.type) {
    case 'reputationGte': return (state?.world?.reputation ?? 0) >= c.value;
    case 'reputationLte': return (state?.world?.reputation ?? 0) <= c.value;
    case 'levelGte': return (state?.player?.level ?? 1) >= c.value;
    case 'realmGte': return getRealm(state?.player?.realm).order >= getRealm(c.value).order;
    case 'cultivationGte': return (state?.player?.cultivation ?? 0) >= c.value;
    case 'flagTrue': return state?.world?.flags?.[c.key] === true;
    case 'flagFalse': return state?.world?.flags?.[c.key] !== true;
    case 'eventCompleted': return list(state, 'completed').includes(c.event);
    case 'eventNotCompleted': return !list(state, 'completed').includes(c.event);
    case 'eventFailed': return list(state, 'failed').includes(c.event);
    case 'eventNotFailed': return !list(state, 'failed').includes(c.event);
    case 'affinityGte': return (state?.relationships?.[c.character]?.affinity ?? 0) >= c.value;
    case 'affinityLte': return (state?.relationships?.[c.character]?.affinity ?? 0) <= c.value;
    case 'personalFlagTrue': return state?.relationships?.[c.character]?.personalFlags?.[c.key] === true;
    case 'personalFlagFalse': return state?.relationships?.[c.character]?.personalFlags?.[c.key] !== true;
    case 'characterMet': return state?.relationships?.[c.character]?.met === true;
    case 'hasItem': return (state?.inventory?.items?.[c.item] ?? 0) >= (c.count ?? 1);
    case 'locationUnlocked': return (state?.world?.unlockedLocations || []).includes(c.location);
    case 'seasonIs': return state?.world?.season === c.value;
    case 'chapterIs': return state?.world?.chapter === c.value;
    default: return false;
  }
}

export function checkConditions(conditions = [], state) {
  return conditions.every(condition => checkCondition(condition, state));
}
