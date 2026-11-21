/**
 * 盤面描画クラスの抽象基底クラス
 */
export class BaseRenderer {
  constructor(container, onAction) {
    this.container = container;
    this.onAction = onAction;
  }

  mount() {
    // Subclass initializes DOM / SVG / Canvas inside this.container
  }

  render(_viewModel) {
    throw new Error('render() must be implemented by subclass');
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
