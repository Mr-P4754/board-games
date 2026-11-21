/**
 * 収録ボードゲーム一覧を表示するロビー画面クラス
 */
export class LobbyView {
  constructor({ games, storage, onSelectGame }) {
    this.games = games;
    this.storage = storage;
    this.onSelectGame = onSelectGame;
  }

  render() {
    const section = document.createElement('section');
    section.className = 'lobby-view';

    const hero = document.createElement('div');
    hero.className = 'lobby-hero';
    hero.innerHTML = `
      <div>
        <h1>定番ボードゲームを、いつでも一局。</h1>
        <p>オセロ・囲碁・五目並べ・将棋・チェス・4人麻雀をブラウザひとつで。3段階のCPU対戦とローカル対人戦に対応しています。</p>
      </div>
    `;
    section.appendChild(hero);

    const grid = document.createElement('div');
    grid.className = 'lobby-grid';

    for (const game of this.games) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'game-card';
      card.id = `game-card-${game.id}`;

      const statsText = this._formatMiniStats(game.id);
      const modeBadges = game.supportsPvp
        ? `<span class="tag">CPU 3段階</span><span class="tag">対人 2P</span>`
        : `<span class="tag tag--cpu-only">半荘戦・CPU対戦専用</span>`;

      card.innerHTML = `
        <div class="game-card-visual game-card-visual--${game.id}">
          ${game.thumbnailSvg}
        </div>
        <div class="game-card-body">
          <div class="game-card-head">
            <h2 class="game-card-name">${game.name}</h2>
            <span class="game-card-en">${game.enName}</span>
          </div>
          <p class="game-card-desc">${game.description}</p>
          <div class="game-card-meta">
            <div class="mode-tags">${modeBadges}</div>
            <span class="stat-mini">${statsText}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => this.onSelectGame(game));
      grid.appendChild(card);
    }

    section.appendChild(grid);
    return section;
  }

  _formatMiniStats(gameId) {
    const stat = this.storage.getGameStats(gameId);
    if (!stat) return '未対局';
    if (gameId === 'mahjong') {
      const played = stat.total?.played || 0;
      if (!played) return '未対局';
      const ranks = stat.total.ranks;
      const avg = ((ranks[0] * 1 + ranks[1] * 2 + ranks[2] * 3 + ranks[3] * 4) / played).toFixed(2);
      return `${played}半荘 / 平均${avg}着`;
    }
    const { win = 0, lose = 0, draw = 0 } = stat.total || {};
    const total = win + lose + draw;
    if (total === 0) {
      const pvp = stat.pvp?.played || 0;
      return pvp > 0 ? `対人 ${pvp}局` : '未対局';
    }
    return `CPU ${win}勝${lose}敗`;
  }
}
