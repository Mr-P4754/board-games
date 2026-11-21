import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * オセロ（8×8）のルール・盤面状態エンジン
 */
export class OthelloEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.board = Array.from({ length: 8 }, () => Array(8).fill(0));
    this.board[3][3] = 2;
    this.board[3][4] = 1;
    this.board[4][3] = 1;
    this.board[4][4] = 2;
    this.currentPlayer = 1; // 1: Black, 2: White
    this.lastMove = null;
    this.lastFlipped = [];
  }

  static getFlips(board, r, c, player) {
    if (r < 0 || r >= 8 || c < 0 || c >= 8 || board[r][c] !== 0) return [];
    const opp = player === 1 ? 2 : 1;
    const flips = [];

    for (const [dr, dc] of DIRS) {
      let nr = r + dr;
      let nc = c + dc;
      const line = [];
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === opp) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === player) {
        flips.push(...line);
      }
    }
    return flips;
  }

  static getLegalMovesForBoard(board, player) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const flips = OthelloEngine.getFlips(board, r, c, player);
        if (flips.length > 0) {
          moves.push({ r, c, flips });
        }
      }
    }
    return moves;
  }

  static countDiscs(board) {
    let black = 0;
    let white = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === 1) black++;
        else if (board[r][c] === 2) white++;
      }
    }
    return { black, white, empty: 64 - black - white };
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getLegalMoves(player = this.currentPlayer) {
    if (this.gameOver) return [];
    return OthelloEngine.getLegalMovesForBoard(this.board, player);
  }

  applyMove(move) {
    if (this.gameOver || !move) return { ok: false, reason: '対局は終了しています' };
    const { r, c } = move;
    const flips = OthelloEngine.getFlips(this.board, r, c, this.currentPlayer);
    if (flips.length === 0) {
      return { ok: false, reason: 'そのマスには置けません' };
    }

    this.undoStack.push({
      board: this.board.map((row) => [...row]),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      lastFlipped: [...this.lastFlipped],
      historyLen: this.history.length,
    });

    const actor = this.currentPlayer;
    this.board[r][c] = actor;
    for (const [fr, fc] of flips) {
      this.board[fr][fc] = actor;
    }

    this.lastMove = { r, c, player: actor };
    this.lastFlipped = flips;
    const actorLabel = actor === 1 ? '黒' : '白';
    this.history.push(`${actorLabel} ${COLS[c]}${r + 1}（+${flips.length}）`);

    const nextPlayer = actor === 1 ? 2 : 1;
    const nextMoves = OthelloEngine.getLegalMovesForBoard(this.board, nextPlayer);
    let notice = null;

    if (nextMoves.length > 0) {
      this.currentPlayer = nextPlayer;
    } else {
      const sameMoves = OthelloEngine.getLegalMovesForBoard(this.board, actor);
      if (sameMoves.length > 0) {
        const skippedLabel = nextPlayer === 1 ? '黒' : '白';
        notice = `${skippedLabel}は置ける場所がないためパスしました`;
        this.history.push(`${skippedLabel} パス`);
        this.currentPlayer = actor;
      } else {
        this._finishGame();
      }
    }

    return { ok: true, flippedCount: flips.length, notice };
  }

  _finishGame() {
    this.gameOver = true;
    const counts = OthelloEngine.countDiscs(this.board);
    const winner = counts.black > counts.white ? 1 : counts.white > counts.black ? 2 : 0;
    this.result = {
      winner,
      reason: `黒 ${counts.black} 石 対 白 ${counts.white} 石`,
      details: [`黒（先手）: ${counts.black} 石`, `白（後手）: ${counts.white} 石`],
    };
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.currentPlayer = snap.currentPlayer;
    this.lastMove = snap.lastMove;
    this.lastFlipped = snap.lastFlipped;
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
      reason: `${player === 1 ? '黒' : '白'}の投了`,
      details: [`${winner === 1 ? '黒（先手）' : '白（後手）'}の勝利`],
    };
  }

  getState() {
    const counts = OthelloEngine.countDiscs(this.board);
    return {
      board: this.board.map((row) => [...row]),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      lastFlipped: this.lastFlipped.map((p) => [...p]),
      counts,
      gameOver: this.gameOver,
    };
  }
}
