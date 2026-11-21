/**
 * 全画面共通のヘッダーバーを描画・制御するビュークラス
 */
export class HeaderView {
  constructor(handlers) {
    this.handlers = handlers;
    this.el = null;
  }

  render(settings) {
    if (!this.el) {
      this.el = document.createElement('header');
      this.el.className = 'app-header';
    }

    const themeLabel = settings.theme === 'dark' ? 'ライト' : 'ダーク';
    const soundLabel = settings.sound ? '効果音 ON' : '効果音 OFF';

    this.el.innerHTML = `
      <div class="header-inner">
        <a href="#/" class="brand-link" id="nav-home">
          <span class="brand-emblem" aria-hidden="true">盤</span>
          <span>
            <span class="brand-title">盤遊館</span>
            <span class="brand-sub">Classic Board Games</span>
          </span>
        </a>
        <div class="header-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-open-stats">戦績</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-sound">${soundLabel}</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-theme">${themeLabel}</button>
        </div>
      </div>
    `;

    this.el.querySelector('#btn-open-stats').addEventListener('click', () => this.handlers.onOpenStats());
    this.el.querySelector('#btn-toggle-sound').addEventListener('click', () => this.handlers.onToggleSound());
    this.el.querySelector('#btn-toggle-theme').addEventListener('click', () => this.handlers.onToggleTheme());

    return this.el;
  }
}
