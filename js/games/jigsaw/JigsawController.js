import { BasePuzzleController } from '../../core/BasePuzzleController.js';
import { JigsawEngine } from './JigsawEngine.js';
import { JigsawRenderer } from './JigsawRenderer.js';

/**
 * ジグソーパズルの進行コントローラー
 */
export class JigsawController extends BasePuzzleController {
  createEngine() {
    return new JigsawEngine(this.getEngineOptions());
  }

  createRenderer(container) {
    return new JigsawRenderer(container, (action) => this.handleAction(action));
  }

  handleAction(action) {
    if (action?.type === 'setCustomImage') {
      this.engine.setCustomImage(action.dataUrl);
      this.toast.show('カスタム画像を読み込みました！');
      this._syncUI();
      return;
    }
    super.handleAction(action);
  }

  getClearDetails(state) {
    return [
      `サイズ: ${state.gridSize}×${state.gridSize}（${state.totalPieces}ピース）`,
      `クリアタイム: ${this.formatTime(this.elapsedSec)}`,
      `配置手数: ${state.moves} 手`,
    ];
  }

  getClearMetrics(state) {
    return { timeSec: this.elapsedSec, moves: state.moves };
  }
}
