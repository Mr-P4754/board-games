import { BaseRenderer } from '../../core/BaseRenderer.js';

/**
 * 数独盤面・メモ切替・数字パッド・キーボード入力描画クラス
 */
export class SudokuRenderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this.selected = { r: 0, c: 0 };
    this.noteMode = false;
    this.lastViewModel = null;
    this._onKeyDown = (e) => this._handleKey(e);
  }

  mount() {
    this.container.innerHTML = `<div class="sudoku-shell" id="sudoku-shell"></div>`;
    this.shellEl = this.container.querySelector('#sudoku-shell');
    window.addEventListener('keydown', this._onKeyDown);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    super.destroy();
  }

  _handleKey(e) {
    if (!this.lastViewModel || this.lastViewModel.state.gameOver) return;
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      this.onAction({ r: this.selected.r, c: this.selected.c, value: Number(e.key), isNote: this.noteMode });
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      this.onAction({ r: this.selected.r, c: this.selected.c, value: 0, isNote: false });
    } else if (e.key === 'n' || e.key === 'N') {
      this.noteMode = !this.noteMode;
      this.render(this.lastViewModel);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selected.r = (this.selected.r + 8) % 9;
      this.render(this.lastViewModel);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selected.r = (this.selected.r + 1) % 9;
      this.render(this.lastViewModel);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.selected.c = (this.selected.c + 8) % 9;
      this.render(this.lastViewModel);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.selected.c = (this.selected.c + 1) % 9;
      this.render(this.lastViewModel);
    }
  }

  render(viewModel) {
    this.lastViewModel = viewModel;
    const { state, showHints } = viewModel;
    if (!this.shellEl) return;

    const conflicts = new Set(state.conflicts || []);
    const selVal = state.board[this.selected.r]?.[this.selected.c] || 0;
    const selBoxR = Math.floor(this.selected.r / 3);
    const selBoxC = Math.floor(this.selected.c / 3);

    let cellsHtml = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = state.board[r][c];
        const isFixed = state.fixed[r][c];
        const isSelected = r === this.selected.r && c === this.selected.c;
        const inPeer =
          showHints &&
          (r === this.selected.r ||
            c === this.selected.c ||
            (Math.floor(r / 3) === selBoxR && Math.floor(c / 3) === selBoxC));
        const isSame = showHints && selVal > 0 && val === selVal;
        const isConflict = showHints && conflicts.has(`${r},${c}`);

        const cls = ['sudoku-cell'];
        if (isFixed) cls.push('sudoku-cell--fixed');
        else if (val > 0) cls.push('sudoku-cell--user');
        if (c === 2 || c === 5) cls.push('sudoku-cell--box-right');
        if (r === 2 || r === 5) cls.push('sudoku-cell--box-bottom');
        if (inPeer) cls.push('sudoku-cell--peer');
        if (isSame) cls.push('sudoku-cell--same');
        if (isSelected) cls.push('sudoku-cell--selected');
        if (isConflict) cls.push('sudoku-cell--conflict');

        let inner = '';
        if (val > 0) {
          inner = String(val);
        } else {
          const noteSet = new Set(state.notes[r][c]);
          if (noteSet.size > 0) {
            inner = `<div class="sudoku-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9]
              .map((n) => `<span>${noteSet.has(n) ? n : ''}</span>`)
              .join('')}</div>`;
          }
        }

        cellsHtml += `<button type="button" class="${cls.join(' ')}" data-r="${r}" data-c="${c}">${inner}</button>`;
      }
    }

    const numpadHtml = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((n) => {
        const rem = Math.max(0, 9 - (state.digitCounts[n] || 0));
        return `
          <button type="button" class="sudoku-num-btn ${rem === 0 ? 'sudoku-num-btn--done' : ''}" data-num="${n}">
            <span>${n}</span>
            <span class="sudoku-num-rem">${rem}</span>
          </button>`;
      })
      .join('');

    this.shellEl.innerHTML = `
      <div class="sudoku-board" role="grid" aria-label="数独盤">${cellsHtml}</div>
      <div class="sudoku-controls">
        <div class="sudoku-tool-row">
          <button type="button" class="btn btn-secondary btn-sm ${this.noteMode ? 'btn-active' : ''}" id="sd-note-btn">
            メモモード ${this.noteMode ? 'ON' : 'OFF'} (N)
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="sd-erase-btn">消去</button>
          <button type="button" class="btn btn-secondary btn-sm" id="sd-hint-btn">ヒント</button>
        </div>
        <div class="sudoku-numpad">${numpadHtml}</div>
      </div>
    `;

    this.shellEl.querySelectorAll('.sudoku-cell').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selected = { r: Number(btn.dataset.r), c: Number(btn.dataset.c) };
        this.render(this.lastViewModel);
      });
    });

    this.shellEl.querySelectorAll('[data-num]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onAction({
          r: this.selected.r,
          c: this.selected.c,
          value: Number(btn.dataset.num),
          isNote: this.noteMode,
        });
      });
    });

    this.shellEl.querySelector('#sd-note-btn').addEventListener('click', () => {
      this.noteMode = !this.noteMode;
      this.render(this.lastViewModel);
    });

    this.shellEl.querySelector('#sd-erase-btn').addEventListener('click', () => {
      this.onAction({ r: this.selected.r, c: this.selected.c, value: 0, isNote: false });
    });

    this.shellEl.querySelector('#sd-hint-btn').addEventListener('click', () => {
      this.onAction({ type: 'hint', selected: this.selected });
    });
  }
}
