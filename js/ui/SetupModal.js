/**
 * 対局開始前にモード・難易度・先手後手・固有設定を選ぶモーダルクラス
 */
export class SetupModal {
  constructor(modalRoot) {
    this.modalRoot = modalRoot;
  }

  open(gameMeta, initialConfig = null) {
    return new Promise((resolve) => {
      const isSolo = Boolean(gameMeta.isSoloPuzzle);
      const state = {
        mode: isSolo ? 'solo' : gameMeta.supportsPvp ? (initialConfig?.mode || 'cpu') : 'cpu',
        difficulty: initialConfig?.difficulty || 'intermediate',
        sideChoice: initialConfig?.sideChoice || '1',
        options: {},
      };

      for (const opt of gameMeta.options || []) {
        state.options[opt.key] =
          initialConfig?.options?.[opt.key] !== undefined
            ? initialConfig.options[opt.key]
            : opt.defaultValue;
      }

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';

      const close = (result) => {
        backdrop.remove();
        resolve(result);
      };

      const renderDialog = () => {
        const isCpu = state.mode === 'cpu';
        const diffLabels = gameMeta.difficultyLabels || {
          beginner: '初級',
          intermediate: '中級',
          advanced: '上級',
        };
        const optionsHtml = (gameMeta.options || [])
          .map(
            (opt) => `
            <div class="form-section">
              <span class="form-label">${opt.label}</span>
              <div class="segmented">
                ${opt.choices
                  .map(
                    (c, idx) => `
                  <button type="button"
                    class="segmented-btn ${state.options[opt.key] === c.value ? 'is-selected' : ''}"
                    data-opt-key="${opt.key}"
                    data-opt-idx="${idx}">
                    ${c.label}
                  </button>`
                  )
                  .join('')}
              </div>
            </div>`
          )
          .join('');

        backdrop.innerHTML = `
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-modal-title">
            <div class="modal-header">
              <div>
                <h2 class="modal-title" id="setup-modal-title">${gameMeta.name} — ${isSolo ? 'パズル設定' : '対局設定'}</h2>
                <p class="modal-subtitle">${gameMeta.description}</p>
              </div>
              <button type="button" class="btn btn-ghost btn-sm" id="setup-close" aria-label="閉じる">✕</button>
            </div>

            ${
              !isSolo
                ? `
              <div class="form-section">
                <span class="form-label">対戦モード</span>
                <div class="segmented">
                  <button type="button" class="segmented-btn ${isCpu ? 'is-selected' : ''}" data-mode="cpu">コンピューター対戦</button>
                  ${
                    gameMeta.supportsPvp
                      ? `<button type="button" class="segmented-btn ${!isCpu ? 'is-selected' : ''}" data-mode="pvp">対人モード（2P）</button>`
                      : `<button type="button" class="segmented-btn" disabled title="4人麻雀はCPU対戦専用です">対人モード（非対応）</button>`
                  }
                </div>
                ${
                  !gameMeta.supportsPvp
                    ? `<p class="form-note">4人麻雀（半荘戦）はコンピューター3名との対戦専用です。</p>`
                    : `<p class="form-note">${isCpu ? '3段階のCPUと対戦します。' : '同一端末で交互に操作するローカル2人対戦です。'}</p>`
                }
              </div>`
                : ''
            }

            ${
              isSolo || isCpu
                ? `
              <div class="form-section">
                <span class="form-label">${isSolo ? '難易度' : 'CPUの強さ'}</span>
                <div class="segmented">
                  <button type="button" class="segmented-btn ${state.difficulty === 'beginner' ? 'is-selected' : ''}" data-diff="beginner">${diffLabels.beginner}</button>
                  <button type="button" class="segmented-btn ${state.difficulty === 'intermediate' ? 'is-selected' : ''}" data-diff="intermediate">${diffLabels.intermediate}</button>
                  <button type="button" class="segmented-btn ${state.difficulty === 'advanced' ? 'is-selected' : ''}" data-diff="advanced">${diffLabels.advanced}</button>
                </div>
              </div>`
                : ''
            }

            ${
              !isSolo && isCpu && gameMeta.supportsPvp
                ? `
              <div class="form-section">
                <span class="form-label">あなたの手番</span>
                <div class="segmented">
                  <button type="button" class="segmented-btn ${state.sideChoice === '1' ? 'is-selected' : ''}" data-side="1">${gameMeta.sideLabels[1]}</button>
                  <button type="button" class="segmented-btn ${state.sideChoice === '2' ? 'is-selected' : ''}" data-side="2">${gameMeta.sideLabels[2]}</button>
                  <button type="button" class="segmented-btn ${state.sideChoice === 'random' ? 'is-selected' : ''}" data-side="random">ランダム</button>
                </div>
              </div>`
                : ''
            }

            ${optionsHtml}

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="setup-cancel">キャンセル</button>
              <button type="button" class="btn btn-primary" id="setup-start">${isSolo ? 'プレイ開始' : '対局開始'}</button>
            </div>
          </div>
        `;

        backdrop.querySelector('#setup-close').addEventListener('click', () => close(null));
        backdrop.querySelector('#setup-cancel').addEventListener('click', () => close(null));
        backdrop.querySelector('#setup-start').addEventListener('click', () => {
          const playerSide =
            state.sideChoice === 'random'
              ? Math.random() < 0.5
                ? 1
                : 2
              : Number(state.sideChoice);
          close({
            mode: state.mode,
            difficulty: state.mode === 'cpu' || state.mode === 'solo' ? state.difficulty : null,
            sideChoice: state.sideChoice,
            playerSide,
            options: { ...state.options },
          });
        });

        backdrop.querySelectorAll('[data-mode]').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.mode = btn.dataset.mode;
            renderDialog();
          });
        });

        backdrop.querySelectorAll('[data-diff]').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.difficulty = btn.dataset.diff;
            renderDialog();
          });
        });

        backdrop.querySelectorAll('[data-side]').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.sideChoice = btn.dataset.side;
            renderDialog();
          });
        });

        backdrop.querySelectorAll('[data-opt-key]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const key = btn.dataset.optKey;
            const idx = Number(btn.dataset.optIdx);
            const def = gameMeta.options.find((o) => o.key === key);
            if (def && def.choices[idx]) {
              state.options[key] = def.choices[idx].value;
              renderDialog();
            }
          });
        });
      };

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close(null);
      });

      renderDialog();
      this.modalRoot.appendChild(backdrop);
    });
  }
}
