import { BaseGameEngine } from '../../core/BaseGameEngine.js';
import { ShogiPiece } from './ShogiPiece.js';
import { ShogiMoveGenerator } from './ShogiMoveGenerator.js';

const FILES_JP = ['９', '８', '７', '６', '５', '４', '３', '２', '１'];
const RANKS_JP = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

/**
 * 本将棋（9×9）の対局状態エンジン
 */
export class ShogiEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.board = this._initialBoard();
    this.hands = {
      1: { HI: 0, KA: 0, KI: 0, GI: 0, KE: 0, KY: 0, FU: 0 },
      2: { HI: 0, KA: 0, KI: 0, GI: 0, KE: 0, KY: 0, FU: 0 },
    };
    this.currentPlayer = 1; // 1: Sente (▲), 2: Gote (△)
    this.lastMove = null;
    this.positionHistory = [];
    this._recordPosition(false);
  }

  _initialBoard() {
    const b = Array.from({ length: 9 }, () => Array(9).fill(null));
    const back = ['KY', 'KE', 'GI', 'KI', 'OU', 'KI', 'GI', 'KE', 'KY'];
    for (let c = 0; c < 9; c++) {
      b[0][c] = { type: back[c], owner: 2 };
      b[2][c] = { type: 'FU', owner: 2 };
      b[6][c] = { type: 'FU', owner: 1 };
      b[8][c] = { type: back[c], owner: 1 };
    }
    b[1][1] = { type: 'HI', owner: 2 };
    b[1][7] = { type: 'KA', owner: 2 };
    b[7][1] = { type: 'KA', owner: 1 };
    b[7][7] = { type: 'HI', owner: 1 };
    return b;
  }

  _coreState() {
    return {
      board: this.board,
      hands: this.hands,
      currentPlayer: this.currentPlayer,
    };
  }

  _recordPosition(isCheck) {
    const key = ShogiMoveGenerator.positionKey(this.board, this.hands, this.currentPlayer);
    this.positionHistory.push({ key, isCheck, player: this.currentPlayer });
    return this.positionHistory.filter((entry) => entry.key === key);
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getLegalMoves() {
    if (this.gameOver) return [];
    return ShogiMoveGenerator.generateLegalMoves(this._coreState(), this.currentPlayer);
  }

  applyMove(move) {
    if (this.gameOver || !move) return { ok: false, reason: '対局は終了しています' };
    const legal = this.getLegalMoves();
    const matched = legal.find((m) => {
      if (move.drop) {
        return m.drop === move.drop && m.to.r === move.to.r && m.to.c === move.to.c;
      }
      return (
        !m.drop &&
        m.from.r === move.from?.r &&
        m.from.c === move.from?.c &&
        m.to.r === move.to.r &&
        m.to.c === move.to.c &&
        Boolean(m.promote) === Boolean(move.promote)
      );
    });

    if (!matched) {
      return { ok: false, reason: 'その手は反則または移動不可です' };
    }

    this.undoStack.push({
      board: ShogiMoveGenerator.cloneBoard(this.board),
      hands: ShogiMoveGenerator.cloneHands(this.hands),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? structuredClone(this.lastMove) : null,
      positionHistoryLen: this.positionHistory.length,
      historyLen: this.history.length,
    });

    const actor = this.currentPlayer;
    const movingType = matched.drop || this.board[matched.from.r][matched.from.c].type;
    const next = ShogiMoveGenerator.applyMoveToState(this._coreState(), matched);

    this.board = next.board;
    this.hands = next.hands;
    this.currentPlayer = next.currentPlayer;
    this.lastMove = matched.drop
      ? { drop: matched.drop, to: matched.to }
      : { from: matched.from, to: matched.to };

    const oppInCheck = ShogiMoveGenerator.isInCheck(this.board, this.currentPlayer);
    const reps = this._recordPosition(oppInCheck);
    const oppMoves = ShogiMoveGenerator.generateLegalMoves(this._coreState(), this.currentPlayer);

    const kifu = this._formatKifu(actor, movingType, matched);
    this.history.push(kifu);

    let notice = null;
    if (oppMoves.length === 0) {
      this.gameOver = true;
      this.result = {
        winner: actor,
        reason: `詰み！（${actor === 1 ? '先手' : '後手'}の勝利）`,
        details: [`総手数: ${this.history.length} 手`],
      };
    } else if (reps.length >= 4) {
      this.gameOver = true;
      // Check perpetual check: all intervening moves by actor gave check
      const firstIdx = this.positionHistory.findIndex((e) => e.key === reps[0].key);
      const cycle = this.positionHistory.slice(firstIdx + 1);
      const perpetualByActor =
        cycle.length > 0 &&
        cycle.filter((e) => e.player === this.currentPlayer).every((e) => e.isCheck);

      if (perpetualByActor) {
        this.result = {
          winner: this.currentPlayer,
          reason: `連続王手の千日手により${actor === 1 ? '先手' : '後手'}の反則負け`,
          details: [`総手数: ${this.history.length} 手`],
        };
      } else {
        this.result = {
          winner: 0,
          reason: '千日手により引き分け',
          details: [`総手数: ${this.history.length} 手`],
        };
      }
    } else if (oppInCheck) {
      notice = '王手！';
    }

    return { ok: true, captured: Boolean(next.captured), notice };
  }

  _formatKifu(actor, type, move) {
    const mark = actor === 1 ? '▲' : '△';
    const sq = `${FILES_JP[move.to.c]}${RANKS_JP[move.to.r]}`;
    const name = ShogiPiece.label(type, actor);
    const suffix = move.drop ? '打' : move.promote ? '成' : '';
    return `${mark}${sq}${name}${suffix}`;
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.hands = snap.hands;
    this.currentPlayer = snap.currentPlayer;
    this.lastMove = snap.lastMove;
    this.positionHistory.length = snap.positionHistoryLen;
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
      details: [`総手数: ${this.history.length} 手`],
    };
  }

  getState() {
    return {
      board: ShogiMoveGenerator.cloneBoard(this.board),
      hands: ShogiMoveGenerator.cloneHands(this.hands),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? structuredClone(this.lastMove) : null,
      inCheck: ShogiMoveGenerator.isInCheck(this.board, this.currentPlayer),
      gameOver: this.gameOver,
    };
  }
}
