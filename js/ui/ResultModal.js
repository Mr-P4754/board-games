/**
 * 対局終了時の勝敗・精算リザルトを表示するモーダルクラス
 */
export class ResultModal {
  constructor(modalRoot) {
    this.modalRoot = modalRoot;
  }

  open(summary, handlers) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const close = () => backdrop.remove();

    const detailsHtml =
      summary.details && summary.details.length > 0
        ? `<div class="result-detail">${summary.details.map((d) => `<div>${d}</div>`).join('')}</div>`
        : '';

    backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="result-modal-title">
        <div class="modal-header">
          <div>
            <span class="result-badge result-badge--${summary.badgeType || 'draw'}">${summary.badgeText || 'RESULT'}</span>
            <h2 class="modal-title" id="result-modal-title">${summary.headline}</h2>
            ${summary.reason ? `<p class="modal-subtitle">${summary.reason}</p>` : ''}
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="result-close" aria-label="閉じる">✕</button>
        </div>

        ${detailsHtml}

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="result-lobby">ロビーへ戻る</button>
          <button type="button" class="btn btn-secondary" id="result-setup">設定変更</button>
          <button type="button" class="btn btn-primary" id="result-rematch">もう一度対局</button>
        </div>
      </div>
    `;

    backdrop.querySelector('#result-close').addEventListener('click', close);
    backdrop.querySelector('#result-lobby').addEventListener('click', () => {
      close();
      handlers.onLobby();
    });
    backdrop.querySelector('#result-setup').addEventListener('click', () => {
      close();
      handlers.onSetup();
    });
    backdrop.querySelector('#result-rematch').addEventListener('click', () => {
      close();
      handlers.onRematch();
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    this.modalRoot.appendChild(backdrop);
  }
}
