import { BaseGameEngine } from '../../core/BaseGameEngine.js';
import { ChessMoveGenerator } from './ChessMoveGenerator.js';

const FILES = 'abcdefgh';

/**
 * チェス（国際ルール完全対応）の対局状態エンジン
 */
export class ChessEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.board = this._initialBoard();
    this.currentPlayer = 1; // 1: White, 2: Black
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassant = null;
    this.halfmoveClock = 0;
    this.captured = { 1: [], 2: [] };
    this.lastMove = null;
    this.positionCounts = new Map();
    this._recordPosition();
  }

  _initialBoard() {
    const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: back[c], color: 2 };
      board[1][c] = { type: 'P', color: 2 };
      board[6][c] = { type: 'P', color: 1 };
      board[7][c] = { type: back[c], color: 1 };
    }
    return board;
  }

  _recordPosition() {
    const key = ChessMoveGenerator.positionKey(
      this.board,
      this.currentPlayer,
      this.castling,
      this.enPassant
    );
    this.positionCounts.set(key, (this.positionCounts.get(key) || 0) + 1);
    return this.positionCounts.get(key);
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getLegalMoves() {
    if (this.gameOver) return [];
    return ChessMoveGenerator.generateLegalMoves(this._coreState());
  }

  _coreState() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      castling: this.castling,
      enPassant: this.enPassant,
      halfmoveClock: this.halfmoveClock,
    };
  }

  applyMove(move) {
    if (this.gameOver || !move) return { ok: false, reason: '対局は終了しています' };
    const legal = this.getLegalMoves();
    const matched = legal.find(
      (m) =>
        m.from.r === move.from.r &&
        m.from.c === move.from.c &&
        m.to.r === move.to.r &&
        m.to.c === move.to.c &&
        (m.promotion || null) === (move.promotion || (m.promotion ? 'Q' : null))
    );
    if (!matched) {
      return { ok: false, reason: '不正な手です' };
    }

    this.undoStack.push({
      board: ChessMoveGenerator.cloneBoard(this.board),
      currentPlayer: this.currentPlayer,
      castling: { ...this.castling },
      enPassant: this.enPassant ? { ...this.enPassant } : null,
      halfmoveClock: this.halfmoveClock,
      captured: { 1: [...this.captured[1]], 2: [...this.captured[2]] },
      lastMove: this.lastMove ? structuredClone(this.lastMove) : null,
      positionCounts: new Map(this.positionCounts),
      historyLen: this.history.length,
    });

    const actor = this.currentPlayer;
    const movingPiece = this.board[matched.from.r][matched.from.c];
    const next = ChessMoveGenerator.applyMoveToState(this._coreState(), matched);

    this.board = next.board;
    this.currentPlayer = next.currentPlayer;
    this.castling = next.castling;
    this.enPassant = next.enPassant;
    this.halfmoveClock = next.halfmoveClock;
    if (next.capturedPiece) {
      this.captured[actor].push(next.capturedPiece);
    }
    this.lastMove = { from: matched.from, to: matched.to };

    const repCount = this._recordPosition();
    const oppInCheck = ChessMoveGenerator.isInCheck(this.board, this.currentPlayer);
    const oppMoves = ChessMoveGenerator.generateLegalMoves(this._coreState());

    const notation = this._formatNotation(movingPiece, matched, next.capturedPiece, oppInCheck, oppMoves.length === 0);
    this.history.push(`${actor === 1 ? '白' : '黒'} ${notation}`);

    let notice = null;
    if (oppMoves.length === 0) {
      this.gameOver = true;
      if (oppInCheck) {
        this.result = {
          winner: actor,
          reason: `チェックメイト！（${actor === 1 ? '白' : '黒'}の勝利）`,
          details: [`総手数: ${this.history.length} 手`],
        };
      } else {
        this.result = {
          winner: 0,
          reason: 'ステイルメイトにより引き分け',
          details: [`総手数: ${this.history.length} 手`],
        };
      }
    } else if (this.halfmoveClock >= 100) {
      this.gameOver = true;
      this.result = {
        winner: 0,
        reason: '50手ルールにより引き分け',
        details: [`総手数: ${this.history.length} 手`],
      };
    } else if (repCount >= 3) {
      this.gameOver = true;
      this.result = {
        winner: 0,
        reason: '同形3回（スリーフォールド・レペティション）により引き分け',
        details: [`総手数: ${this.history.length} 手`],
      };
    } else if (this._isInsufficientMaterial()) {
      this.gameOver = true;
      this.result = {
        winner: 0,
        reason: '戦力不足により引き分け',
        details: [`総手数: ${this.history.length} 手`],
      };
    } else if (oppInCheck) {
      notice = 'チェック！';
    }

    return { ok: true, captured: Boolean(next.capturedPiece), notice };
  }

  _formatNotation(piece, move, captured, isCheck, isMate) {
    if (move.castle === 'K') return `O-O${isMate ? '#' : isCheck ? '+' : ''}`;
    if (move.castle === 'Q') return `O-O-O${isMate ? '#' : isCheck ? '+' : ''}`;
    const toSq = `${FILES[move.to.c]}${8 - move.to.r}`;
    const prefix = piece.type === 'P' ? (captured ? FILES[move.from.c] : '') : piece.type;
    const cap = captured ? 'x' : '';
    const promo = move.promotion ? `=${move.promotion}` : '';
    const suffix = isMate ? '#' : isCheck ? '+' : '';
    return `${prefix}${cap}${toSq}${promo}${suffix}`;
  }

  _isInsufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type !== 'K') {
          pieces.push({ ...p, sqColor: (r + c) % 2 });
        }
      }
    }
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && (pieces[0].type === 'N' || pieces[0].type === 'B')) return true;
    if (
      pieces.length === 2 &&
      pieces[0].type === 'B' &&
      pieces[1].type === 'B' &&
      pieces[0].color !== pieces[1].color &&
      pieces[0].sqColor === pieces[1].sqColor
    ) {
      return true;
    }
    return false;
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.currentPlayer = snap.currentPlayer;
    this.castling = snap.castling;
    this.enPassant = snap.enPassant;
    this.halfmoveClock = snap.halfmoveClock;
    this.captured = snap.captured;
    this.lastMove = snap.lastMove;
    this.positionCounts = snap.positionCounts;
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
      reason: `${player === 1 ? '白' : '黒'}の投了`,
      details: [`総手数: ${this.history.length} 手`],
    };
  }

  getState() {
    const inCheck = ChessMoveGenerator.isInCheck(this.board, this.currentPlayer);
    return {
      board: ChessMoveGenerator.cloneBoard(this.board),
      currentPlayer: this.currentPlayer,
      castling: { ...this.castling },
      enPassant: this.enPassant ? { ...this.enPassant } : null,
      halfmoveClock: this.halfmoveClock,
      captured: { 1: [...this.captured[1]], 2: [...this.captured[2]] },
      lastMove: this.lastMove ? structuredClone(this.lastMove) : null,
      inCheck,
      gameOver: this.gameOver,
    };
  }
}
