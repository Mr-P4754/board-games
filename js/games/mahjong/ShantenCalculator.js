import { MahjongTile } from './MahjongTile.js';

const YAOCHU = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

/**
 * 麻雀の正確な向聴数（通常手・七対子・国士無双）と受入有効牌（待ち牌）を計算するクラス
 */
export class ShantenCalculator {
  static calcShanten(counts, openMeldsCount = 0) {
    let min = ShantenCalculator.calcStandardShanten(counts, openMeldsCount);
    if (openMeldsCount === 0) {
      min = Math.min(min, ShantenCalculator.calcChiitoitsuShanten(counts));
      min = Math.min(min, ShantenCalculator.calcKokushiShanten(counts));
    }
    return min;
  }

  static calcChiitoitsuShanten(counts) {
    let pairs = 0;
    let kinds = 0;
    for (let i = 0; i < 34; i++) {
      if (counts[i] > 0) kinds++;
      if (counts[i] >= 2) pairs++;
    }
    let shanten = 6 - pairs;
    if (kinds < 7) shanten += 7 - kinds;
    return shanten;
  }

  static calcKokushiShanten(counts) {
    let unique = 0;
    let hasPair = false;
    for (const idx of YAOCHU) {
      if (counts[idx] > 0) {
        unique++;
        if (counts[idx] >= 2) hasPair = true;
      }
    }
    return 13 - unique - (hasPair ? 1 : 0);
  }

  static calcStandardShanten(counts, openMeldsCount = 0) {
    const work = Int8Array.from(counts);
    const maxGroups = 4 - openMeldsCount;
    let bestShanten = 8;

    const evalWithoutPair = () => {
      const sh = ShantenCalculator._searchGroups(work, maxGroups, 0, openMeldsCount);
      if (sh < bestShanten) bestShanten = sh;
    };

    // Case 1: Try each possible pair as head (Jantou)
    for (let i = 0; i < 34; i++) {
      if (work[i] >= 2) {
        work[i] -= 2;
        const sh = ShantenCalculator._searchGroups(work, maxGroups, 1, openMeldsCount);
        if (sh < bestShanten) bestShanten = sh;
        work[i] += 2;
        if (bestShanten === -1) return -1;
      }
    }

    // Case 2: No pair chosen yet
    evalWithoutPair();
    return bestShanten;
  }

  static _searchGroups(counts, maxGroups, hasPair, openMeldsCount) {
    // Honors can only form triplets or pairs (taatsu)
    let honorMelds = 0;
    let honorTaatsu = 0;
    for (let i = 27; i < 34; i++) {
      if (counts[i] >= 3) honorMelds++;
      else if (counts[i] === 2) honorTaatsu++;
    }

    // Analyze each of the 3 number suits independently for speed!
    const s0 = ShantenCalculator._suitBest(counts, 0);
    const s1 = ShantenCalculator._suitBest(counts, 9);
    const s2 = ShantenCalculator._suitBest(counts, 18);

    let best = 8;
    for (const [m0, t0] of s0) {
      for (const [m1, t1] of s1) {
        for (const [m2, t2] of s2) {
          const melds = Math.min(maxGroups, m0 + m1 + m2 + honorMelds);
          const taatsu = Math.min(maxGroups - melds, t0 + t1 + t2 + honorTaatsu);
          const sh = 8 - 2 * (melds + openMeldsCount) - taatsu - hasPair;
          if (sh < best) best = sh;
        }
      }
    }
    return best;
  }

  /**
   * 1つの数牌スート（9種）から可能な (面子数, 搭子数) のパレート最適集合を返す
   */
  static _suitBest(counts, offset) {
    const arr = new Int8Array(9);
    let total = 0;
    for (let i = 0; i < 9; i++) {
      arr[i] = counts[offset + i];
      total += arr[i];
    }
    if (total === 0) return [[0, 0]];

    // bestTaatsuByMelds[m] = max taatsu achievable with m melds
    const bestT = [-1, -1, -1, -1, -1];

    const dfs = (idx, melds, taatsu) => {
      while (idx < 9 && arr[idx] === 0) idx++;
      if (idx >= 9) {
        if (taatsu > bestT[melds]) bestT[melds] = taatsu;
        return;
      }

      // 1. Triplet (Koutsu)
      if (arr[idx] >= 3) {
        arr[idx] -= 3;
        dfs(idx, melds + 1, taatsu);
        arr[idx] += 3;
      }

      // 2. Sequence (Shuntsu)
      if (idx <= 6 && arr[idx] >= 1 && arr[idx + 1] >= 1 && arr[idx + 2] >= 1) {
        arr[idx]--;
        arr[idx + 1]--;
        arr[idx + 2]--;
        dfs(idx, melds + 1, taatsu);
        arr[idx]++;
        arr[idx + 1]++;
        arr[idx + 2]++;
      }

      // 3. Pair taatsu
      if (arr[idx] >= 2) {
        arr[idx] -= 2;
        dfs(idx, melds, taatsu + 1);
        arr[idx] += 2;
      }

      // 4. Ryanmen/Penchan taatsu (idx, idx+1)
      if (idx <= 7 && arr[idx] >= 1 && arr[idx + 1] >= 1) {
        arr[idx]--;
        arr[idx + 1]--;
        dfs(idx, melds, taatsu + 1);
        arr[idx]++;
        arr[idx + 1]++;
      }

      // 5. Kanchan taatsu (idx, idx+2)
      if (idx <= 6 && arr[idx] >= 1 && arr[idx + 2] >= 1) {
        arr[idx]--;
        arr[idx + 2]--;
        dfs(idx, melds, taatsu + 1);
        arr[idx]++;
        arr[idx + 2]++;
      }

      // 6. Skip one isolated tile
      arr[idx]--;
      dfs(idx, melds, taatsu);
      arr[idx]++;
    };

    dfs(0, 0, 0);
    const out = [];
    for (let m = 0; m <= 4; m++) {
      if (bestT[m] >= 0) out.push([m, bestT[m]]);
    }
    return out.length > 0 ? out : [[0, 0]];
  }

  /**
   * 聴牌手（13-3*melds枚）に対する待ち牌リスト（0..33）を返す
   */
  static getWaits(counts, openMeldsCount = 0) {
    const current = ShantenCalculator.calcShanten(counts, openMeldsCount);
    if (current > 0) return [];
    const waits = [];
    const work = Int8Array.from(counts);
    for (let t = 0; t < 34; t++) {
      if (work[t] >= 4) continue;
      work[t]++;
      if (ShantenCalculator.calcShanten(work, openMeldsCount) === -1) {
        waits.push(t);
      }
      work[t]--;
    }
    return waits;
  }

  /**
   * 14枚手牌に対し、各打牌候補の向聴数・有効牌枚数（受入）を計算
   */
  static analyzeDiscards(tiles, openMeldsCount = 0, visibleCounts = null) {
    const counts = MahjongTile.toCounts(tiles);
    const seen = new Set();
    const results = [];

    for (const tile of tiles) {
      if (seen.has(tile.type)) continue;
      seen.add(tile.type);

      counts[tile.type]--;
      const shanten = ShantenCalculator.calcShanten(counts, openMeldsCount);
      let ukeire = 0;
      const improvingTypes = [];

      for (let t = 0; t < 34; t++) {
        if (t === tile.type || counts[t] >= 4) continue;
        const used = visibleCounts ? visibleCounts[t] : counts[t];
        const rem = Math.max(0, 4 - used);
        if (rem === 0) continue;

        counts[t]++;
        if (ShantenCalculator.calcShanten(counts, openMeldsCount) < shanten) {
          ukeire += rem;
          improvingTypes.push(t);
        }
        counts[t]--;
      }

      counts[tile.type]++;
      results.push({ tileType: tile.type, shanten, ukeire, improvingTypes });
    }

    results.sort((a, b) => a.shanten - b.shanten || b.ukeire - a.ukeire);
    return results;
  }
}
