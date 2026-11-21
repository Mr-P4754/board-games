/**
 * 全ゲームのルール・状態管理クラスが継承する基底クラス（DOM非依存）
 */
export class BaseGameEngine {
  constructor(options = {}) {
    this.options = { ...options };
    this.history = [];
    this.undoStack = [];
    this.gameOver = false;
    this.result = null;
  }

  reset(options = this.options) {
    this.options = { ...options };
    this.history = [];
    this.undoStack = [];
    this.gameOver = false;
    this.result = null;
  }

  getCurrentPlayer() {
    throw new Error('getCurrentPlayer() must be implemented by subclass');
  }

  getLegalMoves() {
    throw new Error('getLegalMoves() must be implemented by subclass');
  }

  applyMove(_move) {
    throw new Error('applyMove() must be implemented by subclass');
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  undo() {
    throw new Error('undo() must be implemented by subclass');
  }

  resign(_player) {
    throw new Error('resign() must be implemented by subclass');
  }

  isGameOver() {
    return this.gameOver;
  }

  getResult() {
    return this.result;
  }

  getState() {
    throw new Error('getState() must be implemented by subclass');
  }

  getMoveHistory() {
    return [...this.history];
  }
}
