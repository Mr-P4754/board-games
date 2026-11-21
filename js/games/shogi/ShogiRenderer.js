import { BaseRenderer } from '../../core/BaseRenderer.js';
import { ShogiPiece } from './ShogiPiece.js';

const FILES_JP = ['９', '８', '７', '６', '５', '４', '３', '２', '１'];
const RANKS_JP = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

/**
 * 将棋盤・駒台・成り選択UIの描画クラス
 */
export class ShogiRenderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this.selectedBoard = null; // { r, c }
    this.selectedDrop = null; // pieceType
    this.pendingPromo = null; // [moveNoProm, moveProm]
    this.lastViewModel = null;
  }

  mount() {
    this.container.innerHTML = `
      <div class="shogi-shell">
        <div class="shogi-komadai" id="shogi-hand-top"></div>
        <div class="shogi-frame">
          <div class="shogi-coords-top" id="shogi-coords-top"></div>
          <div class="shogi-grid-row">
            <div class="shogi-board" id="shogi-board" role="grid" aria-label="将棋盤"></div>
            <div class="shogi-coords-right" id="shogi-coords-right"></div>
          </div>
          <div id="shogi-promo-slot"></div>
        </div>
        <div class="shogi-komadai" id="shogi-hand-bottom"></div>
      </div>
    `;
    this.boardEl = this.container.querySelector('#shogi-board');
    this.coordsTopEl = this.container.querySelector('#shogi-coords-top');
    this.coordsRightEl = this.container.querySelector('#shogi-coords-right');
    this.handTopEl = this.container.querySelector('#shogi-hand-top');
    this.handBottomEl = this.container.querySelector('#shogi-hand-bottom');
    this.promoSlotEl = this.container.querySelector('#shogi-promo-slot');
  }

  render(viewModel) {
    this.lastViewModel = viewModel;
    const { state, legalMoves, showHints, showLastMove, isHumanTurn, playerSide, mode } = viewModel;
    if (!this.boardEl) return;

    if (!isHumanTurn) {
      this.selectedBoard = null;
      this.selectedDrop = null;
      this.pendingPromo = null;
    }

    const flipped = mode === 'cpu' && playerSide === 2;
    const topOwner = flipped ? 1 : 2;
    const bottomOwner = flipped ? 2 : 1;

    this._renderKomadai(this.handTopEl, topOwner, state, isHumanTurn, flipped);
    this._renderKomadai(this.handBottomEl, bottomOwner, state, isHumanTurn, flipped);

    const rows = flipped ? [8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const cols = flipped ? [8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8];

    this.coordsTopEl.innerHTML = cols.map((c) => `<span>${FILES_JP[c]}</span>`).join('');
    this.coordsRightEl.innerHTML = rows.map((r) => `<span>${RANKS_JP[r]}</span>`).join('');

    const targets = new Map();
    if (isHumanTurn) {
      for (const m of legalMoves) {
        if (
          this.selectedBoard &&
          !m.drop &&
          m.from.r === this.selectedBoard.r &&
          m.from.c === this.selectedBoard.c
        ) {
          const key = `${m.to.r},${m.to.c}`;
          if (!targets.has(key)) targets.set(key, []);
          targets.get(key).push(m);
        } else if (this.selectedDrop && m.drop === this.selectedDrop) {
          const key = `${m.to.r},${m.to.c}`;
          if (!targets.has(key)) targets.set(key, []);
          targets.get(key).push(m);
        }
      }
    }

    const frag = document.createDocumentFragment();
    for (const r of rows) {
      for (const c of cols) {
        const piece = state.board[r][c];
        const key = `${r},${c}`;
        const movesHere = targets.get(key) || [];
        const isSelected = this.selectedBoard && this.selectedBoard.r === r && this.selectedBoard.c === c;
        const isLast =
          showLastMove &&
          state.lastMove &&
          ((state.lastMove.to.r === r && state.lastMove.to.c === c) ||
            (state.lastMove.from && state.lastMove.from.r === r && state.lastMove.from.c === c));
        const isKingCheck =
          state.inCheck && piece && piece.type === 'OU' && piece.owner === state.currentPlayer;
        const canSelectOwn = isHumanTurn && piece && piece.owner === state.currentPlayer;

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'shogi-cell';
        cell.setAttribute('aria-label', `${FILES_JP[c]}${RANKS_JP[r]}`);

        if (canSelectOwn) cell.classList.add('shogi-cell--selectable');
        if (isSelected) cell.classList.add('shogi-cell--selected');
        if (isLast) cell.classList.add('shogi-cell--last');
        if (isKingCheck) cell.classList.add('shogi-cell--check');
        if (movesHere.length > 0) cell.classList.add('shogi-cell--legal');

        if (piece) {
          const rotated = flipped ? piece.owner === 1 : piece.owner === 2;
          cell.insertAdjacentHTML('beforeend', ShogiPiece.renderSvg(piece.type, piece.owner, rotated));
        }

        if (movesHere.length > 0 && showHints) {
          cell.insertAdjacentHTML(
            'beforeend',
            piece ? `<span class="shogi-legal-ring"></span>` : `<span class="shogi-legal-dot"></span>`
          );
        }

        cell.addEventListener('click', () => this._handleCellClick(r, c, piece, movesHere, isHumanTurn));
        frag.appendChild(cell);
      }
    }

    this.boardEl.innerHTML = '';
    this.boardEl.appendChild(frag);
    this._renderPromoOverlay();
  }

  _renderKomadai(el, owner, state, isHumanTurn, flipped) {
    const label = owner === 1 ? '▲ 先手の持ち駒' : '△ 後手の持ち駒';
    const hand = state.hands[owner] || {};
    const usable = isHumanTurn && state.currentPlayer === owner;
    const rotated = flipped ? owner === 1 : owner === 2;

    el.innerHTML = `<span class="shogi-komadai-label">${label}</span>`;
    let any = false;

    for (const type of ShogiPiece.HAND_ORDER) {
      const count = hand[type] || 0;
      if (count <= 0) continue;
      any = true;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shogi-hand-btn';
      if (usable) btn.classList.add('shogi-hand-btn--usable');
      if (usable && this.selectedDrop === type) btn.classList.add('shogi-hand-btn--selected');
      btn.innerHTML = `
        ${ShogiPiece.renderSvg(type, owner, rotated)}
        ${count > 1 ? `<span class="shogi-hand-count">${count}</span>` : ''}
      `;
      if (usable) {
        btn.addEventListener('click', () => {
          this.selectedBoard = null;
          this.pendingPromo = null;
          this.selectedDrop = this.selectedDrop === type ? null : type;
          this.render(this.lastViewModel);
        });
      }
      el.appendChild(btn);
    }

    if (!any) {
      const empty = document.createElement('span');
      empty.className = 'shogi-komadai-label';
      empty.style.opacity = '0.65';
      empty.textContent = 'なし';
      el.appendChild(empty);
    }
  }

  _handleCellClick(r, c, piece, movesHere, isHumanTurn) {
    if (!isHumanTurn) return;

    if (movesHere.length > 0) {
      if (movesHere.length === 2) {
        this.pendingPromo = movesHere;
        this._renderPromoOverlay();
        return;
      }
      this.selectedBoard = null;
      this.selectedDrop = null;
      this.pendingPromo = null;
      this.onAction(movesHere[0]);
      return;
    }

    if (piece && piece.owner === this.lastViewModel.state.currentPlayer) {
      this.selectedDrop = null;
      this.pendingPromo = null;
      if (this.selectedBoard && this.selectedBoard.r === r && this.selectedBoard.c === c) {
        this.selectedBoard = null;
      } else {
        this.selectedBoard = { r, c };
      }
      this.render(this.lastViewModel);
    } else if (this.selectedBoard || this.selectedDrop) {
      this.selectedBoard = null;
      this.selectedDrop = null;
      this.render(this.lastViewModel);
    }
  }

  _renderPromoOverlay() {
    if (!this.promoSlotEl) return;
    if (!this.pendingPromo) {
      this.promoSlotEl.innerHTML = '';
      return;
    }

    this.promoSlotEl.innerHTML = `
      <div class="shogi-promo-overlay">
        <div class="shogi-promo-card">
          <div class="shogi-promo-title">駒を成りますか？</div>
          <div class="shogi-promo-actions">
            <button type="button" class="btn btn-primary" id="shogi-btn-promote">成る</button>
            <button type="button" class="btn btn-secondary" id="shogi-btn-keep">不成</button>
          </div>
        </div>
      </div>
    `;

    const pick = (promoteFlag) => {
      const chosen = this.pendingPromo.find((m) => Boolean(m.promote) === promoteFlag);
      this.selectedBoard = null;
      this.selectedDrop = null;
      this.pendingPromo = null;
      this.promoSlotEl.innerHTML = '';
      if (chosen) this.onAction(chosen);
    };

    this.promoSlotEl.querySelector('#shogi-btn-promote').addEventListener('click', () => pick(true));
    this.promoSlotEl.querySelector('#shogi-btn-keep').addEventListener('click', () => pick(false));
  }
}
