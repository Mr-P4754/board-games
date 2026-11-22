import { BaseRenderer } from '../../core/BaseRenderer.js';

/**
 * ライツアウト盤面・ランプ点灯・ヒントボタン描画クラス
 */
export class LightsOutRenderer extends BaseRenderer {
  mount() {
    this.container.innerHTML = `
      <div class="lo-shell">
        <div class="lo-frame">
          <div class="lo-board" id="lo-board" role="grid" aria-label="ライツアウト盤"></div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="lo-hint-btn">次の1手ヒントを表示</button>
      </div>
    `;
    this.boardEl = this.container.querySelector('#lo-board');
    this.container.querySelector('#lo-hint-btn').addEventListener('click', () => {
      this.onAction({ type: 'hint' });
    });
  }

  render({ state }) {
    if (!this.boardEl) return;
    this.boardEl.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    this.boardEl.innerHTML = '';

    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        const isOn = state.board[r][c];
        const isHint = state.hintCell && state.hintCell.r === r && state.hintCell.c === c;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `lo-lamp ${isOn ? 'lo-lamp--on' : 'lo-lamp--off'} ${isHint ? 'lo-lamp--hint' : ''}`;
        btn.setAttribute('aria-label', `${r + 1}行${c + 1}列 ${isOn ? '点灯' : '消灯'}`);
        btn.addEventListener('click', () => this.onAction({ r, c }));
        this.boardEl.appendChild(btn);
      }
    }
  }
}
