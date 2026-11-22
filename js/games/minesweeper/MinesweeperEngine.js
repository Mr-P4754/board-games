import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const PRESETS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 12, cols: 12, mines: 22 },
  advanced: { rows: 12, cols: 16, mines: 36 },
};

/**
 * マインスイーパー（初手安全保証・自動展開・コード開示・旗切替対応）エンジン
 */
export class MinesweeperEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.difficulty = this.options.difficulty || 'intermediate';
    const spec = PRESETS[this.difficulty] || PRESETS.intermediate;
    this.rows = spec.rows;
    this.cols = spec.cols;
    this.mineCount = spec.mines;
    this.minesPlaced = false;
    this.exploded = null;

    this.mines = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    this.counts = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.revealed = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    this.flagged = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    this.revealedCount = 0;
    this.flagCount = 0;
  }

  _inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  _neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (this._inBounds(nr, nc)) out.push([nr, nc]);
      }
    }
    return out;
  }

  _placeMines(safeR, safeC) {
    const forbidden = new Set([`${safeR},${safeC}`]);
    for (const [nr, nc] of this._neighbors(safeR, safeC)) {
      forbidden.add(`${nr},${nc}`);
    }

    const pool = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!forbidden.has(`${r},${c}`)) pool.push([r, c]);
      }
    }

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }

    const toPlace = Math.min(this.mineCount, pool.length);
    for (let i = 0; i < toPlace; i++) {
      const [r, c] = pool[i];
      this.mines[r][c] = true;
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.mines[r][c]) continue;
        let cnt = 0;
        for (const [nr, nc] of this._neighbors(r, c)) {
          if (this.mines[nr][nc]) cnt++;
        }
        this.counts[r][c] = cnt;
      }
    }
    this.minesPlaced = true;
  }

  getCurrentPlayer() {
    return 1;
  }

  getLegalMoves() {
    return [];
  }

  canUndo() {
    return false;
  }

  applyMove(action) {
    if (this.gameOver || !action) return { ok: false };
    const { type, r, c } = action;
    if (!this._inBounds(r, c)) return { ok: false };

    if (type === 'flag') {
      if (this.revealed[r][c]) return { ok: false };
      this.flagged[r][c] = !this.flagged[r][c];
      this.flagCount += this.flagged[r][c] ? 1 : -1;
      return { ok: true, sound: 'place' };
    }

    if (type === 'chord') {
      if (!this.revealed[r][c] || this.counts[r][c] === 0) return { ok: false };
      const neigh = this._neighbors(r, c);
      const adjFlags = neigh.filter(([nr, nc]) => this.flagged[nr][nc]).length;
      if (adjFlags !== this.counts[r][c]) return { ok: false };
      let any = false;
      for (const [nr, nc] of neigh) {
        if (!this.revealed[nr][nc] && !this.flagged[nr][nc]) {
          this._revealCell(nr, nc);
          any = true;
          if (this.gameOver) break;
        }
      }
      if (!any) return { ok: false };
      this._checkWin();
      return { ok: true, sound: this.exploded ? 'capture' : 'stone' };
    }

    if (type === 'reveal') {
      if (this.revealed[r][c] || this.flagged[r][c]) return { ok: false };
      if (!this.minesPlaced) {
        this._placeMines(r, c);
      }
      this._revealCell(r, c);
      if (!this.gameOver) {
        this._checkWin();
      }
      return { ok: true, sound: this.exploded ? 'capture' : 'stone' };
    }

    return { ok: false };
  }

  _revealCell(startR, startC) {
    if (this.mines[startR][startC]) {
      this.exploded = { r: startR, c: startC };
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.mines[r][c]) this.revealed[r][c] = true;
        }
      }
      this.gameOver = true;
      this.result = {
        winner: 0,
        headline: '地雷を踏みました！',
        reason: `開封済み ${this.revealedCount} / ${this.rows * this.cols - this.mineCount} マス`,
      };
      return;
    }

    const queue = [[startR, startC]];
    while (queue.length > 0) {
      const [r, c] = queue.shift();
      if (this.revealed[r][c] || this.flagged[r][c]) continue;
      this.revealed[r][c] = true;
      this.revealedCount++;
      if (this.counts[r][c] === 0) {
        for (const [nr, nc] of this._neighbors(r, c)) {
          if (!this.revealed[nr][nc] && !this.mines[nr][nc]) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  _checkWin() {
    const safeTotal = this.rows * this.cols - this.mineCount;
    if (this.revealedCount >= safeTotal) {
      this.gameOver = true;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.mines[r][c]) this.flagged[r][c] = true;
        }
      }
      this.flagCount = this.mineCount;
      this.result = {
        winner: 1,
        headline: 'マインスイーパー クリア！',
        reason: `全 ${this.mineCount} 個の地雷を回避して完全制覇しました`,
      };
    }
  }

  undo() {
    return false;
  }

  resign() {
    this.gameOver = true;
  }

  getState() {
    return {
      rows: this.rows,
      cols: this.cols,
      mineCount: this.mineCount,
      flagCount: this.flagCount,
      revealedCount: this.revealedCount,
      safeTotal: this.rows * this.cols - this.mineCount,
      mines: this.gameOver ? this.mines.map((r) => [...r]) : null,
      counts: this.counts.map((r) => [...r]),
      revealed: this.revealed.map((r) => [...r]),
      flagged: this.flagged.map((r) => [...r]),
      exploded: this.exploded ? { ...this.exploded } : null,
      gameOver: this.gameOver,
    };
  }
}
