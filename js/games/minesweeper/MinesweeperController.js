import { BasePuzzleController } from '../../core/BasePuzzleController.js';
import { MinesweeperEngine } from './MinesweeperEngine.js';
import { MinesweeperRenderer } from './MinesweeperRenderer.js';

/**
 * マインスイーパーの進行コントローラー
 */
export class MinesweeperController extends BasePuzzleController {
  createEngine() {
    return new MinesweeperEngine(this.getEngineOptions());
  }

  createRenderer(container) {
    return new MinesweeperRenderer(container, (action) => this.handleAction(action));
  }

  getStatusSummary(state) {
    const remaining = state.mineCount - state.flagCount;
    return {
      turnText: state.gameOver ? '終了' : `タイム ${this.formatTime(this.elapsedSec)}`,
      scores: [
        { label: '⚑ 残り地雷', value: `${remaining} 個`, active: !state.gameOver },
        { label: '開封進捗', value: `${state.revealedCount} / ${state.safeTotal}`, active: false },
      ],
    };
  }

  getClearDetails(state) {
    return [
      `盤面: ${state.cols}×${state.rows}（地雷 ${state.mineCount} 個）`,
      `クリアタイム: ${this.formatTime(this.elapsedSec)}`,
    ];
  }
}
