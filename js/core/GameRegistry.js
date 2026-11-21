/**
 * 収録ボードゲームのメタデータ・ルール・動的モジュール読み込みを一元管理するレジストリ
 */
export class GameRegistry {
  constructor() {
    this.games = new Map();
    this._registerBuiltInGames();
  }

  _registerBuiltInGames() {
    const definitions = [
      {
        id: 'othello',
        name: 'オセロ',
        enName: 'OTHELLO',
        description: '相手の石を挟んで自分の色に変える定番の陣取りゲーム。角と着手可能数の読み合いが勝敗を分けます。',
        supportsPvp: true,
        wideLayout: false,
        sideLabels: { 1: '黒（先手）', 2: '白（後手）' },
        options: [],
        rules: [
          '8×8の盤面で黒が先手、白が後手で交互に石を置きます。',
          '相手の石を縦・横・斜めに挟めるマスにのみ着手でき、挟んだ石をすべて反転します。',
          '着手可能なマスがない場合は自動でパスになります。',
          '双方とも置けなくなるか全64マスが埋まると終局し、石数が多い方の勝利です。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="8" y="8" width="104" height="104" rx="10" fill="#185437" stroke="#0e3422" stroke-width="3"/>
            <g stroke="#0e3422" stroke-width="1.5" opacity="0.65">
              <line x1="34" y1="8" x2="34" y2="112"/><line x1="60" y1="8" x2="60" y2="112"/><line x1="86" y1="8" x2="86" y2="112"/>
              <line x1="8" y1="34" x2="112" y2="34"/><line x1="8" y1="60" x2="112" y2="60"/><line x1="8" y1="86" x2="112" y2="86"/>
            </g>
            <circle cx="47" cy="47" r="10.5" fill="#f7f4ec" stroke="#b9b2a4" stroke-width="1"/>
            <circle cx="73" cy="73" r="10.5" fill="#f7f4ec" stroke="#b9b2a4" stroke-width="1"/>
            <circle cx="73" cy="47" r="10.5" fill="#1d1b19" stroke="#3c3834" stroke-width="1"/>
            <circle cx="47" cy="73" r="10.5" fill="#1d1b19" stroke="#3c3834" stroke-width="1"/>
          </svg>`,
        loadController: () =>
          import('../games/othello/OthelloController.js').then((m) => m.OthelloController),
      },
      {
        id: 'go',
        name: '囲碁',
        enName: 'GO / WEIQI',
        description: '黒白の石を交点に打ち合い、陣地（地）の広さを競う伝統ゲーム。9路・13路・19路盤に対応。',
        supportsPvp: true,
        wideLayout: false,
        sideLabels: { 1: '黒（先手）', 2: '白（後手）' },
        options: [
          {
            key: 'boardSize',
            label: '盤面サイズ',
            defaultValue: 9,
            choices: [
              { value: 9, label: '9路盤（手軽）' },
              { value: 13, label: '13路盤' },
              { value: 19, label: '19路盤（本格）' },
            ],
          },
        ],
        rules: [
          '交点に黒（先手）・白（後手）が交互に着手します。',
          '上下左右の呼吸点（ダメ）がすべて塞がれた石の塊は盤上から取り除かれます。',
          '自殺手および直前盤面を再現するコウの即時取り返しは禁止です。',
          '双方連続パスで終局フェーズに移行し、死石を指定して「地合い確定」すると中国ルール（盤上の石＋地、白コミ7.5目）で勝敗を判定します。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="8" y="8" width="104" height="104" rx="8" fill="#dfb267" stroke="#996d2f" stroke-width="3"/>
            <g stroke="#4b3518" stroke-width="1.4">
              <line x1="24" y1="24" x2="96" y2="24"/><line x1="24" y1="48" x2="96" y2="48"/>
              <line x1="24" y1="72" x2="96" y2="72"/><line x1="24" y1="96" x2="96" y2="96"/>
              <line x1="24" y1="24" x2="24" y2="96"/><line x1="48" y1="24" x2="48" y2="96"/>
              <line x1="72" y1="24" x2="72" y2="96"/><line x1="96" y1="24" x2="96" y2="96"/>
            </g>
            <circle cx="48" cy="48" r="10.5" fill="#1e1c1a"/>
            <circle cx="72" cy="48" r="10.5" fill="#f7f4ec" stroke="#b9b2a4"/>
            <circle cx="72" cy="72" r="10.5" fill="#1e1c1a"/>
            <circle cx="48" cy="72" r="10.5" fill="#f7f4ec" stroke="#b9b2a4"/>
            <circle cx="48" cy="24" r="9.5" fill="#1e1c1a"/>
          </svg>`,
        loadController: () =>
          import('../games/go/GoController.js').then((m) => m.GoController),
      },
      {
        id: 'gomoku',
        name: '五目並べ',
        enName: 'GOMOKU',
        description: '縦・横・斜めのいずれかに自分の石を5つ並べた方が勝利。禁じ手なしの標準戦と連珠ルールを選択可能。',
        supportsPvp: true,
        wideLayout: false,
        sideLabels: { 1: '黒（先手）', 2: '白（後手）' },
        options: [
          {
            key: 'renju',
            label: '禁じ手ルール',
            defaultValue: false,
            choices: [
              { value: false, label: '標準（禁じ手なし）' },
              { value: true, label: '連珠（黒の三三・四四・長連禁）' },
            ],
          },
        ],
        rules: [
          '15×15の交点に黒（先手）・白（後手）が交互に石を置きます。',
          '縦・横・斜めに同色の石を5つ連続して並べた時点で勝利です。',
          '連珠ルール選択時は、黒番のみ「三三」「四四」「長連（6連以上）」が禁じ手となります。',
          '盤面がすべて埋まった場合は引き分けです。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="8" y="8" width="104" height="104" rx="8" fill="#d8aa60" stroke="#8f662a" stroke-width="3"/>
            <g stroke="#4b3518" stroke-width="1.3">
              <line x1="22" y1="22" x2="98" y2="22"/><line x1="22" y1="41" x2="98" y2="41"/>
              <line x1="22" y1="60" x2="98" y2="60"/><line x1="22" y1="79" x2="98" y2="79"/>
              <line x1="22" y1="98" x2="98" y2="98"/>
              <line x1="22" y1="22" x2="22" y2="98"/><line x1="41" y1="22" x2="41" y2="98"/>
              <line x1="60" y1="22" x2="60" y2="98"/><line x1="79" y1="22" x2="79" y2="98"/>
              <line x1="98" y1="22" x2="98" y2="98"/>
            </g>
            <circle cx="22" cy="98" r="8" fill="#1e1c1a"/>
            <circle cx="41" cy="79" r="8" fill="#1e1c1a"/>
            <circle cx="60" cy="60" r="8" fill="#1e1c1a"/>
            <circle cx="79" cy="41" r="8" fill="#1e1c1a"/>
            <circle cx="98" cy="22" r="8" fill="#1e1c1a"/>
            <circle cx="41" cy="41" r="8" fill="#f7f4ec" stroke="#b9b2a4"/>
            <circle cx="60" cy="41" r="8" fill="#f7f4ec" stroke="#b9b2a4"/>
            <circle cx="79" cy="79" r="8" fill="#f7f4ec" stroke="#b9b2a4"/>
          </svg>`,
        loadController: () =>
          import('../games/gomoku/GomokuController.js').then((m) => m.GomokuController),
      },
      {
        id: 'shogi',
        name: '将棋',
        enName: 'SHOGI',
        description: '取った駒を持ち駒として再利用できる奥深い本将棋。成り・二歩・打ち歩詰め・千日手まで完全対応。',
        supportsPvp: true,
        wideLayout: false,
        sideLabels: { 1: '先手（▲）', 2: '後手（△）' },
        options: [],
        rules: [
          '9×9の盤面で先手（下側）・後手（上側）が交互に駒を指します。',
          '敵陣3段目に入るとき・動くとき・出るときに駒を「成る」ことができます（行き所のない駒は強制成り）。',
          '取った相手の駒は持ち駒として自軍の番に空きマスへ打てます。',
          '二歩・打ち歩詰め・王手放置は自動的に制限されます。相手の玉を詰ませると勝利です。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="8" y="8" width="104" height="104" rx="8" fill="#e2bb74" stroke="#966c2d" stroke-width="3"/>
            <polygon points="60,22 92,36 98,96 22,96 28,36" fill="#f5dfb0" stroke="#7d5622" stroke-width="2.5"/>
            <text x="60" y="74" text-anchor="middle" font-size="38" font-weight="800" fill="#1d1814" font-family="Shippori Mincho, serif">王</text>
          </svg>`,
        loadController: () =>
          import('../games/shogi/ShogiController.js').then((m) => m.ShogiController),
      },
      {
        id: 'chess',
        name: 'チェス',
        enName: 'CHESS',
        description: '世界中で親しまれる戦略ボードゲーム。キャスリング・アンパッサン・プロモーション・50手ルール完備。',
        supportsPvp: true,
        wideLayout: false,
        sideLabels: { 1: '白（先手）', 2: '黒（後手）' },
        options: [],
        rules: [
          '8×8の盤面で白が先手、黒が後手で交互に駒を動かします。',
          'キャスリング・アンパッサン・ポーンの昇格（Q/R/B/N選択）に対応しています。',
          'チェックメイトで勝利。ステイルメイト・戦力不足・同形3回・50手ルールで引き分けとなります。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="8" y="8" width="104" height="104" rx="8" fill="#5c3c24" stroke="#362213" stroke-width="3"/>
            <rect x="14" y="14" width="46" height="46" fill="#ead4b2"/>
            <rect x="60" y="60" width="46" height="46" fill="#ead4b2"/>
            <rect x="60" y="14" width="46" height="46" fill="#9a6842"/>
            <rect x="14" y="60" width="46" height="46" fill="#9a6842"/>
            <path d="M44 92h32v-8H44v8zm4-12h24l-3-24 10-8-7-10-10 4-2-10h-4l-2 10-10-4-7 10 10 8-3 24z" fill="#faf6ee" stroke="#2a1c11" stroke-width="2.2" stroke-linejoin="round"/>
          </svg>`,
        loadController: () =>
          import('../games/chess/ChessController.js').then((m) => m.ChessController),
      },
      {
        id: 'mahjong',
        name: '4人麻雀',
        enName: 'RIICHI MAHJONG',
        description: '東1局〜南4局の本格半荘戦（CPU対戦専用）。赤ドラ・鳴き・リーチ・フリテン・正確な役・符点数計算を搭載。',
        supportsPvp: false,
        wideLayout: true,
        sideLabels: { 1: 'プレイヤー' },
        options: [
          {
            key: 'redDora',
            label: '赤ドラ（各5に1枚）',
            defaultValue: true,
            choices: [
              { value: true, label: 'あり（標準）' },
              { value: false, label: 'なし' },
            ],
          },
          {
            key: 'tobi',
            label: 'トビ（0点未満で終局）',
            defaultValue: true,
            choices: [
              { value: true, label: 'あり' },
              { value: false, label: 'なし' },
            ],
          },
        ],
        rules: [
          '東1局〜南4局の半荘戦（25,000点持ち・30,000点返し・ウマ10-30）をCPU3名と対局します。',
          '喰いタンあり・後付けあり（アリアリ）、一発・裏ドラ・カンドラ対応。',
          '鳴き（チー・ポン・カン）・リーチ・ツモ・ロンが可能です。フリテン時はロン和了できません。',
          '手牌をクリックして打牌します。鳴きやリーチが可能な時は画面下部のアクションバーから選択できます。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="20" y="16" width="54" height="76" rx="8" fill="#fbf8ef" stroke="#c8bfa8" stroke-width="2.5"/>
            <rect x="20" y="84" width="54" height="10" rx="4" fill="#217253"/>
            <text x="47" y="64" text-anchor="middle" font-size="36" font-weight="800" fill="#a7261f" font-family="Shippori Mincho, serif">中</text>
            <rect x="48" y="30" width="54" height="76" rx="8" fill="#fbf8ef" stroke="#c8bfa8" stroke-width="2.5"/>
            <rect x="48" y="98" width="54" height="10" rx="4" fill="#217253"/>
            <text x="75" y="78" text-anchor="middle" font-size="34" font-weight="800" fill="#1e6844" font-family="Shippori Mincho, serif">發</text>
          </svg>`,
        loadController: () =>
          import('../games/mahjong/MahjongController.js').then((m) => m.MahjongController),
      },
    ];

    for (const def of definitions) {
      this.games.set(def.id, def);
    }
  }

  getAll() {
    return [...this.games.values()];
  }

  get(id) {
    return this.games.get(id) || null;
  }
}
