import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { LOCATIONS, SKILLS } from '../src/data.js';
import { EVENTS, getAvailableEvents, beginEvent, completeEvent, validateEventDefinition } from '../src/events.js';
import '../src/events-s1-longquan.js';
import '../src/events-s1-finale.js';
import '../src/events-s1-growth.js';
import '../src/events-s1-balance.js';
import { createBattle } from '../src/battle.js';
import { getBreakthroughInfo, tryBreakthrough } from '../src/progression.js';

const state = defaultState();
const locationIds = new Set(LOCATIONS.map(location => location.id));
const ids = new Set();

for (const event of EVENTS) {
  assert.equal(validateEventDefinition(event), true, `invalid event definition: ${event?.id}`);
  assert.equal(ids.has(event.id), false, `duplicate event id: ${event.id}`);
  ids.add(event.id);
  assert.equal(locationIds.has(event.location), true, `unknown event location: ${event.id} -> ${event.location}`);
  assert.equal(/skeleton/i.test(event.id), false, `skeleton event id remains: ${event.id}`);
  assert.equal(String(event.title).includes('骨架'), false, `skeleton title remains: ${event.id}`);
}

const battleEventsSeen = new Set();
let steps = 0;
let idleRounds = 0;

function autoBreakthrough() {
  let changed = false;
  while (getBreakthroughInfo(state).canBreakthrough) {
    const result = tryBreakthrough(state);
    assert.equal(result.ok, true, 'breakthrough should succeed when available');
    changed = true;
  }
  return changed;
}

function availableEvents() {
  return LOCATIONS
    .filter(location => location.unlock(state))
    .flatMap(location => getAvailableEvents(state, location.id));
}

function priority(event) {
  // 先做自由内容，避免只靠主线按钮推进，也给声望/修为留出自然增长空间。
  const rank = { hidden: 0, character: 1, side: 2, encounter: 3, main: 4 };
  return rank[event.category] ?? 9;
}

while (steps < 300) {
  const brokeThrough = autoBreakthrough();
  const available = availableEvents().sort((a, b) => priority(a) - priority(b));

  if (!available.length) {
    if (state.world.flags.season1Complete === true) break;
    idleRounds += 1;
    if (brokeThrough && idleRounds < 3) continue;
    throw new Error(`new-save progression stalled: chapter=${state.world.chapter}, quest=${state.world.quest}, rep=${state.world.reputation}, cultivation=${state.player.cultivation}, realm=${state.player.realm}`);
  }

  idleRounds = 0;
  const event = available[0];
  const started = beginEvent(state, event.id);
  assert.equal(started.ok, true, `failed to begin available event: ${event.id}`);

  if (event.action?.type === 'battle') {
    const battle = createBattle(event.action.enemies || [], state.party, state.martialArts);
    assert.ok(battle.allies.length > 0, `battle has no allies: ${event.id}`);
    assert.equal(battle.enemies.length, (event.action.enemies || []).length, `battle enemy mismatch: ${event.id}`);
    battleEventsSeen.add(event.id);
  }

  const completed = completeEvent(state, event.id);
  assert.equal(completed.ok, true, `failed to complete event: ${event.id}`);
  steps += 1;
}

autoBreakthrough();

assert.equal(state.world.flags.season1Complete, true, 'season one did not complete from a new save');
assert.equal(state.world.flags.s1_stage_g_complete, true, 'stage G completion flag missing');
assert.equal(state.world.chapter, 's1_complete', 'season one final chapter mismatch');
assert.equal(state.world.unlockedLocations.includes('luoyang'), true, 'Luoyang was not unlocked for finale');
assert.equal(state.world.unlockedLocations.includes('longquan'), false, 'Dragon Spring secret location should not be unlocked in season one');
assert.ok(battleEventsSeen.size >= 3, 'too few battle events exercised');
assert.ok(state.world.reputation >= 220, 'season one reputation progression is unexpectedly low');
assert.ok(['middle_star', 'great_star', 'small_heaven', 'middle_heaven', 'great_heaven', 'shenxiao'].includes(state.player.realm), `season one realm progression too low: ${state.player.realm}`);

// 阶段 H 武学轴：新存档路线应能获得并实战验证折风剑式。
assert.equal(state.martialArts?.folding_wind_sword?.learned, true, 'Folding Wind Sword was not learned');
assert.ok((state.martialArts?.folding_wind_sword?.mastery || 0) >= 2, 'Folding Wind Sword mastery did not grow');
assert.ok(SKILLS.folding_wind_sword?.playerLearnable, 'Folding Wind Sword is not marked player-learnable');

console.log(`season1 smoke passed: steps=${steps}, completed=${state.events.completed.length}, battles=${battleEventsSeen.size}, rep=${state.world.reputation}, realm=${state.player.realm}, silver=${state.player.silver}`);
