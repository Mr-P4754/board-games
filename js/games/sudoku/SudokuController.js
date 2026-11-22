import { BasePuzzleController } from '../../core/BasePuzzleController.js';
import { SudokuEngine } from './SudokuEngine.js';
import { SudokuRenderer } from './SudokuRenderer.js';

/**
 * 数独の進行コントローラー
 */
export class SudokuController extends BasePuzzleController {
  createEngine() {
    return new SudokuEngine(this.getEngineOptions());
  }

  createRenderer(container) {
    return new SudokuRenderer(container, (action) => this.handleAction(action));
  }

  getStatusSummary(state) {
    return {
      turnText: state.gameOver ? 'クリア！' : `タイム ${this.formatTime(this.elapsedSec)}`,
      scores: [
        { label: '埋めたマス', value: `${state.filled} / 81`, active: !state.gameOver },
        { label: 'ヒント使用', value: `${state.hintsUsed} 回`, active: false },
      ],
    };
  }

  getClearDetails(state) {
    return [
      `クリアタイム: ${this.formatTime(this.elapsedSec)}`,
      `ヒント使用回数: ${state.hintsUsed} 回`,
    ];
  }
}
