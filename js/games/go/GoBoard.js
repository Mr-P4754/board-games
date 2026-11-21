const ORTHO = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const DIAG = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

/**
 * 囲碁盤の連・呼吸点・打ち上げ・自殺手・コウ・眼判定を行う純粋クラス
 */
export class GoBoard {
  static createEmpty(size = 9) {
    return Array.from({ length: size }, () => Array(size).fill(0));
  }

  static clone(board) {
    return board.map((row) => [...row]);
  }

  static hash(board) {
    return board.map((row) => row.join('')).join('/');
  }

  static inBounds(size, r, c) {
    return r >= 0 && r < size && c >= 0 && c < size;
  }

  static getGroupAndLiberties(board, startR, startC) {
    const size = board.length;
    const color = board[startR][startC];
    if (color === 0) return { stones: [], liberties: new Set() };

    const visited = new Set([startR * size + startC]);
    const stack = [[startR, startC]];
    const stones = [];
    const liberties = new Set();

    while (stack.length > 0) {
      const [r, c] = stack.pop();
      stones.push([r, c]);

      for (const [dr, dc] of ORTHO) {
        const nr = r + dr;
        const nc = c + dc;
        if (!GoBoard.inBounds(size, nr, nc)) continue;
        const key = nr * size + nc;
        const val = board[nr][nc];
        if (val === 0) {
          liberties.add(key);
        } else if (val === color && !visited.has(key)) {
          visited.add(key);
          stack.push([nr, nc]);
        }
      }
    }

    return { stones, liberties };
  }

  /**
   * (r, c) に player が着手可能か検証し、新盤面と打ち上げ石数を返す
   */
  static tryPlace(board, r, c, player, koHash = null) {
    const size = board.length;
    if (!GoBoard.inBounds(size, r, c) || board[r][c] !== 0) {
      return { ok: false, reason: 'その交点には打てません' };
    }

    const next = GoBoard.clone(board);
    const opp = player === 1 ? 2 : 1;
    next[r][c] = player;

    let capturedCount = 0;
    let lastCapturedPos = null;

    for (const [dr, dc] of ORTHO) {
      const nr = r + dr;
      const nc = c + dc;
      if (!GoBoard.inBounds(size, nr, nc) || next[nr][nc] !== opp) continue;
      const group = GoBoard.getGroupAndLiberties(next, nr, nc);
      if (group.liberties.size === 0) {
        for (const [sr, sc] of group.stones) {
          next[sr][sc] = 0;
          capturedCount++;
          lastCapturedPos = [sr, sc];
        }
      }
    }

    // Suicide check
    const ownGroup = GoBoard.getGroupAndLiberties(next, r, c);
    if (ownGroup.liberties.size === 0) {
      return { ok: false, reason: '自殺手は打てません' };
    }

    // Simple Ko check
    const nextHash = GoBoard.hash(next);
    if (koHash && nextHash === koHash) {
      return { ok: false, reason: 'コウの即時取り返しは禁止されています' };
    }

    // If a single stone captured a single stone and now has 1 liberty, record previous board as Ko hash
    const nextKoHash =
      capturedCount === 1 && ownGroup.stones.length === 1 && ownGroup.liberties.size === 1 && lastCapturedPos
        ? GoBoard.hash(board)
        : null;

    return { ok: true, board: next, capturedCount, nextKoHash };
  }

  /**
   * 自分の明確な眼（埋めるべきでない空点）かどうかを簡易判定
   */
  static isTrueEye(board, r, c, player) {
    const size = board.length;
    if (board[r][c] !== 0) return false;

    for (const [dr, dc] of ORTHO) {
      const nr = r + dr;
      const nc = c + dc;
      if (GoBoard.inBounds(size, nr, nc) && board[nr][nc] !== player) {
        return false;
      }
    }

    const opp = player === 1 ? 2 : 1;
    let oppDiag = 0;
    let onEdge = false;
    for (const [dr, dc] of DIAG) {
      const nr = r + dr;
      const nc = c + dc;
      if (!GoBoard.inBounds(size, nr, nc)) {
        onEdge = true;
      } else if (board[nr][nc] === opp) {
        oppDiag++;
      }
    }
    return onEdge ? oppDiag === 0 : oppDiag <= 1;
  }
}
