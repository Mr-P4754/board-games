import { BasePuzzleController } from '../../core/BasePuzzleController.js';
import { Game2048Engine } from './Game2048Engine.js';
import { Game2048Renderer } from './Game2048Renderer.js';

/**
 * 2048の進行コントローラー
 */
export class Game2048Controller extends BasePuzzleController {
  createEngine() {
    return new Game2048Engine(this.getEngineOptions());
  }

  createRenderer(container) {
    return new Game2048Renderer(container, (action) => this.handleAction(action));
  }

  getStatusSummary(state) {
    return {
      turnText: state.gameOver ? '終了' : `目標 ${state.target} / タイム ${this.formatTime(this.elapsedSec)}`,
      scores: [
        { label: 'スコア', value: state.score.toLocaleString(), active: !state.gameOver },
        { label: '最大タイル', value: String(state.maxTile), active: false },
      ],
    };
  }

  getClearDetails(state) {
    return [
      `スコア: ${state.score.toLocaleString()}`,
      `最大タイル: ${state.maxTile}`,
      `手数: ${state.moves} 手 / タイム: ${this.formatTime(this.elapsedSec)}`,
    ];
  }

  getClearMetrics(state) {
    return { timeSec: this.elapsedSec, moves: state.moves, score: state.score };
  }
}
