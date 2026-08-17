import { getArtPath } from './art.js';

const GLYPH_TO_ASSET = Object.freeze({
  '侠': 'player-portrait',
  '梦': 'chimeng-portrait',
  '岐': 'nvdi-portrait'
});

function applyPortraits(root = document) {
  root.querySelectorAll('.character-card .portrait[data-char]').forEach(frame => {
    if (frame.dataset.artBound === '1') return;
    const assetId = GLYPH_TO_ASSET[frame.dataset.char];
    const path = assetId ? getArtPath(assetId) : null;
    if (!path) return;

    frame.dataset.artBound = '1';
    const img = document.createElement('img');
    img.className = 'portrait-art';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = `./${path}`;
    img.setAttribute('aria-hidden', 'true');

    img.addEventListener('load', () => frame.classList.add('has-art'), { once: true });
    img.addEventListener('error', () => {
      frame.classList.remove('has-art');
      frame.dataset.artBound = '0';
      img.remove();
    }, { once: true });

    frame.prepend(img);
  });
}

const app = document.querySelector('#app');
if (app) {
  applyPortraits(app);
  new MutationObserver(() => applyPortraits(app)).observe(app, { childList: true, subtree: true });
}
