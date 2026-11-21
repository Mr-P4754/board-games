import { BaseGameController } from '../../core/BaseGameController.js';
import { GomokuEngine } from './GomokuEngine.js';
import { GomokuRenderer } from './GomokuRenderer.js';

/**
 * 五目並べの対局進行コントローラー
 */
export class GomokuController extends BaseGameController {
  createEngine() {
    return new GomokuEngine(this.config.options || {});
  }

  createRenderer(container) {
    return new GomokuRenderer(container, (action) => this.handleAction(action));
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
        label: '手数',
        value: `${state.moveCount} 手`,
        active: !state.gameOver,
      },
      {
        label: 'ルール',
        value: state.renju ? '連珠' : '標準',
        active: false,
      },
    ];
  }
}
