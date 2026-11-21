import { BaseGameController } from '../../core/BaseGameController.js';
import { ShogiEngine } from './ShogiEngine.js';
import { ShogiRenderer } from './ShogiRenderer.js';
import { ShogiPiece } from './ShogiPiece.js';

/**
 * 将棋の対局進行コントローラー
 */
export class ShogiController extends BaseGameController {
  createEngine() {
    return new ShogiEngine(this.config.options || {});
  }

  createRenderer(container) {
    return new ShogiRenderer(container, (action) => this.handleAction(action));
  }

  getPlayerSideLabels() {
    return { 1: '先手（▲）', 2: '後手（△）' };
  }

  getSoundForMove(moveResult) {
    return moveResult?.captured ? 'capture' : 'shogi';
  }

  getScoreSummary(state) {
    const countHand = (side) =>
      ShogiPiece.HAND_ORDER.reduce((sum, t) => sum + (state.hands[side][t] || 0), 0);
    return [
      {
        label: '▲ 先手 持ち駒',
        value: `${countHand(1)} 枚`,
        active: !state.gameOver && state.currentPlayer === 1,
      },
      {
        label: '△ 後手 持ち駒',
        value: `${countHand(2)} 枚`,
        active: !state.gameOver && state.currentPlayer === 2,
      },
    ];
  }
}
