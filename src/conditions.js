import { getRealm } from './progression.js';

export function checkCondition(condition, state) {
  const c = condition || {};
  switch (c.type) {
    case 'reputationGte': return state.world.reputation >= c.value;
    case 'reputationLte': return state.world.reputation <= c.value;
    case 'levelGte': return state.player.level >= c.value;
    case 'realmGte': return getRealm(state.player.realm).order >= getRealm(c.value).order;
    case 'cultivationGte': return state.player.cultivation >= c.value;
    case 'flagTrue': return state.world.flags?.[c.key] === true;
    case 'flagFalse': return state.world.flags?.[c.key] !== true;
    case 'eventCompleted': return state.events.completed.includes(c.event);
    case 'eventNotCompleted': return !state.events.completed.includes(c.event);
    case 'affinityGte': return (state.relationships?.[c.character]?.affinity ?? 0) >= c.value;
    case 'affinityLte': return (state.relationships?.[c.character]?.affinity ?? 0) <= c.value;
    case 'hasItem': return (state.inventory?.items?.[c.item] ?? 0) >= (c.count ?? 1);
    case 'locationUnlocked': return state.world.unlockedLocations.includes(c.location);
    case 'seasonIs': return state.world.season === c.value;
    case 'chapterIs': return state.world.chapter === c.value;
    default: return false;
  }
}

export function checkConditions(conditions = [], state) {
  return conditions.every(condition => checkCondition(condition, state));
}
