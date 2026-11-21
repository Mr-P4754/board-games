/**
 * メインスレッドとAI用Web Workerを仲介するブリッジクラス
 * Module Worker非対応環境では自動的にメインスレッド実行へフォールバックする
 */
export class AIWorkerBridge {
  constructor() {
    this.worker = null;
    this.pending = new Map();
    this.seq = 0;
    this.useFallback = false;
    this.fallbackCache = new Map();
  }

  _ensureWorker() {
    if (this.useFallback) return null;
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined') {
      this.useFallback = true;
      return null;
    }
    try {
      const workerUrl = new URL('./aiWorkerEntry.js', import.meta.url);
      this.worker = new Worker(workerUrl, { type: 'module' });
      this.worker.addEventListener('message', (event) => {
        const { requestId, ok, move, error } = event.data;
        const job = this.pending.get(requestId);
        if (!job) return;
        this.pending.delete(requestId);
        if (ok) job.resolve(move);
        else job.reject(new Error(error));
      });
      this.worker.addEventListener('error', () => {
        this.useFallback = true;
        this._rejectAll('Worker failed, switching to fallback');
        this.terminate();
      });
      return this.worker;
    } catch {
      this.useFallback = true;
      return null;
    }
  }

  _rejectAll(reason) {
    for (const job of this.pending.values()) {
      job.reject(new Error(reason));
    }
    this.pending.clear();
  }

  async computeMove(gameId, state, difficulty, options = {}) {
    const worker = this._ensureWorker();
    if (!worker) {
      return this._computeFallback(gameId, state, difficulty, options);
    }

    const requestId = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      worker.postMessage({ requestId, gameId, state, difficulty, options });
    }).catch(() => this._computeFallback(gameId, state, difficulty, options));
  }

  async _computeFallback(gameId, state, difficulty, options) {
    if (!this.fallbackCache.has(gameId)) {
      const map = {
        othello: () => import('../games/othello/OthelloAI.js').then((m) => new m.OthelloAI()),
        gomoku: () => import('../games/gomoku/GomokuAI.js').then((m) => new m.GomokuAI()),
        chess: () => import('../games/chess/ChessAI.js').then((m) => new m.ChessAI()),
        shogi: () => import('../games/shogi/ShogiAI.js').then((m) => new m.ShogiAI()),
        go: () => import('../games/go/GoAI.js').then((m) => new m.GoAI()),
        mahjong: () => import('../games/mahjong/MahjongAI.js').then((m) => new m.MahjongAI()),
      };
      this.fallbackCache.set(gameId, await map[gameId]());
    }
    const ai = this.fallbackCache.get(gameId);
    return new Promise((resolve) => {
      setTimeout(() => resolve(ai.chooseMove(state, difficulty, options)), 16);
    });
  }

  cancelPending() {
    if (this.pending.size > 0 && this.worker) {
      this.terminate();
    }
    this.pending.clear();
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
