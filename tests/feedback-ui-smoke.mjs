import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app.js', 'utf8');
const enhancer = fs.readFileSync('src/feedback-ui.js', 'utf8');
const css = fs.readFileSync('feedback-ui.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const presentation = `${app}\n${enhancer}`;

for (const marker of [
  'logs-page',
  'logs-summary',
  'log-entry',
  'settings-panel',
  'danger-zone',
  'toast--success',
  'toast--error',
  'empty-state'
]) {
  assert.ok(presentation.includes(marker) || css.includes(marker), `Stage G marker missing: ${marker}`);
}

for (const text of [
  '自动存档',
  'SAVE_VERSION',
  '重置本地存档',
  '行囊空空',
  '暂时无事发生',
  '银两不足',
  '当前资源已满'
]) {
  assert.ok(presentation.includes(text), `Stage G feedback text missing: ${text}`);
}

assert.ok(app.includes("confirm('确定清空当前本地存档？')"), 'dangerous reset must keep second confirmation');
assert.ok(index.includes('href="./feedback-ui.css"'), 'feedback UI stylesheet must load');
assert.ok(index.includes('src="./src/feedback-ui.js"'), 'feedback UI enhancer must load');

console.log('feedback UI smoke passed: logs + empty/error states + dangerous action + toast variants verified');
