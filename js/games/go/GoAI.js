import { BaseAI } from '../../core/BaseAI.js';
import { GoBoard } from './GoBoard.js';
import { GoScoring } from './GoScoring.js';

const ORTHO = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * 囲碁3段階AI
 * 初級：自陣眼埋め回避＋簡易アタリ対応ランダム
 * 中級：戦術ヒューリスティック＋軽量モンテカルロ評価
 * 上級：UCT ベースの MCTS（時間制限付き）＋戦術ロールアウト
 */
export class GoAI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate') {
    if (state.phase !== 'play') return null;

    const { board, currentPlayer, koHash, komi, consecutivePasses } = state;
    const size = board.length;
    const candidates = this._getSensibleMoves(board, currentPlayer, koHash);

    // If opponent just passed and we are ahead or no non-eye moves remain, pass cleanly
    if (candidates.length === 0) {
      return { type: 'pass' };
    }
    if (consecutivePasses >= 1) {
      const score = GoScoring.scoreBoard(board, new Set(), komi);
      if (
        (currentPlayer === 1 && score.blackTotal > score.whiteTotal + 1) ||
        (currentPlayer === 2 && score.whiteTotal > score.blackTotal + 1)
      ) {
        return { type: 'pass' };
      }
    }

    if (difficulty === 'beginner') {
      return this._chooseBeginner(board, currentPlayer, koHash, candidates);
    }

    if (difficulty === 'intermediate') {
      return this._chooseMonteCarlo(board, currentPlayer, koHash, komi, candidates, 450, false);
    }

    // Advanced: UCT-style MCTS with 1250ms budget
    return this._chooseMonteCarlo(board, currentPlayer, koHash, komi, candidates, 1250, true);
  }

  _getSensibleMoves(board, player, koHash) {
    const size = board.length;
    const moves = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== 0) continue;
        if (GoBoard.isTrueEye(board, r, c, player)) continue;
        const res = GoBoard.tryPlace(board, r, c, player, koHash);
        if (res.ok) {
          moves.push({ type: 'place', r, c, captured: res.capturedCount, nextBoard: res.board, nextKo: res.nextKoHash });
        }
      }
    }
    return moves;
  }

  _tacticalScore(board, move, player) {
    const size = board.length;
    const opp = player === 1 ? 2 : 1;
    let score = move.captured * 45;

    // Check own group liberties after move
    const own = GoBoard.getGroupAndLiberties(move.nextBoard, move.r, move.c);
    if (own.liberties.size === 1) score -= 24;
    else if (own.liberties.size >= 3) score += 8;

    // Check putting opponent into atari or saving own atari
    for (const [dr, dc] of ORTHO) {
      const nr = move.r + dr;
      const nc = move.c + dc;
      if (!GoBoard.inBounds(size, nr, nc)) continue;
      if (move.nextBoard[nr][nc] === opp) {
        const g = GoBoard.getGroupAndLiberties(move.nextBoard, nr, nc);
        if (g.liberties.size === 1) score += 26;
      }
      if (board[nr][nc] === player) {
        const before = GoBoard.getGroupAndLiberties(board, nr, nc);
        if (before.liberties.size === 1 && own.liberties.size >= 2) {
          score += 38;
        }
      }
    }

    // Avoid edge-line 1st line early, prefer 3rd/4th line and center
    const edgeDist = Math.min(move.r, move.c, size - 1 - move.r, size - 1 - move.c);
    if (edgeDist === 0) score -= 12;
    else if (edgeDist === 2 || edgeDist === 3) score += 8;

    return score;
  }

  _chooseBeginner(board, player, koHash, candidates) {
    const scored = candidates.map((m) => ({
      move: m,
      score: this._tacticalScore(board, m, player) + Math.random() * 55,
    }));
    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0].move;
    return { type: 'place', r: chosen.r, c: chosen.c };
  }

  _chooseMonteCarlo(board, player, koHash, komi, candidates, budgetMs, useUCB) {
    const size = board.length;
    const scored = candidates
      .map((m) => ({ move: m, prior: this._tacticalScore(board, m, player) }))
      .sort((a, b) => b.prior - a.prior);

    // Narrow to top candidates for larger boards to keep MCTS deep & sharp
    const maxBranches = size <= 9 ? 22 : size <= 13 ? 18 : 16;
    const arms = scored.slice(0, maxBranches).map((item) => ({
      move: item.move,
      prior: item.prior,
      visits: 0,
      wins: 0,
    }));

    const deadline = performance.now() + budgetMs;
    const maxPlayoutSteps = size <= 9 ? 54 : size <= 13 ? 72 : 84;
    let totalVisits = 0;

    while (performance.now() < deadline && totalVisits < (useUCB ? 480 : 140)) {
      let chosenArm;
      if (totalVisits < arms.length) {
        chosenArm = arms[totalVisits];
      } else if (useUCB) {
        let bestUcb = -Infinity;
        const logTotal = Math.log(totalVisits + 1);
        for (const arm of arms) {
          const mean = arm.wins / arm.visits;
          const priorBonus = Math.max(0, Math.min(0.25, arm.prior / 200)) / (arm.visits + 1);
          const ucb = mean + 1.15 * Math.sqrt(logTotal / arm.visits) + priorBonus;
          if (ucb > bestUcb) {
            bestUcb = ucb;
            chosenArm = arm;
          }
        }
      } else {
        chosenArm = arms[totalVisits % arms.length];
      }

      const won = this._runPlayout(
        chosenArm.move.nextBoard,
        player === 1 ? 2 : 1,
        chosenArm.move.nextKo,
        player,
        komi,
        maxPlayoutSteps
      );

      chosenArm.visits += 1;
      chosenArm.wins += won ? 1 : 0;
      totalVisits += 1;
    }

    arms.sort((a, b) => {
      const rateA = a.visits ? a.wins / a.visits : 0;
      const rateB = b.visits ? b.wins / b.visits : 0;
      return rateB + b.prior * 0.001 - (rateA + a.prior * 0.001);
    });

    const best = arms[0].move;
    return { type: 'place', r: best.r, c: best.c };
  }

  _runPlayout(startBoard, startTurn, startKo, rootPlayer, komi, maxSteps) {
    const size = startBoard.length;
    let board = GoBoard.clone(startBoard);
    let turn = startTurn;
    let koHash = startKo;
    let passes = 0;

    for (let step = 0; step < maxSteps; step++) {
      // Sample up to 16 random empty intersections for speed
      let placed = null;
      const empties = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] === 0) empties.push([r, c]);
        }
      }
      if (empties.length === 0) break;

      const tries = Math.min(empties.length, 16);
      for (let t = 0; t < tries; t++) {
        const idx = t + Math.floor(Math.random() * (empties.length - t));
        const tmp = empties[t];
        empties[t] = empties[idx];
        empties[idx] = tmp;

        const [r, c] = empties[t];
        if (GoBoard.isTrueEye(board, r, c, turn)) continue;
        const res = GoBoard.tryPlace(board, r, c, turn, koHash);
        if (res.ok) {
          placed = res;
          break;
        }
      }

      if (placed) {
        board = placed.board;
        koHash = placed.nextKoHash;
        passes = 0;
      } else {
        passes++;
        koHash = null;
        if (passes >= 2) break;
      }
      turn = turn === 1 ? 2 : 1;
    }

    const score = GoScoring.scoreBoard(board, new Set(), komi);
    return score.winner === rootPlayer;
  }
}
