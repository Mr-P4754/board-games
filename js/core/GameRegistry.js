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
      {
        id: 'checkers',
        name: 'チェッカー',
        enName: 'CHECKERS',
        description: '斜めに駒を進め、相手の駒を連続ジャンプで飛び越して取る爽快な定番ボードゲーム。',
        supportsPvp: true,
        wideLayout: false,
        sideLabels: { 1: '赤（先手）', 2: '白（後手）' },
        options: [],
        rules: [
          '8×8盤面の濃いマスのみを使用し、赤（先手）・白（後手）が交互に斜め前へ1マス進みます。',
          '斜め隣の相手の駒の奥が空いている場合はジャンプして取ることができ、取れる駒があるときは強制ジャンプとなります（連続ジャンプ対応）。',
          '相手の最奥段に到達した駒は「キング」に昇格し、前後すべての斜め方向へ移動・ジャンプできます。',
          '相手の駒をすべて取るか、相手が動けなくなると勝利です。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="8" y="8" width="104" height="104" rx="8" fill="#593722" stroke="#361f12" stroke-width="3"/>
            <rect x="14" y="14" width="46" height="46" fill="#ecd8b8"/>
            <rect x="60" y="60" width="46" height="46" fill="#ecd8b8"/>
            <rect x="60" y="14" width="46" height="46" fill="#7d4f32"/>
            <rect x="14" y="60" width="46" height="46" fill="#7d4f32"/>
            <circle cx="37" cy="83" r="15" fill="#b82c22" stroke="#5e130e" stroke-width="2.5"/>
            <path d="M29 88l2-9 4 4 2-6 2 6 4-4 2 9H29z" fill="#f5cc64" stroke="#6c4b11" stroke-width="1.2"/>
            <circle cx="83" cy="37" r="15" fill="#f5eee0" stroke="#8a7c66" stroke-width="2.5"/>
          </svg>`,
        loadController: () =>
          import('../games/checkers/CheckersController.js').then((m) => m.CheckersController),
      },
      {
        id: 'connect4',
        name: 'コネクトフォー',
        enName: 'CONNECT FOUR',
        description: '7列×6段のフレームにディスクを落とし、縦・横・斜めに4つ揃えるスピード勝負の頭脳戦。',
        supportsPvp: true,
        wideLayout: false,
        sideLabels: { 1: '赤（先手）', 2: '黄（後手）' },
        options: [],
        rules: [
          '7列×6段の縦型ボードに、赤（先手）・黄（後手）が交互にディスクを落とします。',
          'ディスクは選んだ列の一番下の空きマスまで重力で落下します。',
          '縦・横・斜めのいずれかに自分のディスクを4つ連続で並べた瞬間に勝利となります。',
          '42マスすべてが埋まると引き分けです。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="8" y="16" width="104" height="88" rx="12" fill="#1d4066" stroke="#10253b" stroke-width="3"/>
            <circle cx="30" cy="40" r="10" fill="#102338"/><circle cx="60" cy="40" r="10" fill="#102338"/><circle cx="90" cy="40" r="10" fill="#e5b832"/>
            <circle cx="30" cy="64" r="10" fill="#102338"/><circle cx="60" cy="64" r="10" fill="#d1382c"/><circle cx="90" cy="64" r="10" fill="#e5b832"/>
            <circle cx="30" cy="88" r="10" fill="#d1382c"/><circle cx="60" cy="88" r="10" fill="#e5b832"/><circle cx="90" cy="88" r="10" fill="#d1382c"/>
          </svg>`,
        loadController: () =>
          import('../games/connect4/Connect4Controller.js').then((m) => m.Connect4Controller),
      },
      {
        id: 'mancala',
        name: 'マンカラ',
        enName: 'MANCALA',
        description: '石を反時計回りに蒔き合いストアに集める世界最古級の戦略ゲーム。ピッタリ連続手番と横取りが熱い。',
        supportsPvp: true,
        wideLayout: false,
        sideLabels: { 1: '先手', 2: '後手' },
        options: [
          {
            key: 'stonesPerPit',
            label: '初期石数（1ポケット）',
            defaultValue: 4,
            choices: [
              { value: 4, label: '4石（標準）' },
              { value: 3, label: '3石（短時間）' },
              { value: 5, label: '5石（じっくり）' },
            ],
          },
        ],
        rules: [
          '自陣の6つのポケットから1つを選び、入っている石を反時計回りに1つずつ隣へ蒔いていきます（相手のストアは飛ばします）。',
          '最後の1石が自分のストアにピッタリ入ると、もう一度自分の手番（連続手番）になります。',
          '最後の1石が自陣の空ポケットに入り、向かい側の相手ポケットに石がある場合、両方の石を自分のストアへ横取りできます。',
          'どちらかの自陣ポケットがすべて空になると終局し、相手陣に残った石は相手ストアへ回収して石数の多い方が勝利です。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="6" y="28" width="108" height="64" rx="26" fill="#7d4f2c" stroke="#422612" stroke-width="3"/>
            <rect x="14" y="37" width="18" height="46" rx="9" fill="#3f2310"/>
            <rect x="88" y="37" width="18" height="46" rx="9" fill="#3f2310"/>
            <circle cx="44" cy="48" r="8" fill="#3f2310"/><circle cx="60" cy="48" r="8" fill="#3f2310"/><circle cx="76" cy="48" r="8" fill="#3f2310"/>
            <circle cx="44" cy="72" r="8" fill="#3f2310"/><circle cx="60" cy="72" r="8" fill="#3f2310"/><circle cx="76" cy="72" r="8" fill="#3f2310"/>
            <circle cx="42" cy="71" r="3" fill="#e0a74d"/><circle cx="46" cy="74" r="3" fill="#589e7d"/>
            <circle cx="60" cy="72" r="3" fill="#c95c4d"/><circle cx="76" cy="48" r="3" fill="#5d8ab8"/>
            <circle cx="97" cy="58" r="3.5" fill="#e0a74d"/><circle cx="97" cy="67" r="3.5" fill="#589e7d"/>
          </svg>`,
        loadController: () =>
          import('../games/mancala/MancalaController.js').then((m) => m.MancalaController),
      },
      {
        id: 'jigsaw',
        category: 'puzzle',
        isSoloPuzzle: true,
        name: 'ジグソーパズル',
        enName: 'JIGSAW PUZZLE',
        description: '凹凸が噛み合う本格ジグソーパズル。和洋4種のアートに加え、手持ちの画像からもパズルを作成できます。',
        supportsPvp: false,
        wideLayout: true,
        difficultyLabels: {
          beginner: '初級 (3×3)',
          intermediate: '中級 (4×4)',
          advanced: '上級 (5×5)',
        },
        options: [
          {
            key: 'theme',
            label: '絵柄テーマ',
            defaultValue: 'fuji',
            choices: [
              { value: 'fuji', label: '富士と紅葉' },
              { value: 'lighthouse', label: '星空の灯台' },
              { value: 'koi', label: '庭園と錦鯉' },
              { value: 'mosaic', label: 'ステンドグラス' },
            ],
          },
        ],
        rules: [
          'トレー内のピースを盤面のマスへドラッグ＆ドロップ（またはクリック選択→マスクリック）で配置します。',
          '正しい位置に置かれたピースは自動的にピタッとロックされます。',
          '「お手本 ON/OFF」でうっすらとした下絵の表示切替ができ、「画像を変更」から自分の写真でも遊べます。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <path d="M18,22 H56 C56,12 68,12 68,22 H102 V56 C112,56 112,68 102,68 V102 H68 C68,92 56,92 56,102 H18 V68 C28,68 28,56 18,56 Z" fill="#e5b864" stroke="#223442" stroke-width="3"/>
            <path d="M56,22 C56,32 68,32 68,22" fill="none" stroke="#223442" stroke-width="2.2"/>
            <line x1="60" y1="22" x2="60" y2="102" stroke="#223442" stroke-width="2.2" opacity="0.45"/>
            <line x1="18" y1="62" x2="102" y2="62" stroke="#223442" stroke-width="2.2" opacity="0.45"/>
            <circle cx="80" cy="40" r="10" fill="#c94635"/>
            <polygon points="24,96 48,54 72,96" fill="#3a597a"/>
          </svg>`,
        loadController: () =>
          import('../games/jigsaw/JigsawController.js').then((m) => m.JigsawController),
      },
      {
        id: 'sudoku',
        category: 'puzzle',
        isSoloPuzzle: true,
        name: '数独',
        enName: 'SUDOKU',
        description: '唯一解が保証された本格9×9ナンプレ。候補数字メモモード・重複ハイライト・ヒント機能を搭載。',
        supportsPvp: false,
        wideLayout: false,
        difficultyLabels: {
          beginner: '初級',
          intermediate: '中級',
          advanced: '上級',
        },
        options: [],
        rules: [
          '縦・横の各列および3×3の各ブロックに1〜9の数字が重複しないようすべてのマスを埋めます。',
          '「メモモード (N)」を使うと各マスに候補の数字を小さくメモできます。',
          'キーボードの1〜9・矢印キー・Backspaceにも対応しています。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="12" y="12" width="96" height="96" rx="8" fill="#fbf7ef" stroke="#263329" stroke-width="3"/>
            <g stroke="#263329" stroke-width="2.2">
              <line x1="44" y1="12" x2="44" y2="108"/><line x1="76" y1="12" x2="76" y2="108"/>
              <line x1="12" y1="44" x2="108" y2="44"/><line x1="12" y1="76" x2="108" y2="76"/>
            </g>
            <g font-family="sans-serif" font-weight="800" font-size="22" text-anchor="middle">
              <text x="28" y="36" fill="#221c15">5</text><text x="60" y="36" fill="#22543d">3</text>
              <text x="92" y="68" fill="#221c15">8</text><text x="60" y="68" fill="#221c15">7</text>
              <text x="28" y="100" fill="#22543d">9</text><text x="92" y="100" fill="#8e2c24">4</text>
            </g>
          </svg>`,
        loadController: () =>
          import('../games/sudoku/SudokuController.js').then((m) => m.SudokuController),
      },
      {
        id: 'game2048',
        category: 'puzzle',
        isSoloPuzzle: true,
        name: '2048',
        enName: '2048 PUZZLE',
        description: '同じ数字のタイルをスライドして合体させ、目標タイルを目指す中毒性の高い数字パズル。',
        supportsPvp: false,
        wideLayout: false,
        difficultyLabels: {
          beginner: '初級 (512)',
          intermediate: '中級 (2048)',
          advanced: '上級 (4096)',
        },
        options: [],
        rules: [
          '上下左右（矢印キー / WASD / スワイプ / 画面ボタン）に全タイルをスライドさせます。',
          '同じ数字のタイル同士がぶつかると合体して2倍の数字になります。',
          '難易度に応じた目標タイル（512 / 2048 / 4096）を完成するとクリアです。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="10" y="10" width="100" height="100" rx="12" fill="#8c7660"/>
            <rect x="18" y="18" width="38" height="38" rx="6" fill="#ede0c8"/>
            <rect x="64" y="18" width="38" height="38" rx="6" fill="#e8a768"/>
            <rect x="18" y="64" width="38" height="38" rx="6" fill="#d66242"/>
            <rect x="64" y="64" width="38" height="38" rx="6" fill="#9c2b23"/>
            <g font-family="sans-serif" font-weight="800" text-anchor="middle">
              <text x="37" y="44" font-size="20" fill="#463a2f">4</text>
              <text x="83" y="44" font-size="20" fill="#fff">16</text>
              <text x="37" y="90" font-size="18" fill="#fff">128</text>
              <text x="83" y="89" font-size="14" fill="#fff6d6">2048</text>
            </g>
          </svg>`,
        loadController: () =>
          import('../games/game2048/Game2048Controller.js').then((m) => m.Game2048Controller),
      },
      {
        id: 'sliding',
        category: 'puzzle',
        isSoloPuzzle: true,
        name: '15パズル',
        enName: 'SLIDING PUZZLE',
        description: '木製タイルをスライドして1から順番に並べる王道スライドパズル。3×3・4×4・5×5の3段階。',
        supportsPvp: false,
        wideLayout: false,
        difficultyLabels: {
          beginner: '初級 (3×3)',
          intermediate: '中級 (4×4)',
          advanced: '上級 (5×5)',
        },
        options: [],
        rules: [
          '空きマスと同じ行または列にあるタイルをクリックすると、まとめてスライド移動できます。',
          '左上から右方向へ 1, 2, 3… と順番に並べ、右下を空きマスにすると完成です。',
          '必ず解ける配置のみが生成されます。矢印キー操作にも対応しています。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="10" y="10" width="100" height="100" rx="12" fill="#4f331d" stroke="#2d1c0f" stroke-width="3"/>
            <rect x="18" y="18" width="25" height="25" rx="4" fill="#ecd2a0"/><rect x="47.5" y="18" width="25" height="25" rx="4" fill="#ecd2a0"/><rect x="77" y="18" width="25" height="25" rx="4" fill="#ecd2a0"/>
            <rect x="18" y="47.5" width="25" height="25" rx="4" fill="#ecd2a0"/><rect x="47.5" y="47.5" width="25" height="25" rx="4" fill="#c3d9b5"/><rect x="77" y="47.5" width="25" height="25" rx="4" fill="#ecd2a0"/>
            <rect x="18" y="77" width="25" height="25" rx="4" fill="#ecd2a0"/><rect x="47.5" y="77" width="25" height="25" rx="4" fill="#ecd2a0"/>
            <rect x="77" y="77" width="25" height="25" rx="4" fill="#2b1a0e"/>
            <g font-family="Shippori Mincho, serif" font-weight="800" font-size="14" fill="#2a1d10" text-anchor="middle">
              <text x="30.5" y="36">1</text><text x="60" y="36">2</text><text x="89.5" y="36">3</text>
              <text x="30.5" y="65.5">4</text><text x="60" y="65.5">5</text><text x="89.5" y="65.5">6</text>
              <text x="30.5" y="95">7</text><text x="60" y="95">8</text>
            </g>
          </svg>`,
        loadController: () =>
          import('../games/sliding/SlidingController.js').then((m) => m.SlidingController),
      },
      {
        id: 'minesweeper',
        category: 'puzzle',
        isSoloPuzzle: true,
        name: 'マインスイーパー',
        enName: 'MINESWEEPER',
        description: '数字を手がかりに地雷の位置を推理する定番論理パズル。初手安全保証・旗モード・コード開示対応。',
        supportsPvp: false,
        wideLayout: false,
        difficultyLabels: {
          beginner: '初級 (9×9)',
          intermediate: '中級 (12×12)',
          advanced: '上級 (16×12)',
        },
        options: [],
        rules: [
          'マスを開くと周囲8マスに隠れた地雷の数が表示されます。最初の1手は必ず安全です。',
          '地雷だと思うマスには右クリック（または旗モード切替）で旗（⚑）を立てられます。',
          '開いた数字マスの周囲に同数の旗が立っている場合、数字をクリックすると残りの周囲を一括開示できます。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="12" y="12" width="96" height="96" rx="10" fill="#3a3f47"/>
            <rect x="20" y="20" width="24" height="24" rx="4" fill="#e9e4d8"/><rect x="48" y="20" width="24" height="24" rx="4" fill="#e9e4d8"/><rect x="76" y="20" width="24" height="24" rx="4" fill="#b4bcc6"/>
            <rect x="20" y="48" width="24" height="24" rx="4" fill="#e9e4d8"/><rect x="48" y="48" width="24" height="24" rx="4" fill="#b4bcc6"/><rect x="76" y="48" width="24" height="24" rx="4" fill="#b4bcc6"/>
            <rect x="20" y="76" width="24" height="24" rx="4" fill="#b4bcc6"/><rect x="48" y="76" width="24" height="24" rx="4" fill="#e9e4d8"/><rect x="76" y="76" width="24" height="24" rx="4" fill="#c4362c"/>
            <text x="32" y="38" text-anchor="middle" font-size="16" font-weight="800" fill="#1d57a3">1</text>
            <text x="60" y="38" text-anchor="middle" font-size="16" font-weight="800" fill="#1f6e3f">2</text>
            <text x="60" y="66" text-anchor="middle" font-size="16" font-weight="800" fill="#b8251e">⚑</text>
            <circle cx="88" cy="88" r="7" fill="#1a1715"/>
          </svg>`,
        loadController: () =>
          import('../games/minesweeper/MinesweeperController.js').then((m) => m.MinesweeperController),
      },
      {
        id: 'lightsout',
        category: 'puzzle',
        isSoloPuzzle: true,
        name: 'ライツアウト',
        enName: 'LIGHTS OUT',
        description: '押したマスと上下左右の明かりが反転する頭脳パズル。すべてのライトを消灯すればクリア。',
        supportsPvp: false,
        wideLayout: false,
        difficultyLabels: {
          beginner: '初級 (4×4)',
          intermediate: '中級 (5×5)',
          advanced: '上級 (6×6)',
        },
        options: [],
        rules: [
          'いずれかのマスを押すと、そのマス自身と上下左右に隣接する最大5マスの点灯／消灯が反転します。',
          'すべてのマスを消灯状態にするとクリアです。',
          '必ず解ける盤面のみ出題されます。迷ったときはヒント機能で次の1手を確認できます。',
        ],
        thumbnailSvg: `
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <rect x="12" y="12" width="96" height="96" rx="12" fill="#211c16" stroke="#473c2e" stroke-width="3"/>
            <rect x="20" y="20" width="24" height="24" rx="5" fill="#362f28"/><rect x="48" y="20" width="24" height="24" rx="5" fill="#f0c24b"/><rect x="76" y="20" width="24" height="24" rx="5" fill="#362f28"/>
            <rect x="20" y="48" width="24" height="24" rx="5" fill="#f0c24b"/><rect x="48" y="48" width="24" height="24" rx="5" fill="#fff0ad"/><rect x="76" y="48" width="24" height="24" rx="5" fill="#f0c24b"/>
            <rect x="20" y="76" width="24" height="24" rx="5" fill="#362f28"/><rect x="48" y="76" width="24" height="24" rx="5" fill="#f0c24b"/><rect x="76" y="76" width="24" height="24" rx="5" fill="#362f28"/>
          </svg>`,
        loadController: () =>
          import('../games/lightsout/LightsOutController.js').then((m) => m.LightsOutController),
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
