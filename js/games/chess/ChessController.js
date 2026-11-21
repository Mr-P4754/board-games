import { BaseGameController } from '../../core/BaseGameController.js';
import { ChessEngine } from './ChessEngine.js';
import { ChessRenderer } from './ChessRenderer.js';
import { ChessPiece } from './ChessPiece.js';

/**
 * チェスの対局進行コントローラー
 */
export class ChessController extends BaseGameController {
  createEngine() {
    return new ChessEngine(this.config.options || {});
  }

  createRenderer(container) {
    return new ChessRenderer(container, (action) => this.handleAction(action));
  }

  getPlayerSideLabels() {
    return { 1: '白（先手）', 2: '黒（後手）' };
  }

  getSoundForMove(moveResult) {
    return moveResult?.captured ? 'capture' : 'place';
  }

  getScoreSummary(state) {
    const scoreOf = (color) =>
      state.captured[color].reduce((sum, p) => sum + Math.round(ChessPiece.valueOf(p.type) / 100), 0);
    return [
      {
        label: '♔ 白（先手）',
        value: `+${scoreOf(1)} pt`,
        active: !state.gameOver && state.currentPlayer === 1,
      },
      {
        label: '♚ 黒（後手）',
        value: `+${scoreOf(2)} pt`,
        active: !state.gameOver && state.currentPlayer === 2,
      },
    ];
  }
}
