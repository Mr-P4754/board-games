import { BaseRenderer } from '../../core/BaseRenderer.js';

/**
 * 15パズル木製タイル盤面描画・クリック＆矢印キー操作クラス
 */
export class SlidingRenderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this._onKeyDown = (e) => {
      const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        this.onAction({ dir });
      }
    };
  }

  mount() {
    this.container.innerHTML = `
      <div class="sliding-frame">
        <div class="sliding-board" id="sliding-board" role="grid" aria-label="スライドパズル盤"></div>
      </div>
    `;
    this.boardEl = this.container.querySelector('#sliding-board');
    window.addEventListener('keydown', this._onKeyDown);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    super.destroy();
  }

  render({ state, showHints }) {
    if (!this.boardEl) return;
    const n = state.size;
    const blank = state.tiles.indexOf(0);
    const br = Math.floor(blank / n);
    const bc = blank % n;

    this.boardEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    this.boardEl.innerHTML = '';

    state.tiles.forEach((val, idx) => {
      if (val === 0) {
        const empty = document.createElement('div');
        empty.className = 'sliding-empty';
        this.boardEl.appendChild(empty);
        return;
      }

      const r = Math.floor(idx / n);
      const c = idx % n;
      const movable = !state.gameOver && (r === br || c === bc);
      const isCorrect = showHints && val === idx + 1;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sliding-tile';
      if (movable) btn.classList.add('sliding-tile--movable');
      if (isCorrect) btn.classList.add('sliding-tile--correct');
      btn.textContent = String(val);

      if (movable) {
        btn.addEventListener('click', () => this.onAction({ index: idx }));
      }
      this.boardEl.appendChild(btn);
    });
  }
}
