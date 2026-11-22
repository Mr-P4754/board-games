import { BaseRenderer } from '../../core/BaseRenderer.js';

const PEBBLE_COLORS = ['#e0a74d', '#589e7d', '#c95c4d', '#5d8ab8', '#d9c598', '#8a73a8'];

/**
 * マンカラ木製ボード・ガラス石・ストア描画クラス
 */
export class MancalaRenderer extends BaseRenderer {
  mount() {
    this.container.innerHTML = `<div class="mancala-wrap" id="mancala-wrap"></div>`;
    this.wrapEl = this.container.querySelector('#mancala-wrap');
  }

  render({ state, legalMoves, showLastMove, isHumanTurn, playerSide, mode }) {
    if (!this.wrapEl) return;

    const flipped = mode === 'cpu' && playerSide === 2;
    const legalSet = new Set(legalMoves.map((m) => m.pit));

    // Top row is opponent side (right-to-left in counter-clockwise order), bottom row is player side (left-to-right)
    const topPits = flipped ? [5, 4, 3, 2, 1, 0] : [12, 11, 10, 9, 8, 7];
    const bottomPits = flipped ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5];
    const leftStoreIdx = flipped ? 6 : 13;
    const rightStoreIdx = flipped ? 13 : 6;
    const topOwner = flipped ? 1 : 2;
    const bottomOwner = flipped ? 2 : 1;

    const renderPit = (pitIdx) => {
      const count = state.pits[pitIdx];
      const playable = isHumanTurn && legalSet.has(pitIdx);
      const isLast = showLastMove && state.lastMove && state.lastMove.pit === pitIdx;
      const cls = [
        'mancala-pit',
        playable ? 'mancala-pit--playable' : '',
        isLast ? 'mancala-pit--last' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `
        <button type="button" class="${cls}" ${playable ? `data-pit="${pitIdx}"` : 'disabled'} aria-label="ポケット ${count}個">
          ${this._pebblesSvg(count, pitIdx)}
          <span class="mancala-pit-count">${count}</span>
        </button>
      `;
    };

    this.wrapEl.innerHTML = `
      <div class="mancala-side-label">
        <span>← ${topOwner === 1 ? '先手' : '後手'}の陣地（反時計回り）</span>
        <span>${state.currentPlayer === topOwner && !state.gameOver ? '手番中' : ''}</span>
      </div>
      <div class="mancala-board">
        <div class="mancala-store ${state.currentPlayer === topOwner && !state.gameOver ? 'mancala-store--active' : ''}">
          <span class="mancala-store-title">${topOwner === 1 ? '先手' : '後手'}</span>
          ${this._pebblesSvg(Math.min(state.pits[leftStoreIdx], 14), leftStoreIdx, true)}
          <span class="mancala-store-count">${state.pits[leftStoreIdx]}</span>
        </div>

        <div class="mancala-pits-col">
          <div class="mancala-row">${topPits.map(renderPit).join('')}</div>
          <div class="mancala-row">${bottomPits.map(renderPit).join('')}</div>
        </div>

        <div class="mancala-store ${state.currentPlayer === bottomOwner && !state.gameOver ? 'mancala-store--active' : ''}">
          <span class="mancala-store-title">${bottomOwner === 1 ? '先手' : '後手'}</span>
          ${this._pebblesSvg(Math.min(state.pits[rightStoreIdx], 14), rightStoreIdx, true)}
          <span class="mancala-store-count">${state.pits[rightStoreIdx]}</span>
        </div>
      </div>
      <div class="mancala-side-label">
        <span>${state.currentPlayer === bottomOwner && !state.gameOver ? '手番中' : ''}</span>
        <span>${bottomOwner === 1 ? '先手' : '後手'}の陣地（左から右へ蒔く）→</span>
      </div>
    `;

    this.wrapEl.querySelectorAll('[data-pit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onAction({ pit: Number(btn.dataset.pit) });
      });
    });
  }

  _pebblesSvg(count, seed, tall = false) {
    const shown = Math.min(count, tall ? 14 : 12);
    const w = 64;
    const h = tall ? 104 : 64;
    const cx0 = w / 2;
    const cy0 = h / 2;
    let circles = '';

    for (let i = 0; i < shown; i++) {
      const angle = i * 2.39996 + seed * 0.7; // Golden-angle spiral for natural stone cluster
      const radius = i === 0 ? 0 : Math.sqrt(i / Math.max(shown, 1)) * (tall ? 20 : 18);
      const x = cx0 + Math.cos(angle) * radius * (tall ? 0.85 : 1);
      const y = cy0 + Math.sin(angle) * radius * (tall ? 1.55 : 1);
      const color = PEBBLE_COLORS[(seed * 3 + i) % PEBBLE_COLORS.length];
      circles += `
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.2" fill="${color}" stroke="rgba(0,0,0,0.35)" stroke-width="0.9"/>
        <circle cx="${(x - 1.8).toFixed(1)}" cy="${(y - 1.8).toFixed(1)}" r="1.8" fill="rgba(255,255,255,0.55)"/>
      `;
    }

    return `<svg class="mancala-pebbles" viewBox="0 0 ${w} ${h}" aria-hidden="true">${circles}</svg>`;
  }
}
