const DIFF_LABELS = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
};

/**
 * 各ゲーム対局画面の共通フレーム（ヘッダー・盤面領域・ステータス・操作・棋譜履歴）
 */
export class GameLayoutView {
  constructor({ gameMeta, config, settings, handlers }) {
    this.gameMeta = gameMeta;
    this.config = config;
    this.settings = settings;
    this.handlers = handlers;
    this.el = null;
  }

  render() {
    this.el = document.createElement('section');
    this.el.className = 'game-view';

    const modeBadge =
      this.config.mode === 'cpu'
        ? `CPU対戦（${DIFF_LABELS[this.config.difficulty] || ''}）`
        : '対人モード（2P）';

    const isWide = Boolean(this.gameMeta.wideLayout);

    this.el.innerHTML = `
      <div class="game-topbar">
        <div class="game-topbar-left">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-back-lobby">← ロビー</button>
          <h1 class="game-title-heading">${this.gameMeta.name}</h1>
          <span class="game-mode-tag">${modeBadge}</span>
        </div>
        <div class="game-topbar-actions">
          ${
            !isWide
              ? `<button type="button" class="btn btn-secondary btn-sm ${this.settings.showHints ? 'btn-active' : ''}" id="btn-toggle-hints">ガイド ${this.settings.showHints ? 'ON' : 'OFF'}</button>`
              : ''
          }
          <button type="button" class="btn btn-secondary btn-sm" id="btn-show-rules">ルール</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-change-setup">設定変更</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-restart-game">最初から</button>
        </div>
      </div>

      <div class="game-stage ${isWide ? 'game-stage--full' : ''}">
        <div class="board-column">
          <div class="board-mount" id="board-mount"></div>
        </div>
        ${
          !isWide
            ? `
          <aside class="side-panel">
            <div class="panel-card">
              <div class="panel-card-title">対局状況</div>
              <div class="turn-banner">
                <div class="turn-banner-main">
                  <span class="turn-dot turn-dot--dark" id="turn-dot"></span>
                  <span id="turn-text">対局準備中</span>
                </div>
                <span class="thinking-indicator" id="thinking-indicator" style="display:none;">
                  <span class="spinner"></span>思考中
                </span>
              </div>
              <div class="score-row" id="score-row"></div>
            </div>

            <div class="panel-card">
              <div class="panel-card-title">操作</div>
              <div class="control-grid">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-undo">待った</button>
                <button type="button" class="btn btn-danger btn-sm" id="btn-resign">投了</button>
              </div>
              <div id="extra-controls" style="margin-top:8px;"></div>
            </div>

            <div class="panel-card">
              <div class="panel-card-title">着手履歴</div>
              <div class="history-list" id="history-list">
                <div class="history-empty">まだ着手はありません</div>
              </div>
            </div>
          </aside>`
            : ''
        }
      </div>
    `;

    this.el.querySelector('#btn-back-lobby').addEventListener('click', () => this.handlers.onBack());
    this.el.querySelector('#btn-show-rules').addEventListener('click', () => this.handlers.onRules());
    this.el.querySelector('#btn-change-setup').addEventListener('click', () => this.handlers.onChangeSetup());
    this.el.querySelector('#btn-restart-game').addEventListener('click', () => this.handlers.onRestart());

    const hintBtn = this.el.querySelector('#btn-toggle-hints');
    if (hintBtn) {
      hintBtn.addEventListener('click', () => this.handlers.onToggleHints());
    }

    const undoBtn = this.el.querySelector('#btn-undo');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.handlers.onUndo());
    }

    const resignBtn = this.el.querySelector('#btn-resign');
    if (resignBtn) {
      resignBtn.addEventListener('click', () => this.handlers.onResign());
    }

    return this.el;
  }

  getBoardContainer() {
    return this.el.querySelector('#board-mount');
  }

  getExtraControlsContainer() {
    return this.el.querySelector('#extra-controls');
  }

  updateHintButton(showHints) {
    const btn = this.el?.querySelector('#btn-toggle-hints');
    if (!btn) return;
    btn.textContent = `ガイド ${showHints ? 'ON' : 'OFF'}`;
    btn.classList.toggle('btn-active', showHints);
  }

  updateStatus({ turnText, turnColor, isThinking, scores, canUndo, canResign, history }) {
    if (!this.el) return;
    const turnTextEl = this.el.querySelector('#turn-text');
    if (turnTextEl) turnTextEl.textContent = turnText;

    const dotEl = this.el.querySelector('#turn-dot');
    if (dotEl) {
      dotEl.className = `turn-dot ${turnColor === 'light' ? 'turn-dot--light' : 'turn-dot--dark'}`;
    }

    const thinkingEl = this.el.querySelector('#thinking-indicator');
    if (thinkingEl) {
      thinkingEl.style.display = isThinking ? 'inline-flex' : 'none';
    }

    const scoreRow = this.el.querySelector('#score-row');
    if (scoreRow && Array.isArray(scores)) {
      scoreRow.innerHTML = scores
        .map(
          (item) => `
          <div class="player-chip ${item.active ? 'player-chip--active' : ''}">
            <div class="player-chip-label">${item.label}</div>
            <div class="player-chip-value">${item.value}</div>
          </div>`
        )
        .join('');
    }

    const undoBtn = this.el.querySelector('#btn-undo');
    if (undoBtn) undoBtn.disabled = !canUndo;

    const resignBtn = this.el.querySelector('#btn-resign');
    if (resignBtn) resignBtn.disabled = !canResign;

    const historyList = this.el.querySelector('#history-list');
    if (historyList && Array.isArray(history)) {
      if (history.length === 0) {
        historyList.innerHTML = `<div class="history-empty">まだ着手はありません</div>`;
      } else {
        historyList.innerHTML = history
          .map(
            (text, idx) => `
            <div class="history-item">
              <span class="history-num">${idx + 1}.</span>
              <span>${text}</span>
            </div>`
          )
          .join('');
        historyList.scrollTop = historyList.scrollHeight;
      }
    }
  }
}
