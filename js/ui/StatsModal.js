/**
 * 全ゲームのCPU対戦戦績・4人麻雀の順位統計を表示するモーダルクラス
 */
export class StatsModal {
  constructor(modalRoot, storage, games) {
    this.modalRoot = modalRoot;
    this.storage = storage;
    this.games = games;
  }

  open(onCleared) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const close = () => backdrop.remove();

    const renderContent = () => {
      const stats = this.storage.getAllStats();
      const rows = this.games
        .map((game) => {
          const s = stats[game.id];
          if (game.id === 'mahjong') {
            const total = s?.total || { played: 0, ranks: [0, 0, 0, 0] };
            const avg = total.played
              ? (
                  (total.ranks[0] + total.ranks[1] * 2 + total.ranks[2] * 3 + total.ranks[3] * 4) /
                  total.played
                ).toFixed(2)
              : '-';
            return `
              <tr>
                <td><strong>${game.name}</strong></td>
                <td colspan="3">半荘 ${total.played}回（1着:${total.ranks[0]} / 2着:${total.ranks[1]} / 3着:${total.ranks[2]} / 4着:${total.ranks[3]}）</td>
                <td>平均 ${avg}着</td>
              </tr>`;
          }
          if (game.isSoloPuzzle) {
            const lv = s?.levels || {};
            const fmtLv = (d) => {
              if (!d || !d.clears) return '0回';
              if (game.id === 'game2048' && d.bestScore) return `${d.clears}回 (${d.bestScore})`;
              if (typeof d.bestTime === 'number') {
                const m = Math.floor(d.bestTime / 60);
                const sec = String(d.bestTime % 60).padStart(2, '0');
                return `${d.clears}回 (${m}:${sec})`;
              }
              return `${d.clears}回`;
            };
            return `
              <tr>
                <td><strong>${game.name}</strong></td>
                <td>${fmtLv(lv.beginner)}</td>
                <td>${fmtLv(lv.intermediate)}</td>
                <td>${fmtLv(lv.advanced)}</td>
                <td>計 ${s?.total?.clears || 0}クリア</td>
              </tr>`;
          }
          const fmt = (d) => (d ? `${d.win}-${d.lose}-${d.draw}` : '0-0-0');
          return `
            <tr>
              <td><strong>${game.name}</strong></td>
              <td>${fmt(s?.cpu?.beginner)}</td>
              <td>${fmt(s?.cpu?.intermediate)}</td>
              <td>${fmt(s?.cpu?.advanced)}</td>
              <td>対人 ${s?.pvp?.played || 0}局</td>
            </tr>`;
        })
        .join('');

      backdrop.innerHTML = `
        <div class="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="stats-modal-title">
          <div class="modal-header">
            <div>
              <h2 class="modal-title" id="stats-modal-title">通算戦績</h2>
              <p class="modal-subtitle">CPU戦は「勝-敗-分」形式でブラウザ内に保存されます</p>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" id="stats-close" aria-label="閉じる">✕</button>
          </div>

          <div style="overflow-x:auto;">
            <table class="stats-table">
              <thead>
                <tr>
                  <th>ゲーム</th>
                  <th>初級</th>
                  <th>中級</th>
                  <th>上級</th>
                  <th>その他</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-danger btn-sm" id="stats-reset">戦績リセット</button>
            <button type="button" class="btn btn-primary" id="stats-ok">閉じる</button>
          </div>
        </div>
      `;

      backdrop.querySelector('#stats-close').addEventListener('click', close);
      backdrop.querySelector('#stats-ok').addEventListener('click', close);
      backdrop.querySelector('#stats-reset').addEventListener('click', () => {
        this.storage.clearStats();
        if (onCleared) onCleared();
        renderContent();
      });
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    renderContent();
    this.modalRoot.appendChild(backdrop);
  }
}
