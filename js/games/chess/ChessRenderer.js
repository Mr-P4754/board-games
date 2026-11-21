import { BaseRenderer } from '../../core/BaseRenderer.js';
import { ChessPiece } from './ChessPiece.js';

const FILES = 'abcdefgh';

/**
 * チェス盤面・駒・昇格選択UIの描画クラス
 */
export class ChessRenderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this.selected = null;
    this.pendingPromotion = null;
    this.lastViewModel = null;
  }

  mount() {
    this.container.innerHTML = `
      <div class="chess-shell">
        <div class="chess-captured-bar" id="chess-cap-top"></div>
        <div class="chess-frame" id="chess-frame">
          <div class="chess-board" id="chess-board" role="grid" aria-label="チェス盤"></div>
          <div id="chess-promo-slot"></div>
        </div>
        <div class="chess-captured-bar" id="chess-cap-bottom"></div>
      </div>
    `;
    this.boardEl = this.container.querySelector('#chess-board');
    this.promoSlotEl = this.container.querySelector('#chess-promo-slot');
    this.capTopEl = this.container.querySelector('#chess-cap-top');
    this.capBottomEl = this.container.querySelector('#chess-cap-bottom');
  }

  render(viewModel) {
    this.lastViewModel = viewModel;
    const { state, legalMoves, showHints, showLastMove, isHumanTurn, playerSide, mode } = viewModel;
    if (!this.boardEl) return;

    // Clear selection if no longer valid
    if (this.selected) {
      const p = state.board[this.selected.r]?.[this.selected.c];
      if (!isHumanTurn || !p || p.color !== state.currentPlayer) {
        this.selected = null;
        this.pendingPromotion = null;
      }
    }

    const flipped = mode === 'cpu' && playerSide === 2;
    const topColor = flipped ? 1 : 2;
    const bottomColor = flipped ? 2 : 1;

    this._renderCaptured(this.capTopEl, topColor, state.captured[topColor]);
    this._renderCaptured(this.capBottomEl, bottomColor, state.captured[bottomColor]);

    const targetsForSelected = new Map();
    if (this.selected && isHumanTurn) {
      for (const m of legalMoves) {
        if (m.from.r === this.selected.r && m.from.c === this.selected.c) {
          const key = `${m.to.r},${m.to.c}`;
          if (!targetsForSelected.has(key)) targetsForSelected.set(key, []);
          targetsForSelected.get(key).push(m);
        }
      }
    }

    const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    const frag = document.createDocumentFragment();
    rows.forEach((r, visualR) => {
      cols.forEach((c, visualC) => {
        const piece = state.board[r][c];
        const key = `${r},${c}`;
        const isLight = (r + c) % 2 === 0;
        const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
        const isLast =
          showLastMove &&
          state.lastMove &&
          ((state.lastMove.from.r === r && state.lastMove.from.c === c) ||
            (state.lastMove.to.r === r && state.lastMove.to.c === c));
        const isKingCheck =
          state.inCheck && piece && piece.type === 'K' && piece.color === state.currentPlayer;
        const movesHere = targetsForSelected.get(key) || [];
        const canSelectOwn = isHumanTurn && piece && piece.color === state.currentPlayer;

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `chess-cell ${isLight ? 'chess-cell--light' : 'chess-cell--dark'}`;
        cell.setAttribute('aria-label', `${FILES[c]}${8 - r}`);

        if (canSelectOwn) cell.classList.add('chess-cell--selectable');
        if (isSelected) cell.classList.add('chess-cell--selected');
        if (isLast) cell.classList.add('chess-cell--last');
        if (isKingCheck) cell.classList.add('chess-cell--check');
        if (movesHere.length > 0) cell.classList.add('chess-cell--legal');

        if (visualC === 0) {
          cell.insertAdjacentHTML('beforeend', `<span class="chess-coord chess-coord--rank">${8 - r}</span>`);
        }
        if (visualR === 7) {
          cell.insertAdjacentHTML('beforeend', `<span class="chess-coord chess-coord--file">${FILES[c]}</span>`);
        }

        if (piece) {
          cell.insertAdjacentHTML('beforeend', ChessPiece.renderSvg(piece));
        }

        if (movesHere.length > 0 && showHints) {
          if (piece || movesHere[0].isEnPassant) {
            cell.insertAdjacentHTML('beforeend', `<span class="chess-legal-ring"></span>`);
          } else {
            cell.insertAdjacentHTML('beforeend', `<span class="chess-legal-dot"></span>`);
          }
        }

        cell.addEventListener('click', () => this._handleCellClick(r, c, piece, movesHere, isHumanTurn));
        frag.appendChild(cell);
      });
    });

    this.boardEl.innerHTML = '';
    this.boardEl.appendChild(frag);
    this._renderPromotionOverlay(state.currentPlayer);
  }

  _handleCellClick(r, c, piece, movesHere, isHumanTurn) {
    if (!isHumanTurn) return;

    if (movesHere.length > 0) {
      if (movesHere.length > 1 && movesHere[0].promotion) {
        this.pendingPromotion = movesHere;
        this._renderPromotionOverlay(this.lastViewModel.state.currentPlayer);
        return;
      }
      this.selected = null;
      this.pendingPromotion = null;
      this.onAction(movesHere[0]);
      return;
    }

    if (piece && piece.color === this.lastViewModel.state.currentPlayer) {
      if (this.selected && this.selected.r === r && this.selected.c === c) {
        this.selected = null;
      } else {
        this.selected = { r, c };
      }
      this.pendingPromotion = null;
      this.render(this.lastViewModel);
    } else if (this.selected) {
      this.selected = null;
      this.render(this.lastViewModel);
    }
  }

  _renderPromotionOverlay(color) {
    if (!this.promoSlotEl) return;
    if (!this.pendingPromotion) {
      this.promoSlotEl.innerHTML = '';
      return;
    }

    const pieces = ['Q', 'R', 'B', 'N'];
    this.promoSlotEl.innerHTML = `
      <div class="chess-promo-overlay">
        <div class="chess-promo-card">
          <div class="chess-promo-title">昇格する駒を選択</div>
          <div class="chess-promo-choices">
            ${pieces
              .map(
                (type) => `
              <button type="button" class="chess-promo-btn" data-promo="${type}" aria-label="${type}">
                ${ChessPiece.renderSvg({ type, color })}
              </button>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    this.promoSlotEl.querySelectorAll('[data-promo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const promo = btn.dataset.promo;
        const chosen = this.pendingPromotion.find((m) => m.promotion === promo);
        this.selected = null;
        this.pendingPromotion = null;
        this.promoSlotEl.innerHTML = '';
        if (chosen) this.onAction(chosen);
      });
    });
  }

  _renderCaptured(el, capturerColor, list) {
    if (!el) return;
    const label = capturerColor === 1 ? '白の獲得駒' : '黒の獲得駒';
    const sorted = [...(list || [])].sort((a, b) => ChessPiece.valueOf(b.type) - ChessPiece.valueOf(a.type));
    el.innerHTML = `<span class="chess-captured-label">${label}:</span>${
      sorted.length > 0
        ? sorted.map((p) => ChessPiece.renderSvg(p)).join('')
        : `<span class="chess-captured-label">なし</span>`
    }`;
  }
}
