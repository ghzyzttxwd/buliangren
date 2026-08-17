import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app.js', 'utf8');
const enhancer = fs.readFileSync('src/battle-ui.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('battle-ui.css', 'utf8');
const presentation = `${app}\n${enhancer}`;

// v0.6 Stage F：只锁战斗呈现契约，不锁战斗演算结果。
for (const marker of [
  'battle-sheet',
  'battle-focus',
  'battle-order',
  'battle-field',
  'battle-actions',
  'battle-log-panel',
  'battle-result'
]) {
  assert.ok(presentation.includes(marker), `Stage F battle UI marker missing: ${marker}`);
}

// 当前行动、回合、行动顺序、敌我、生命/内力/境界、状态必须继续可见。
for (const marker of [
  '当前行动',
  '第 ${battle.round} 回合',
  '本回合顺序',
  '我方',
  '敌方',
  '气血',
  '内力',
  'getRealmName(f.realm)',
  'battleStatusHtml(f)'
]) {
  assert.ok(presentation.includes(marker), `battle information missing: ${marker}`);
}

// 所有既有操作钩子必须保留。
for (const hook of [
  'data-basic-attack',
  'data-skill=',
  'data-battle-item=',
  'data-battle-finish',
  'data-battle-leave'
]) {
  assert.ok(app.includes(hook), `battle action hook missing: ${hook}`);
}

// 禁用原因与日志必须仍来自既有 battle API/state。
for (const marker of ['getSkillBlockReason', 'canUseSkill', 'battle.log.slice']) {
  assert.ok(app.includes(marker), `battle state/UI contract missing: ${marker}`);
}

assert.ok(index.includes('href="./battle-ui.css"'), 'Stage F stylesheet must be loaded');
assert.ok(index.includes('src="./src/battle-ui.js"'), 'Stage F enhancer must be loaded');
assert.ok(css.includes('.battle-actions'), 'battle action area CSS missing');
assert.ok(css.includes('.battle-field'), 'battle field CSS missing');
assert.ok(!/\.battle-field[^}]*overflow-x\s*:\s*(auto|scroll)/s.test(css), 'battle field must not require horizontal scrolling');

console.log('battle UI smoke passed: focus + order + combatants + actions + block reasons + log + result contracts verified');
