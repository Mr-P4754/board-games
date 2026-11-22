import { BaseGameEngine } from '../../core/BaseGameEngine.js';
import { SudokuGenerator } from './SudokuGenerator.js';

/**
 * 数独（9×9・メモモード・重複検出・ヒント・Undo対応）エンジン
 */
export class SudokuEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.difficulty = this.options.difficulty || 'intermediate';
    const { puzzle, solution } = SudokuGenerator.generate(this.difficulty);
    this.fixed = puzzle.map((row) => row.map((v) => v !== 0));
    this.board = puzzle.map((row) => [...row]);
    this.solution = solution;
    this.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    this.hintsUsed = 0;
    this.mistakes = 0;
  }

  getCurrentPlayer() {
    return 1;
  }

  getLegalMoves() {
    return [];
  }

  getConflicts() {
    const conflicts = new Set();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = this.board[r][c];
        if (val === 0) continue;
        // Row & Col
        for (let i = 0; i < 9; i++) {
          if (i !== c && this.board[r][i] === val) conflicts.add(`${r},${c}`);
          if (i !== r && this.board[i][c] === val) conflicts.add(`${r},${c}`);
        }
        // Box
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            const nr = br + dr;
            const nc = bc + dc;
            if ((nr !== r || nc !== c) && this.board[nr][nc] === val) {
              conflicts.add(`${r},${c}`);
            }
          }
        }
      }
    }
    return conflicts;
  }

  applyMove(action) {
    if (this.gameOver || !action) return { ok: false };

    if (action.type === 'hint') {
      const target = this._findHintCell(action.selected);
      if (!target) return { ok: false, reason: 'ヒントを出せる空きマスがありません' };
      const [r, c] = target;
      this._pushUndo();
      this.board[r][c] = this.solution[r][c];
      this.notes[r][c].clear();
      this._clearPeerNotes(r, c, this.solution[r][c]);
      this.hintsUsed++;
      this.history.push(`ヒント (${r + 1},${c + 1}) → ${this.solution[r][c]}`);
      this._checkComplete();
      return { ok: true, sound: 'call', notice: `ヒントを適用しました（${this.solution[r][c]}）` };
    }

    const { r, c, value, isNote } = action;
    if (r < 0 || r >= 9 || c < 0 || c >= 9) return { ok: false };
    if (this.fixed[r][c]) return { ok: false, reason: '初期配置の数字は変更できません' };

    this._pushUndo();

    if (value === 0) {
      this.board[r][c] = 0;
      this.notes[r][c].clear();
      return { ok: true, sound: 'place' };
    }

    if (isNote) {
      if (this.board[r][c] !== 0) {
        this.board[r][c] = 0;
      }
      if (this.notes[r][c].has(value)) this.notes[r][c].delete(value);
      else this.notes[r][c].add(value);
      return { ok: true, sound: 'place' };
    }

    this.board[r][c] = value;
    this.notes[r][c].clear();
    this._clearPeerNotes(r, c, value);
    if (value !== this.solution[r][c]) {
      this.mistakes++;
    }
    this.history.push(`(${r + 1},${c + 1}) → ${value}`);
    this._checkComplete();
    return { ok: true, sound: 'stone' };
  }

  _clearPeerNotes(r, c, value) {
    for (let i = 0; i < 9; i++) {
      this.notes[r][i].delete(value);
      this.notes[i][c].delete(value);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        this.notes[br + dr][bc + dc].delete(value);
      }
    }
  }

  _findHintCell(selected) {
    if (
      selected &&
      !this.fixed[selected.r]?.[selected.c] &&
      this.board[selected.r][selected.c] !== this.solution[selected.r][selected.c]
    ) {
      return [selected.r, selected.c];
    }
    const candidates = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!this.fixed[r][c] && this.board[r][c] !== this.solution[r][c]) {
          candidates.push([r, c]);
        }
      }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  _checkComplete() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c] === 0) return;
      }
    }
    if (this.getConflicts().size === 0) {
      this.gameOver = true;
      this.result = {
        winner: 1,
        headline: '数独クリア！',
        reason: 'すべてのマスを正しく埋めました',
      };
    }
  }

  _pushUndo() {
    this.undoStack.push({
      board: this.board.map((row) => [...row]),
      notes: this.notes.map((row) => row.map((s) => new Set(s))),
      historyLen: this.history.length,
    });
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.notes = snap.notes;
    this.history.length = snap.historyLen;
    this.gameOver = false;
    this.result = null;
    return true;
  }

  resign() {
    this.gameOver = true;
  }

  getState() {
    const digitCounts = Array(10).fill(0);
    let filled = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = this.board[r][c];
        if (v > 0) {
          digitCounts[v]++;
          filled++;
        }
      }
    }
    return {
      board: this.board.map((row) => [...row]),
      fixed: this.fixed.map((row) => [...row]),
      notes: this.notes.map((row) => row.map((s) => [...s])),
      conflicts: [...this.getConflicts()],
      digitCounts,
      filled,
      hintsUsed: this.hintsUsed,
      gameOver: this.gameOver,
    };
  }
}
