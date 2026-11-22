import { BaseGameController } from '../../core/BaseGameController.js';
import { MancalaEngine } from './MancalaEngine.js';
import { MancalaRenderer } from './MancalaRenderer.js';

/**
 * マンカラの対局進行コントローラー
 */
export class MancalaController extends BaseGameController {
  createEngine() {
    return new MancalaEngine(this.config.options || {});
  }

  createRenderer(container) {
    return new MancalaRenderer(container, (action) => this.handleAction(action));
  }

  getPlayerSideLabels() {
    return { 1: '先手', 2: '後手' };
  }

  getSoundForMove(moveResult) {
    if (moveResult?.captured) return 'capture';
    if (moveResult?.extraTurn) return 'call';
    return 'stone';
  }

  getScoreSummary(state) {
    return [
      {
        label: '先手 ストア',
        value: `${state.pits[6]} 石`,
        active: !state.gameOver && state.currentPlayer === 1,
      },
      {
        label: '後手 ストア',
        value: `${state.pits[13]} 石`,
        active: !state.gameOver && state.currentPlayer === 2,
      },
    ];
  }
}
