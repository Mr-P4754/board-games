import { BaseRenderer } from '../../core/BaseRenderer.js';
import { GomokuEngine } from './GomokuEngine.js';

const SIZE = GomokuEngine.SIZE;
const PAD = 32;
const STEP = 36;
const VIEW = PAD * 2 + STEP * (SIZE - 1);
const STARS = [
  [3, 3], [3, 11], [7, 7], [11, 3], [11, 11],
];
const COLS = 'ABCDEFGHIJKLMNO';

/**
 * 五目並べ（15×15交点盤）のSVG描画クラス
 */
export class GomokuRenderer extends BaseRenderer {
  mount() {
    this.container.innerHTML = `<div class="gomoku-board-wrap" id="gomoku-wrap"></div>`;
    this.wrapEl = this.container.querySelector('#gomoku-wrap');
  }

  render({ state, showHints, showLastMove, isHumanTurn }) {
    if (!this.wrapEl) return;

    const forbiddenSet = new Set((state.forbidden || []).map(([r, c]) => `${r},${c}`));
    const winSet = new Set((state.winLine || []).map(([r, c]) => `${r},${c}`));
    const hoverFill = state.currentPlayer === 1 ? '#1e1c1a' : '#f7f4ec';

    const lines = [];
    for (let i = 0; i < SIZE; i++) {
      const pos = PAD + i * STEP;
      const end = PAD + (SIZE - 1) * STEP;
      lines.push(`<line x1="${PAD}" y1="${pos}" x2="${end}" y2="${pos}" stroke="#4c3518" stroke-width="1.2"/>`);
      lines.push(`<line x1="${pos}" y1="${PAD}" x2="${pos}" y2="${end}" stroke="#4c3518" stroke-width="1.2"/>`);
      lines.push(`<text x="${pos}" y="16" text-anchor="middle" font-size="11" fill="#5e4320" font-family="monospace">${COLS[i]}</text>`);
      lines.push(`<text x="14" y="${pos + 4}" text-anchor="middle" font-size="11" fill="#5e4320" font-family="monospace">${SIZE - i}</text>`);
    }

    const stars = STARS.map(([r, c]) => {
      const x = PAD + c * STEP;
      const y = PAD + r * STEP;
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#4c3518"/>`;
    }).join('');

    const items = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = PAD + c * STEP;
        const y = PAD + r * STEP;
        const val = state.board[r][c];
        const key = `${r},${c}`;
        const isForbidden = forbiddenSet.has(key);

        if (val === 0 && isHumanTurn && !isForbidden) {
          items.push(
            `<rect class="gomoku-hit" data-r="${r}" data-c="${c}" x="${x - STEP / 2}" y="${y - STEP / 2}" width="${STEP}" height="${STEP}"/>`,
            `<circle class="gomoku-hover-ring" cx="${x}" cy="${y}" r="14" fill="${hoverFill}"/>`
          );
        }

        if (val === 0 && isForbidden && showHints) {
          items.push(
            `<path class="gomoku-forbidden" d="M${x - 6} ${y - 6}L${x + 6} ${y + 6}M${x + 6} ${y - 6}L${x - 6} ${y + 6}"/>`
          );
        }

        if (val === 1 || val === 2) {
          const fill = val === 1 ? 'url(#g-black)' : 'url(#g-white)';
          items.push(
            `<circle class="gomoku-stone" cx="${x}" cy="${y}" r="15.5" fill="${fill}" filter="url(#stone-shadow)"/>`
          );

          const isLast =
            showLastMove && state.lastMove && state.lastMove.r === r && state.lastMove.c === c;
          if (isLast) {
            items.push(
              `<circle cx="${x}" cy="${y}" r="4.2" fill="${val === 1 ? '#f0c45d' : '#c43b31'}" pointer-events="none"/>`
            );
          }
          if (winSet.has(key)) {
            items.push(`<circle class="gomoku-win-ring" cx="${x}" cy="${y}" r="16.5"/>`);
          }
        }
      }
    }

    this.wrapEl.innerHTML = `
      <svg class="gomoku-svg" viewBox="0 0 ${VIEW} ${VIEW}" role="img" aria-label="五目並べ盤面">
        <defs>
          <radialGradient id="g-black" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#524d47"/>
            <stop offset="55%" stop-color="#1d1b18"/>
            <stop offset="100%" stop-color="#0b0a09"/>
          </radialGradient>
          <radialGradient id="g-white" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="72%" stop-color="#ece6d8"/>
            <stop offset="100%" stop-color="#cac0ae"/>
          </radialGradient>
          <filter id="stone-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="1.6" flood-color="rgba(0,0,0,0.34)"/>
          </filter>
        </defs>
        ${lines.join('')}
        ${stars}
        ${items.join('')}
      </svg>
    `;

    this.wrapEl.querySelectorAll('.gomoku-hit').forEach((el) => {
      el.addEventListener('click', () => {
        this.onAction({ r: Number(el.dataset.r), c: Number(el.dataset.c) });
      });
    });
  }
}
