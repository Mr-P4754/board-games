const SETTINGS_KEY = 'banyukan_settings_v1';
const STATS_KEY = 'banyukan_stats_v1';

const DEFAULT_SETTINGS = {
  theme: 'light',
  sound: true,
  showHints: true,
  showLastMove: true,
};

/**
 * ユーザー設定およびゲーム戦績をLocalStorageに永続化するクラス
 */
export class StorageManager {
  constructor() {
    this.settings = this._load(SETTINGS_KEY, { ...DEFAULT_SETTINGS });
    this.stats = this._load(STATS_KEY, {});
  }

  _load(key, fallback) {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  }

  _save(key, data) {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(data));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this._save(SETTINGS_KEY, this.settings);
    return this.getSettings();
  }

  /**
   * 2人対戦系ゲームの戦績を記録
   * @param {string} gameId
   * @param {'cpu'|'pvp'} mode
   * @param {'beginner'|'intermediate'|'advanced'|null} difficulty
   * @param {'win'|'lose'|'draw'} outcome
   */
  recordResult(gameId, mode, difficulty, outcome) {
    if (!this.stats[gameId]) {
      this.stats[gameId] = {
        total: { win: 0, lose: 0, draw: 0 },
        cpu: {
          beginner: { win: 0, lose: 0, draw: 0 },
          intermediate: { win: 0, lose: 0, draw: 0 },
          advanced: { win: 0, lose: 0, draw: 0 },
        },
        pvp: { played: 0 },
      };
    }

    const entry = this.stats[gameId];
    if (mode === 'pvp') {
      entry.pvp.played += 1;
    } else if (difficulty && entry.cpu[difficulty]) {
      entry.cpu[difficulty][outcome] += 1;
      entry.total[outcome] += 1;
    }
    this._save(STATS_KEY, this.stats);
  }

  /**
   * 4人麻雀の半荘順位を記録
   * @param {'beginner'|'intermediate'|'advanced'} difficulty
   * @param {number} rank 1..4
   */
  recordMahjongRank(difficulty, rank) {
    if (!this.stats.mahjong) {
      this.stats.mahjong = {
        total: { played: 0, ranks: [0, 0, 0, 0] },
        cpu: {
          beginner: { played: 0, ranks: [0, 0, 0, 0] },
          intermediate: { played: 0, ranks: [0, 0, 0, 0] },
          advanced: { played: 0, ranks: [0, 0, 0, 0] },
        },
      };
    }
    const idx = Math.max(0, Math.min(3, rank - 1));
    this.stats.mahjong.total.played += 1;
    this.stats.mahjong.total.ranks[idx] += 1;
    if (this.stats.mahjong.cpu[difficulty]) {
      this.stats.mahjong.cpu[difficulty].played += 1;
      this.stats.mahjong.cpu[difficulty].ranks[idx] += 1;
    }
    this._save(STATS_KEY, this.stats);
  }

  getGameStats(gameId) {
    return this.stats[gameId] || null;
  }

  getAllStats() {
    return structuredClone(this.stats);
  }

  clearStats() {
    this.stats = {};
    this._save(STATS_KEY, this.stats);
  }
}
