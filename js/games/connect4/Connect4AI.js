import { BaseAI } from '../../core/BaseAI.js';
import { Connect4Engine } from './Connect4Engine.js';

const ROWS = Connect4Engine.ROWS;
const COLS = Connect4Engine.COLS;
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

/**
 * コネクトフォー3段階AI
 * 初級：ランダム＋即勝ち・3連防御
 * 中級：4手Alpha-Beta（中央優先＋4連窓評価）
 * 上級：7手Alpha-Beta（中央優先オーダリング＋窓評価＋時間制限）
 */
export class Connect4AI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate') {
    const board = state.board.map((r) => [...r]);
    const player = state.currentPlayer;
    const opp = player === 1 ? 2 : 1;
    const cols = COL_ORDER.filter((c) => board[0][c] === 0);
    if (cols.length === 0) return null;
    if (cols.length === 1) return { c: cols[0] };

    // Immediate winning move
    for (const c of cols) {
      const r = Connect4Engine.findDropRow(board, c);
      board[r][c] = player;
      const win = Connect4Engine.findWinLine(board, r, c, player);
      board[r][c] = 0;
      if (win) return { c };
    }

    // Immediate block
    for (const c of cols) {
      const r = Connect4Engine.findDropRow(board, c);
      board[r][c] = opp;
      const oppWin = Connect4Engine.findWinLine(board, r, c, opp);
      board[r][c] = 0;
      if (oppWin) return { c };
    }

    if (difficulty === 'beginner') {
      return { c: this.pickRandom(cols) };
    }

    const depth = difficulty === 'intermediate' ? 4 : 7;
    const deadline = performance.now() + (difficulty === 'intermediate' ? 400 : 950);

    let bestCol = cols[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const c of cols) {
      const r = Connect4Engine.findDropRow(board, c);
      board[r][c] = player;
      const score = -this._negamax(board, opp, depth - 1, -beta, -alpha, deadline);
      board[r][c] = 0;
      if (score > bestScore) {
        bestScore = score;
        bestCol = c;
      }
      if (score > alpha) alpha = score;
      if (performance.now() > deadline) break;
    }

    return { c: bestCol };
  }

  _negamax(board, player, depth, alpha, beta, deadline) {
    const cols = COL_ORDER.filter((c) => board[0][c] === 0);
    if (cols.length === 0) return 0;

    // Immediate win check at node
    for (const c of cols) {
      const r = Connect4Engine.findDropRow(board, c);
      board[r][c] = player;
      const win = Connect4Engine.findWinLine(board, r, c, player);
      board[r][c] = 0;
      if (win) return 100000 + depth * 100;
    }

    if (depth <= 0 || performance.now() > deadline) {
      return this._evaluate(board, player);
    }

    const opp = player === 1 ? 2 : 1;
    let best = -Infinity;
    for (const c of cols) {
      const r = Connect4Engine.findDropRow(board, c);
      board[r][c] = player;
      const score = -this._negamax(board, opp, depth - 1, -beta, -alpha, deadline);
      board[r][c] = 0;
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
      if (performance.now() > deadline) break;
    }
    return best;
  }

  _evaluate(board, player) {
    const opp = player === 1 ? 2 : 1;
    let score = 0;

    // Center column preference
    for (let r = 0; r < ROWS; r++) {
      if (board[r][3] === player) score += 6;
      else if (board[r][3] === opp) score -= 6;
    }

    const scoreWindow = (a, b, c, d) => {
      let me = 0;
      let them = 0;
      for (const v of [a, b, c, d]) {
        if (v === player) me++;
        else if (v === opp) them++;
      }
      if (me > 0 && them > 0) return 0;
      if (me === 3) return 22;
      if (me === 2) return 5;
      if (them === 3) return -26;
      if (them === 2) return -5;
      return 0;
    };

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += scoreWindow(board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]);
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        score += scoreWindow(board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]);
      }
    }
    // Diagonals
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += scoreWindow(board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]);
        score += scoreWindow(board[r + 3][c], board[r + 2][c + 1], board[r + 1][c + 2], board[r][c + 3]);
      }
    }

    return score;
  }
}
