import { BaseGameController } from '../../core/BaseGameController.js';
import { GoEngine } from './GoEngine.js';
import { GoRenderer } from './GoRenderer.js';

/**
 * 囲碁の対局進行コントローラー（パスボタン・終局死石フェーズ対応）
 */
export class GoController extends BaseGameController {
  createEngine() {
    return new GoEngine(this.config.options || {});
  }

  createRenderer(container) {
    return new GoRenderer(container, (action) => this.handleAction(action));
  }

  getPlayerSideLabels() {
    return { 1: '黒（先手）', 2: '白（後手）' };
  }

  getSoundForMove(moveResult) {
    return moveResult?.capturedCount > 0 ? 'capture' : 'stone';
  }

  start() {
    super.start();
    const extra = this.layoutView.getExtraControlsContainer();
    if (extra) {
      extra.innerHTML = `<button type="button" class="btn btn-secondary btn-sm" id="btn-go-pass" style="width:100%;">パスする</button>`;
      this.passBtn = extra.querySelector('#btn-go-pass');
      this.passBtn.addEventListener('click', () => this.handleAction({ type: 'pass' }));
    }
    this._syncUI();
  }

  isHumanTurn() {
    if (this.engine.isGameOver()) return false;
    if (this.engine.phase === 'scoring') return true;
    return super.isHumanTurn();
  }

  _syncUI() {
    super._syncUI();
    if (this.passBtn) {
      this.passBtn.disabled =
        this.engine.isGameOver() ||
        this.engine.phase !== 'play' ||
        this.isThinking ||
        !this.isHumanTurn();
    }
  }

  getScoreSummary(state) {
    return [
      {
        label: '● 黒 アゲハマ',
        value: `${state.captures[1]} 石`,
        active: !state.gameOver && state.phase === 'play' && state.currentPlayer === 1,
      },
      {
        label: '○ 白 アゲハマ',
        value: `${state.captures[2]} 石`,
        active: !state.gameOver && state.phase === 'play' && state.currentPlayer === 2,
      },
    ];
  }
}
