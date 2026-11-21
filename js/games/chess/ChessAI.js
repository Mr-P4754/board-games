import { BaseAI } from '../../core/BaseAI.js';
import { ChessPiece } from './ChessPiece.js';
import { ChessMoveGenerator } from './ChessMoveGenerator.js';

/**
 * チェス3段階AI
 * 初級：ランダム＋駒取り優先
 * 中級：駒価値＋PST＋2手Alpha-Beta
 * 上級：MVV-LVA＋静止探索＋反復深化Alpha-Beta
 */
export class ChessAI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate') {
    const moves = ChessMoveGenerator.generateLegalMoves(state, state.currentPlayer);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    if (difficulty === 'beginner') {
      return this._chooseBeginner(moves);
    }

    if (difficulty === 'intermediate') {
      return this._searchRoot(state, moves, 2, false, performance.now() + 700);
    }

    // Advanced: Iterative deepening depth 3 -> 4 within 1.1s budget
    const deadline = performance.now() + 1100;
    let best = this._searchRoot(state, moves, 3, true, deadline);
    if (performance.now() < deadline - 250) {
      const deeper = this._searchRoot(state, moves, 4, true, deadline);
      if (deeper) best = deeper;
    }
    return best;
  }

  _chooseBeginner(moves) {
    const captures = moves.filter((m) => m.capture || m.promotion);
    if (captures.length > 0 && Math.random() < 0.45) {
      captures.sort((a, b) => ChessPiece.valueOf(b.capture || 'Q') - ChessPiece.valueOf(a.capture || 'Q'));
      return captures[0];
    }
    return this.pickRandom(moves);
  }

  _scoreMoveOrder(board, move) {
    let score = 0;
    if (move.capture) {
      const attacker = board[move.from.r][move.from.c];
      score += 10 * ChessPiece.valueOf(move.capture) - ChessPiece.valueOf(attacker?.type);
    }
    if (move.promotion) {
      score += ChessPiece.valueOf(move.promotion) * 8;
    }
    if (move.castle) score += 60;
    return score;
  }

  _orderMoves(board, moves) {
    return [...moves].sort((a, b) => this._scoreMoveOrder(board, b) - this._scoreMoveOrder(board, a));
  }

  _searchRoot(state, moves, depth, useQuiescence, deadline) {
    const ordered = this._orderMoves(state.board, moves);
    let bestMove = ordered[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of ordered) {
      const next = ChessMoveGenerator.applyMoveToState(state, move);
      const score = -this._negamax(next, depth - 1, -beta, -alpha, useQuiescence, deadline);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) alpha = score;
      if (performance.now() > deadline) break;
    }
    return bestMove;
  }

  _negamax(state, depth, alpha, beta, useQuiescence, deadline) {
    if (performance.now() > deadline) {
      return this._evaluate(state.board, state.currentPlayer);
    }

    const moves = ChessMoveGenerator.generateLegalMoves(state, state.currentPlayer);
    if (moves.length === 0) {
      if (ChessMoveGenerator.isInCheck(state.board, state.currentPlayer)) {
        return -100000 - depth * 100;
      }
      return 0; // Stalemate
    }

    if (depth <= 0) {
      return useQuiescence
        ? this._quiesce(state, alpha, beta, 3, deadline)
        : this._evaluate(state.board, state.currentPlayer);
    }

    const ordered = this._orderMoves(state.board, moves);
    let best = -Infinity;

    for (const move of ordered) {
      const next = ChessMoveGenerator.applyMoveToState(state, move);
      const score = -this._negamax(next, depth - 1, -beta, -alpha, useQuiescence, deadline);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
      if (performance.now() > deadline) break;
    }
    return best;
  }

  _quiesce(state, alpha, beta, qDepth, deadline) {
    const standPat = this._evaluate(state.board, state.currentPlayer);
    if (standPat >= beta || qDepth <= 0 || performance.now() > deadline) {
      return standPat;
    }
    if (standPat > alpha) alpha = standPat;

    const captures = ChessMoveGenerator.generateLegalMoves(state, state.currentPlayer).filter(
      (m) => m.capture || m.promotion
    );
    const ordered = this._orderMoves(state.board, captures);

    for (const move of ordered) {
      const next = ChessMoveGenerator.applyMoveToState(state, move);
      const score = -this._quiesce(next, -beta, -alpha, qDepth - 1, deadline);
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  _evaluate(board, color) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        const val = ChessPiece.valueOf(p.type) + ChessPiece.pstValue(p.type, p.color, r, c);
        score += p.color === color ? val : -val;
      }
    }
    return score;
  }
}
