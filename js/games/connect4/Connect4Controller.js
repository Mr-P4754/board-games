import { BaseGameController } from '../../core/BaseGameController.js';
import { Connect4Engine } from './Connect4Engine.js';
import { Connect4Renderer } from './Connect4Renderer.js';

/**
 * コネクトフォーの対局進行コントローラー
 */
export class Connect4Controller extends BaseGameController {
  createEngine() {
    return new Connect4Engine(this.config.options || {});
  }

  createRenderer(container) {
    return new Connect4Renderer(container, (action) => this.handleAction(action));
  }

  getPlayerSideLabels() {
    return { 1: '赤（先手）', 2: '黄（後手）' };
  }

  getSoundForMove() {
    return 'stone';
  }

  getScoreSummary(state) {
    return [
      {
        label: '手数',
        value: `${state.moveCount} / 42`,
        active: !state.gameOver,
      },
      {
        label: '手番',
        value: state.currentPlayer === 1 ? '赤（先手）' : '黄（後手）',
        active: !state.gameOver,
      },
    ];
  }
}
