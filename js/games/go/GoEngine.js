import { BaseGameEngine } from '../../core/BaseGameEngine.js';
import { GoBoard } from './GoBoard.js';
import { GoScoring } from './GoScoring.js';

const COLS = 'ABCDEFGHJKLMNOPQRST';

/**
 * 囲碁（9路・13路・19路盤、中国ルール・死石合意フェーズ対応）エンジン
 */
export class GoEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    const sz = Number(this.options.boardSize) || 9;
    this.size = [9, 13, 19].includes(sz) ? sz : 9;
    this.komi = 7.5;
    this.board = GoBoard.createEmpty(this.size);
    this.currentPlayer = 1; // 1: Black, 2: White
    this.koHash = null;
    this.captures = { 1: 0, 2: 0 };
    this.consecutivePasses = 0;
    this.phase = 'play'; // 'play' | 'scoring'
    this.deadStones = new Set();
    this.lastMove = null;
    this.moveCount = 0;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getLegalMoves() {
    if (this.gameOver || this.phase !== 'play') return [];
    const moves = [{ type: 'pass' }];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] !== 0) continue;
        const test = GoBoard.tryPlace(this.board, r, c, this.currentPlayer, this.koHash);
        if (test.ok) moves.push({ type: 'place', r, c });
      }
    }
    return moves;
  }

  applyMove(move) {
    if (this.gameOver || !move) return { ok: false, reason: '対局は終了しています' };

    if (this.phase === 'scoring') {
      if (move.type === 'toggleDead') {
        const { r, c } = move;
        if (this.board[r]?.[c] === 0) return { ok: false };
        const group = GoBoard.getGroupAndLiberties(this.board, r, c);
        const firstKey = `${r},${c}`;
        const markDead = !this.deadStones.has(firstKey);
        for (const [sr, sc] of group.stones) {
          const k = `${sr},${sc}`;
          if (markDead) this.deadStones.add(k);
          else this.deadStones.delete(k);
        }
        return { ok: true };
      }
      if (move.type === 'resumePlay') {
        this.phase = 'play';
        this.consecutivePasses = 0;
        this.deadStones.clear();
        return { ok: true, notice: '対局を再開しました' };
      }
      if (move.type === 'confirmScore') {
        this._finalizeScore();
        return { ok: true };
      }
      return { ok: false };
    }

    const actor = this.currentPlayer;
    const actorLabel = actor === 1 ? '黒' : '白';

    if (move.type === 'pass') {
      this._pushUndo();
      this.consecutivePasses += 1;
      this.koHash = null;
      this.lastMove = { type: 'pass', player: actor };
      this.moveCount += 1;
      this.history.push(`${actorLabel} パス`);

      if (this.consecutivePasses >= 2) {
        this.phase = 'scoring';
        return {
          ok: true,
          notice: '連続パスにより終局フェーズへ移行しました。死石を確認して確定してください。',
        };
      }
      this.currentPlayer = actor === 1 ? 2 : 1;
      return { ok: true, notice: `${actorLabel}がパスしました` };
    }

    const r = move.r;
    const c = move.c;
    const placed = GoBoard.tryPlace(this.board, r, c, actor, this.koHash);
    if (!placed.ok) {
      return { ok: false, reason: placed.reason };
    }

    this._pushUndo();
    this.board = placed.board;
    this.koHash = placed.nextKoHash;
    this.captures[actor] += placed.capturedCount;
    this.consecutivePasses = 0;
    this.lastMove = { type: 'place', r, c, player: actor };
    this.moveCount += 1;
    this.history.push(
      `${actorLabel} ${COLS[c]}${this.size - r}${placed.capturedCount > 0 ? `（+${placed.capturedCount}）` : ''}`
    );
    this.currentPlayer = actor === 1 ? 2 : 1;

    return { ok: true, capturedCount: placed.capturedCount };
  }

  _pushUndo() {
    this.undoStack.push({
      board: GoBoard.clone(this.board),
      currentPlayer: this.currentPlayer,
      koHash: this.koHash,
      captures: { ...this.captures },
      consecutivePasses: this.consecutivePasses,
      phase: this.phase,
      deadStones: new Set(this.deadStones),
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      moveCount: this.moveCount,
      historyLen: this.history.length,
    });
  }

  _finalizeScore() {
    const score = GoScoring.scoreBoard(this.board, this.deadStones, this.komi);
    this.gameOver = true;
    this.result = {
      winner: score.winner,
      reason:
        score.winner === 0
          ? '引き分け（持碁）'
          : `${score.winner === 1 ? '黒' : '白'}の ${score.margin} 目勝ち`,
      details: [
        `黒: 盤上 ${score.blackStones} + 地 ${score.blackTerritory} = ${score.blackTotal} 目`,
        `白: 盤上 ${score.whiteStones} + 地 ${score.whiteTerritory} + コミ ${score.komi} = ${score.whiteTotal} 目`,
        `ルール: 中国ルール（${this.size}路盤）`,
      ],
    };
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.currentPlayer = snap.currentPlayer;
    this.koHash = snap.koHash;
    this.captures = snap.captures;
    this.consecutivePasses = snap.consecutivePasses;
    this.phase = snap.phase;
    this.deadStones = snap.deadStones;
    this.lastMove = snap.lastMove;
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
      reason: `${player === 1 ? '黒' : '白'}の中押し負け（投了）`,
      details: [`総手数: ${this.moveCount} 手`],
    };
  }

  getState() {
    const scorePreview =
      this.phase === 'scoring' || this.gameOver
        ? GoScoring.scoreBoard(this.board, this.deadStones, this.komi)
        : null;
    return {
      size: this.size,
      komi: this.komi,
      board: GoBoard.clone(this.board),
      currentPlayer: this.currentPlayer,
      koHash: this.koHash,
      captures: { ...this.captures },
      consecutivePasses: this.consecutivePasses,
      phase: this.phase,
      deadStones: [...this.deadStones],
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      moveCount: this.moveCount,
      scorePreview,
      gameOver: this.gameOver,
    };
  }
}
