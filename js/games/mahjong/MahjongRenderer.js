import { BaseRenderer } from '../../core/BaseRenderer.js';
import { MahjongTile } from './MahjongTile.js';

/**
 * 4人麻雀の卓・4家の河・副露・手牌・アクションバー・局結果モーダル描画クラス
 */
export class MahjongRenderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this.riichiSelectMode = false;
    this.lastState = null;
  }

  mount() {
    this.container.innerHTML = `<div class="mj-table" id="mj-table"></div>`;
    this.tableEl = this.container.querySelector('#mj-table');
  }

  render({ state }) {
    this.lastState = state;
    if (!this.tableEl) return;

    if (state.phase !== 'turn' || state.currentTurn !== 0 || !state.humanTurnActions?.riichiDiscardIds?.length) {
      this.riichiSelectMode = false;
    }

    const p0 = state.players[0]; // Self (bottom)
    const p1 = state.players[1]; // Shimocha (right)
    const p2 = state.players[2]; // Toimen (top)
    const p3 = state.players[3]; // Kamicha (left)

    const doraHtml = (state.doraIndicators || [])
      .map((t) => this._tileHtml(t, 'xs'))
      .join('');

    this.tableEl.innerHTML = `
      <!-- Top (Toimen) -->
      <div class="mj-top-row">
        ${this._seatBadgeHtml(p2, state.currentTurn === 2)}
        <div class="mj-opp-hand">
          ${this._backsHtml(p2.hand.length + (p2.drawnTile ? 1 : 0))}
          ${this._meldsHtml(p2.melds)}
        </div>
      </div>

      <!-- Middle Row: Left (Kamicha), Center Arena, Right (Shimocha) -->
      <div class="mj-middle-row">
        <div class="mj-side-seat">
          ${this._seatBadgeHtml(p3, state.currentTurn === 3)}
          <div class="mj-opp-hand">
            ${this._backsHtml(Math.min(14, p3.hand.length + (p3.drawnTile ? 1 : 0)), true)}
          </div>
          ${this._meldsHtml(p3.melds)}
        </div>

        <div class="mj-arena">
          <div class="mj-river mj-river--top">${this._riverHtml(p2.discards)}</div>
          <div class="mj-river mj-river--side mj-river--left">${this._riverHtml(p3.discards)}</div>

          <div class="mj-center-box">
            <div class="mj-round-title">${state.roundLabel}${state.honba > 0 ? ` ${state.honba}本場` : ''}</div>
            <div class="mj-center-meta">
              <span>残 ${state.tilesRemaining}</span>
              <span>供託 ${state.riichiSticks}本</span>
            </div>
            <div class="mj-dora-row">
              <span class="mj-dora-label">ドラ表示</span>
              ${doraHtml}
            </div>
          </div>

          <div class="mj-river mj-river--side mj-river--right">${this._riverHtml(p1.discards)}</div>
          <div class="mj-river mj-river--bottom">${this._riverHtml(p0.discards)}</div>
        </div>

        <div class="mj-side-seat">
          ${this._seatBadgeHtml(p1, state.currentTurn === 1)}
          <div class="mj-opp-hand">
            ${this._backsHtml(Math.min(14, p1.hand.length + (p1.drawnTile ? 1 : 0)), true)}
          </div>
          ${this._meldsHtml(p1.melds)}
        </div>
      </div>

      <!-- Bottom (Human Player) -->
      <div class="mj-player-zone">
        <div class="mj-player-info-row">
          ${this._seatBadgeHtml(p0, state.currentTurn === 0)}
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${this._waitsBarHtml(state)}
            ${state.humanFuriten && state.humanWaits.length > 0 ? `<span class="mj-furiten-badge">フリテン</span>` : ''}
          </div>
        </div>

        <div class="mj-action-bar" id="mj-action-bar">
          ${this._actionBarHtml(state)}
        </div>

        <div class="mj-player-hand-row">
          <div class="mj-hand-tiles" id="mj-hand-tiles">
            ${this._humanHandHtml(state)}
          </div>
          ${this._meldsHtml(p0.melds)}
        </div>
      </div>

      ${state.phase === 'round_end' && state.roundResult ? this._roundOverlayHtml(state.roundResult) : ''}
    `;

    this._bindEvents(state);
  }

  _seatBadgeHtml(player, isActive) {
    const classes = ['mj-seat-badge'];
    if (isActive) classes.push('mj-seat-badge--active');
    if (player.isRiichi) classes.push('mj-seat-badge--riichi');
    return `
      <div class="${classes.join(' ')}">
        <span class="mj-wind-pill ${player.isDealer ? 'mj-wind-pill--dealer' : ''}">${player.wind}</span>
        <span>${player.name}</span>
        <span class="mj-score-num">${player.score.toLocaleString()}</span>
      </div>
    `;
  }

  _backsHtml(count, compact = false) {
    const shown = compact ? Math.min(count, 7) : count;
    let html = '';
    for (let i = 0; i < shown; i++) {
      html += `<span class="mj-tile mj-tile--back mj-tile--back-sm"></span>`;
    }
    if (compact && count > shown) {
      html += `<span style="font-size:0.7rem;color:#c7d8cf;margin-left:3px;">×${count}</span>`;
    }
    return html;
  }

  _tileHtml(tile, size = 'md', extraClass = '', attrs = '') {
    const sizeCls = size === 'sm' ? 'mj-tile--sm' : size === 'xs' ? 'mj-tile--xs' : '';
    const redCls = tile.isRed ? 'mj-tile--red-dot' : '';
    const tag = attrs ? 'button' : 'span';
    const typeAttr = attrs ? 'type="button"' : '';
    return `<${tag} ${typeAttr} class="mj-tile ${sizeCls} ${redCls} ${extraClass}" ${attrs}>${MahjongTile.renderSvg(tile.type, tile.isRed)}</${tag}>`;
  }

  _riverHtml(discards) {
    return (discards || [])
      .map((d) => {
        const extra = [
          d.isRiichiDiscard ? 'mj-tile--rotated' : '',
          d.isCalled ? 'mj-tile--called' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return this._tileHtml(d.tile, 'xs', extra);
      })
      .join('');
  }

  _meldsHtml(melds) {
    if (!melds || melds.length === 0) return '';
    return `
      <div class="mj-melds">
        ${melds
          .map(
            (m) => `
          <div class="mj-meld-group">
            ${m.tiles
              .map((t, idx) =>
                m.kind === 'ankan' && (idx === 0 || idx === 3)
                  ? `<span class="mj-tile mj-tile--xs mj-tile--back"></span>`
                  : this._tileHtml(t, 'xs')
              )
              .join('')}
          </div>`
          )
          .join('')}
      </div>
    `;
  }

  _waitsBarHtml(state) {
    if (!state.humanWaits || state.humanWaits.length === 0) return '';
    const labels = state.humanWaits.map((t) => MahjongTile.labelOf(t)).join('・');
    return `<div class="mj-waits-bar">聴牌 待ち: <strong>${labels}</strong></div>`;
  }

  _actionBarHtml(state) {
    if (state.phase === 'turn' && state.currentTurn === 0 && state.humanTurnActions) {
      const a = state.humanTurnActions;
      const btns = [];

      if (a.canTsumo) {
        btns.push(`<button type="button" class="mj-act-btn mj-act-btn--win" data-mj-act="tsumo">ツモ和了</button>`);
      }

      if (a.riichiDiscardIds.length > 0) {
        if (this.riichiSelectMode) {
          btns.push(`<button type="button" class="mj-act-btn mj-act-btn--pass" data-mj-act="cancel-riichi">リーチをキャンセル（捨てる牌を選択中）</button>`);
        } else {
          btns.push(`<button type="button" class="mj-act-btn mj-act-btn--riichi" data-mj-act="enter-riichi">リーチ</button>`);
        }
      }

      for (const t of a.ankanTypes) {
        btns.push(`<button type="button" class="mj-act-btn" data-mj-act="ankan" data-tile-type="${t}">暗槓（${MahjongTile.labelOf(t)}）</button>`);
      }

      for (const t of a.kakanTypes) {
        btns.push(`<button type="button" class="mj-act-btn" data-mj-act="kakan" data-tile-type="${t}">加槓（${MahjongTile.labelOf(t)}）</button>`);
      }

      if (btns.length === 0) {
        return `<span style="font-size:0.8rem;color:#c7d8cf;">${
          state.players[0].isRiichi ? 'リーチ中：ツモ牌をクリックして打牌' : '手牌をクリックして打牌してください'
        }</span>`;
      }
      return btns.join('');
    }

    if (state.phase === 'claim' && state.humanClaimOptions) {
      const c = state.humanClaimOptions;
      const btns = [];
      if (c.ronEval) {
        btns.push(`<button type="button" class="mj-act-btn mj-act-btn--win" data-mj-claim="ron">ロン和了</button>`);
      }
      if (c.canPon) {
        btns.push(`<button type="button" class="mj-act-btn" data-mj-claim="pon">ポン</button>`);
      }
      if (c.canMinkan) {
        btns.push(`<button type="button" class="mj-act-btn" data-mj-claim="minkan">カン</button>`);
      }
      c.chiCombos.forEach((combo, idx) => {
        const label = `${MahjongTile.labelOf(combo[0])}・${MahjongTile.labelOf(combo[1])}`;
        btns.push(`<button type="button" class="mj-act-btn" data-mj-claim="chi" data-chi-idx="${idx}">チー（${label}）</button>`);
      });
      btns.push(`<button type="button" class="mj-act-btn mj-act-btn--pass" data-mj-claim="pass">スキップ</button>`);
      return btns.join('');
    }

    return `<span style="font-size:0.8rem;color:#b8ccc0;">CPU が対局進行中...</span>`;
  }

  _humanHandHtml(state) {
    const p0 = state.players[0];
    const isMyTurn = state.phase === 'turn' && state.currentTurn === 0;
    const actions = state.humanTurnActions;
    const discardable = new Set(actions?.discardableIds || []);
    const riichiCands = new Set(actions?.riichiDiscardIds || []);

    const renderPlayTile = (tile, isDrawn) => {
      const canClick =
        isMyTurn && (this.riichiSelectMode ? riichiCands.has(tile.id) : discardable.has(tile.id));
      const classes = [];
      if (isDrawn) classes.push('mj-tile-drawn-gap');
      if (canClick) classes.push('mj-tile--clickable');
      else if (isMyTurn) classes.push('mj-tile--disabled');
      if (this.riichiSelectMode && riichiCands.has(tile.id)) classes.push('mj-tile--riichi-cand');

      const attrs = canClick ? `data-discard-id="${tile.id}" aria-label="${MahjongTile.labelOf(tile.type)}"` : '';
      return this._tileHtml(tile, 'md', classes.join(' '), attrs);
    };

    let html = p0.hand.map((t) => renderPlayTile(t, false)).join('');
    if (p0.drawnTile) {
      html += renderPlayTile(p0.drawnTile, true);
    }
    return html;
  }

  _roundOverlayHtml(rr) {
    const deltasHtml = this.lastState.players
      .map((pl, idx) => {
        const d = rr.deltas[idx] || 0;
        const cls = d > 0 ? 'mj-delta-plus' : d < 0 ? 'mj-delta-minus' : '';
        const sign = d > 0 ? `+${d.toLocaleString()}` : d.toLocaleString();
        return `
          <div class="mj-delta-cell">
            <div>${pl.wind} ${pl.name}</div>
            <div><strong>${pl.score.toLocaleString()}</strong></div>
            <div class="${cls}">${sign}</div>
          </div>`;
      })
      .join('');

    if (rr.type === 'draw') {
      const tpNames =
        rr.tenpaiSeats.length > 0
          ? rr.tenpaiSeats.map((s) => this.lastState.players[s].name).join('・')
          : 'なし';
      return `
        <div class="mj-overlay">
          <div class="mj-round-card">
            <h2 class="mj-round-card-title">${rr.roundLabel} — 荒牌流局</h2>
            <p class="mj-round-sub">聴牌者: ${tpNames} ${rr.renchan ? '（親聴牌のため連荘）' : ''}</p>
            <div class="mj-delta-grid">${deltasHtml}</div>
            <div style="text-align:right;">
              <button type="button" class="btn btn-primary" id="mj-next-round-btn">次局へ進む</button>
            </div>
          </div>
        </div>
      `;
    }

    const ev = rr.evalRes;
    const winTypeLabel = rr.type === 'tsumo' ? 'ツモ和了' : `ロン和了（放銃: ${rr.loserName}）`;
    const handHtml = [
      ...rr.hand.map((t) => this._tileHtml(t, 'sm')),
      `<span style="width:8px;"></span>`,
      this._tileHtml(rr.winTile, 'sm', 'mj-tile--riichi-cand'),
      `<span style="width:10px;"></span>`,
      ...(rr.melds || []).flatMap((m) => m.tiles.map((t) => this._tileHtml(t, 'xs'))),
    ].join('');

    const yakuHtml = ev.yaku
      .map(
        (y) => `
        <div class="mj-yaku-item">
          <span>${y.name}</span>
          <strong>${ev.isYakuman ? '役満' : `${y.han}翻`}</strong>
        </div>`
      )
      .join('');

    const scoreSummary = ev.isYakuman
      ? `${ev.payment.rankName} ${ev.payment.label}`
      : `${ev.han}翻 ${ev.fu}符 ${ev.payment.rankName ? `【${ev.payment.rankName}】 ` : ''}${ev.payment.label}`;

    return `
      <div class="mj-overlay">
        <div class="mj-round-card">
          <h2 class="mj-round-card-title">${rr.roundLabel} — ${rr.winnerName} ${winTypeLabel}</h2>
          <p class="mj-round-sub">${scoreSummary}${rr.collectedSticks > 0 ? ` ＋供託${rr.collectedSticks * 1000}点` : ''}</p>
          <div class="mj-win-hand">${handHtml}</div>
          <div class="mj-yaku-list">${yakuHtml}</div>
          <div class="mj-delta-grid">${deltasHtml}</div>
          <div style="text-align:right;">
            <button type="button" class="btn btn-primary" id="mj-next-round-btn">次局へ進む</button>
          </div>
        </div>
      </div>
    `;
  }

  _bindEvents(state) {
    this.tableEl.querySelectorAll('[data-discard-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tileId = Number(btn.dataset.discardId);
        const type = this.riichiSelectMode ? 'riichi' : 'discard';
        this.riichiSelectMode = false;
        this.onAction({ kind: 'turn', type, tileId });
      });
    });

    this.tableEl.querySelectorAll('[data-mj-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.mjAct;
        if (act === 'enter-riichi') {
          this.riichiSelectMode = true;
          this.render({ state: this.lastState });
        } else if (act === 'cancel-riichi') {
          this.riichiSelectMode = false;
          this.render({ state: this.lastState });
        } else if (act === 'tsumo') {
          this.onAction({ kind: 'turn', type: 'tsumo' });
        } else if (act === 'ankan' || act === 'kakan') {
          this.onAction({ kind: 'turn', type: act, tileType: Number(btn.dataset.tileType) });
        }
      });
    });

    this.tableEl.querySelectorAll('[data-mj-claim]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const claim = btn.dataset.mjClaim;
        if (claim === 'chi') {
          const combo = state.humanClaimOptions.chiCombos[Number(btn.dataset.chiIdx)];
          this.onAction({ kind: 'claim', type: 'chi', combo });
        } else {
          this.onAction({ kind: 'claim', type: claim });
        }
      });
    });

    const nextBtn = this.tableEl.querySelector('#mj-next-round-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.onAction({ kind: 'nextRound' }));
    }
  }
}
