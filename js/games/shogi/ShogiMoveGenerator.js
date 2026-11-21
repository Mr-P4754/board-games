import { ShogiPiece } from './ShogiPiece.js';

/**
 * 将棋の合法手生成（成り・打ち駒・二歩・打ち歩詰め・王手放置除外）を担うクラス
 */
export class ShogiMoveGenerator {
  static inBounds(r, c) {
    return r >= 0 && r < 9 && c >= 0 && c < 9;
  }

  static cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  static cloneHands(hands) {
    return {
      1: { ...hands[1] },
      2: { ...hands[2] },
    };
  }

  static findKing(board, owner) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (p && p.owner === owner && p.type === 'OU') return { r, c };
      }
    }
    return null;
  }

  static isSquareAttacked(board, targetR, targetC, byOwner) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (!p || p.owner !== byOwner) continue;
        const spec = ShogiPiece.getMovesSpec(p.type, byOwner);

        for (const [dr, dc] of spec.steps) {
          if (r + dr === targetR && c + dc === targetC) return true;
        }
        for (const [dr, dc] of spec.slides) {
          let nr = r + dr;
          let nc = c + dc;
          while (ShogiMoveGenerator.inBounds(nr, nc)) {
            if (nr === targetR && nc === targetC) return true;
            if (board[nr][nc]) break;
            nr += dr;
            nc += dc;
          }
        }
      }
    }
    return false;
  }

  static isInCheck(board, owner) {
    const king = ShogiMoveGenerator.findKing(board, owner);
    if (!king) return false;
    return ShogiMoveGenerator.isSquareAttacked(board, king.r, king.c, owner === 1 ? 2 : 1);
  }

  static isPromoZone(r, owner) {
    return owner === 1 ? r <= 2 : r >= 6;
  }

  static mustPromote(type, r, owner) {
    if (type === 'FU' || type === 'KY') {
      return owner === 1 ? r === 0 : r === 8;
    }
    if (type === 'KE') {
      return owner === 1 ? r <= 1 : r >= 7;
    }
    return false;
  }

  static applyMoveToState(state, move) {
    const board = ShogiMoveGenerator.cloneBoard(state.board);
    const hands = ShogiMoveGenerator.cloneHands(state.hands);
    const actor = state.currentPlayer;
    const opp = actor === 1 ? 2 : 1;
    let captured = null;

    if (move.drop) {
      board[move.to.r][move.to.c] = { type: move.drop, owner: actor };
      hands[actor][move.drop] = Math.max(0, (hands[actor][move.drop] || 0) - 1);
    } else {
      const piece = board[move.from.r][move.from.c];
      const target = board[move.to.r][move.to.c];
      if (target) {
        captured = target.type;
        const base = ShogiPiece.demote(target.type);
        if (base !== 'OU') {
          hands[actor][base] = (hands[actor][base] || 0) + 1;
        }
      }
      const nextType = move.promote ? ShogiPiece.promote(piece.type) : piece.type;
      board[move.from.r][move.from.c] = null;
      board[move.to.r][move.to.c] = { type: nextType, owner: actor };
    }

    return {
      board,
      hands,
      currentPlayer: opp,
      captured,
    };
  }

  static _hasUnpromotedPawnOnFile(board, col, owner) {
    for (let r = 0; r < 9; r++) {
      const p = board[r][cOr(col)];
      if (p && p.owner === owner && p.type === 'FU') return true;
    }
    return false;
  }

  static generateLegalMoves(state, owner = state.currentPlayer, checkUchifuzume = true) {
    const { board, hands } = state;
    const opp = owner === 1 ? 2 : 1;
    const legal = [];

    // 1. Board piece moves
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (!p || p.owner !== owner) continue;
        const spec = ShogiPiece.getMovesSpec(p.type, owner);
        const dests = [];

        for (const [dr, dc] of spec.steps) {
          const nr = r + dr;
          const nc = c + dc;
          if (!ShogiMoveGenerator.inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target || target.owner === opp) dests.push([nr, nc, target]);
        }

        for (const [dr, dc] of spec.slides) {
          let nr = r + dr;
          let nc = c + dc;
          while (ShogiMoveGenerator.inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              dests.push([nr, nc, null]);
            } else {
              if (target.owner === opp) dests.push([nr, nc, target]);
              break;
            }
            nr += dr;
            nc += dc;
          }
        }

        for (const [nr, nc, target] of dests) {
          const canProm =
            ShogiPiece.canPromote(p.type) &&
            (ShogiMoveGenerator.isPromoZone(r, owner) || ShogiMoveGenerator.isPromoZone(nr, owner));
          const forcedProm = ShogiMoveGenerator.mustPromote(p.type, nr, owner);

          const variants = [];
          if (canProm) variants.push(true);
          if (!forcedProm) variants.push(false);

          for (const promote of variants) {
            const move = {
              from: { r, c },
              to: { r: nr, c: nc },
              promote,
              piece: p.type,
              capture: target ? target.type : null,
            };
            const next = ShogiMoveGenerator.applyMoveToState({ board, hands, currentPlayer: owner }, move);
            if (!ShogiMoveGenerator.isInCheck(next.board, owner)) {
              legal.push(move);
            }
          }
        }
      }
    }

    // 2. Drop moves from Komadai
    const myHand = hands[owner] || {};
    for (const type of ShogiPiece.HAND_ORDER) {
      if (!myHand[type] || myHand[type] <= 0) continue;

      for (let c = 0; c < 9; c++) {
        // Nifu (two pawns on same file)
        if (type === 'FU' && ShogiMoveGenerator._hasUnpromotedPawnOnFile(board, c, owner)) {
          continue;
        }
        for (let r = 0; r < 9; r++) {
          if (board[r][c]) continue;
          // Cannot drop where piece has no further moves
          if (ShogiMoveGenerator.mustPromote(type, r, owner)) continue;

          const move = { drop: type, to: { r, c }, promote: false };
          const next = ShogiMoveGenerator.applyMoveToState({ board, hands, currentPlayer: owner }, move);
          if (ShogiMoveGenerator.isInCheck(next.board, owner)) continue;

          // Uchifuzume (drop-pawn checkmate) check
          if (checkUchifuzume && type === 'FU' && ShogiMoveGenerator.isInCheck(next.board, opp)) {
            const oppReplies = ShogiMoveGenerator.generateLegalMoves(next, opp, false);
            if (oppReplies.length === 0) continue;
          }

          legal.push(move);
        }
      }
    }

    return legal;
  }

  static positionKey(board, hands, currentPlayer) {
    let key = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        key += p ? `${p.owner}${p.type}` : '..';
      }
    }
    const h1 = ShogiPiece.HAND_ORDER.map((t) => hands[1][t] || 0).join(',');
    const h2 = ShogiPiece.HAND_ORDER.map((t) => hands[2][t] || 0).join(',');
    return `${key}|${h1}|${h2}|${currentPlayer}`;
  }
}

function cOr(col) {
  return col;
}
