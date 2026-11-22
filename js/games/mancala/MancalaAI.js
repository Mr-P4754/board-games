import { BaseAI } from '../../core/BaseAI.js';
import { MancalaEngine } from './MancalaEngine.js';

/**
 * マンカラ3段階AI（連続手番を正確に考慮したAlpha-Beta探索）
 * 初級：ランダム＋時折ピッタリ連続手番を選択
 * 中級：3手Alpha-Beta
 * 上級：7手Alpha-Beta（ストア差＋自陣石数＋連続手番・横取り評価）
 */
export class MancalaAI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate') {
    const { pits, currentPlayer } = state;
    const legal = MancalaEngine.getLegalPits(pits, currentPlayer);
    if (legal.length === 0) return null;
    if (legal.length === 1) return { pit: legal[0] };

    if (difficulty === 'beginner') {
      const extraMoves = legal.filter((pit) => MancalaEngine.simulateMove(pits, currentPlayer, pit).extraTurn);
      if (extraMoves.length > 0 && Math.random() < 0.45) {
        return { pit: this.pickRandom(extraMoves) };
      }
      return { pit: this.pickRandom(legal) };
    }

    const depth = difficulty === 'intermediate' ? 3 : 7;
    const deadline = performance.now() + (difficulty === 'intermediate' ? 400 : 900);

    let bestPit = legal[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    // Order moves right-to-left (closest to store first — often extra turns)
    const ordered = [...legal].reverse();
    for (const pit of ordered) {
      const sim = MancalaEngine.simulateMove(pits, currentPlayer, pit);
      const score = sim.extraTurn
        ? this._search(sim.pits, currentPlayer, depth - 1, alpha, beta, deadline)
        : -this._search(sim.pits, sim.nextPlayer, depth - 1, -beta, -alpha, deadline);
      if (score > bestScore) {
        bestScore = score;
        bestPit = pit;
      }
      if (score > alpha) alpha = score;
      if (performance.now() > deadline) break;
    }

    return { pit: bestPit };
  }

  _search(pits, player, depth, alpha, beta, deadline) {
    const legal = MancalaEngine.getLegalPits(pits, player);
    if (legal.length === 0 || depth <= 0 || performance.now() > deadline) {
      return this._evaluate(pits, player);
    }

    let best = -Infinity;
    const ordered = [...legal].reverse();
    for (const pit of ordered) {
      const sim = MancalaEngine.simulateMove(pits, player, pit);
      let score;
      if (sim.gameOver) {
        score = this._evaluateTerminal(sim.pits, player);
      } else if (sim.extraTurn) {
        score = this._search(sim.pits, player, depth - 1, alpha, beta, deadline);
      } else {
        score = -this._search(sim.pits, sim.nextPlayer, depth - 1, -beta, -alpha, deadline);
      }
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
      if (performance.now() > deadline) break;
    }
    return best;
  }

  _evaluateTerminal(pits, player) {
    const diff = player === 1 ? pits[6] - pits[13] : pits[13] - pits[6];
    return diff * 1000;
  }

  _evaluate(pits, player) {
    const myStore = player === 1 ? pits[6] : pits[13];
    const oppStore = player === 1 ? pits[13] : pits[6];

    let mySide = 0;
    let oppSide = 0;
    const myStart = player === 1 ? 0 : 7;
    const oppStart = player === 1 ? 7 : 0;
    let extraReady = 0;

    for (let i = 0; i < 6; i++) {
      const cnt = pits[myStart + i];
      mySide += cnt;
      if (cnt === 6 - i) extraReady++;
      oppSide += pits[oppStart + i];
    }

    return (myStore - oppStore) * 14 + (mySide - oppSide) * 2 + extraReady * 6;
  }
}
