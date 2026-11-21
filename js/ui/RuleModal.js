/**
 * 各ゲームのルール・操作説明を表示するモーダルクラス
 */
export class RuleModal {
  constructor(modalRoot) {
    this.modalRoot = modalRoot;
  }

  open(gameMeta) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const close = () => backdrop.remove();

    backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="rule-modal-title">
        <div class="modal-header">
          <div>
            <h2 class="modal-title" id="rule-modal-title">${gameMeta.name} のルール</h2>
            <p class="modal-subtitle">${gameMeta.enName}</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="rule-close" aria-label="閉じる">✕</button>
        </div>

        <ul class="rules-list">
          ${(gameMeta.rules || []).map((r) => `<li>${r}</li>`).join('')}
        </ul>

        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="rule-ok">閉じる</button>
        </div>
      </div>
    `;

    backdrop.querySelector('#rule-close').addEventListener('click', close);
    backdrop.querySelector('#rule-ok').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    this.modalRoot.appendChild(backdrop);
  }
}
