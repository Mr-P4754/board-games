import { BasePuzzleController } from '../../core/BasePuzzleController.js';
import { SlidingEngine } from './SlidingEngine.js';
import { SlidingRenderer } from './SlidingRenderer.js';

/**
 * 15パズルの進行コントローラー
 */
export class SlidingController extends BasePuzzleController {
  createEngine() {
    return new SlidingEngine(this.getEngineOptions());
  }

  createRenderer(container) {
    return new SlidingRenderer(container, (action) => this.handleAction(action));
  }

  getStatusSummary(state) {
    return {
      turnText: state.gameOver ? '完成！' : `タイム ${this.formatTime(this.elapsedSec)}`,
      scores: [
        { label: '手数', value: `${state.moves} 手`, active: !state.gameOver },
        { label: '一致タイル', value: `${state.correctCount} / ${state.totalTiles}`, active: false },
      ],
    };
  }

  getClearDetails(state) {
    return [
      `サイズ: ${state.size}×${state.size}`,
      `手数: ${state.moves} 手`,
      `クリアタイム: ${this.formatTime(this.elapsedSec)}`,
    ];
  }

  getClearMetrics(state) {
    return { timeSec: this.elapsedSec, moves: state.moves };
  }
}
