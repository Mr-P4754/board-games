import { BaseRenderer } from '../../core/BaseRenderer.js';

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * オセロ盤面のDOM描画・入力ハンドリングクラス
 */
export class OthelloRenderer extends BaseRenderer {
  mount() {
    this.container.innerHTML = `
      <div class="othello-frame">
        <div class="othello-coords-top">
          <span></span>${COLS.map((c) => `<span>${c}</span>`).join('')}
        </div>
        <div class="othello-body">
          <div class="othello-coords-left">
            ${Array.from({ length: 8 }, (_, i) => `<span>${i + 1}</span>`).join('')}
          </div>
          <div class="othello-board" id="othello-grid" role="grid" aria-label="オセロ盤"></div>
        </div>
      </div>
    `;
    this.gridEl = this.container.querySelector('#othello-grid');
  }

  render({ state, legalMoves, showHints, showLastMove, isHumanTurn }) {
    if (!this.gridEl) return;
    const legalMap = new Map();
    for (const m of legalMoves) {
      legalMap.set(`${m.r},${m.c}`, m);
    }

    const frag = document.createDocumentFragment();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const key = `${r},${c}`;
        const val = state.board[r][c];
        const legal = isHumanTurn && legalMap.has(key);
        const isLast =
          showLastMove &&
          state.lastMove &&
          state.lastMove.r === r &&
          state.lastMove.c === c;

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'othello-cell';
        cell.setAttribute('aria-label', `${COLS[c]}${r + 1}`);
        if (legal) cell.classList.add('othello-cell--legal');
        if (isLast) cell.classList.add('othello-cell--last');

        if (val === 1 || val === 2) {
          const disc = document.createElement('span');
          disc.className = `othello-disc othello-disc--${val}`;
          cell.appendChild(disc);
        } else if (legal && showHints) {
          const hint = document.createElement('span');
          hint.className = 'othello-hint';
          cell.appendChild(hint);
        }

        if (legal) {
          cell.addEventListener('click', () => this.onAction({ r, c }));
        }
        frag.appendChild(cell);
      }
    }

    this.gridEl.innerHTML = '';
    this.gridEl.appendChild(frag);
  }
}
