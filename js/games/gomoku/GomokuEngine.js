import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const SIZE = 15;
const AXES = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];
const COLS = 'ABCDEFGHIJKLMNO';

/**
 * 五目並べ（15×15・標準／連珠禁じ手ルール対応）エンジン
 */
export class GomokuEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.renju = Boolean(this.options.renju);
    this.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    this.currentPlayer = 1; // 1: Black, 2: White
    this.lastMove = null;
    this.winLine = [];
    this.moveCount = 0;
  }

  static get SIZE() {
    return SIZE;
  }

  static inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  /**
   * (r, c) に player が置いたときの5連（または長連）を検出
   */
  static findWinLine(board, r, c, player, exactFive = false) {
    for (const [dr, dc] of AXES) {
      const cells = [[r, c]];
      for (const sign of [1, -1]) {
        let nr = r + dr * sign;
        let nc = c + dc * sign;
        while (GomokuEngine.inBounds(nr, nc) && board[nr][nc] === player) {
          cells.push([nr, nc]);
          nr += dr * sign;
          nc += dc * sign;
        }
      }
      if (exactFive ? cells.length === 5 : cells.length >= 5) {
        return cells;
      }
    }
    return null;
  }

  /**
   * 連珠ルールにおける黒の禁じ手（長連・四四・三三）判定
   */
  static isForbiddenForBlack(board, r, c) {
    if (board[r][c] !== 0) return false;
    board[r][c] = 1;

    // 1. Exact five wins immediately (overrides forbidden except overline)
    let hasExactFive = false;
    let hasOverline = false;
    for (const [dr, dc] of AXES) {
      const count = 1 + GomokuEngine._countDir(board, r, c, dr, dc, 1) + GomokuEngine._countDir(board, r, c, -dr, -dc, 1);
      if (count === 5) hasExactFive = true;
      if (count >= 6) hasOverline = true;
    }
    if (hasExactFive) {
      board[r][c] = 0;
      return false;
    }
    if (hasOverline) {
      board[r][c] = 0;
      return true;
    }

    // 2. Count fours and open threes across all 4 axes
    let fours = 0;
    let openThrees = 0;

    for (const [dr, dc] of AXES) {
      const lineStr = GomokuEngine._extractAxisPattern(board, r, c, dr, dc, 1);
      const axisFours = GomokuEngine._countFoursInLine(lineStr);
      fours += axisFours;
      if (axisFours === 0 && GomokuEngine._hasOpenThreeInLine(lineStr)) {
        openThrees += 1;
      }
    }

    board[r][c] = 0;
    return fours >= 2 || openThrees >= 2;
  }

  static _countDir(board, r, c, dr, dc, player) {
    let n = 0;
    let nr = r + dr;
    let nc = c + dc;
    while (GomokuEngine.inBounds(nr, nc) && board[nr][nc] === player) {
      n++;
      nr += dr;
      nc += dc;
    }
    return n;
  }

  static _extractAxisPattern(board, r, c, dr, dc, player) {
    let s = '';
    for (let k = -4; k <= 4; k++) {
      const nr = r + dr * k;
      const nc = c + dc * k;
      if (!GomokuEngine.inBounds(nr, nc)) s += '2';
      else if (board[nr][nc] === player) s += '1';
      else if (board[nr][nc] === 0) s += '0';
      else s += '2';
    }
    return s;
  }

  static _countFoursInLine(s) {
    // Center is index 4. Check how many distinct empty spots make an exact 5 containing center
    let wins = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== '0') continue;
      const test = s.slice(0, i) + '1' + s.slice(i + 1);
      // Count contiguous '1's passing through index 4
      let l = 4;
      while (l > 0 && test[l - 1] === '1') l--;
      let r = 4;
      while (r < test.length - 1 && test[r + 1] === '1') r++;
      if (r - l + 1 === 5 && i >= l && i <= r) {
        wins++;
      }
    }
    // Straight open four (.1111.) creates 2 winning points on the same axis, which counts as 1 four (not double-four!)
    if (wins >= 2 && s.includes('011110')) {
      return 1;
    }
    return wins > 0 ? Math.min(wins, 2) : 0;
  }

  static _hasOpenThreeInLine(s) {
    // Open three patterns that contain center (index 4): 001110, 011100, 010110, 011010
    const patterns = ['001110', '011100', '010110', '011010'];
    for (const pat of patterns) {
      let idx = s.indexOf(pat);
      while (idx !== -1) {
        const end = idx + pat.length - 1;
        if (idx <= 4 && 4 <= end) return true;
        idx = s.indexOf(pat, idx + 1);
      }
    }
    return false;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getLegalMoves() {
    if (this.gameOver) return [];
    const moves = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.board[r][c] !== 0) continue;
        if (this.renju && this.currentPlayer === 1 && GomokuEngine.isForbiddenForBlack(this.board, r, c)) {
          continue;
        }
        moves.push({ r, c });
      }
    }
    return moves;
  }

  getForbiddenCells() {
    if (!this.renju || this.currentPlayer !== 1 || this.gameOver) return [];
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.board[r][c] === 0 && GomokuEngine.isForbiddenForBlack(this.board, r, c)) {
          cells.push([r, c]);
        }
      }
    }
    return cells;
  }

  applyMove(move) {
    if (this.gameOver || !move) return { ok: false, reason: '対局は終了しています' };
    const { r, c } = move;
    if (!GomokuEngine.inBounds(r, c) || this.board[r][c] !== 0) {
      return { ok: false, reason: 'その交点には置けません' };
    }
    if (this.renju && this.currentPlayer === 1 && GomokuEngine.isForbiddenForBlack(this.board, r, c)) {
      return { ok: false, reason: '連珠ルールにより黒の禁じ手（三三・四四・長連）です' };
    }

    this.undoStack.push({
      board: this.board.map((row) => [...row]),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      winLine: [...this.winLine],
      moveCount: this.moveCount,
      historyLen: this.history.length,
    });

    const actor = this.currentPlayer;
    this.board[r][c] = actor;
    this.lastMove = { r, c, player: actor };
    this.moveCount += 1;
    this.history.push(`${actor === 1 ? '黒' : '白'} ${COLS[c]}${SIZE - r}`);

    const exactFive = this.renju && actor === 1;
    const winLine = GomokuEngine.findWinLine(this.board, r, c, actor, exactFive);
    if (winLine) {
      this.winLine = winLine;
      this.gameOver = true;
      this.result = {
        winner: actor,
        reason: `${actor === 1 ? '黒' : '白'}が5連を完成しました（${this.moveCount}手）`,
        details: [`総手数: ${this.moveCount} 手`, this.renju ? 'ルール: 連珠（禁じ手あり）' : 'ルール: 標準'],
      };
    } else if (this.moveCount >= SIZE * SIZE) {
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
      reason: `${player === 1 ? '黒' : '白'}の投了`,
      details: [`総手数: ${this.moveCount} 手`],
    };
  }

  getState() {
    return {
      board: this.board.map((row) => [...row]),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      winLine: this.winLine.map((p) => [...p]),
      moveCount: this.moveCount,
      renju: this.renju,
      forbidden: this.getForbiddenCells(),
      gameOver: this.gameOver,
    };
  }
}
