const KANJI_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HONOR_LABELS = ['東', '南', '西', '北', '白', '發', '中'];
const GREEN_TYPES = new Set([19, 20, 21, 23, 25, 32]); // 2s,3s,4s,6s,8s,Hatsu

const PIN_POSITIONS = {
  1: [[22, 31, 10]],
  2: [[22, 18, 6.2], [22, 44, 6.2]],
  3: [[13, 16, 5.2], [22, 31, 5.2], [31, 46, 5.2]],
  4: [[14, 18, 5.5], [30, 18, 5.5], [14, 44, 5.5], [30, 44, 5.5]],
  5: [[13, 16, 5], [31, 16, 5], [22, 31, 5], [13, 46, 5], [31, 46, 5]],
  6: [[14, 14, 4.8], [30, 14, 4.8], [14, 34, 4.8], [30, 34, 4.8], [14, 48, 4.8], [30, 48, 4.8]],
  7: [[12, 13, 4.4], [22, 17, 4.4], [32, 21, 4.4], [14, 36, 4.4], [30, 36, 4.4], [14, 49, 4.4], [30, 49, 4.4]],
  8: [[14, 13, 4.4], [30, 13, 4.4], [14, 25, 4.4], [30, 25, 4.4], [14, 37, 4.4], [30, 37, 4.4], [14, 49, 4.4], [30, 49, 4.4]],
  9: [[11, 14, 4.2], [22, 14, 4.2], [33, 14, 4.2], [11, 31, 4.2], [22, 31, 4.2], [33, 31, 4.2], [11, 48, 4.2], [22, 48, 4.2], [33, 48, 4.2]],
};

/**
 * 麻雀牌（34種・136枚・赤ドラ対応）の定義・ユーティリティ・SVG描画クラス
 */
export class MahjongTile {
  static createWall(redDora = true) {
    const wall = [];
    let id = 0;
    for (let type = 0; type < 34; type++) {
      for (let copy = 0; copy < 4; copy++) {
        const isRed = redDora && copy === 0 && (type === 4 || type === 13 || type === 22);
        wall.push({ id: id++, type, isRed });
      }
    }
    for (let i = wall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = wall[i];
      wall[i] = wall[j];
      wall[j] = tmp;
    }
    return wall;
  }

  static suitOf(type) {
    if (type < 9) return 0; // Manzu
    if (type < 18) return 1; // Pinzu
    if (type < 27) return 2; // Souzu
    return 3; // Honors
  }

  static numberOf(type) {
    return type < 27 ? (type % 9) + 1 : 0;
  }

  static isHonor(type) {
    return type >= 27;
  }

  static isTerminal(type) {
    if (type >= 27) return false;
    const n = type % 9;
    return n === 0 || n === 8;
  }

  static isYaochu(type) {
    return type >= 27 || type % 9 === 0 || type % 9 === 8;
  }

  static isSimple(type) {
    return type < 27 && type % 9 >= 1 && type % 9 <= 7;
  }

  static isGreen(type) {
    return GREEN_TYPES.has(type);
  }

  static doraFromIndicator(indType) {
    if (indType < 27) {
      const base = Math.floor(indType / 9) * 9;
      return base + ((indType - base + 1) % 9);
    }
    if (indType <= 30) {
      return 27 + ((indType - 27 + 1) % 4);
    }
    return 31 + ((indType - 31 + 1) % 3);
  }

  static labelOf(type) {
    if (type < 9) return `${type + 1}萬`;
    if (type < 18) return `${type - 8}筒`;
    if (type < 27) return `${type - 17}索`;
    return HONOR_LABELS[type - 27] || '?';
  }

  static sortTiles(tiles) {
    return [...tiles].sort((a, b) => a.type - b.type || (b.isRed ? 1 : 0) - (a.isRed ? 1 : 0) || a.id - b.id);
  }

  static toCounts(tiles) {
    const counts = new Int8Array(34);
    for (const t of tiles) {
      counts[typeof t === 'number' ? t : t.type]++;
    }
    return counts;
  }

  static renderSvg(type, isRed = false) {
    const suit = MahjongTile.suitOf(type);
    const num = MahjongTile.numberOf(type);

    if (suit === 0) {
      const ink = isRed ? '#c62820' : '#1f1a15';
      return `
        <svg viewBox="0 0 44 62" aria-hidden="true">
          <text x="22" y="27" text-anchor="middle" font-size="21" font-weight="800" fill="${ink}" font-family="Shippori Mincho, serif">${KANJI_NUMS[num - 1]}</text>
          <text x="22" y="51" text-anchor="middle" font-size="21" font-weight="800" fill="#a8241d" font-family="Shippori Mincho, serif">萬</text>
        </svg>
      `;
    }

    if (suit === 1) {
      const pts = PIN_POSITIONS[num] || [];
      const circles = pts
        .map(([cx, cy, r], idx) => {
          let fill = '#1e5a88';
          if (isRed) fill = '#c62820';
          else if (num === 1) fill = '#b82920';
          else if ((num === 3 || num === 5 || num === 7 || num === 9) && idx === Math.floor(pts.length / 2)) fill = '#b82920';
          else if (num >= 6 && idx >= 2 && idx < 4) fill = '#1f7045';
          return `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#19252e" stroke-width="0.9"/>
            <circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="none" stroke="#fffdf7" stroke-width="1.2"/>
          `;
        })
        .join('');
      return `<svg viewBox="0 0 44 62" aria-hidden="true">${circles}</svg>`;
    }

    if (suit === 2) {
      if (num === 1) {
        // Stylized 1-Sou emblem
        return `
          <svg viewBox="0 0 44 62" aria-hidden="true">
            <circle cx="22" cy="24" r="10" fill="#1e6f43"/>
            <path d="M13 38c4-6 14-6 18 0l-9 14-9-14z" fill="#b82920"/>
            <circle cx="22" cy="22" r="4" fill="#f7f2e4"/>
            <circle cx="22" cy="22" r="1.8" fill="#1a1714"/>
          </svg>
        `;
      }
      const color = isRed ? '#c62820' : '#1c6d42';
      const sticks = MahjongTile._souzuSticks(num, color, isRed);
      return `<svg viewBox="0 0 44 62" aria-hidden="true">${sticks}</svg>`;
    }

    // Honors
    const label = HONOR_LABELS[type - 27];
    if (type === 31) {
      // Haku (White Dragon)
      return `
        <svg viewBox="0 0 44 62" aria-hidden="true">
          <rect x="8" y="10" width="28" height="42" rx="4" fill="none" stroke="#24537c" stroke-width="2.4"/>
          <rect x="12" y="14" width="20" height="34" rx="2" fill="none" stroke="#24537c" stroke-width="1"/>
        </svg>
      `;
    }
    const ink = type === 32 ? '#1a6c40' : type === 33 ? '#b8251e' : '#1b1713';
    return `
      <svg viewBox="0 0 44 62" aria-hidden="true">
        <text x="22" y="42" text-anchor="middle" font-size="30" font-weight="800" fill="${ink}" font-family="Shippori Mincho, serif">${label}</text>
      </svg>
    `;
  }

  static _souzuSticks(num, color, isRed) {
    const layouts = {
      2: [[22, 13], [22, 37]],
      3: [[22, 11], [13, 36], [31, 36]],
      4: [[14, 13], [30, 13], [14, 37], [30, 37]],
      5: [[13, 12], [31, 12], [22, 25], [13, 38], [31, 38]],
      6: [[12, 13], [22, 13], [32, 13], [12, 37], [22, 37], [32, 37]],
      7: [[22, 7], [12, 24], [22, 24], [32, 24], [12, 41], [22, 41], [32, 41]],
      8: [[11, 11], [22, 11], [33, 11], [16, 25], [28, 25], [11, 39], [22, 39], [33, 39]],
      9: [[11, 9], [22, 9], [33, 9], [11, 25], [22, 25], [33, 25], [11, 41], [22, 41], [33, 41]],
    };
    const pts = layouts[num] || [];
    const h = num >= 7 ? 13 : 16;
    return pts
      .map(([x, y], idx) => {
        const fill = !isRed && ((num === 5 && idx === 2) || (num === 7 && idx === 0) || (num === 9 && idx % 3 === 1))
          ? '#b82920'
          : color;
        return `<rect x="${x - 3}" y="${y}" width="6" height="${h}" rx="2.5" fill="${fill}" stroke="#103622" stroke-width="0.6"/>`;
      })
      .join('');
  }
}
