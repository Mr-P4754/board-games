/**
 * 非破壊的なトースト通知マネージャクラス
 */
export class ToastManager {
  constructor(rootEl) {
    this.rootEl = rootEl;
  }

  show(message, durationMs = 2400) {
    if (!this.rootEl || !message) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.rootEl.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, durationMs);
  }
}
