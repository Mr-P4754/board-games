import { BaseAI } from '../../core/BaseAI.js';
import { CheckersEngine } from './CheckersEngine.js';

/**
 * チェッカー3段階AI
 * 初級：ランダム合法手
 * 中級：3手Alpha-Beta（駒数＋キング評価）
 * 上級：6手Alpha-Beta（後列防御・中央支配・キング機動力・時間制限付き）
 */
export class CheckersAI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate') {
    const moves = CheckersEngine.generateLegalMovesForBoard(state.board, state.currentPlayer);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    if (difficulty === 'beginner') {
      return this.pickRandom(moves);
    }

    if (difficulty === 'intermediate') {
      return this._searchRoot(state.board, state.currentPlayer, moves, 3, performance.now() + 500);
    }

    return this._searchRoot(state.board, state.currentPlayer, moves, 6, performance.now() + 950);
  }

  _orderMoves(moves) {
    return [...moves].sort((a, b) => (b.captures?.length || 0) - (a.captures?.length || 0));
  }

  _searchRoot(board, player, moves, depth, deadline) {
    const ordered = this._orderMoves(moves);
    let bestMove = ordered[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of ordered) {
      const { board: nextBoard } = CheckersEngine.applyMoveToBoard(board, move);
      const score = -this._negamax(nextBoard, player === 1 ? 2 : 1, depth - 1, -beta, -alpha, deadline);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) alpha = score;
      if (performance.now() > deadline) break;
    }
    return bestMove;
  }

  _negamax(board, player, depth, alpha, beta, deadline) {
    if (performance.now() > deadline) {
      return this._evaluate(board, player);
    }
    const moves = CheckersEngine.generateLegalMovesForBoard(board, player);
    if (moves.length === 0) {
      return -100000 - depth * 100;
    }
    if (depth <= 0) {
      return this._evaluate(board, player);
    }

    const ordered = this._orderMoves(moves);
    let best = -Infinity;
    for (const move of ordered) {
      const { board: nextBoard } = CheckersEngine.applyMoveToBoard(board, move);
      const score = -this._negamax(nextBoard, player === 1 ? 2 : 1, depth - 1, -beta, -alpha, deadline);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
      if (performance.now() > deadline) break;
    }
    return best;
  }

  _evaluate(board, player) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        let val = p.king ? 185 : 100;
        if (!p.king) {
          const advance = p.owner === 1 ? 7 - r : r;
          val += advance * 5;
          // Back-rank defense bonus
          if ((p.owner === 1 && r === 7) || (p.owner === 2 && r === 0)) val += 14;
        }
        // Center control bonus
        if (r >= 2 && r <= 5 && c >= 2 && c <= 5) val += 10;
        score += p.owner === player ? val : -val;
      }
    }
    return score;
  }
}
