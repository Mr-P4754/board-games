/**
 * GitHub Pages 互換のハッシュベースSPAルーター
 */
export class Router {
  constructor(onRouteChange) {
    this.onRouteChange = onRouteChange;
    this._boundHandler = () => this._handleChange();
  }

  start() {
    window.addEventListener('hashchange', this._boundHandler);
    this._handleChange();
  }

  stop() {
    window.removeEventListener('hashchange', this._boundHandler);
  }

  navigate(path) {
    const target = path.startsWith('#') ? path : `#${path}`;
    if (window.location.hash === target) {
      this._handleChange();
    } else {
      window.location.hash = target;
    }
  }

  parseHash(hash = window.location.hash) {
    const clean = (hash || '#/').replace(/^#/, '') || '/';
    const matchGame = clean.match(/^\/game\/([a-z0-9-]+)$/i);
    if (matchGame) {
      return { view: 'game', gameId: matchGame[1].toLowerCase() };
    }
    return { view: 'lobby', gameId: null };
  }

  _handleChange() {
    const route = this.parseHash();
    this.onRouteChange(route);
  }
}
