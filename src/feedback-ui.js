// v0.6 Stage G: polish non-core pages and interaction feedback without touching game state.
const root = document.querySelector('#app');

const SUCCESS_HINTS = ['成功', '完成', '已装备', '已卸下', '已结算', '已休整', '学会武学', '自动存档', '购得', '剩余银两'];
const ERROR_HINTS = ['不足', '无法', '失败', '无效', '已经用完', '不能', '无需使用', '条件不满足', '尚不足'];

function classifyToast(toast) {
  if (!toast || toast.dataset.feedbackClassified === '1') return;
  toast.dataset.feedbackClassified = '1';
  const text = toast.textContent || '';
  const type = ERROR_HINTS.some(hint => text.includes(hint))
    ? 'error'
    : SUCCESS_HINTS.some(hint => text.includes(hint))
      ? 'success'
      : 'info';
  toast.classList.add(`toast--${type}`);
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
}

function enhanceLogsPage() {
  const page = [...document.querySelectorAll('.page')]
    .find(node => node.querySelector('.log-list') && node.querySelector('.settings'));
  if (!page || page.dataset.feedbackEnhanced === '1') return;
  page.dataset.feedbackEnhanced = '1';
  page.classList.add('logs-page');

  const title = page.querySelector('.section-title');
  const logList = page.querySelector('.log-list');
  const settings = page.querySelector('.settings');
  const version = settings?.querySelector('.version')?.textContent?.trim() || '版本信息';

  if (title) {
    title.insertAdjacentHTML('afterend', `
      <section class="logs-summary" aria-label="记录与存档状态">
        <div><span>存档</span><b>自动存档已开启</b></div>
        <div><span>版本</span><b>${version}</b></div>
      </section>`);
  }

  if (logList) {
    const entries = [...logList.children];
    if (!entries.length) {
      logList.innerHTML = '<article class="empty-state"><b>暂无江湖记录</b><p>完成事件、战斗或物品操作后，重要变化会记录在这里。</p></article>';
    } else {
      entries.forEach((entry, index) => {
        entry.classList.add('log-entry');
        entry.dataset.logIndex = String(index);
      });
    }
  }

  if (settings) {
    settings.classList.add('settings-panel', 'danger-zone');
    const reset = settings.querySelector('[data-reset]');
    if (reset) {
      reset.setAttribute('aria-describedby', 'reset-save-warning');
      reset.insertAdjacentHTML('beforebegin', '<p id="reset-save-warning" class="danger-note">危险操作：会清空当前本地存档，点击后仍需再次确认。</p>');
    }
  }
}

function enhanceEmptyAndDisabledStates() {
  document.querySelectorAll('.item-empty').forEach(node => node.classList.add('empty-state'));
  document.querySelectorAll('.story-option').forEach(node => {
    if ((node.textContent || '').includes('暂时无事发生')) node.classList.add('empty-state-action');
  });
  document.querySelectorAll('button:disabled').forEach(button => {
    button.setAttribute('aria-disabled', 'true');
    if (!button.title) button.title = (button.textContent || '当前不可用').trim();
  });
}

function enhanceFeedback() {
  document.querySelectorAll('.toast').forEach(classifyToast);
  enhanceLogsPage();
  enhanceEmptyAndDisabledStates();
}

const observer = new MutationObserver(() => enhanceFeedback());
if (root) observer.observe(root, { childList: true, subtree: true });
observer.observe(document.body, { childList: true, subtree: true });
enhanceFeedback();
