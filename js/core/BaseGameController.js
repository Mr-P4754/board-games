/**
 * 2人対戦系ボードゲームの共通進行コントローラー基底クラス
 */
export class BaseGameController {
  constructor(context) {
    this.gameMeta = context.gameMeta;
    this.config = context.config; // { mode: 'cpu'|'pvp', difficulty, playerSide, options }
    this.layoutView = context.layoutView;
    this.storage = context.storage;
    this.sound = context.sound;
    this.toast = context.toast;
    this.aiBridge = context.aiBridge;
    this.onShowResult = context.onShowResult;
    this.onRequestRematch = context.onRequestRematch;

    this.engine = null;
    this.renderer = null;
    this.isThinking = false;
    this.destroyed = false;
    this.turnToken = 0;
    this.resultRecorded = false;
  }

  createEngine() {
    throw new Error('createEngine() must be implemented by subclass');
  }

  createRenderer(_container) {
    throw new Error('createRenderer() must be implemented by subclass');
  }

  getPlayerSideLabels() {
    return { 1: '先手', 2: '後手' };
  }

  getScoreSummary(_state) {
    return [];
  }

  getSoundForMove(_moveResult) {
    return 'place';
  }

  start() {
    this.engine = this.createEngine();
    this.renderer = this.createRenderer(this.layoutView.getBoardContainer());
    this.renderer.mount();
    this.resultRecorded = false;
    this._syncUI();
    this._maybeTriggerAI();
  }

  isHumanTurn() {
    if (this.engine.isGameOver()) return false;
    if (this.config.mode === 'pvp') return true;
    return this.engine.getCurrentPlayer() === this.config.playerSide;
  }

  handleAction(action) {
    if (this.destroyed || this.isThinking || this.engine.isGameOver()) return;
    if (!this.isHumanTurn()) return;
    this.executeMove(action);
  }

  executeMove(move) {
    const moveResult = this.engine.applyMove(move);
    if (!moveResult || !moveResult.ok) {
      if (moveResult?.reason) {
        this.toast.show(moveResult.reason);
      }
      return false;
    }

    this.sound.play(this.getSoundForMove(moveResult));
    if (moveResult.notice) {
      this.toast.show(moveResult.notice);
    }

    this._syncUI();

    if (this.engine.isGameOver()) {
      this._handleGameOver();
    } else {
      this._maybeTriggerAI();
    }
    return true;
  }

  async _maybeTriggerAI() {
    if (this.destroyed || this.engine.isGameOver()) return;
    if (this.config.mode !== 'cpu') return;
    if (this.engine.getCurrentPlayer() === this.config.playerSide) return;

    this.isThinking = true;
    const token = ++this.turnToken;
    this._syncUI();

    const startTime = performance.now();
    try {
      const state = this.engine.getState();
      const move = await this.aiBridge.computeMove(
        this.gameMeta.id,
        state,
        this.config.difficulty,
        this.config.options || {}
      );
      if (this.destroyed || token !== this.turnToken) return;

      const elapsed = performance.now() - startTime;
      const minDelay = 260;
      if (elapsed < minDelay) {
        await new Promise((r) => setTimeout(r, minDelay - elapsed));
      }
      if (this.destroyed || token !== this.turnToken) return;

      this.isThinking = false;
      if (move) {
        this.executeMove(move);
      } else {
        this._syncUI();
      }
    } catch (err) {
      if (this.destroyed || token !== this.turnToken) return;
      this.isThinking = false;
      this.toast.show(`AI思考エラー: ${err.message}`);
      this._syncUI();
    }
  }

  undo() {
    if (this.destroyed || !this.engine.canUndo()) return;
    this.turnToken++;
    this.aiBridge.cancelPending();
    this.isThinking = false;
    this.resultRecorded = false;

    if (this.config.mode === 'cpu') {
      // Undo until it's back to the human's turn (at least 1 ply, usually 2 plies)
      this.engine.undo();
      while (
        this.engine.canUndo() &&
        this.engine.getCurrentPlayer() !== this.config.playerSide
      ) {
        this.engine.undo();
      }
    } else {
      this.engine.undo();
    }

    this._syncUI();
    this._maybeTriggerAI();
  }

  resign() {
    if (this.destroyed || this.engine.isGameOver()) return;
    this.turnToken++;
    this.aiBridge.cancelPending();
    this.isThinking = false;

    const resigningPlayer =
      this.config.mode === 'cpu'
        ? this.config.playerSide
        : this.engine.getCurrentPlayer();
    this.engine.resign(resigningPlayer);
    this._syncUI();
    this._handleGameOver();
  }

  restart() {
    this.turnToken++;
    this.aiBridge.cancelPending();
    this.isThinking = false;
    this.resultRecorded = false;
    this.engine.reset(this.config.options || {});
    this._syncUI();
    this._maybeTriggerAI();
  }

  refreshSettings() {
    if (!this.destroyed) {
      this._syncUI();
    }
  }

  _syncUI() {
    const state = this.engine.getState();
    const settings = this.storage.getSettings();
    const legalMoves = this.isHumanTurn() && !this.isThinking ? this.engine.getLegalMoves() : [];

    this.renderer.render({
      state,
      legalMoves,
      showHints: settings.showHints,
      showLastMove: settings.showLastMove,
      isHumanTurn: this.isHumanTurn() && !this.isThinking,
      playerSide: this.config.playerSide,
      mode: this.config.mode,
    });

    const labels = this.getPlayerSideLabels();
    const current = this.engine.getCurrentPlayer();
    const isCpuTurn = this.config.mode === 'cpu' && current !== this.config.playerSide;

    this.layoutView.updateStatus({
      turnText: this.engine.isGameOver()
        ? '対局終了'
        : `${labels[current]} の番${isCpuTurn ? ' (CPU)' : ''}`,
      turnColor: current === 1 ? 'dark' : 'light',
      isThinking: this.isThinking,
      scores: this.getScoreSummary(state),
      canUndo: this.engine.canUndo() && !this.isThinking,
      canResign: !this.engine.isGameOver(),
      history: this.engine.getMoveHistory(),
    });
  }

  _handleGameOver() {
    const result = this.engine.getResult();
    if (!result) return;

    let outcomeForPlayer = 'draw';
    if (this.config.mode === 'cpu') {
      if (result.winner === 0 || result.winner === null) {
        outcomeForPlayer = 'draw';
      } else if (result.winner === this.config.playerSide) {
        outcomeForPlayer = 'win';
      } else {
        outcomeForPlayer = 'lose';
      }
      if (!this.resultRecorded) {
        this.storage.recordResult(
          this.gameMeta.id,
          'cpu',
          this.config.difficulty,
          outcomeForPlayer
        );
        this.resultRecorded = true;
      }
      this.sound.play(outcomeForPlayer === 'lose' ? 'lose' : 'win');
    } else {
      if (!this.resultRecorded) {
        this.storage.recordResult(this.gameMeta.id, 'pvp', null, 'draw');
        this.resultRecorded = true;
      }
      this.sound.play('win');
    }

    const labels = this.getPlayerSideLabels();
    const headline =
      result.winner === 0 || result.winner === null
        ? '引き分け'
        : this.config.mode === 'cpu'
          ? outcomeForPlayer === 'win'
            ? 'あなたの勝利！'
            : 'CPU の勝利'
          : `${labels[result.winner]} の勝利！`;

    this.onShowResult({
      badgeType:
        this.config.mode === 'pvp'
          ? result.winner ? 'win' : 'draw'
          : outcomeForPlayer,
      badgeText:
        this.config.mode === 'pvp'
          ? '対人戦 決着'
          : outcomeForPlayer === 'win'
            ? 'WIN'
            : outcomeForPlayer === 'lose'
              ? 'LOSE'
              : 'DRAW',
      headline,
      reason: result.reason || '',
      details: result.details || [],
    });
  }

  destroy() {
    this.destroyed = true;
    this.turnToken++;
    this.aiBridge.cancelPending();
    if (this.renderer) {
      this.renderer.destroy();
    }
  }
}
