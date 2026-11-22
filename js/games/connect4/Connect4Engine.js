import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const ROWS = 6;
const COLS = 7;
const AXES = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/**
 * コネクトフォー（7列×6段・重力落下四目並べ）エンジン
 */
export class Connect4Engine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.currentPlayer = 1; // 1: Red, 2: Yellow
    this.lastMove = null;
    this.winLine = [];
    this.moveCount = 0;
  }

  static get ROWS() {
    return ROWS;
  }

  static get COLS() {
    return COLS;
  }

  static findDropRow(board, col) {
    if (col < 0 || col >= COLS) return -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) return r;
    }
    return -1;
  }

  static findWinLine(board, r, c, player) {
    for (const [dr, dc] of AXES) {
      const cells = [[r, c]];
      for (const sign of [1, -1]) {
        let nr = r + dr * sign;
        let nc = c + dc * sign;
        while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) {
          cells.push([nr, nc]);
          nr += dr * sign;
          nc += dc * sign;
        }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }

  static getLegalColumns(board) {
    const cols = [];
    for (let c = 0; c < COLS; c++) {
      if (board[0][c] === 0) cols.push(c);
    }
    return cols;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getLegalMoves() {
    if (this.gameOver) return [];
    return Connect4Engine.getLegalColumns(this.board).map((c) => ({ c }));
  }

  applyMove(move) {
    if (this.gameOver || !move) return { ok: false, reason: '対局は終了しています' };
    const col = move.c;
    const row = Connect4Engine.findDropRow(this.board, col);
    if (row === -1) {
      return { ok: false, reason: 'その列はすでにいっぱいです' };
    }

    this.undoStack.push({
      board: this.board.map((r) => [...r]),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      winLine: [...this.winLine],
      moveCount: this.moveCount,
      historyLen: this.history.length,
    });

    const actor = this.currentPlayer;
    this.board[row][col] = actor;
    this.lastMove = { r: row, c: col, player: actor };
    this.moveCount += 1;
    this.history.push(`${actor === 1 ? '赤' : '黄'} ${col + 1}列目`);

    const winLine = Connect4Engine.findWinLine(this.board, row, col, actor);
    if (winLine) {
      this.winLine = winLine;
      this.gameOver = true;
      this.result = {
        winner: actor,
        reason: `${actor === 1 ? '赤（先手）' : '黄（後手）'}が4連を完成しました（${this.moveCount}手）`,
        details: [`総手数: ${this.moveCount} 手`],
      };
    } else if (this.moveCount >= ROWS * COLS) {
      this.gameOver = true;
      this.result = {
        winner: 0,
        reason: '盤面がすべて埋まり引き分けとなりました',
        details: [`総手数: ${this.moveCount} 手`],
      };
    } else {
      this.currentPlayer = actor === 1 ? 2 : 1;
    }

    return { ok: true };
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.currentPlayer = snap.currentPlayer;
    this.lastMove = snap.lastMove;
    this.winLine = snap.winLine;
    this.moveCount = snap.moveCount;
    this.history.length = snap.historyLen;
    this.gameOver = false;
    this.result = null;
    return true;
  }

  resign(player) {
    this.gameOver = true;
    const winner = player === 1 ? 2 : 1;
    this.result = {
      winner,
      reason: `${player === 1 ? '赤（先手）' : '黄（後手）'}の投了`,
      details: [`総手数: ${this.moveCount} 手`],
    };
  }

  getState() {
    return {
      board: this.board.map((r) => [...r]),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      winLine: this.winLine.map((p) => [...p]),
      moveCount: this.moveCount,
      gameOver: this.gameOver,
    };
  }
}
