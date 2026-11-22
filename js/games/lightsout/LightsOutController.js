import { BasePuzzleController } from '../../core/BasePuzzleController.js';
import { LightsOutEngine } from './LightsOutEngine.js';
import { LightsOutRenderer } from './LightsOutRenderer.js';

/**
 * ライツアウトの進行コントローラー
 */
export class LightsOutController extends BasePuzzleController {
  createEngine() {
    return new LightsOutEngine(this.getEngineOptions());
  }

  createRenderer(container) {
    return new LightsOutRenderer(container, (action) => this.handleAction(action));
  }

  getStatusSummary(state) {
    return {
      turnText: state.gameOver ? '全消灯クリア！' : `タイム ${this.formatTime(this.elapsedSec)}`,
      scores: [
        { label: '残り点灯', value: `${state.litCount} 灯`, active: !state.gameOver },
        { label: '手数', value: `${state.moves} 手`, active: false },
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
