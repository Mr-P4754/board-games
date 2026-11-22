import { BaseRenderer } from '../../core/BaseRenderer.js';

const CROWN_SVG = `
  <svg class="checkers-crown" viewBox="0 0 36 36" aria-hidden="true">
    <path d="M5 26L8 12L14 18L18 9L22 18L28 12L31 26H5Z" fill="#f5cc64" stroke="#6c4b11" stroke-width="2" stroke-linejoin="round"/>
    <rect x="6" y="27" width="24" height="3.5" rx="1.5" fill="#f5cc64" stroke="#6c4b11" stroke-width="1.6"/>
  </svg>
`;

/**
 * チェッカー盤面・駒・キング王冠・合法手描画クラス
 */
export class CheckersRenderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this.selected = null;
    this.lastViewModel = null;
  }

  mount() {
    this.container.innerHTML = `
      <div class="checkers-frame">
        <div class="checkers-board" id="checkers-board" role="grid" aria-label="チェッカー盤"></div>
      </div>
    `;
    this.boardEl = this.container.querySelector('#checkers-board');
  }

  render(viewModel) {
    this.lastViewModel = viewModel;
    const { state, legalMoves, showHints, showLastMove, isHumanTurn, playerSide, mode } = viewModel;
    if (!this.boardEl) return;

    if (!isHumanTurn) {
      this.selected = null;
    } else if (this.selected) {
      const stillValid = legalMoves.some((m) => m.from.r === this.selected.r && m.from.c === this.selected.c);
      if (!stillValid) this.selected = null;
    }

    const movableFrom = new Set(legalMoves.map((m) => `${m.from.r},${m.from.c}`));
    const targetsMap = new Map();
    if (this.selected && isHumanTurn) {
      for (const m of legalMoves) {
        if (m.from.r === this.selected.r && m.from.c === this.selected.c) {
          targetsMap.set(`${m.to.r},${m.to.c}`, m);
        }
      }
    }

    const flipped = mode === 'cpu' && playerSide === 2;
    const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    const frag = document.createDocumentFragment();
    for (const r of rows) {
      for (const c of cols) {
        const piece = state.board[r][c];
        const key = `${r},${c}`;
        const isDark = (r + c) % 2 === 1;
        const canSelect = isHumanTurn && movableFrom.has(key);
        const moveHere = targetsMap.get(key) || null;
        const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
        const isLast =
          showLastMove &&
          state.lastMove &&
          ((state.lastMove.from.r === r && state.lastMove.from.c === c) ||
            (state.lastMove.to.r === r && state.lastMove.to.c === c));

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `checkers-cell ${isDark ? 'checkers-cell--dark' : 'checkers-cell--light'}`;

        if (canSelect) cell.classList.add('checkers-cell--selectable');
        if (isSelected) cell.classList.add('checkers-cell--selected');
        if (isLast) cell.classList.add('checkers-cell--last');
        if (moveHere) cell.classList.add('checkers-cell--legal');

        if (piece) {
          const disc = document.createElement('span');
          disc.className = `checkers-piece checkers-piece--${piece.owner}`;
          if (piece.king) disc.innerHTML = CROWN_SVG;
          cell.appendChild(disc);
        } else if (moveHere && showHints) {
          const dot = document.createElement('span');
          dot.className = 'checkers-legal-dot';
          cell.appendChild(dot);
        }

        cell.addEventListener('click', () => {
          if (!isHumanTurn) return;
          if (moveHere) {
            this.selected = null;
            this.onAction(moveHere);
          } else if (canSelect) {
            this.selected = isSelected ? null : { r, c };
            this.render(this.lastViewModel);
          } else if (this.selected) {
            this.selected = null;
            this.render(this.lastViewModel);
          }
        });

        frag.appendChild(cell);
      }
    }

    this.boardEl.innerHTML = '';
    this.boardEl.appendChild(frag);
  }
}
