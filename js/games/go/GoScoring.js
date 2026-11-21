import { GoBoard } from './GoBoard.js';

const ORTHO = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * 囲碁の中国ルール（盤上の石＋囲んだ空点＋コミ7.5目）地合い計算クラス
 */
export class GoScoring {
  static scoreBoard(board, deadStones = new Set(), komi = 7.5) {
    const size = board.length;
    const cleaned = GoBoard.clone(board);
    for (const key of deadStones) {
      const [r, c] = key.split(',').map(Number);
      if (GoBoard.inBounds(size, r, c)) {
        cleaned[r][c] = 0;
      }
    }

    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;
    const territoryMap = Array.from({ length: size }, () => Array(size).fill(0));
    const visited = Array.from({ length: size }, () => Array(size).fill(false));

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleaned[r][c] === 1) blackStones++;
        else if (cleaned[r][c] === 2) whiteStones++;
      }
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleaned[r][c] !== 0 || visited[r][c]) continue;
        const region = [];
        const stack = [[r, c]];
        visited[r][c] = true;
        let touchesBlack = false;
        let touchesWhite = false;

        while (stack.length > 0) {
          const [cr, cc] = stack.pop();
          region.push([cr, cc]);
          for (const [dr, dc] of ORTHO) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (!GoBoard.inBounds(size, nr, nc)) continue;
            const val = cleaned[nr][nc];
            if (val === 1) touchesBlack = true;
            else if (val === 2) touchesWhite = true;
            else if (!visited[nr][nc]) {
              visited[nr][nc] = true;
              stack.push([nr, nc]);
            }
          }
        }

        if (touchesBlack && !touchesWhite) {
          blackTerritory += region.length;
          for (const [rr, cc] of region) territoryMap[rr][cc] = 1;
        } else if (touchesWhite && !touchesBlack) {
          whiteTerritory += region.length;
          for (const [rr, cc] of region) territoryMap[rr][cc] = 2;
        }
      }
    }

    const blackTotal = blackStones + blackTerritory;
    const whiteTotal = whiteStones + whiteTerritory + komi;
    const winner = blackTotal > whiteTotal ? 1 : whiteTotal > blackTotal ? 2 : 0;
    const margin = Math.abs(blackTotal - whiteTotal);

    return {
      blackStones,
      blackTerritory,
      blackTotal,
      whiteStones,
      whiteTerritory,
      komi,
      whiteTotal,
      winner,
      margin,
      territoryMap,
    };
  }
}
