const MATERIAL = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

// Piece-Square Tables from White's perspective (row 0 = Black's back rank, row 7 = White's back rank)
const PST = {
  P: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 27, 27, 10,  5,  5],
    [ 0,  0,  0, 24, 24,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  R: [
    [  0,  0,  0,  0,  0,  0,  0,  0],
    [  5, 10, 10, 10, 10, 10, 10,  5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [  0,  0,  0,  5,  5,  0,  0,  0],
  ],
  Q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
};

/**
 * チェス駒の定義・評価テーブル・SVG描画を提供するクラス
 */
export class ChessPiece {
  static valueOf(type) {
    return MATERIAL[type] || 0;
  }

  static pstValue(type, color, r, c) {
    const table = PST[type];
    if (!table) return 0;
    const row = color === 1 ? r : 7 - r;
    return table[row][c];
  }

  static renderSvg(piece) {
    if (!piece) return '';
    const fill = piece.color === 1 ? '#fbf7ee' : '#241f1b';
    const stroke = piece.color === 1 ? '#261e17' : '#d7cbb8';
    const detail = piece.color === 1 ? '#261e17' : '#e6dac5';

    const shapes = {
      K: `
        <path d="M22.5 11.6V6M20 8h5" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0" fill="none" stroke="${detail}" stroke-width="1.4"/>
      `,
      Q: `
        <circle cx="8" cy="14" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
        <circle cx="15" cy="10" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
        <circle cx="22.5" cy="9" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
        <circle cx="30" cy="10" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
        <circle cx="37" cy="14" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
        <path d="M10 28c6.5-1.8 18.5-1.8 25 0l3-12-8.5 7-7-11-7 11L7 16l3 12z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M10 28c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5h22s0-1.5-1.5-2.5c-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-6.5-1.5-18.5-1.5-25 0z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      `,
      R: `
        <path d="M11 39h23v-3H11v3zm2-3v-4h19v4H13zm-1-22V9h4v2.5h4.5V9h4v2.5H29V9h4v5l-3 3H15l-3-3z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M15 17h15v12H15V17zm-2 15l2-3h15l2 3H13z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      `,
      B: `
        <circle cx="22.5" cy="8.5" r="2.4" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>
        <path d="M15 31.5c2.5-1 12.5-1 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M11 38c3.5-1.5 8-1.5 11.5.5 3.5-2 8-2 11.5-.5l-2-3.5c-3.5-1-6.5-1-9.5.5-3-1.5-6-1.5-9.5-.5L11 38z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M19 18h7m-3.5-3.5v7" stroke="${detail}" stroke-width="1.6" stroke-linecap="round"/>
      `,
      N: `
        <path d="M14 38h21v-3H14v3z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M22 10c10.5 1 14 7.5 13 25H16c0-7 7-6.5 7-13.5 0-1.5-2.5-2-4-1.5-2 .6-3.5 2-5.5 2-1.8 0-3-1.5-2.5-3.2.6-2 3-4.5 5-6.8l-1-3.5c2.2 0 4 .8 5 2.2 1-.6 1.5-.7 2-.7z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="17.5" cy="15.5" r="1.2" fill="${detail}"/>
      `,
      P: `
        <path d="M22.5 10a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm-4.5 10c-2 2-3.5 4.5-3.5 7.5 0 2.5 1.5 4.5 3 5.5-3 1.5-5.5 3.2-5.5 6h21c0-2.8-2.5-4.5-5.5-6 1.5-1 3-3 3-5.5 0-3-1.5-5.5-3.5-7.5h-9z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      `,
    };

    return `<svg class="chess-piece" viewBox="0 0 45 45" aria-hidden="true">${shapes[piece.type] || ''}</svg>`;
  }
}
