import { BaseRenderer } from '../../core/BaseRenderer.js';

/**
 * 2048盤面描画・キーボード・タッチスワイプ・画面方向パッド入力クラス
 */
export class Game2048Renderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this._touchStart = null;
    this._onKeyDown = (e) => {
      const map = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        this.onAction({ dir });
      }
    };
  }

  mount() {
    this.container.innerHTML = `
      <div class="g2048-shell">
        <div class="g2048-board" id="g2048-board" role="grid" aria-label="2048ボード"></div>
        <div class="g2048-dpad">
          <span></span>
          <button type="button" class="g2048-dpad-btn" data-dir="up" aria-label="上">↑</button>
          <span></span>
          <button type="button" class="g2048-dpad-btn" data-dir="left" aria-label="左">←</button>
          <button type="button" class="g2048-dpad-btn" data-dir="down" aria-label="下">↓</button>
          <button type="button" class="g2048-dpad-btn" data-dir="right" aria-label="右">→</button>
        </div>
        <div class="g2048-hint">矢印キー / WASD / スワイプで操作できます</div>
      </div>
    `;

    this.boardEl = this.container.querySelector('#g2048-board');
    this.container.querySelectorAll('[data-dir]').forEach((btn) => {
      btn.addEventListener('click', () => this.onAction({ dir: btn.dataset.dir }));
    });

    this.boardEl.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this._touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });

    this.boardEl.addEventListener('touchend', (e) => {
      if (!this._touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this._touchStart.x;
      const dy = t.clientY - this._touchStart.y;
      this._touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.onAction({ dir: dx > 0 ? 'right' : 'left' });
      } else {
        this.onAction({ dir: dy > 0 ? 'down' : 'up' });
      }
    }, { passive: true });

    window.addEventListener('keydown', this._onKeyDown);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    super.destroy();
  }

  render({ state }) {
    if (!this.boardEl) return;
    let html = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = state.board[r][c];
        const tileCls = val === 0 ? '' : val <= 2048 ? `g2048-tile--${val}` : 'g2048-tile--super';
        const isNew = state.lastSpawn && state.lastSpawn.r === r && state.lastSpawn.c === c ? 'g2048-tile--new' : '';
        html += `<div class="g2048-tile ${tileCls} ${isNew}">${val > 0 ? val : ''}</div>`;
      }
    }
    this.boardEl.innerHTML = html;
  }
}
