import { BaseGameEngine } from '../../core/BaseGameEngine.js';

/**
 * マンカラ（カラハ標準ルール：6ポケット×4石、ピッタリ連続手番、向かい側横取り対応）エンジン
 * インデックス配置:
 *   0..5 : プレイヤー1（先手・下側 左→右）
 *   6    : プレイヤー1のストア（右）
 *   7..12: プレイヤー2（後手・上側 右→左）
 *   13   : プレイヤー2のストア（左）
 */
export class MancalaEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    const stonesPerPit = Number(this.options.stonesPerPit) || 4;
    this.stonesPerPit = stonesPerPit;
    this.pits = Array(14).fill(stonesPerPit);
    this.pits[6] = 0;
    this.pits[13] = 0;
    this.currentPlayer = 1;
    this.lastMove = null;
  }

  static getLegalPits(pits, player) {
    const start = player === 1 ? 0 : 7;
    const legal = [];
    for (let i = start; i < start + 6; i++) {
      if (pits[i] > 0) legal.push(i);
    }
    return legal;
  }

  static simulateMove(pits, player, pitIdx) {
    const next = [...pits];
    let stones = next[pitIdx];
    if (stones <= 0) return null;

    next[pitIdx] = 0;
    const ownStore = player === 1 ? 6 : 13;
    const oppStore = player === 1 ? 13 : 6;
    const ownStart = player === 1 ? 0 : 7;
    const ownEnd = ownStart + 5;

    let idx = pitIdx;
    while (stones > 0) {
      idx = (idx + 1) % 14;
      if (idx === oppStore) continue;
      next[idx]++;
      stones--;
    }

    let extraTurn = idx === ownStore;
    let capturedCount = 0;

    // Capture opposite pit when landing in own empty pit (now has 1) and opposite has stones
    if (!extraTurn && idx >= ownStart && idx <= ownEnd && next[idx] === 1) {
      const oppIdx = 12 - idx;
      if (next[oppIdx] > 0) {
        capturedCount = next[oppIdx] + 1;
        next[ownStore] += capturedCount;
        next[idx] = 0;
        next[oppIdx] = 0;
      }
    }

    // Check game end (either side has all 6 pits empty)
    let p1Sum = 0;
    let p2Sum = 0;
    for (let i = 0; i < 6; i++) p1Sum += next[i];
    for (let i = 7; i < 13; i++) p2Sum += next[i];

    let gameOver = false;
    if (p1Sum === 0 || p2Sum === 0) {
      next[6] += p1Sum;
      next[13] += p2Sum;
      for (let i = 0; i < 6; i++) next[i] = 0;
      for (let i = 7; i < 13; i++) next[i] = 0;
      gameOver = true;
      extraTurn = false;
    }

    return {
      pits: next,
      nextPlayer: extraTurn ? player : player === 1 ? 2 : 1,
      extraTurn,
      capturedCount,
      endPit: idx,
      gameOver,
    };
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getLegalMoves() {
    if (this.gameOver) return [];
    return MancalaEngine.getLegalPits(this.pits, this.currentPlayer).map((pit) => ({ pit }));
  }

  applyMove(move) {
    if (this.gameOver || !move) return { ok: false, reason: '対局は終了しています' };
    const pit = move.pit;
    const legal = MancalaEngine.getLegalPits(this.pits, this.currentPlayer);
    if (!legal.includes(pit)) {
      return { ok: false, reason: 'そのポケットからは選べません' };
    }

    this.undoStack.push({
      pits: [...this.pits],
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      historyLen: this.history.length,
    });

    const actor = this.currentPlayer;
    const sim = MancalaEngine.simulateMove(this.pits, actor, pit);
    this.pits = sim.pits;
    this.currentPlayer = sim.nextPlayer;
    this.lastMove = { pit, endPit: sim.endPit, player: actor };

    const slotNum = actor === 1 ? pit + 1 : pit - 6;
    const tag = sim.extraTurn ? '（連続手番）' : sim.capturedCount > 0 ? `（横取り+${sim.capturedCount}）` : '';
    this.history.push(`${actor === 1 ? '先手' : '後手'} ポケット${slotNum}${tag}`);

    let notice = null;
    if (sim.extraTurn) {
      notice = `${actor === 1 ? '先手' : '後手'}：ストアにピッタリ！もう一度手番です`;
    } else if (sim.capturedCount > 0) {
      notice = `${actor === 1 ? '先手' : '後手'}が向かい側の石を横取り（+${sim.capturedCount}石）！`;
    }

    if (sim.gameOver) {
      this.gameOver = true;
      const s1 = this.pits[6];
      const s2 = this.pits[13];
      const winner = s1 > s2 ? 1 : s2 > s1 ? 2 : 0;
      this.result = {
        winner,
        reason: `先手 ${s1} 石 対 後手 ${s2} 石`,
        details: [`先手ストア: ${s1} 石`, `後手ストア: ${s2} 石`, `総手数: ${this.history.length} 手`],
      };
    }

    return { ok: true, captured: sim.capturedCount > 0, extraTurn: sim.extraTurn, notice };
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.pits = snap.pits;
    this.currentPlayer = snap.currentPlayer;
    this.lastMove = snap.lastMove;
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
      reason: `${player === 1 ? '先手' : '後手'}の投了`,
      details: [`先手ストア: ${this.pits[6]} 石`, `後手ストア: ${this.pits[13]} 石`],
    };
  }

  getState() {
    return {
      pits: [...this.pits],
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      stonesPerPit: this.stonesPerPit,
      gameOver: this.gameOver,
    };
  }
}
