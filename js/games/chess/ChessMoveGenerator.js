const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2],  [1, 2],  [2, -1],  [2, 1],
];
const KING_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

/**
 * チェスの合法手生成・王手判定・状態遷移を担う純粋ロジッククラス
 */
export class ChessMoveGenerator {
  static inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  static cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  static findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === color && p.type === 'K') return { r, c };
      }
    }
    return null;
  }

  static isSquareAttacked(board, r, c, byColor) {
    // Pawn attacks
    const pawnSourceRow = byColor === 1 ? r + 1 : r - 1;
    if (pawnSourceRow >= 0 && pawnSourceRow < 8) {
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (nc >= 0 && nc < 8) {
          const p = board[pawnSourceRow][nc];
          if (p && p.color === byColor && p.type === 'P') return true;
        }
      }
    }

    // Knight attacks
    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const nr = r + dr;
      const nc = c + dc;
      if (ChessMoveGenerator.inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === byColor && p.type === 'N') return true;
      }
    }

    // King attacks
    for (const [dr, dc] of KING_OFFSETS) {
      const nr = r + dr;
      const nc = c + dc;
      if (ChessMoveGenerator.inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === byColor && p.type === 'K') return true;
      }
    }

    // Bishop / Queen diagonals
    for (const [dr, dc] of BISHOP_DIRS) {
      let nr = r + dr;
      let nc = c + dc;
      while (ChessMoveGenerator.inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (p.color === byColor && (p.type === 'B' || p.type === 'Q')) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    // Rook / Queen orthogonals
    for (const [dr, dc] of ROOK_DIRS) {
      let nr = r + dr;
      let nc = c + dc;
      while (ChessMoveGenerator.inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (p.color === byColor && (p.type === 'R' || p.type === 'Q')) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }

  static isInCheck(board, color) {
    const king = ChessMoveGenerator.findKing(board, color);
    if (!king) return false;
    return ChessMoveGenerator.isSquareAttacked(board, king.r, king.c, color === 1 ? 2 : 1);
  }

  static generatePseudoMoves(state, color = state.currentPlayer) {
    const { board, castling, enPassant } = state;
    const opp = color === 1 ? 2 : 1;
    const moves = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p || p.color !== color) continue;

        if (p.type === 'P') {
          const dir = color === 1 ? -1 : 1;
          const startRow = color === 1 ? 6 : 1;
          const promoRow = color === 1 ? 0 : 7;
          const nr = r + dir;

          if (ChessMoveGenerator.inBounds(nr, c) && !board[nr][c]) {
            if (nr === promoRow) {
              for (const promo of ['Q', 'R', 'B', 'N']) {
                moves.push({ from: { r, c }, to: { r: nr, c }, promotion: promo });
              }
            } else {
              moves.push({ from: { r, c }, to: { r: nr, c } });
              const nr2 = r + dir * 2;
              if (r === startRow && !board[nr2][c]) {
                moves.push({ from: { r, c }, to: { r: nr2, c }, isDoublePawn: true });
              }
            }
          }

          for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (!ChessMoveGenerator.inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (target && target.color === opp) {
              if (nr === promoRow) {
                for (const promo of ['Q', 'R', 'B', 'N']) {
                  moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target.type, promotion: promo });
                }
              } else {
                moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target.type });
              }
            } else if (enPassant && enPassant.r === nr && enPassant.c === nc) {
              moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: 'P', isEnPassant: true });
            }
          }
        } else if (p.type === 'N') {
          for (const [dr, dc] of KNIGHT_OFFSETS) {
            const nr = r + dr;
            const nc = c + dc;
            if (!ChessMoveGenerator.inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || target.color === opp) {
              moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target ? target.type : null });
            }
          }
        } else if (p.type === 'B' || p.type === 'R' || p.type === 'Q') {
          const dirs = p.type === 'B' ? BISHOP_DIRS : p.type === 'R' ? ROOK_DIRS : QUEEN_DIRS;
          for (const [dr, dc] of dirs) {
            let nr = r + dr;
            let nc = c + dc;
            while (ChessMoveGenerator.inBounds(nr, nc)) {
              const target = board[nr][nc];
              if (!target) {
                moves.push({ from: { r, c }, to: { r: nr, c: nc } });
              } else {
                if (target.color === opp) {
                  moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target.type });
                }
                break;
              }
              nr += dr;
              nc += dc;
            }
          }
        } else if (p.type === 'K') {
          for (const [dr, dc] of KING_OFFSETS) {
            const nr = r + dr;
            const nc = c + dc;
            if (!ChessMoveGenerator.inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || target.color === opp) {
              moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target ? target.type : null });
            }
          }

          // Castling
          const homeRow = color === 1 ? 7 : 0;
          if (r === homeRow && c === 4 && !ChessMoveGenerator.isSquareAttacked(board, homeRow, 4, opp)) {
            const canK = color === 1 ? castling.wK : castling.bK;
            const canQ = color === 1 ? castling.wQ : castling.bQ;

            if (
              canK &&
              !board[homeRow][5] &&
              !board[homeRow][6] &&
              board[homeRow][7]?.type === 'R' &&
              board[homeRow][7]?.color === color &&
              !ChessMoveGenerator.isSquareAttacked(board, homeRow, 5, opp) &&
              !ChessMoveGenerator.isSquareAttacked(board, homeRow, 6, opp)
            ) {
              moves.push({ from: { r: homeRow, c: 4 }, to: { r: homeRow, c: 6 }, castle: 'K' });
            }

            if (
              canQ &&
              !board[homeRow][3] &&
              !board[homeRow][2] &&
              !board[homeRow][1] &&
              board[homeRow][0]?.type === 'R' &&
              board[homeRow][0]?.color === color &&
              !ChessMoveGenerator.isSquareAttacked(board, homeRow, 3, opp) &&
              !ChessMoveGenerator.isSquareAttacked(board, homeRow, 2, opp)
            ) {
              moves.push({ from: { r: homeRow, c: 4 }, to: { r: homeRow, c: 2 }, castle: 'Q' });
            }
          }
        }
      }
    }

    return moves;
  }

  static applyMoveToState(state, move) {
    const board = ChessMoveGenerator.cloneBoard(state.board);
    const castling = { ...state.castling };
    const actor = state.currentPlayer;
    const opp = actor === 1 ? 2 : 1;
    const piece = board[move.from.r][move.from.c];

    let capturedPiece = board[move.to.r][move.to.c];

    // Move piece
    board[move.from.r][move.from.c] = null;
    board[move.to.r][move.to.c] = move.promotion
      ? { type: move.promotion, color: actor }
      : { ...piece };

    // En passant capture
    if (move.isEnPassant) {
      const capRow = actor === 1 ? move.to.r + 1 : move.to.r - 1;
      capturedPiece = board[capRow][move.to.c];
      board[capRow][move.to.c] = null;
    }

    // Castling rook move
    if (move.castle === 'K') {
      board[move.to.r][5] = board[move.to.r][7];
      board[move.to.r][7] = null;
    } else if (move.castle === 'Q') {
      board[move.to.r][3] = board[move.to.r][0];
      board[move.to.r][0] = null;
    }

    // Update castling rights
    if (piece.type === 'K') {
      if (actor === 1) {
        castling.wK = false;
        castling.wQ = false;
      } else {
        castling.bK = false;
        castling.bQ = false;
      }
    }
    const updateRookRight = (r, c) => {
      if (r === 7 && c === 0) castling.wQ = false;
      if (r === 7 && c === 7) castling.wK = false;
      if (r === 0 && c === 0) castling.bQ = false;
      if (r === 0 && c === 7) castling.bK = false;
    };
    updateRookRight(move.from.r, move.from.c);
    updateRookRight(move.to.r, move.to.c);

    // Next en passant target
    const enPassant = move.isDoublePawn
      ? { r: (move.from.r + move.to.r) / 2, c: move.from.c }
      : null;

    const halfmoveClock =
      piece.type === 'P' || capturedPiece ? 0 : (state.halfmoveClock || 0) + 1;

    return {
      board,
      currentPlayer: opp,
      castling,
      enPassant,
      halfmoveClock,
      capturedPiece,
    };
  }

  static generateLegalMoves(state, color = state.currentPlayer) {
    const pseudo = ChessMoveGenerator.generatePseudoMoves(state, color);
    const legal = [];
    for (const m of pseudo) {
      const next = ChessMoveGenerator.applyMoveToState({ ...state, currentPlayer: color }, m);
      if (!ChessMoveGenerator.isInCheck(next.board, color)) {
        legal.push(m);
      }
    }
    return legal;
  }

  static positionKey(board, currentPlayer, castling, enPassant) {
    let key = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        key += p ? (p.color === 1 ? p.type : p.type.toLowerCase()) : '.';
      }
    }
    const cStr = `${castling.wK ? 'K' : ''}${castling.wQ ? 'Q' : ''}${castling.bK ? 'k' : ''}${castling.bQ ? 'q' : ''}`;
    const epStr = enPassant ? `${enPassant.r}${enPassant.c}` : '-';
    return `${key}|${currentPlayer}|${cStr}|${epStr}`;
  }
}
