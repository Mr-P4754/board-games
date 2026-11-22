import { BaseGameController } from '../../core/BaseGameController.js';
import { CheckersEngine } from './CheckersEngine.js';
import { CheckersRenderer } from './CheckersRenderer.js';

/**
 * チェッカーの対局進行コントローラー
 */
export class CheckersController extends BaseGameController {
  createEngine() {
    return new CheckersEngine(this.config.options || {});
  }

  createRenderer(container) {
    return new CheckersRenderer(container, (action) => this.handleAction(action));
  }

  getPlayerSideLabels() {
    return { 1: '赤（先手）', 2: '白（後手）' };
  }

  getSoundForMove(moveResult) {
    return moveResult?.captured ? 'capture' : 'stone';
  }

  getScoreSummary(state) {
    return [
      {
        label: '● 赤（先手）',
        value: `${state.counts.p1} 駒`,
        active: !state.gameOver && state.currentPlayer === 1,
      },
      {
        label: '○ 白（後手）',
        value: `${state.counts.p2} 駒`,
        active: !state.gameOver && state.currentPlayer === 2,
      },
    ];
  }
}
