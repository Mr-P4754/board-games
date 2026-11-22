import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const COLS = 'ABCDEFGH';

/**
 * チェッカー（8×8・強制ジャンプ＆連続飛び越し・キング成り対応）エンジン
 */
export class CheckersEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    // 1: Red/Dark (starts bottom rows 5-7, moves up r--), 2: White/Light (starts top rows 0-2, moves down r++)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) this.board[r][c] = { owner: 2, king: false };
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) this.board[r][c] = { owner: 1, king: false };
      }
    }
    this.currentPlayer = 1;
    this.lastMove = null;
    this.noCaptureTurns = 0;
  }

  static inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  static cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  static getMoveDirs(piece) {
    if (piece.king) {
      return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    }
    return piece.owner === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  }

  /**
   * 連続ジャンプを含む全合法手を生成（ジャンプ可能時は強制ジャンプ）
   */
  static generateLegalMovesForBoard(board, player) {
    const jumps = [];
    const normals = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.owner !== player) continue;

        const pieceJumps = CheckersEngine._findJumpChains(board, r, c, piece, [], []);
        if (pieceJumps.length > 0) {
          jumps.push(...pieceJumps);
        } else if (jumps.length === 0) {
          for (const [dr, dc] of CheckersEngine.getMoveDirs(piece)) {
            const nr = r + dr;
            const nc = c + dc;
            if (CheckersEngine.inBounds(nr, nc) && !board[nr][nc]) {
              normals.push({
                from: { r, c },
                to: { r: nr, c: nc },
                path: [{ r: nr, c: nc }],
                captures: [],
              });
            }
          }
        }
      }
    }

    return jumps.length > 0 ? jumps : normals;
  }

  static _findJumpChains(board, r, c, piece, capturesSoFar, pathSoFar) {
    const opp = piece.owner === 1 ? 2 : 1;
    const chains = [];
    const dirs = CheckersEngine.getMoveDirs(piece);

    for (const [dr, dc] of dirs) {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + dr * 2;
      const lc = c + dc * 2;
      if (!CheckersEngine.inBounds(lr, lc)) continue;

      const mid = board[mr][mc];
      if (!mid || mid.owner !== opp || board[lr][lc]) continue;
      if (capturesSoFar.some((cap) => cap.r === mr && cap.c === mc)) continue;

      const nextBoard = CheckersEngine.cloneBoard(board);
      const willKing = !piece.king && ((piece.owner === 1 && lr === 0) || (piece.owner === 2 && lr === 7));
      const movedPiece = { owner: piece.owner, king: piece.king || willKing };
      nextBoard[r][c] = null;
      nextBoard[mr][mc] = null;
      nextBoard[lr][lc] = movedPiece;

      const nextCaptures = [...capturesSoFar, { r: mr, c: mc }];
      const nextPath = [...pathSoFar, { r: lr, c: lc }];

      // In standard Draughts, crowning ends the turn immediately
      const deeper = willKing
        ? []
        : CheckersEngine._findJumpChains(nextBoard, lr, lc, movedPiece, nextCaptures, nextPath);

      if (deeper.length > 0) {
        chains.push(...deeper);
      } else {
        chains.push({
          from: pathSoFar.length === 0 ? { r, c } : null,
          to: { r: lr, c: lc },
          path: nextPath,
          captures: nextCaptures,
        });
      }
    }

    if (pathSoFar.length === 0) {
      for (const ch of chains) {
        ch.from = { r, c };
      }
    }
    return chains;
  }

  static applyMoveToBoard(board, move) {
    const next = CheckersEngine.cloneBoard(board);
    const piece = next[move.from.r][move.from.c];
    next[move.from.r][move.from.c] = null;
    for (const cap of move.captures || []) {
      next[cap.r][cap.c] = null;
    }
    const crowned = !piece.king && ((piece.owner === 1 && move.to.r === 0) || (piece.owner === 2 && move.to.r === 7));
    next[move.to.r][move.to.c] = { owner: piece.owner, king: piece.king || crowned };
    return { board: next, crowned };
  }

  static countPieces(board) {
    let p1 = 0;
    let p2 = 0;
    let k1 = 0;
    let k2 = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (!cell) continue;
        if (cell.owner === 1) {
          p1++;
          if (cell.king) k1++;
        } else {
          p2++;
          if (cell.king) k2++;
        }
      }
    }
    return { p1, p2, k1, k2 };
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getLegalMoves() {
    if (this.gameOver) return [];
    return CheckersEngine.generateLegalMovesForBoard(this.board, this.currentPlayer);
  }

  applyMove(move) {
    if (this.gameOver || !move) return { ok: false, reason: '対局は終了しています' };
    const legal = this.getLegalMoves();
    const matched = legal.find(
      (m) =>
        m.from.r === move.from?.r &&
        m.from.c === move.from?.c &&
        m.to.r === move.to?.r &&
        m.to.c === move.to?.c &&
        m.captures.length === (move.captures?.length ?? m.captures.length)
    );
    if (!matched) {
      return { ok: false, reason: 'ジャンプできる駒がある場合は必ず取る必要があります' };
    }

    this.undoStack.push({
      board: CheckersEngine.cloneBoard(this.board),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? structuredClone(this.lastMove) : null,
      noCaptureTurns: this.noCaptureTurns,
      historyLen: this.history.length,
    });

    const actor = this.currentPlayer;
    const { board: nextBoard, crowned } = CheckersEngine.applyMoveToBoard(this.board, matched);
    this.board = nextBoard;
    this.lastMove = { from: matched.from, to: matched.to, captures: matched.captures };
    this.noCaptureTurns = matched.captures.length > 0 ? 0 : this.noCaptureTurns + 1;

    const fromSq = `${COLS[matched.from.c]}${8 - matched.from.r}`;
    const toSq = `${COLS[matched.to.c]}${8 - matched.to.r}`;
    const sep = matched.captures.length > 0 ? '×' : '→';
    this.history.push(
      `${actor === 1 ? '赤' : '白'} ${fromSq}${sep}${toSq}${matched.captures.length > 1 ? `(${matched.captures.length}連取)` : ''}${crowned ? ' ♛' : ''}`
    );

    const nextPlayer = actor === 1 ? 2 : 1;
    const oppMoves = CheckersEngine.generateLegalMovesForBoard(this.board, nextPlayer);
    const counts = CheckersEngine.countPieces(this.board);

    let notice = null;
    if (crowned) notice = `${actor === 1 ? '赤' : '白'}の駒がキングになりました！`;
    else if (matched.captures.length >= 2) notice = `${matched.captures.length}連続ジャンプ！`;

    if (oppMoves.length === 0 || (nextPlayer === 1 ? counts.p1 === 0 : counts.p2 === 0)) {
      this.gameOver = true;
      this.result = {
        winner: actor,
        reason: `${actor === 1 ? '赤（先手）' : '白（後手）'}の勝利`,
        details: [`残り駒数: 赤 ${counts.p1} / 白 ${counts.p2}`, `総手数: ${this.history.length} 手`],
      };
    } else if (this.noCaptureTurns >= 80) {
      this.gameOver = true;
      this.result = {
        winner: 0,
        reason: '40手連続で駒取りがなく引き分けとなりました',
        details: [`残り駒数: 赤 ${counts.p1} / 白 ${counts.p2}`],
      };
    } else {
      this.currentPlayer = nextPlayer;
    }

    return { ok: true, captured: matched.captures.length > 0, notice };
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.board = snap.board;
    this.currentPlayer = snap.currentPlayer;
    this.lastMove = snap.lastMove;
    this.noCaptureTurns = snap.noCaptureTurns;
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
      reason: `${player === 1 ? '赤（先手）' : '白（後手）'}の投了`,
      details: [`総手数: ${this.history.length} 手`],
    };
  }

  getState() {
    return {
      board: CheckersEngine.cloneBoard(this.board),
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? structuredClone(this.lastMove) : null,
      counts: CheckersEngine.countPieces(this.board),
      gameOver: this.gameOver,
    };
  }
}
