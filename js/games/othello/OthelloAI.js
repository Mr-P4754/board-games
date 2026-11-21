import { BaseAI } from '../../core/BaseAI.js';
import { OthelloEngine } from './OthelloEngine.js';

const WEIGHTS = [
  [120, -25, 20,  5,  5, 20, -25, 120],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [120, -25, 20,  5,  5, 20, -25, 120],
];

const CORNERS = [
  [0, 0], [0, 7], [7, 0], [7, 7],
];

/**
 * オセロ3段階AI（初級：ランダム寄り / 中級：位置評価+2手読み / 上級：Alpha-Beta+終盤完全読み）
 */
export class OthelloAI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate') {
    const { board, currentPlayer } = state;
    const moves = OthelloEngine.getLegalMovesForBoard(board, currentPlayer);
    if (moves.length === 0) return null;
    if (moves.length === 1) return { r: moves[0].r, c: moves[0].c };

    if (difficulty === 'beginner') {
      return this._chooseBeginner(moves);
    }

    if (difficulty === 'intermediate') {
      return this._searchRoot(board, currentPlayer, moves, 2, false);
    }

    const { empty } = OthelloEngine.countDiscs(board);
    if (empty <= 9) {
      return this._searchRoot(board, currentPlayer, moves, empty, true);
    }
    return this._searchRoot(board, currentPlayer, moves, 5, false);
  }

  _chooseBeginner(moves) {
    // 70% pure random, 30% pick max flips (classic beginner heuristic)
    if (Math.random() < 0.7) {
      const m = this.pickRandom(moves);
      return { r: m.r, c: m.c };
    }
    let best = moves[0];
    for (const m of moves) {
      if (m.flips.length > best.flips.length) best = m;
    }
    return { r: best.r, c: best.c };
  }

  _cloneAndApply(board, move, player) {
    const next = board.map((row) => [...row]);
    next[move.r][move.c] = player;
    for (const [fr, fc] of move.flips) {
      next[fr][fc] = player;
    }
    return next;
  }

  _orderMoves(moves) {
    return [...moves].sort((a, b) => WEIGHTS[b.r][b.c] - WEIGHTS[a.r][a.c]);
  }

  _searchRoot(board, player, moves, depth, exactEndgame) {
    const ordered = this._orderMoves(moves);
    let bestScore = -Infinity;
    let bestMove = ordered[0];
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of ordered) {
      const nextBoard = this._cloneAndApply(board, move, player);
      const score = -this._negamax(
        nextBoard,
        player === 1 ? 2 : 1,
        depth - 1,
        -beta,
        -alpha,
        exactEndgame,
        false
      );
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) alpha = score;
    }

    return { r: bestMove.r, c: bestMove.c };
  }

  _negamax(board, player, depth, alpha, beta, exactEndgame, prevPassed) {
    const moves = OthelloEngine.getLegalMovesForBoard(board, player);
    if (moves.length === 0) {
      if (prevPassed) {
        return this._evaluateTerminal(board, player);
      }
      return -this._negamax(
        board,
        player === 1 ? 2 : 1,
        depth,
        -beta,
        -alpha,
        exactEndgame,
        true
      );
    }

    if (depth <= 0) {
      return exactEndgame
        ? this._evaluateTerminal(board, player)
        : this._evaluateHeuristic(board, player, moves.length);
    }

    const ordered = this._orderMoves(moves);
    let best = -Infinity;
    for (const move of ordered) {
      const nextBoard = this._cloneAndApply(board, move, player);
      const score = -this._negamax(
        nextBoard,
        player === 1 ? 2 : 1,
        depth - 1,
        -beta,
        -alpha,
        exactEndgame,
        false
      );
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  _evaluateTerminal(board, player) {
    const { black, white } = OthelloEngine.countDiscs(board);
    const diff = player === 1 ? black - white : white - black;
    return diff * 1000;
  }

  _evaluateHeuristic(board, player, myMobility) {
    const opp = player === 1 ? 2 : 1;
    let posScore = 0;
    let myDiscs = 0;
    let oppDiscs = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (cell === player) {
          posScore += WEIGHTS[r][c];
          myDiscs++;
        } else if (cell === opp) {
          posScore -= WEIGHTS[r][c];
          oppDiscs++;
        }
      }
    }

    let cornerScore = 0;
    for (const [r, c] of CORNERS) {
      if (board[r][c] === player) cornerScore += 45;
      else if (board[r][c] === opp) cornerScore -= 45;
    }

    const oppMobility = OthelloEngine.getLegalMovesForBoard(board, opp).length;
    const mobilityScore = (myMobility - oppMobility) * 14;
    const totalDiscs = myDiscs + oppDiscs;
    const discScore = totalDiscs > 48 ? (myDiscs - oppDiscs) * 8 : 0;

    return posScore + cornerScore + mobilityScore + discScore;
  }
}
