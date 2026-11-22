import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const SIZE_BY_DIFF = {
  beginner: 4,
  intermediate: 5,
  advanced: 6,
};

/**
 * ライツアウト（4×4 / 5×5 / 6×6・必ず解ける生成・ヒント対応）エンジン
 */
export class LightsOutEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.difficulty = this.options.difficulty || 'intermediate';
    this.size = SIZE_BY_DIFF[this.difficulty] || 5;
    this.moves = 0;
    this.hintCell = null;

    this._generateSolvableBoard();
  }

  _generateSolvableBoard() {
    const n = this.size;
    this.board = Array.from({ length: n }, () => Array(n).fill(false));
    this.solutionParity = Array.from({ length: n }, () => Array(n).fill(false));

    const clicks = n + Math.floor(Math.random() * n) + 2;
    const chosen = new Set();
    while (chosen.size < Math.min(clicks, n * n - 1)) {
      chosen.add(Math.floor(Math.random() * n * n));
    }

    for (const idx of chosen) {
      const r = Math.floor(idx / n);
      const c = idx % n;
      this._toggleRaw(r, c);
      this.solutionParity[r][c] = !this.solutionParity[r][c];
    }

    if (this.countLit() === 0) {
      this._toggleRaw(0, 0);
      this.solutionParity[0][0] = !this.solutionParity[0][0];
    }
  }

  _toggleRaw(r, c) {
    const n = this.size;
    const pts = [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of pts) {
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        this.board[nr][nc] = !this.board[nr][nc];
      }
    }
  }

  countLit() {
    let cnt = 0;
    for (const row of this.board) {
      for (const v of row) if (v) cnt++;
    }
    return cnt;
  }

  getCurrentPlayer() {
    return 1;
  }

  getLegalMoves() {
    return [];
  }

  applyMove(action) {
    if (this.gameOver || !action) return { ok: false };

    if (action.type === 'hint') {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.solutionParity[r][c]) {
            this.hintCell = { r, c };
            return { ok: true, sound: 'call', notice: 'ヒントのマスを赤枠で表示しました' };
          }
        }
      }
      return { ok: false };
    }

    const { r, c } = action;
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return { ok: false };

    this.undoStack.push({
      board: this.board.map((row) => [...row]),
      solutionParity: this.solutionParity.map((row) => [...row]),
      moves: this.moves,
      historyLen: this.history.length,
    });

    this._toggleRaw(r, c);
    this.solutionParity[r][c] = !this.solutionParity[r][c];
    this.hintCell = null;
    this.moves += 1;
    this.history.push(`(${r + 1},${c + 1}) 切替（残 ${this.countLit()}灯）`);

    if (this.countLit() === 0) {
      this.gameOver = true;
      this.result = {
        winner: 1,
        headline: 'ライツアウト クリア！',
        reason: `${this.moves} 手ですべてのライトを消灯しました`,
      };
    }

    return { ok: true, sound: 'stone' };
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.solutionParity = snap.solutionParity;
    this.moves = snap.moves;
    this.hintCell = null;
    this.history.length = snap.historyLen;
    this.gameOver = false;
    this.result = null;
    return true;
  }

  resign() {
    this.gameOver = true;
  }

  getState() {
    return {
      size: this.size,
      board: this.board.map((row) => [...row]),
      litCount: this.countLit(),
      moves: this.moves,
      hintCell: this.hintCell ? { ...this.hintCell } : null,
      gameOver: this.gameOver,
    };
  }
}
