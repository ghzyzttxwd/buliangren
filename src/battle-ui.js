const app = document.querySelector('#app');

function ensureSideLabel(side, label) {
  if (!side || side.querySelector(':scope > .battle-side-label')) return;
  const title = document.createElement('div');
  title.className = 'battle-side-label';
  title.textContent = label;
  side.prepend(title);
}

function normalizeVitals(sheet) {
  sheet.querySelectorAll('.fighter-vitals span').forEach(node => {
    node.textContent = node.textContent.replace(/^血\s*/, '气血 ').replace(/^内\s*/, '内力 ');
  });
}

function enhanceBattleSheet(sheet) {
  if (!sheet || sheet.classList.contains('battle-enhanced')) return;
  const title = sheet.querySelector(':scope > .battle-title');
  if (!title) return;

  sheet.classList.add('battle-sheet', 'battle-enhanced');
  title.classList.add('battle-header');

  const focus = sheet.querySelector(':scope > .current-actor-banner');
  focus?.classList.add('battle-focus');

  const order = sheet.querySelector(':scope > .turn-order');
  order?.classList.add('battle-order');

  const field = sheet.querySelector(':scope > .combatants');
  field?.classList.add('battle-field');
  if (field) {
    const sides = field.querySelectorAll(':scope > .side');
    sides[0]?.classList.add('battle-side', 'battle-side--ally');
    sides[1]?.classList.add('battle-side', 'battle-side--enemy');
    ensureSideLabel(sides[0], '我方');
    ensureSideLabel(sides[1], '敌方');
  }

  normalizeVitals(sheet);

  const log = sheet.querySelector(':scope > .battle-log');
  if (log) {
    log.classList.add('battle-log-panel');
    if (!log.querySelector(':scope > .battle-log-title')) {
      const logTitle = document.createElement('div');
      logTitle.className = 'battle-log-title';
      logTitle.textContent = '最近战况';
      log.prepend(logTitle);
    }
  }

  const movable = [];
  let node = log?.nextElementSibling || null;
  while (node) {
    movable.push(node);
    node = node.nextElementSibling;
  }

  if (movable.length) {
    const actions = document.createElement('section');
    const hasResult = movable.some(el => el.matches?.('[data-battle-finish], [data-battle-leave]'));
    actions.className = `battle-actions${hasResult ? ' battle-result' : ''}`;

    const actionsTitle = document.createElement('div');
    actionsTitle.className = 'battle-actions-title';
    actionsTitle.innerHTML = hasResult
      ? '<span>战斗结束</span><b>处理本场结果</b>'
      : '<span>行动选择</span><b>选择本回合操作</b>';
    actions.appendChild(actionsTitle);

    movable.forEach(el => actions.appendChild(el));
    if (log) sheet.insertBefore(actions, log);
    else sheet.appendChild(actions);
  }
}

function enhanceBattleUi() {
  document.querySelectorAll('.sheet').forEach(enhanceBattleSheet);
}

enhanceBattleUi();

if (app) {
  const observer = new MutationObserver(enhanceBattleUi);
  observer.observe(app, { childList: true, subtree: true });
}
