/**
 * 収録ボードゲーム＆パズルゲーム一覧（カテゴリフィルター付き）を表示するロビー画面クラス
 */
export class LobbyView {
  constructor({ games, storage, onSelectGame }) {
    this.games = games;
    this.storage = storage;
    this.onSelectGame = onSelectGame;
    this.activeCategory = 'all';
  }

  render() {
    const section = document.createElement('section');
    section.className = 'lobby-view';

    const boardCount = this.games.filter((g) => g.category !== 'puzzle').length;
    const puzzleCount = this.games.filter((g) => g.category === 'puzzle').length;

    const hero = document.createElement('div');
    hero.className = 'lobby-hero';
    hero.innerHTML = `
      <div>
        <h1>定番ボードゲームも、パズルも、いつでも一局。</h1>
        <p>オセロ・囲碁・五目並べ・将棋・チェス・4人麻雀・チェッカー・コネクトフォー・マンカラの定番ボードゲーム9種に加え、ジグソーパズル・数独・2048・15パズル・マインスイーパー・ライツアウトのパズル6種を収録。</p>
      </div>
      <div class="lobby-filter-tabs" role="tablist" aria-label="ゲームカテゴリ">
        <button type="button" class="filter-tab is-active" data-cat="all" role="tab">すべて (${this.games.length})</button>
        <button type="button" class="filter-tab" data-cat="board" role="tab">ボードゲーム (${boardCount})</button>
        <button type="button" class="filter-tab" data-cat="puzzle" role="tab">パズルゲーム (${puzzleCount})</button>
      </div>
    `;
    section.appendChild(hero);

    const grid = document.createElement('div');
    grid.className = 'lobby-grid';
    section.appendChild(grid);

    const renderGrid = () => {
      const filtered = this.games.filter((g) => {
        if (this.activeCategory === 'all') return true;
        if (this.activeCategory === 'puzzle') return g.category === 'puzzle';
        return g.category !== 'puzzle';
      });

      grid.innerHTML = '';
      for (const game of filtered) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'game-card';
        card.id = `game-card-${game.id}`;

        const statsText = this._formatMiniStats(game);
        let modeBadges;
        if (game.isSoloPuzzle) {
          modeBadges = `<span class="tag tag--puzzle">パズル・3段階</span><span class="tag">1人プレイ</span>`;
        } else if (game.supportsPvp) {
          modeBadges = `<span class="tag">CPU 3段階</span><span class="tag">対人 2P</span>`;
        } else {
          modeBadges = `<span class="tag tag--cpu-only">半荘戦・CPU対戦専用</span>`;
        }

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
    };

    hero.querySelectorAll('.filter-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.cat;
        hero.querySelectorAll('.filter-tab').forEach((b) => b.classList.toggle('is-active', b === btn));
        renderGrid();
      });
    });

    renderGrid();
    return section;
  }

  _formatMiniStats(game) {
    const stat = this.storage.getGameStats(game.id);
    if (!stat) return game.isSoloPuzzle ? '未クリア' : '未対局';

    if (game.isSoloPuzzle) {
      const clears = stat.total?.clears || 0;
      if (game.id === 'game2048' && stat.total?.bestScore) {
        return `BEST ${stat.total.bestScore}`;
      }
      return clears > 0 ? `${clears}回クリア` : '未クリア';
    }

    if (game.id === 'mahjong') {
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
