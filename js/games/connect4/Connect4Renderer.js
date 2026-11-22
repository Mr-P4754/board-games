import { BaseRenderer } from '../../core/BaseRenderer.js';
import { Connect4Engine } from './Connect4Engine.js';

const ROWS = Connect4Engine.ROWS;
const COLS = Connect4Engine.COLS;

/**
 * コネクトフォー盤面・列投入ボタン・勝利ハイライト描画クラス
 */
export class Connect4Renderer extends BaseRenderer {
  mount() {
    this.container.innerHTML = `
      <div class="c4-shell">
        <div class="c4-col-buttons" id="c4-col-buttons"></div>
        <div class="c4-frame">
          <div class="c4-board" id="c4-board" role="grid" aria-label="コネクトフォー盤"></div>
        </div>
      </div>
    `;
    this.btnsEl = this.container.querySelector('#c4-col-buttons');
    this.boardEl = this.container.querySelector('#c4-board');
  }

  render({ state, legalMoves, showLastMove, isHumanTurn }) {
    if (!this.boardEl) return;
    const legalCols = new Set(legalMoves.map((m) => m.c));
    const winSet = new Set((state.winLine || []).map(([r, c]) => `${r},${c}`));

    this.btnsEl.innerHTML = '';
    for (let c = 0; c < COLS; c++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'c4-drop-btn';
      btn.textContent = `▼ ${c + 1}`;
      btn.disabled = !isHumanTurn || !legalCols.has(c);
      btn.addEventListener('click', () => this.onAction({ c }));
      this.btnsEl.appendChild(btn);
    }

    const frag = document.createDocumentFragment();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = state.board[r][c];
        const canDrop = isHumanTurn && legalCols.has(c);
        const slot = document.createElement('div');
        slot.className = 'c4-slot';
        if (canDrop) {
          slot.classList.add('c4-slot--clickable');
          slot.addEventListener('click', () => this.onAction({ c }));
        }

        if (val === 1 || val === 2) {
          const disc = document.createElement('span');
          disc.className = `c4-disc c4-disc--${val}`;
          if (showLastMove && state.lastMove && state.lastMove.r === r && state.lastMove.c === c) {
            disc.classList.add('c4-disc--last');
          }
          if (winSet.has(`${r},${c}`)) {
            disc.classList.add('c4-disc--win');
          }
          slot.appendChild(disc);
        }

        frag.appendChild(slot);
      }
    }

    this.boardEl.innerHTML = '';
    this.boardEl.appendChild(frag);
  }
}
