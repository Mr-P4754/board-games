import { MahjongEngine } from './MahjongEngine.js';
import { MahjongRenderer } from './MahjongRenderer.js';
import { MahjongAI } from './MahjongAI.js';

/**
 * 4人麻雀（半荘戦・CPU対戦専用）の対局進行コントローラー
 */
export class MahjongController {
  constructor(context) {
    this.gameMeta = context.gameMeta;
    this.config = context.config;
    this.layoutView = context.layoutView;
    this.storage = context.storage;
    this.sound = context.sound;
    this.toast = context.toast;
    this.onShowResult = context.onShowResult;

    this.engine = null;
    this.renderer = null;
    this.ai = new MahjongAI();
    this.destroyed = false;
    this.stepToken = 0;
    this.resultRecorded = false;
  }

  start() {
    this.engine = new MahjongEngine(this.config.options || {});
    this.renderer = new MahjongRenderer(this.layoutView.getBoardContainer(), (action) =>
      this.handleHumanAction(action)
    );
    this.renderer.mount();
    this.resultRecorded = false;
    this._render();
    this._scheduleProgress();
  }

  restart() {
    this.stepToken++;
    this.resultRecorded = false;
    this.engine.reset(this.config.options || {});
    this._render();
    this._scheduleProgress();
  }

  undo() {
    // 4-player mahjong does not support undo
  }

  resign() {
    // Handled via restart or lobby navigation
  }

  refreshSettings() {
    if (!this.destroyed) this._render();
  }

  handleHumanAction(action) {
    if (this.destroyed) return;

    if (action.kind === 'nextRound') {
      this.engine.advanceAfterRound();
      this._render();
      if (this.engine.phase === 'match_end') {
        this._handleMatchEnd();
      } else {
        this._scheduleProgress();
      }
      return;
    }

    if (action.kind === 'turn' && this.engine.phase === 'turn' && this.engine.currentTurn === 0) {
      const res = this.engine.applyTurnAction(0, action);
      if (!res.ok) {
        if (res.reason) this.toast.show(res.reason);
        return;
      }
      this._playEventSound(res.event, 'あなた');
      this._render();
      this._scheduleProgress();
      return;
    }

    if (action.kind === 'claim' && this.engine.phase === 'claim' && this.engine.pendingClaims.has(0)) {
      const res = this.engine.submitClaimResponse(0, action);
      if (res.ok && res.event && res.event !== 'pass') {
        this._playEventSound(res.event, 'あなた');
      }
      this._render();
      this._scheduleProgress();
    }
  }

  async _scheduleProgress() {
    const token = ++this.stepToken;

    while (!this.destroyed && token === this.stepToken) {
      const phase = this.engine.phase;

      if (phase === 'round_end') {
        const rr = this.engine.roundResult;
        if (rr?.type === 'tsumo' || rr?.type === 'ron') {
          this.sound.play(rr.winnerSeat === 0 ? 'win' : 'call');
        }
        return;
      }

      if (phase === 'match_end') {
        this._handleMatchEnd();
        return;
      }

      if (phase === 'claim') {
        // Resolve all CPU claims immediately; wait if human has a pending claim
        const state = this.engine.getState();
        let cpuResponded = false;
        for (const [seat, opts] of [...this.engine.pendingClaims.entries()]) {
          if (seat === 0 || this.engine.claimResponses.has(seat)) continue;
          const choice = this.ai.chooseClaimAction(state, seat, opts, this.config.difficulty);
          const res = this.engine.submitClaimResponse(seat, choice);
          cpuResponded = true;
          if (res.event && res.event !== 'pass') {
            this._playEventSound(res.event, this.engine.players[seat].name);
            this._render();
            await this._sleep(360);
          }
          if (this.engine.phase !== 'claim') break;
        }

        // If human still needs to choose a claim, pause and wait for click
        if (this.engine.phase === 'claim' && this.engine.pendingClaims.has(0) && !this.engine.claimResponses.has(0)) {
          this._render();
          return;
        }
        if (!cpuResponded) return;
        this._render();
        continue;
      }

      if (phase === 'turn') {
        if (this.engine.currentTurn === 0) {
          // Human's turn
          this._render();
          return;
        }

        // CPU turn
        await this._sleep(320);
        if (this.destroyed || token !== this.stepToken) return;

        const seat = this.engine.currentTurn;
        const state = this.engine.getState();
        const turnActions = this.engine.getTurnActions(seat);
        const choice = this.ai.chooseTurnAction(state, seat, turnActions, this.config.difficulty);
        const res = this.engine.applyTurnAction(seat, choice);
        if (res.ok) {
          this._playEventSound(res.event, this.engine.players[seat].name);
        }
        this._render();
      }
    }
  }

  _playEventSound(event, actorName) {
    if (event === 'discard') {
      this.sound.play('tile');
    } else if (event === 'riichi') {
      this.sound.play('riichi');
      this.toast.show(`${actorName} がリーチ！`);
    } else if (event === 'pon') {
      this.sound.play('call');
      this.toast.show(`${actorName} がポン！`);
    } else if (event === 'chi') {
      this.sound.play('call');
      this.toast.show(`${actorName} がチー！`);
    } else if (event === 'kan' || event === 'minkan') {
      this.sound.play('call');
      this.toast.show(`${actorName} がカン！`);
    } else if (event === 'tsumo' || event === 'ron') {
      this.sound.play('win');
    }
  }

  _handleMatchEnd() {
    const mr = this.engine.matchResult;
    if (!mr) return;
    const humanStanding = mr.standings.find((s) => s.isHuman);
    const rank = humanStanding?.rank || 4;

    if (!this.resultRecorded) {
      this.storage.recordMahjongRank(this.config.difficulty || 'intermediate', rank);
      this.resultRecorded = true;
    }

    this.sound.play(rank <= 2 ? 'win' : 'lose');

    this.onShowResult({
      badgeType: rank === 1 ? 'win' : rank <= 2 ? 'draw' : 'lose',
      badgeText: `${rank}位`,
      headline: `半荘終了 — あなたは ${rank}位！`,
      reason: mr.reason,
      details: mr.standings.map(
        (s) =>
          `${s.rank}位 ${s.name}: ${s.score.toLocaleString()}点（${s.point >= 0 ? '+' : ''}${s.point.toFixed(1)}）`
      ),
    });
  }

  _render() {
    if (!this.destroyed && this.renderer) {
      this.renderer.render({ state: this.engine.getState() });
    }
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  destroy() {
    this.destroyed = true;
    this.stepToken++;
    if (this.renderer) {
      this.renderer.destroy();
    }
  }
}
