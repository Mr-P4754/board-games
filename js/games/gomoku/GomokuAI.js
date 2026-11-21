import { BaseAI } from '../../core/BaseAI.js';
import { GomokuEngine } from './GomokuEngine.js';

const SIZE = GomokuEngine.SIZE;
const AXES = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/**
 * 五目並べ3段階AI
 * 初級：周辺ランダム＋即勝ち・4連防御
 * 中級：脅威パターン評価（活三・四等）＋浅い先読み
 * 上級：候補手絞り込み＋Alpha-Beta探索（4手読み）
 */
export class GomokuAI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate') {
    const board = state.board.map((row) => [...row]);
    const player = state.currentPlayer;
    const opp = player === 1 ? 2 : 1;
    const renju = Boolean(state.renju);

    const candidates = this._getCandidates(board, player, renju);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Always take immediate winning move
    for (const m of candidates) {
      board[m.r][m.c] = player;
      const win = GomokuEngine.findWinLine(board, m.r, m.c, player, renju && player === 1);
      board[m.r][m.c] = 0;
      if (win) return m;
    }

    // Always block opponent's immediate winning move
    for (const m of candidates) {
      board[m.r][m.c] = opp;
      const oppWin = GomokuEngine.findWinLine(board, m.r, m.c, opp, renju && opp === 1);
      board[m.r][m.c] = 0;
      if (oppWin) return m;
    }

    if (difficulty === 'beginner') {
      const scored = candidates.map((m) => ({
        move: m,
        score: this._scorePoint(board, m.r, m.c, player, opp) + Math.random() * 140,
      }));
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, Math.min(5, scored.length));
      return this.pickRandom(top).move;
    }

    if (difficulty === 'intermediate') {
      const top = this._rankCandidates(board, candidates, player, opp, 10);
      let best = top[0];
      let bestScore = -Infinity;
      for (const m of top) {
        board[m.r][m.c] = player;
        const val = this._evalBoard(board, player) - this._bestReplyThreat(board, opp, player, renju) * 0.55;
        board[m.r][m.c] = 0;
        if (val > bestScore) {
          bestScore = val;
          best = m;
        }
      }
      return best;
    }

    // Advanced: Alpha-Beta search with time cap
    const deadline = performance.now() + 900;
    const top = this._rankCandidates(board, candidates, player, opp, 12);
    let bestMove = top[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const m of top) {
      board[m.r][m.c] = player;
      const score = -this._negamax(board, opp, 3, -beta, -alpha, renju, deadline);
      board[m.r][m.c] = 0;
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
      if (score > alpha) alpha = score;
      if (performance.now() > deadline) break;
    }

    return bestMove;
  }

  _getCandidates(board, player, renju) {
    let hasStone = false;
    const seen = new Set();
    const list = [];

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) continue;
        hasStone = true;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (!GomokuEngine.inBounds(nr, nc) || board[nr][nc] !== 0) continue;
            const key = nr * SIZE + nc;
            if (seen.has(key)) continue;
            if (renju && player === 1 && GomokuEngine.isForbiddenForBlack(board, nr, nc)) continue;
            seen.add(key);
            list.push({ r: nr, c: nc });
          }
        }
      }
    }

    if (!hasStone) {
      return [{ r: 7, c: 7 }];
    }
    return list;
  }

  _rankCandidates(board, candidates, player, opp, limit) {
    return candidates
      .map((m) => ({
        move: m,
        score: this._scorePoint(board, m.r, m.c, player, opp),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.move);
  }

  _scorePoint(board, r, c, player, opp) {
    const atk = this._pointThreat(board, r, c, player);
    const def = this._pointThreat(board, r, c, opp);
    const centerBias = 14 - (Math.abs(r - 7) + Math.abs(c - 7));
    return atk * 1.12 + def + centerBias;
  }

  _pointThreat(board, r, c, color) {
    let total = 0;
    for (const [dr, dc] of AXES) {
      let count = 1;
      let openEnds = 0;

      for (const sign of [1, -1]) {
        let nr = r + dr * sign;
        let nc = c + dc * sign;
        while (GomokuEngine.inBounds(nr, nc) && board[nr][nc] === color) {
          count++;
          nr += dr * sign;
          nc += dc * sign;
        }
        if (GomokuEngine.inBounds(nr, nc) && board[nr][nc] === 0) {
          openEnds++;
        }
      }

      if (count >= 5) total += 100000;
      else if (count === 4) total += openEnds === 2 ? 18000 : openEnds === 1 ? 3500 : 0;
      else if (count === 3) total += openEnds === 2 ? 2800 : openEnds === 1 ? 320 : 0;
      else if (count === 2) total += openEnds === 2 ? 220 : openEnds === 1 ? 45 : 0;
      else if (count === 1 && openEnds === 2) total += 12;
    }
    return total;
  }

  _bestReplyThreat(board, opp, player, renju) {
    const cands = this._getCandidates(board, opp, renju);
    let maxVal = 0;
    for (const m of cands) {
      const t = this._pointThreat(board, m.r, m.c, opp);
      if (t > maxVal) maxVal = t;
    }
    return maxVal;
  }

  _negamax(board, player, depth, alpha, beta, renju, deadline) {
    const opp = player === 1 ? 2 : 1;
    if (depth <= 0 || performance.now() > deadline) {
      return this._evalBoard(board, player);
    }

    const candidates = this._getCandidates(board, player, renju);
    if (candidates.length === 0) return 0;

    // Immediate win check
    for (const m of candidates) {
      board[m.r][m.c] = player;
      const win = GomokuEngine.findWinLine(board, m.r, m.c, player, renju && player === 1);
      board[m.r][m.c] = 0;
      if (win) return 100000 + depth * 1000;
    }

    const top = this._rankCandidates(board, candidates, player, opp, 9);
    let best = -Infinity;
    for (const m of top) {
      board[m.r][m.c] = player;
      const score = -this._negamax(board, opp, depth - 1, -beta, -alpha, renju, deadline);
      board[m.r][m.c] = 0;
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  _evalBoard(board, player) {
    const opp = player === 1 ? 2 : 1;
    return this._evalColor(board, player) - this._evalColor(board, opp) * 1.15;
  }

  _evalColor(board, color) {
    let score = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] !== color) continue;
        for (const [dr, dc] of AXES) {
          const pr = r - dr;
          const pc = c - dc;
          if (GomokuEngine.inBounds(pr, pc) && board[pr][pc] === color) continue;

          let len = 0;
          let nr = r;
          let nc = c;
          while (GomokuEngine.inBounds(nr, nc) && board[nr][nc] === color) {
            len++;
            nr += dr;
            nc += dc;
          }
          let open = 0;
          if (GomokuEngine.inBounds(pr, pc) && board[pr][pc] === 0) open++;
          if (GomokuEngine.inBounds(nr, nc) && board[nr][nc] === 0) open++;

          if (len >= 5) score += 100000;
          else if (len === 4) score += open === 2 ? 16000 : open === 1 ? 2400 : 0;
          else if (len === 3) score += open === 2 ? 1800 : open === 1 ? 180 : 0;
          else if (len === 2) score += open === 2 ? 120 : open === 1 ? 20 : 0;
        }
      }
    }
    return score;
  }
}
