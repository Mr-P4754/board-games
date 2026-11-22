import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const TARGET_BY_DIFF = {
  beginner: 512,
  intermediate: 2048,
  advanced: 4096,
};

/**
 * 2048（4×4スライド合体パズル・目標値3段階・Undo対応）エンジン
 */
export class Game2048Engine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.difficulty = this.options.difficulty || 'intermediate';
    this.target = TARGET_BY_DIFF[this.difficulty] || 2048;
    this.board = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.score = 0;
    this.moves = 0;
    this.maxTile = 0;
    this.lastSpawn = null;
    this._spawnTile();
    this._spawnTile();
  }

  _spawnTile() {
    const empties = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.board[r][c] === 0) empties.push([r, c]);
      }
    }
    if (empties.length === 0) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    this.board[r][c] = val;
    this.lastSpawn = { r, c };
    if (val > this.maxTile) this.maxTile = val;
  }

  static slideLine(line) {
    const nonZero = line.filter((v) => v !== 0);
    const result = [];
    let gained = 0;
    let i = 0;
    while (i < nonZero.length) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        const merged = nonZero[i] * 2;
        result.push(merged);
        gained += merged;
        i += 2;
      } else {
        result.push(nonZero[i]);
        i += 1;
      }
    }
    while (result.length < 4) result.push(0);
    return { line: result, gained };
  }

  static hasAnyMove(board) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = board[r][c];
        if (v === 0) return true;
        if (c < 3 && board[r][c + 1] === v) return true;
        if (r < 3 && board[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  getCurrentPlayer() {
    return 1;
  }

  getLegalMoves() {
    return ['up', 'down', 'left', 'right'].map((dir) => ({ dir }));
  }

  applyMove(action) {
    if (this.gameOver || !action?.dir) return { ok: false };
    const dir = action.dir;
    const prevBoard = this.board.map((row) => [...row]);
    let gained = 0;
    let changed = false;

    const next = this.board.map((row) => [...row]);

    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < 4; r++) {
        const raw = dir === 'left' ? next[r] : [...next[r]].reverse();
        const { line, gained: g } = Game2048Engine.slideLine(raw);
        const finalRow = dir === 'left' ? line : [...line].reverse();
        for (let c = 0; c < 4; c++) {
          if (next[r][c] !== finalRow[c]) changed = true;
          next[r][c] = finalRow[c];
        }
        gained += g;
      }
    } else if (dir === 'up' || dir === 'down') {
      for (let c = 0; c < 4; c++) {
        const col = [next[0][c], next[1][c], next[2][c], next[3][c]];
        const raw = dir === 'up' ? col : [...col].reverse();
        const { line, gained: g } = Game2048Engine.slideLine(raw);
        const finalCol = dir === 'up' ? line : [...line].reverse();
        for (let r = 0; r < 4; r++) {
          if (next[r][c] !== finalCol[r]) changed = true;
          next[r][c] = finalCol[r];
        }
        gained += g;
      }
    } else {
      return { ok: false };
    }

    if (!changed) return { ok: false };

    this.undoStack.push({
      board: prevBoard,
      score: this.score,
      moves: this.moves,
      maxTile: this.maxTile,
      lastSpawn: this.lastSpawn ? { ...this.lastSpawn } : null,
      historyLen: this.history.length,
    });

    this.board = next;
    this.score += gained;
    this.moves += 1;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.board[r][c] > this.maxTile) this.maxTile = this.board[r][c];
      }
    }

    this._spawnTile();

    const dirLabel = { up: '↑', down: '↓', left: '←', right: '→' }[dir];
    this.history.push(`${dirLabel} (スコア ${this.score})`);

    if (this.maxTile >= this.target) {
      this.gameOver = true;
      this.result = {
        winner: 1,
        headline: `${this.target} 達成！`,
        reason: `目標タイル ${this.target} を完成しました`,
      };
    } else if (!Game2048Engine.hasAnyMove(this.board)) {
      this.gameOver = true;
      this.result = {
        winner: 0,
        headline: '手詰まり（ゲームオーバー）',
        reason: `最大タイル ${this.maxTile} / スコア ${this.score}`,
      };
    }

    return { ok: true, sound: gained > 0 ? 'stone' : 'place' };
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.score = snap.score;
    this.moves = snap.moves;
    this.maxTile = snap.maxTile;
    this.lastSpawn = snap.lastSpawn;
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
      board: this.board.map((r) => [...r]),
      score: this.score,
      moves: this.moves,
      maxTile: this.maxTile,
      target: this.target,
      lastSpawn: this.lastSpawn ? { ...this.lastSpawn } : null,
      gameOver: this.gameOver,
    };
  }
}
