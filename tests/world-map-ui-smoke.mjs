import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LOCATIONS } from '../src/data.js';

const app = fs.readFileSync('src/app.js', 'utf8');
const worldMap = fs.readFileSync('world-map.css', 'utf8');

// v0.6 阶段 C：地图坐标必须来自地点数据，不再依赖 CSS nth-child 排序。
assert.ok(LOCATIONS.length >= 1, 'locations missing');
for (const loc of LOCATIONS) {
  assert.ok(loc.map && Number.isFinite(loc.map.x) && Number.isFinite(loc.map.y), `map coordinates missing: ${loc.id}`);
  assert.ok(loc.map.x >= 0 && loc.map.x <= 100, `map x out of range: ${loc.id}`);
  assert.ok(loc.map.y >= 0 && loc.map.y <= 100, `map y out of range: ${loc.id}`);
}
assert.doesNotMatch(worldMap, /\.location-list\s+\.location:nth-child\(/, 'world map must not depend on nth-child positions');
assert.ok(app.includes('--map-x'), 'world view must project data-driven x coordinate');
assert.ok(app.includes('--map-y'), 'world view must project data-driven y coordinate');

// 世界页必须区分锁定、可进入、有事件三个地图状态。
for (const status of ['locked', 'open', 'event']) {
  assert.ok(app.includes(`location--${status}`), `location status missing: ${status}`);
}

// 首页必须把阶段、下一步、成长摘要和地图状态明确分层。
for (const marker of ['world-overview', 'world-growth-summary', 'world-next-action', 'map-legend']) {
  assert.ok(app.includes(marker), `world UX marker missing: ${marker}`);
}

console.log('world map UI smoke passed: data-driven coordinates + three states + world overview verified');
