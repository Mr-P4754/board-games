import { BaseAI } from '../../core/BaseAI.js';
import { ShogiPiece } from './ShogiPiece.js';
import { ShogiMoveGenerator } from './ShogiMoveGenerator.js';

/**
 * 将棋3段階AI
 * 初級：ランダム＋駒取り・成り優先
 * 中級：駒割＋持ち駒＋玉周辺評価＋2手Alpha-Beta
 * 上級：ムーブオーダリング＋静止探索＋3手Alpha-Beta（時間制限付き）
 */
export class ShogiAI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate') {
    const moves = ShogiMoveGenerator.generateLegalMoves(state, state.currentPlayer);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    if (difficulty === 'beginner') {
      return this._chooseBeginner(moves);
    }

    if (difficulty === 'intermediate') {
      return this._searchRoot(state, moves, 2, false, performance.now() + 850);
    }

    // Advanced: 3-ply Alpha-Beta + quiescence within 1.2s budget
    const deadline = performance.now() + 1200;
    return this._searchRoot(state, moves, 3, true, deadline);
  }

  _chooseBeginner(moves) {
    const tactical = moves.filter((m) => m.capture || m.promote);
    if (tactical.length > 0 && Math.random() < 0.45) {
      tactical.sort(
        (a, b) =>
          (b.capture ? ShogiPiece.valueOf(b.capture) : 120) -
          (a.capture ? ShogiPiece.valueOf(a.capture) : 120)
      );
      return tactical[0];
    }
    return this.pickRandom(moves);
  }

  _scoreMove(move) {
    let score = 0;
    if (move.capture) {
      score += 10 * ShogiPiece.valueOf(move.capture) - ShogiPiece.valueOf(move.piece || 'FU');
    }
    if (move.promote) score += 260;
    if (move.drop) score += 40;
    return score;
  }

  _orderMoves(moves, limit = null) {
    const sorted = [...moves].sort((a, b) => this._scoreMove(b) - this._scoreMove(a));
    return limit && sorted.length > limit ? sorted.slice(0, limit) : sorted;
  }

  _searchRoot(state, moves, depth, useQuiesce, deadline) {
    const ordered = this._orderMoves(moves);
    let bestMove = ordered[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of ordered) {
      const next = ShogiMoveGenerator.applyMoveToState(state, move);
      const score = -this._negamax(next, depth - 1, -beta, -alpha, useQuiesce, deadline);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) alpha = score;
      if (performance.now() > deadline) break;
    }
    return bestMove;
  }

  _negamax(state, depth, alpha, beta, useQuiesce, deadline) {
    if (performance.now() > deadline) {
      return this._evaluate(state, state.currentPlayer);
    }

    const moves = ShogiMoveGenerator.generateLegalMoves(state, state.currentPlayer, false);
    if (moves.length === 0) {
      return -100000 - depth * 100;
    }

    if (depth <= 0) {
      return useQuiesce
        ? this._quiesce(state, alpha, beta, 2, deadline)
        : this._evaluate(state, state.currentPlayer);
    }

    const ordered = this._orderMoves(moves, depth >= 2 ? 32 : 24);
    let best = -Infinity;

    for (const move of ordered) {
      const next = ShogiMoveGenerator.applyMoveToState(state, move);
      const score = -this._negamax(next, depth - 1, -beta, -alpha, useQuiesce, deadline);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
      if (performance.now() > deadline) break;
    }
    return best;
  }

  _quiesce(state, alpha, beta, qDepth, deadline) {
    const standPat = this._evaluate(state, state.currentPlayer);
    if (standPat >= beta || qDepth <= 0 || performance.now() > deadline) {
      return standPat;
    }
    if (standPat > alpha) alpha = standPat;

    const captures = ShogiMoveGenerator.generateLegalMoves(state, state.currentPlayer, false).filter(
      (m) => m.capture
    );
    const ordered = this._orderMoves(captures, 12);

    for (const move of ordered) {
      const next = ShogiMoveGenerator.applyMoveToState(state, move);
      const score = -this._quiesce(next, -beta, -alpha, qDepth - 1, deadline);
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  _evaluate(state, owner) {
    const { board, hands } = state;
    let score = 0;

    let myKing = null;
    let oppKing = null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (!p) continue;

        let val = ShogiPiece.valueOf(p.type);
        // Advancement bonus for non-king pieces
        if (p.type !== 'OU') {
          const advance = p.owner === 1 ? 8 - r : r;
          val += advance * 6;
          // Center file control
          val += (4 - Math.abs(4 - c)) * 4;
        } else {
          // Keep king safer in back ranks
          const homeDepth = p.owner === 1 ? r : 8 - r;
          val += homeDepth * 14;
          if (p.owner === owner) myKing = { r, c };
          else oppKing = { r, c };
        }

        score += p.owner === owner ? val : -val;
      }
    }

    // Hand piece values
    for (const side of [1, 2]) {
      const sign = side === owner ? 1 : -1;
      for (const type of ShogiPiece.HAND_ORDER) {
        const count = hands[side][type] || 0;
        if (count > 0) {
          score += sign * count * ShogiPiece.handValueOf(type);
        }
      }
    }

    // King defender bonus (friendly gold/silver adjacent to own king)
    const kingSafety = (king, side) => {
      if (!king) return 0;
      let bonus = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = king.r + dr;
          const nc = king.c + dc;
          if (!ShogiMoveGenerator.inBounds(nr, nc)) continue;
          const p = board[nr][nc];
          if (p && p.owner === side && (p.type === 'KI' || p.type === 'GI')) {
            bonus += 34;
          }
        }
      }
      return bonus;
    };

    score += kingSafety(myKing, owner) - kingSafety(oppKing, owner === 1 ? 2 : 1);
    return score;
  }
}
