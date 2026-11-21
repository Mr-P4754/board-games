/**
 * コンピューター対戦AI（初級・中級・上級）の基底クラス
 */
export class BaseAI {
  /**
   * 局面状態から次の一手を選択する
   * @param {object} _state シリアライズ可能なゲーム状態
   * @param {'beginner'|'intermediate'|'advanced'} _difficulty
   * @param {object} _options
   * @returns {object|null}
   */
  chooseMove(_state, _difficulty = 'intermediate', _options = {}) {
    throw new Error('chooseMove() must be implemented by subclass');
  }

  /**
   * 配列からランダムに1要素を返すユーティリティ
   */
  pickRandom(items) {
    if (!items || items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  }
}
