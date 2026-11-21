import { BaseRenderer } from '../../core/BaseRenderer.js';

const COLS = 'ABCDEFGHJKLMNOPQRST';

const STAR_POINTS = {
  9: [
    [2, 2], [2, 6], [4, 4], [6, 2], [6, 6],
  ],
  13: [
    [3, 3], [3, 9], [6, 6], [9, 3], [9, 9],
  ],
  19: [
    [3, 3], [3, 9], [3, 15],
    [9, 3], [9, 9], [9, 15],
    [15, 3], [15, 9], [15, 15],
  ],
};

/**
 * 囲碁盤（9/13/19路動的対応・終局死石/地合い表示）のSVG描画クラス
 */
export class GoRenderer extends BaseRenderer {
  mount() {
    this.container.innerHTML = `
      <div class="go-shell">
        <div id="go-scoring-slot"></div>
        <div class="go-board-wrap" id="go-board-wrap"></div>
      </div>
    `;
    this.scoringSlot = this.container.querySelector('#go-scoring-slot');
    this.boardWrap = this.container.querySelector('#go-board-wrap');
  }

  render({ state, showLastMove, isHumanTurn }) {
    if (!this.boardWrap) return;

    const size = state.size;
    const isScoring = state.phase === 'scoring' && !state.gameOver;
    this._renderScoringBanner(state, isScoring);

    const pad = 34;
    const span = 520;
    const step = span / (size - 1);
    const view = pad * 2 + span;
    const stoneR = step * 0.455;
    const fontSize = size === 19 ? 10 : size === 13 ? 11.5 : 13;

    const deadSet = new Set(state.deadStones || []);
    const territoryMap = state.scorePreview?.territoryMap || null;
    const hoverFill = state.currentPlayer === 1 ? '#1e1c1a' : '#f7f4ec';

    const lines = [];
    for (let i = 0; i < size; i++) {
      const pos = pad + i * step;
      const end = pad + span;
      lines.push(`<line x1="${pad}" y1="${pos}" x2="${end}" y2="${pos}" stroke="#4b3518" stroke-width="${size === 19 ? 1.0 : 1.35}"/>`);
      lines.push(`<line x1="${pos}" y1="${pad}" x2="${pos}" y2="${end}" stroke="#4b3518" stroke-width="${size === 19 ? 1.0 : 1.35}"/>`);
      lines.push(`<text x="${pos}" y="18" text-anchor="middle" font-size="${fontSize}" fill="#5b411f" font-family="monospace">${COLS[i]}</text>`);
      lines.push(`<text x="15" y="${pos + fontSize * 0.35}" text-anchor="middle" font-size="${fontSize}" fill="#5b411f" font-family="monospace">${size - i}</text>`);
    }

    const stars = (STAR_POINTS[size] || [])
      .map(([r, c]) => `<circle cx="${pad + c * step}" cy="${pad + r * step}" r="${size === 19 ? 3.2 : 4}" fill="#4b3518"/>`)
      .join('');

    const items = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x = pad + c * step;
        const y = pad + r * step;
        const val = state.board[r][c];
        const key = `${r},${c}`;
        const isDead = deadSet.has(key);

        if (territoryMap && territoryMap[r][c] !== 0) {
          const tSize = stoneR * 0.85;
          const tColor = territoryMap[r][c] === 1 ? '#1c1a18' : '#faf6ee';
          items.push(
            `<rect x="${x - tSize / 2}" y="${y - tSize / 2}" width="${tSize}" height="${tSize}" rx="2" fill="${tColor}" opacity="0.72" stroke="#5b411f" stroke-width="0.8" pointer-events="none"/>`
          );
        }

        if (val === 0 && isHumanTurn && !isScoring) {
          items.push(
            `<rect class="go-hit" data-action="place" data-r="${r}" data-c="${c}" x="${x - step / 2}" y="${y - step / 2}" width="${step}" height="${step}"/>`,
            `<circle class="go-hover-stone" cx="${x}" cy="${y}" r="${stoneR * 0.92}" fill="${hoverFill}"/>`
          );
        }

        if (val === 1 || val === 2) {
          const fill = val === 1 ? 'url(#go-black)' : 'url(#go-white)';
          const cls = isDead ? 'go-stone-dead' : '';
          items.push(
            `<circle class="${cls}" cx="${x}" cy="${y}" r="${stoneR}" fill="${fill}" filter="url(#go-shadow)" pointer-events="none"/>`
          );
          if (isScoring) {
            items.push(
              `<rect class="go-hit" data-action="toggleDead" data-r="${r}" data-c="${c}" x="${x - step / 2}" y="${y - step / 2}" width="${step}" height="${step}"/>`
            );
            if (isDead) {
              const d = stoneR * 0.55;
              items.push(
                `<path d="M${x - d} ${y - d}L${x + d} ${y + d}M${x + d} ${y - d}L${x - d} ${y + d}" stroke="#c92e25" stroke-width="2.6" stroke-linecap="round" pointer-events="none"/>`
              );
            }
          } else if (
            showLastMove &&
            state.lastMove?.type === 'place' &&
            state.lastMove.r === r &&
            state.lastMove.c === c
          ) {
            items.push(
              `<circle cx="${x}" cy="${y}" r="${stoneR * 0.34}" fill="none" stroke="${val === 1 ? '#f2cb68' : '#c43b31'}" stroke-width="2.2" pointer-events="none"/>`
            );
          }
        }
      }
    }

    this.boardWrap.innerHTML = `
      <svg class="go-svg" viewBox="0 0 ${view} ${view}" role="img" aria-label="囲碁盤">
        <defs>
          <radialGradient id="go-black" cx="34%" cy="28%" r="72%">
            <stop offset="0%" stop-color="#534e48"/>
            <stop offset="56%" stop-color="#1d1b18"/>
            <stop offset="100%" stop-color="#090807"/>
          </radialGradient>
          <radialGradient id="go-white" cx="34%" cy="28%" r="72%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="72%" stop-color="#eee8db"/>
            <stop offset="100%" stop-color="#c6bca9"/>
          </radialGradient>
          <filter id="go-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1.8" stdDeviation="1.4" flood-color="rgba(0,0,0,0.34)"/>
          </filter>
        </defs>
        ${lines.join('')}
        ${stars}
        ${items.join('')}
      </svg>
    `;

    this.boardWrap.querySelectorAll('.go-hit').forEach((el) => {
      el.addEventListener('click', () => {
        this.onAction({
          type: el.dataset.action,
          r: Number(el.dataset.r),
          c: Number(el.dataset.c),
        });
      });
    });
  }

  _renderScoringBanner(state, isScoring) {
    if (!this.scoringSlot) return;
    if (!isScoring || !state.scorePreview) {
      this.scoringSlot.innerHTML = '';
      return;
    }

    const s = state.scorePreview;
    this.scoringSlot.innerHTML = `
      <div class="go-scoring-banner">
        <div>
          <strong>終局・死石確認</strong>：死んでいる石をクリックで指定できます。<br>
          <span>黒 ${s.blackTotal}目 対 白 ${s.whiteTotal}目（コミ${s.komi}含む）</span>
        </div>
        <div class="go-scoring-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="go-resume-btn">対局再開</button>
          <button type="button" class="btn btn-primary btn-sm" id="go-confirm-btn">地合い確定</button>
        </div>
      </div>
    `;

    this.scoringSlot.querySelector('#go-resume-btn').addEventListener('click', () => {
      this.onAction({ type: 'resumePlay' });
    });
    this.scoringSlot.querySelector('#go-confirm-btn').addEventListener('click', () => {
      this.onAction({ type: 'confirmScore' });
    });
  }
}
