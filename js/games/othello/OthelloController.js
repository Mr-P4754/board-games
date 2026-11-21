import { BaseGameController } from '../../core/BaseGameController.js';
import { OthelloEngine } from './OthelloEngine.js';
import { OthelloRenderer } from './OthelloRenderer.js';

/**
 * オセロの対局進行コントローラー
 */
export class OthelloController extends BaseGameController {
  createEngine() {
    return new OthelloEngine(this.config.options || {});
  }

  createRenderer(container) {
    return new OthelloRenderer(container, (action) => this.handleAction(action));
  }

  getPlayerSideLabels() {
    return { 1: '黒（先手）', 2: '白（後手）' };
  }

  getSoundForMove() {
    return 'stone';
  }

  getScoreSummary(state) {
    return [
      {
        label: '● 黒（先手）',
        value: `${state.counts.black} 石`,
        active: !state.gameOver && state.currentPlayer === 1,
      },
      {
        label: '○ 白（後手）',
        value: `${state.counts.white} 石`,
        active: !state.gameOver && state.currentPlayer === 2,
      },
    ];
  }
}
