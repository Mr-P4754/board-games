import { BaseGameEngine } from '../../core/BaseGameEngine.js';

const GRID_BY_DIFF = {
  beginner: 3,
  intermediate: 4,
  advanced: 5,
};

/**
 * ジグソーパズル（凹凸エッジ生成・スロット配置・自動ロック・完成判定）エンジン
 */
export class JigsawEngine extends BaseGameEngine {
  constructor(options = {}) {
    super(options);
    this.reset(options);
  }

  reset(options = this.options) {
    super.reset(options);
    this.difficulty = this.options.difficulty || 'intermediate';
    this.gridSize = GRID_BY_DIFF[this.difficulty] || 4;
    this.theme = this.options.theme || 'fuji';
    this.customImageUrl = this.options.customImageUrl || null;
    this.moves = 0;

    this._generatePieces();
  }

  _generatePieces() {
    const n = this.gridSize;
    // Generate matching interior edge tabs (+1 or -1)
    const hTabs = Array.from({ length: n - 1 }, () =>
      Array.from({ length: n }, () => (Math.random() < 0.5 ? 1 : -1))
    );
    const vTabs = Array.from({ length: n }, () =>
      Array.from({ length: n - 1 }, () => (Math.random() < 0.5 ? 1 : -1))
    );

    this.pieces = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const id = r * n + c;
        this.pieces.push({
          id,
          correctR: r,
          correctC: c,
          edges: {
            top: r === 0 ? 0 : -hTabs[r - 1][c],
            bottom: r === n - 1 ? 0 : hTabs[r][c],
            left: c === 0 ? 0 : -vTabs[r][c - 1],
            right: c === n - 1 ? 0 : vTabs[r][c],
          },
          placedSlot: null, // null = in tray, 0..(n*n-1) = on board
          locked: false,
        });
      }
    }

    // Shuffled tray display order
    this.trayOrder = this.pieces.map((p) => p.id);
    for (let i = this.trayOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = this.trayOrder[i];
      this.trayOrder[i] = this.trayOrder[j];
      this.trayOrder[j] = tmp;
    }
  }

  setCustomImage(dataUrl) {
    this.customImageUrl = dataUrl;
  }

  getCurrentPlayer() {
    return 1;
  }

  getLegalMoves() {
    return [];
  }

  getLockedCount() {
    return this.pieces.filter((p) => p.locked).length;
  }

  applyMove(action) {
    if (this.gameOver || !action) return { ok: false };

    if (action.type === 'place') {
      const { pieceId, slotIndex } = action;
      const piece = this.pieces[pieceId];
      if (!piece || piece.locked) return { ok: false };
      const total = this.gridSize * this.gridSize;
      if (slotIndex < 0 || slotIndex >= total) return { ok: false };

      const occupant = this.pieces.find((p) => p.placedSlot === slotIndex);
      if (occupant && occupant.locked) {
        return { ok: false, reason: 'その位置にはすでに正しいピースがはまっています' };
      }

      this._pushUndo();
      const prevSlot = piece.placedSlot;
      if (occupant && occupant.id !== piece.id) {
        occupant.placedSlot = prevSlot;
      }
      piece.placedSlot = slotIndex;
      this.moves += 1;

      let snapped = false;
      if (slotIndex === piece.id) {
        piece.locked = true;
        snapped = true;
      }
      if (occupant && occupant.placedSlot === occupant.id) {
        occupant.locked = true;
        snapped = true;
      }

      this.history.push(`ピース配置 (${this.getLockedCount()}/${total})`);

      if (this.getLockedCount() === total) {
        this.gameOver = true;
        this.result = {
          winner: 1,
          headline: 'ジグソーパズル完成！',
          reason: `${this.gridSize}×${this.gridSize}（全${total}ピース）を完成しました`,
        };
      }

      return { ok: true, sound: snapped ? 'call' : 'place' };
    }

    if (action.type === 'returnToTray') {
      const piece = this.pieces[action.pieceId];
      if (!piece || piece.locked || piece.placedSlot === null) return { ok: false };
      this._pushUndo();
      piece.placedSlot = null;
      return { ok: true, sound: 'place' };
    }

    return { ok: false };
  }

  _pushUndo() {
    this.undoStack.push({
      pieces: this.pieces.map((p) => ({ ...p, edges: { ...p.edges } })),
      moves: this.moves,
      historyLen: this.history.length,
    });
  }

  undo() {
    if (!this.canUndo()) return false;
    const snap = this.undoStack.pop();
    this.pieces = snap.pieces;
    this.moves = snap.moves;
    this.history.length = snap.historyLen;
    this.gameOver = false;
    this.result = null;
    return true;
  }

  resign() {
    this.gameOver = true;
  }

  getState() {
    return {
      gridSize: this.gridSize,
      theme: this.theme,
      customImageUrl: this.customImageUrl,
      pieces: this.pieces.map((p) => ({ ...p, edges: { ...p.edges } })),
      trayOrder: [...this.trayOrder],
      lockedCount: this.getLockedCount(),
      totalPieces: this.gridSize * this.gridSize,
      moves: this.moves,
      gameOver: this.gameOver,
    };
  }
}
