import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app.js', 'utf8');
const shell = fs.readFileSync('ui-shell.css', 'utf8');

// v0.6 Stage D：锁住队伍 / 武学页面的信息层级，不锁具体像素。
for (const marker of [
  'party-page',
  'party-summary',
  'character-card__head',
  'character-stats',
  'character-detail',
  'character-state',
  'skills-page',
  'skill-card__head',
  'skill-metrics',
  'skill-requirement'
]) {
  assert.ok(app.includes(marker), `Stage D UI marker missing: ${marker}`);
}

// 队伍页核心信息。
for (const marker of ['同行之人', '攻', '防', '速', '境界', '修为', '体力', '关系', '尚未相识']) {
  assert.ok(app.includes(marker), `party information missing: ${marker}`);
}
assert.ok(app.includes('c.unlock'), 'locked character unlock condition must remain visible');

// 武学页核心信息。
for (const marker of ['已掌握武学', '熟练', '威力', '治疗', '内力', '境界要求', '简介']) {
  assert.ok(app.includes(marker), `skill information missing: ${marker}`);
}
assert.ok(app.includes('realmRequirement'), 'skill realm requirement must be consumed by UI');

// 响应式布局：允许换行/收缩，不允许靠横向滚动展示主内容。
for (const selector of ['.party-summary', '.character-card', '.character-stats', '.skill-card', '.skill-metrics']) {
  assert.ok(shell.includes(selector), `Stage D responsive selector missing: ${selector}`);
}
assert.ok(!/\.character-grid[^}]*overflow-x\s*:\s*(auto|scroll)/s.test(shell), 'party page must not require horizontal scrolling');
assert.ok(!/\.skill-list[^}]*overflow-x\s*:\s*(auto|scroll)/s.test(shell), 'skills page must not require horizontal scrolling');

console.log('party/skills UI smoke passed: hierarchy + status + requirements + mobile no-horizontal-scroll verified');
