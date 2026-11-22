/**
 * 1人用パズルゲーム共通の進行コントローラー基底クラス（タイマー・記録保存・UI同期）
 */
export class BasePuzzleController {
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
    this.destroyed = false;
    this.resultRecorded = false;
    this.elapsedSec = 0;
    this.timerId = null;
  }

  createEngine() {
    throw new Error('createEngine() must be implemented by subclass');
  }

  createRenderer(_container) {
    throw new Error('createRenderer() must be implemented by subclass');
  }

  getStatusSummary(_state) {
    return {
      turnText: 'プレイ中',
      scores: [],
    };
  }

  getClearDetails(_state) {
    return [`クリアタイム: ${this.formatTime(this.elapsedSec)}`];
  }

  getClearMetrics(_state) {
    return { timeSec: this.elapsedSec };
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  start() {
    this.engine = this.createEngine();
    this.renderer = this.createRenderer(this.layoutView.getBoardContainer());
    this.renderer.mount();
    this.resultRecorded = false;
    this._startTimer();
    this.onAfterMount();
    this._syncUI();
  }

  onAfterMount() {
    // Optional hook for subclass extra buttons or keyboard bindings
  }

  _startTimer() {
    this._stopTimer();
    this.elapsedSec = 0;
    this.timerId = setInterval(() => {
      if (this.destroyed || this.engine?.isGameOver()) return;
      this.elapsedSec += 1;
      this._syncStatusOnly();
    }, 1000);
  }

  _stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  handleAction(action) {
    if (this.destroyed) return;
    const res = this.engine.applyMove(action);
    if (!res || !res.ok) {
      if (res?.reason) this.toast.show(res.reason);
      return;
    }
    if (res.sound) this.sound.play(res.sound);
    if (res.notice) this.toast.show(res.notice);

    this._syncUI();

    if (this.engine.isGameOver()) {
      this._handleFinished();
    }
  }

  undo() {
    if (this.destroyed || !this.engine?.canUndo()) return;
    this.engine.undo();
    this._syncUI();
  }

  resign() {
    if (this.destroyed || !this.engine || this.engine.isGameOver()) return;
    this.restart();
  }

  restart() {
    this.resultRecorded = false;
    this.engine.reset(this.getEngineOptions());
    this._startTimer();
    this._syncUI();
  }

  getEngineOptions() {
    return {
      difficulty: this.config.difficulty || 'intermediate',
      ...(this.config.options || {}),
    };
  }

  refreshSettings() {
    if (!this.destroyed) this._syncUI();
  }

  _syncUI() {
    const state = this.engine.getState();
    const settings = this.storage.getSettings();
    this.renderer.render({
      state,
      showHints: settings.showHints,
      elapsedSec: this.elapsedSec,
      elapsedText: this.formatTime(this.elapsedSec),
      difficulty: this.config.difficulty || 'intermediate',
    });
    this._syncStatusOnly();
  }

  _syncStatusOnly() {
    if (this.destroyed || !this.engine) return;
    const state = this.engine.getState();
    const summary = this.getStatusSummary(state);
    this.layoutView.updateStatus({
      turnText: summary.turnText,
      turnColor: 'dark',
      isThinking: false,
      scores: summary.scores,
      canUndo: this.engine.canUndo() && !this.engine.isGameOver(),
      canResign: false,
      history: this.engine.getMoveHistory(),
    });
  }

  _handleFinished() {
    this._stopTimer();
    const state = this.engine.getState();
    const result = this.engine.getResult();
    const won = result?.winner === 1;

    if (won && !this.resultRecorded) {
      this.storage.recordPuzzleClear(
        this.gameMeta.id,
        this.config.difficulty || 'intermediate',
        this.getClearMetrics(state)
      );
      this.resultRecorded = true;
    }

    this.sound.play(won ? 'win' : 'lose');
    this.onShowResult({
      badgeType: won ? 'win' : 'lose',
      badgeText: won ? 'CLEAR!' : 'GAME OVER',
      headline: result?.headline || (won ? 'パズルクリア！' : 'ゲームオーバー'),
      reason: result?.reason || '',
      details: this.getClearDetails(state),
    });
  }

  destroy() {
    this.destroyed = true;
    this._stopTimer();
    if (this.renderer) {
      this.renderer.destroy();
    }
  }
}
