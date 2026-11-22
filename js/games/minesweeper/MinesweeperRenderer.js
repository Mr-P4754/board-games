import { BaseRenderer } from '../../core/BaseRenderer.js';

/**
 * マインスイーパー盤面描画・右クリック旗／モバイル旗モード切替クラス
 */
export class MinesweeperRenderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this.flagMode = false;
    this.lastViewModel = null;
  }

  mount() {
    this.container.innerHTML = `<div class="ms-shell" id="ms-shell"></div>`;
    this.shellEl = this.container.querySelector('#ms-shell');
  }

  render(viewModel) {
    this.lastViewModel = viewModel;
    const { state } = viewModel;
    if (!this.shellEl) return;

    let cellsHtml = '';
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const isRev = state.revealed[r][c];
        const isFlag = state.flagged[r][c];
        const isMine = Boolean(state.mines?.[r]?.[c]);
        const cnt = state.counts[r][c];
        const isExploded = state.exploded && state.exploded.r === r && state.exploded.c === c;

        let cls = 'ms-cell ';
        let label = '';
        if (isRev) {
          if (isMine) {
            cls += isExploded ? 'ms-cell--mine' : 'ms-cell--open';
            label = '●';
          } else {
            cls += `ms-cell--open ${cnt > 0 ? `ms-n-${cnt} ms-cell--chord` : ''}`;
            label = cnt > 0 ? String(cnt) : '';
          }
        } else {
          cls += `ms-cell--hidden ${isFlag ? 'ms-cell--flag' : ''}`;
          label = isFlag ? '⚑' : '';
        }

        cellsHtml += `<button type="button" class="${cls}" data-r="${r}" data-c="${c}" data-open="${isRev ? 1 : 0}">${label}</button>`;
      }
    }

    this.shellEl.innerHTML = `
      <div class="ms-mode-bar">
        <button type="button" class="btn btn-secondary btn-sm ${!this.flagMode ? 'btn-active' : ''}" id="ms-mode-dig">
          開くモード
        </button>
        <button type="button" class="btn btn-secondary btn-sm ${this.flagMode ? 'btn-active' : ''}" id="ms-mode-flag">
          ⚑ 旗モード
        </button>
        <span style="font-size:0.76rem;color:var(--text-muted);">右クリックでも旗を立てられます</span>
      </div>
      <div class="ms-frame">
        <div class="ms-board" style="grid-template-columns: repeat(${state.cols}, minmax(0, 1fr));" role="grid" aria-label="マインスイーパー盤">
          ${cellsHtml}
        </div>
      </div>
    `;

    this.shellEl.querySelector('#ms-mode-dig').addEventListener('click', () => {
      this.flagMode = false;
      this.render(this.lastViewModel);
    });
    this.shellEl.querySelector('#ms-mode-flag').addEventListener('click', () => {
      this.flagMode = true;
      this.render(this.lastViewModel);
    });

    this.shellEl.querySelectorAll('.ms-cell').forEach((btn) => {
      const r = Number(btn.dataset.r);
      const c = Number(btn.dataset.c);
      const isOpen = btn.dataset.open === '1';

      btn.addEventListener('click', () => {
        if (isOpen) {
          this.onAction({ type: 'chord', r, c });
        } else {
          this.onAction({ type: this.flagMode ? 'flag' : 'reveal', r, c });
        }
      });

      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!isOpen) {
          this.onAction({ type: 'flag', r, c });
        }
      });
    });
  }
}
