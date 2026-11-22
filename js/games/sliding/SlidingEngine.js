import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const SIZE_BY_DIFF = {
  beginner: 3,
  intermediate: 4,
  advanced: 5,
};

/**
 * 15パズル（3×3 / 4×4 / 5×5・必ず解けるシャッフル・一括スライド対応）エンジン
 */
export class SlidingEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.difficulty = this.options.difficulty || 'intermediate';
    this.size = SIZE_BY_DIFF[this.difficulty] || 4;
    this.moves = 0;
    this.tiles = this._createSolvableBoard(this.size);
  }

  _createSolvableBoard(n) {
    const total = n * n;
    const arr = Array.from({ length: total }, (_, i) => (i + 1) % total);
    // Guarantee solvability by executing valid random blank moves from solved state!
    let blank = total - 1;
    let prev = -1;
    const steps = n * n * 18;
    for (let s = 0; s < steps; s++) {
      const r = Math.floor(blank / n);
      const c = blank % n;
      const neighbors = [];
      if (r > 0) neighbors.push(blank - n);
      if (r < n - 1) neighbors.push(blank + n);
      if (c > 0) neighbors.push(blank - 1);
      if (c < n - 1) neighbors.push(blank + 1);
      const filtered = neighbors.filter((idx) => idx !== prev);
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      arr[blank] = arr[pick];
      arr[pick] = 0;
      prev = blank;
      blank = pick;
    }
    if (SlidingEngine.isSolved(arr)) {
      // Ensure not already solved
      return this._createSolvableBoard(n);
    }
    return arr;
  }

  static isSolved(tiles) {
    for (let i = 0; i < tiles.length - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[tiles.length - 1] === 0;
  }

  getCurrentPlayer() {
    return 1;
  }

  getLegalMoves() {
    return [];
  }

  applyMove(action) {
    if (this.gameOver || !action) return { ok: false };
    const n = this.size;
    const blank = this.tiles.indexOf(0);
    const br = Math.floor(blank / n);
    const bc = blank % n;

    let targetIdx = action.index;
    if (action.dir) {
      // Arrow key moves a tile INTO the blank space
      const delta = { up: [1, 0], down: [-1, 0], left: [0, 1], right: [0, -1] }[action.dir];
      if (!delta) return { ok: false };
      const tr = br + delta[0];
      const tc = bc + delta[1];
      if (tr < 0 || tr >= n || tc < 0 || tc >= n) return { ok: false };
      targetIdx = tr * n + tc;
    }

    if (typeof targetIdx !== 'number' || targetIdx < 0 || targetIdx >= n * n || targetIdx === blank) {
      return { ok: false };
    }

    const tr = Math.floor(targetIdx / n);
    const tc = targetIdx % n;
    if (tr !== br && tc !== bc) return { ok: false };

    this.undoStack.push({
      tiles: [...this.tiles],
      moves: this.moves,
      historyLen: this.history.length,
    });

    // Slide 1 or multiple tiles along row/col toward blank
    const stepR = tr === br ? 0 : tr > br ? 1 : -1;
    const stepC = tc === bc ? 0 : tc > bc ? 1 : -1;
    let curR = br;
    let curC = bc;
    let movedCount = 0;
    while (curR !== tr || curC !== tc) {
      const nextR = curR + stepR;
      const nextC = curC + stepC;
      this.tiles[curR * n + curC] = this.tiles[nextR * n + nextC];
      curR = nextR;
      curC = nextC;
      movedCount++;
    }
    this.tiles[targetIdx] = 0;
    this.moves += movedCount;
    this.history.push(`スライド（計 ${this.moves} 手）`);

    if (SlidingEngine.isSolved(this.tiles)) {
      this.gameOver = true;
      this.result = {
        winner: 1,
        headline: `${n * n - 1}パズル 完成！`,
        reason: `${this.moves} 手で順番どおりに揃えました`,
      };
    }

    return { ok: true, sound: 'shogi' };
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.tiles = snap.tiles;
    this.moves = snap.moves;
    this.history.length = snap.historyLen;
    this.gameOver = false;
    this.result = null;
    return true;
  }

  resign() {
    this.gameOver = true;
  }

  getState() {
    let correctCount = 0;
    for (let i = 0; i < this.tiles.length - 1; i++) {
      if (this.tiles[i] === i + 1) correctCount++;
    }
    return {
      size: this.size,
      tiles: [...this.tiles],
      moves: this.moves,
      correctCount,
      totalTiles: this.size * this.size - 1,
      gameOver: this.gameOver,
    };
  }
}
