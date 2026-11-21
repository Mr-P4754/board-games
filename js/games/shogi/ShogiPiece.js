const PROMOTE_MAP = {
  HI: 'RY',
  KA: 'UM',
  GI: 'NG',
  KE: 'NK',
  KY: 'NY',
  FU: 'TO',
};

const DEMOTE_MAP = {
  RY: 'HI',
  UM: 'KA',
  NG: 'GI',
  NK: 'KE',
  NY: 'KY',
  TO: 'FU',
};

const LABELS = {
  OU: '玉',
  HI: '飛',
  KA: '角',
  KI: '金',
  GI: '銀',
  KE: '桂',
  KY: '香',
  FU: '歩',
  RY: '龍',
  UM: '馬',
  NG: '全',
  NK: '圭',
  NY: '杏',
  TO: 'と',
};

const VALUES = {
  FU: 100,
  KY: 320,
  KE: 350,
  GI: 500,
  KI: 560,
  KA: 820,
  HI: 960,
  TO: 540,
  NY: 520,
  NK: 520,
  NG: 540,
  UM: 1080,
  RY: 1240,
  OU: 15000,
};

const HAND_ORDER = ['HI', 'KA', 'KI', 'GI', 'KE', 'KY', 'FU'];

// Steps defined from Sente's perspective (forward is dr = -1)
const GOLD_STEPS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, 0],
];

const KING_STEPS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const SILVER_STEPS = [
  [-1, -1], [-1, 0], [-1, 1],
  [1, -1],           [1, 1],
];

const ORTHO_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

/**
 * 将棋の駒定義・成り/不成・移動ベクトル・五角形SVG描画クラス
 */
export class ShogiPiece {
  static get HAND_ORDER() {
    return HAND_ORDER;
  }

  static canPromote(type) {
    return Boolean(PROMOTE_MAP[type]);
  }

  static isPromoted(type) {
    return Boolean(DEMOTE_MAP[type]);
  }

  static promote(type) {
    return PROMOTE_MAP[type] || type;
  }

  static demote(type) {
    return DEMOTE_MAP[type] || type;
  }

  static label(type, owner = 1) {
    if (type === 'OU' && owner === 2) return '王';
    return LABELS[type] || type;
  }

  static valueOf(type) {
    return VALUES[type] || 0;
  }

  static handValueOf(type) {
    return Math.round((VALUES[type] || 0) * 1.08);
  }

  /**
   * 駒のステップ移動・スライド移動を返す（owner=1は上向き、owner=2は下向き）
   */
  static getMovesSpec(type, owner) {
    const dir = owner === 1 ? 1 : -1;
    const orient = (list) => list.map(([dr, dc]) => [dr * dir, dc]);

    switch (type) {
      case 'OU':
        return { steps: KING_STEPS, slides: [] };
      case 'KI':
      case 'TO':
      case 'NY':
      case 'NK':
      case 'NG':
        return { steps: orient(GOLD_STEPS), slides: [] };
      case 'GI':
        return { steps: orient(SILVER_STEPS), slides: [] };
      case 'KE':
        return { steps: orient([[-2, -1], [-2, 1]]), slides: [] };
      case 'FU':
        return { steps: orient([[-1, 0]]), slides: [] };
      case 'KY':
        return { steps: [], slides: orient([[-1, 0]]) };
      case 'HI':
        return { steps: [], slides: ORTHO_DIRS };
      case 'KA':
        return { steps: [], slides: DIAG_DIRS };
      case 'RY':
        return { steps: DIAG_DIRS, slides: ORTHO_DIRS };
      case 'UM':
        return { steps: ORTHO_DIRS, slides: DIAG_DIRS };
      default:
        return { steps: [], slides: [] };
    }
  }

  static renderSvg(type, owner, rotated = false) {
    const promoted = ShogiPiece.isPromoted(type);
    const text = ShogiPiece.label(type, owner);
    const ink = promoted ? '#a8221b' : '#1b1612';
    const cls = rotated ? 'shogi-piece-svg shogi-piece-svg--rotated' : 'shogi-piece-svg';
    return `
      <svg class="${cls}" viewBox="0 0 60 66" aria-hidden="true">
        <polygon points="30,4 51,14 56,61 4,61 9,14" fill="#f6e0ae" stroke="#7d5824" stroke-width="2.2" stroke-linejoin="round"/>
        <polygon points="30,8 48,16.5 52,57.5 8,57.5 12,16.5" fill="none" stroke="rgba(255,250,235,0.55)" stroke-width="1"/>
        <text x="30" y="45" text-anchor="middle" font-size="27" font-weight="800" fill="${ink}" font-family="Shippori Mincho, serif">${text}</text>
      </svg>
    `;
  }
}
