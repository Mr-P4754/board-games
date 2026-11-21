import { MahjongTile } from './MahjongTile.js';
import { ScoreCalculator } from './ScoreCalculator.js';

const YAOCHU = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

/**
 * リーチ麻雀の和了形分解・全主要役/役満判定を行う評価クラス
 */
export class YakuEvaluator {
  /**
   * 和了手（手牌+和了牌+副露）を評価し、最高得点となる役一覧・翻数・符数・点数を返す
   * 役無し（ドラのみ）の場合は null を返す
   */
  static evaluate(ctx) {
    const {
      concealedTiles, // includes winTile!
      melds = [], // [{ kind: 'chi'|'pon'|'minkan'|'ankan'|'kakan', tiles: [...], open: bool }]
      winTile,
      isTsumo,
      seatWind, // 27..30
      roundWind, // 27..30
      isRiichi = false,
      isDoubleRiichi = false,
      isIppatsu = false,
      isRinshan = false,
      isChankan = false,
      isHaitei = false,
      isHoutei = false,
      isTenhou = false,
      isChiihou = false,
      doraTypes = [],
      uraDoraTypes = [],
      isDealer = false,
      honba = 0,
      riichiSticks = 0,
    } = ctx;

    const isMenzen = melds.every((m) => !m.open);
    const counts = MahjongTile.toCounts(concealedTiles);
    const allTiles = [...concealedTiles, ...melds.flatMap((m) => m.tiles)];
    const allCounts = MahjongTile.toCounts(allTiles);

    const candidates = [];

    // 1. Check Kokushi Musou (13 Orphans)
    if (melds.length === 0 && YakuEvaluator._isKokushi(counts)) {
      const yakumanList = [{ name: '国士無双', han: 13 }];
      if (isTenhou) yakumanList.unshift({ name: '天和', han: 13 });
      if (isChiihou) yakumanList.unshift({ name: '地和', han: 13 });
      candidates.push(YakuEvaluator._buildYakumanResult(yakumanList, isDealer, isTsumo, honba, riichiSticks));
    }

    // 2. Check Chiitoitsu (7 Pairs)
    if (melds.length === 0 && YakuEvaluator._isChiitoitsu(counts)) {
      const evalRes = YakuEvaluator._evalChiitoitsu(ctx, allTiles, allCounts, isMenzen);
      if (evalRes) candidates.push(evalRes);
    }

    // 3. Standard decompositions (4 melds + 1 pair)
    const decomps = YakuEvaluator.decomposeStandard(counts, 4 - melds.length);
    for (const decomp of decomps) {
      const evalRes = YakuEvaluator._evalStandard(ctx, decomp, allTiles, allCounts, isMenzen);
      if (evalRes) candidates.push(evalRes);
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.payment.total - a.payment.total || b.han - a.han || b.fu - a.fu);
    return candidates[0];
  }

  static _isKokushi(counts) {
    let pairs = 0;
    let total = 0;
    for (let i = 0; i < 34; i++) total += counts[i];
    if (total !== 14) return false;
    for (const idx of YAOCHU) {
      if (counts[idx] === 0) return false;
      if (counts[idx] === 2) pairs++;
    }
    return pairs === 1;
  }

  static _isChiitoitsu(counts) {
    let pairs = 0;
    for (let i = 0; i < 34; i++) {
      if (counts[i] === 2) pairs++;
      else if (counts[i] !== 0) return false;
    }
    return pairs === 7;
  }

  /**
   * 門前部分の牌カウントを (雀頭 + 必要面子数) に全通り分解
   */
  static decomposeStandard(counts, neededMelds) {
    const work = Int8Array.from(counts);
    const results = [];
    const seenKeys = new Set();

    for (let pair = 0; pair < 34; pair++) {
      if (work[pair] < 2) continue;
      work[pair] -= 2;
      const melds = [];
      const dfs = (startIdx) => {
        if (melds.length === neededMelds) {
          // Verify all tiles consumed
          for (let i = 0; i < 34; i++) {
            if (work[i] !== 0) return;
          }
          const key = `${pair}|${melds.map((m) => `${m.type}:${m.tile}`).sort().join(',')}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            results.push({ pair, melds: melds.map((m) => ({ ...m })) });
          }
          return;
        }

        let i = startIdx;
        while (i < 34 && work[i] === 0) i++;
        if (i >= 34) return;

        // Triplet
        if (work[i] >= 3) {
          work[i] -= 3;
          melds.push({ type: 'koutsu', tile: i, open: false });
          dfs(i);
          melds.pop();
          work[i] += 3;
        }

        // Sequence
        if (i < 27 && i % 9 <= 6 && work[i] >= 1 && work[i + 1] >= 1 && work[i + 2] >= 1) {
          work[i]--;
          work[i + 1]--;
          work[i + 2]--;
          melds.push({ type: 'shuntsu', tile: i, open: false });
          dfs(i);
          melds.pop();
          work[i]++;
          work[i + 1]++;
          work[i + 2]++;
        }
      };

      dfs(0);
      work[pair] += 2;
    }

    return results;
  }

  static _evalChiitoitsu(ctx, allTiles, allCounts, isMenzen) {
    const yakuman = YakuEvaluator._detectYakumanBase(ctx, null, allCounts, isMenzen);
    if (yakuman.length > 0) {
      return YakuEvaluator._buildYakumanResult(yakuman, ctx.isDealer, ctx.isTsumo, ctx.honba, ctx.riichiSticks);
    }

    const yaku = [];
    YakuEvaluator._addSituationalYaku(ctx, yaku, isMenzen);
    yaku.push({ name: '七対子', han: 2 });

    if (YakuEvaluator._isTanyao(allCounts)) yaku.push({ name: '断么九', han: 1 });
    if (YakuEvaluator._isHonroutou(allCounts)) yaku.push({ name: '混老頭', han: 2 });
    const flush = YakuEvaluator._flushYaku(allCounts, true);
    if (flush) yaku.push(flush);

    return YakuEvaluator._finalizeNormal(ctx, yaku, 25, allTiles);
  }

  static _evalStandard(ctx, decomp, allTiles, allCounts, isMenzen) {
    const winType = ctx.winTile.type;
    const openGroups = (ctx.melds || []).map((m) => {
      const sorted = [...m.tiles].sort((a, b) => a.type - b.type);
      const isSeq = m.kind === 'chi';
      const isKan = m.kind === 'minkan' || m.kind === 'ankan' || m.kind === 'kakan';
      return {
        type: isSeq ? 'shuntsu' : isKan ? 'kantsu' : 'koutsu',
        tile: sorted[0].type,
        open: m.open,
        kind: m.kind,
      };
    });

    const allGroups = [...decomp.melds, ...openGroups];

    // Check Yakuman first
    const yakuman = YakuEvaluator._detectYakumanStandard(ctx, decomp, allGroups, allCounts, isMenzen);
    if (yakuman.length > 0) {
      return YakuEvaluator._buildYakumanResult(yakuman, ctx.isDealer, ctx.isTsumo, ctx.honba, ctx.riichiSticks);
    }

    const yaku = [];
    YakuEvaluator._addSituationalYaku(ctx, yaku, isMenzen);

    // Count shuntsu / koutsu / kantsu / ankou
    const shuntsu = allGroups.filter((g) => g.type === 'shuntsu');
    const trips = allGroups.filter((g) => g.type === 'koutsu' || g.type === 'kantsu');
    const kantsu = allGroups.filter((g) => g.type === 'kantsu');

    // Concealed triplets count (if Ron completes a concealed triplet and not tanki, that triplet is open for Sanankou)
    let ankouCount = 0;
    let ronTripletUsed = false;
    for (const g of allGroups) {
      if (g.type === 'koutsu' || g.type === 'kantsu') {
        if (!g.open) {
          if (!ctx.isTsumo && !ronTripletUsed && g.type === 'koutsu' && g.tile === winType) {
            ronTripletUsed = true;
          } else {
            ankouCount++;
          }
        }
      }
    }

    // Pinfu (Menzen, 4 shuntsu, non-yakuhai pair, ryanmen wait)
    const isPinfu =
      isMenzen &&
      shuntsu.length === 4 &&
      !YakuEvaluator._isValuePair(decomp.pair, ctx.seatWind, ctx.roundWind) &&
      YakuEvaluator._hasRyanmenWait(decomp.melds, winType);
    if (isPinfu) yaku.push({ name: '平和', han: 1 });

    // Tanyao
    if (YakuEvaluator._isTanyao(allCounts)) {
      yaku.push({ name: '断么九', han: 1 });
    }

    // Iipeikou / Ryanpeikou (Menzen only)
    if (isMenzen && shuntsu.length >= 2) {
      const seqCounts = new Map();
      for (const s of shuntsu) {
        seqCounts.set(s.tile, (seqCounts.get(s.tile) || 0) + 1);
      }
      let identicalPairs = 0;
      for (const cnt of seqCounts.values()) {
        identicalPairs += Math.floor(cnt / 2);
      }
      if (identicalPairs === 2) yaku.push({ name: '二盃口', han: 3 });
      else if (identicalPairs === 1) yaku.push({ name: '一盃口', han: 1 });
    }

    // Yakuhai (Dragons, Seat Wind, Round Wind)
    for (const g of trips) {
      if (g.tile === 31) yaku.push({ name: '役牌（白）', han: 1 });
      if (g.tile === 32) yaku.push({ name: '役牌（發）', han: 1 });
      if (g.tile === 33) yaku.push({ name: '役牌（中）', han: 1 });
      if (g.tile === ctx.roundWind) yaku.push({ name: `場風（${MahjongTile.labelOf(g.tile)}）`, han: 1 });
      if (g.tile === ctx.seatWind) yaku.push({ name: `自風（${MahjongTile.labelOf(g.tile)}）`, han: 1 });
    }

    // Sanshoku Doujun
    if (YakuEvaluator._hasSanshoku(shuntsu)) {
      yaku.push({ name: '三色同順', han: isMenzen ? 2 : 1 });
    }

    // Ittsu (Pure Straight)
    if (YakuEvaluator._hasIttsu(shuntsu)) {
      yaku.push({ name: '一気通貫', han: isMenzen ? 2 : 1 });
    }

    // Toitoi
    if (trips.length === 4) {
      yaku.push({ name: '対々和', han: 2 });
    }

    // Sanankou
    if (ankouCount >= 3) {
      yaku.push({ name: '三暗刻', han: 2 });
    }

    // Sanshoku Doukou
    if (YakuEvaluator._hasSanshoku(trips.filter((t) => t.tile < 27))) {
      yaku.push({ name: '三色同刻', han: 2 });
    }

    // Sankantsu
    if (kantsu.length === 3) {
      yaku.push({ name: '三槓子', han: 2 });
    }

    // Shousangen
    const dragonTrips = trips.filter((g) => g.tile >= 31 && g.tile <= 33).length;
    if (dragonTrips === 2 && decomp.pair >= 31 && decomp.pair <= 33) {
      yaku.push({ name: '小三元', han: 2 });
    }

    // Honroutou / Junchan / Chanta
    if (YakuEvaluator._isHonroutou(allCounts)) {
      yaku.push({ name: '混老頭', han: 2 });
    } else if (YakuEvaluator._isJunchan(decomp.pair, allGroups)) {
      yaku.push({ name: '純全帯么九', han: isMenzen ? 3 : 2 });
    } else if (YakuEvaluator._isChanta(decomp.pair, allGroups)) {
      yaku.push({ name: '混全帯么九', han: isMenzen ? 2 : 1 });
    }

    // Honitsu / Chinitsu
    const flush = YakuEvaluator._flushYaku(allCounts, isMenzen);
    if (flush) yaku.push(flush);

    // Must have at least 1 real yaku before dora
    if (yaku.length === 0) return null;

    const fu = ScoreCalculator.calcFu({
      decomp,
      allGroups,
      winType,
      isTsumo: ctx.isTsumo,
      isMenzen,
      seatWind: ctx.seatWind,
      roundWind: ctx.roundWind,
      isPinfu,
    });

    return YakuEvaluator._finalizeNormal(ctx, yaku, fu, allTiles);
  }

  static _addSituationalYaku(ctx, yaku, isMenzen) {
    if (ctx.isDoubleRiichi) yaku.push({ name: 'ダブル立直', han: 2 });
    else if (ctx.isRiichi) yaku.push({ name: '立直', han: 1 });
    if (ctx.isIppatsu) yaku.push({ name: '一発', han: 1 });
    if (isMenzen && ctx.isTsumo) yaku.push({ name: '門前清自摸和', han: 1 });
    if (ctx.isRinshan) yaku.push({ name: '嶺上開花', han: 1 });
    if (ctx.isChankan) yaku.push({ name: '槍槓', han: 1 });
    if (ctx.isHaitei) yaku.push({ name: '海底摸月', han: 1 });
    if (ctx.isHoutei) yaku.push({ name: '河底撈魚', han: 1 });
  }

  static _detectYakumanBase(ctx, _decomp, allCounts, _isMenzen) {
    const list = [];
    if (ctx.isTenhou) list.push({ name: '天和', han: 13 });
    if (ctx.isChiihou) list.push({ name: '地和', han: 13 });

    // Tsuuiisou (All Honors)
    let allHonors = true;
    for (let i = 0; i < 27; i++) {
      if (allCounts[i] > 0) {
        allHonors = false;
        break;
      }
    }
    if (allHonors) list.push({ name: '字一色', han: 13 });

    return list;
  }

  static _detectYakumanStandard(ctx, decomp, allGroups, allCounts, isMenzen) {
    const list = YakuEvaluator._detectYakumanBase(ctx, decomp, allCounts, isMenzen);
    const trips = allGroups.filter((g) => g.type === 'koutsu' || g.type === 'kantsu');
    const kantsu = allGroups.filter((g) => g.type === 'kantsu');

    // Suuankou
    const concealedTrips = trips.filter((g) => !g.open);
    if (concealedTrips.length === 4 && (ctx.isTsumo || decomp.pair === ctx.winTile.type)) {
      list.push({ name: '四暗刻', han: 13 });
    }

    // Daisangen
    if (trips.filter((g) => g.tile >= 31 && g.tile <= 33).length === 3) {
      list.push({ name: '大三元', han: 13 });
    }

    // Daisuushii / Shousuushii
    const windTrips = trips.filter((g) => g.tile >= 27 && g.tile <= 30).length;
    if (windTrips === 4) list.push({ name: '大四喜', han: 13 });
    else if (windTrips === 3 && decomp.pair >= 27 && decomp.pair <= 30) {
      list.push({ name: '小四喜', han: 13 });
    }

    // Ryuuiisou (All Green)
    let allGreen = true;
    for (let i = 0; i < 34; i++) {
      if (allCounts[i] > 0 && !MahjongTile.isGreen(i)) {
        allGreen = false;
        break;
      }
    }
    if (allGreen) list.push({ name: '緑一色', han: 13 });

    // Chinroutou (All Terminals)
    let allTerm = true;
    for (let i = 0; i < 34; i++) {
      if (allCounts[i] > 0 && !MahjongTile.isTerminal(i)) {
        allTerm = false;
        break;
      }
    }
    if (allTerm) list.push({ name: '清老頭', han: 13 });

    // Suukantsu
    if (kantsu.length === 4) list.push({ name: '四槓子', han: 13 });

    // Chuuren Poutou
    if (isMenzen) {
      for (const base of [0, 9, 18]) {
        let onlyThisSuit = true;
        for (let i = 0; i < 34; i++) {
          if (allCounts[i] > 0 && (i < base || i >= base + 9)) {
            onlyThisSuit = false;
            break;
          }
        }
        if (onlyThisSuit && allCounts[base] >= 3 && allCounts[base + 8] >= 3) {
          let ok = true;
          for (let k = 1; k <= 7; k++) {
            if (allCounts[base + k] < 1) ok = false;
          }
          if (ok) list.push({ name: '九蓮宝燈', han: 13 });
        }
      }
    }

    return list;
  }

  static _buildYakumanResult(yakumanList, isDealer, isTsumo, honba, riichiSticks) {
    const count = yakumanList.length;
    const payment = ScoreCalculator.calcPayment({
      han: count * 13,
      fu: 0,
      isYakuman: true,
      yakumanCount: count,
      isDealer,
      isTsumo,
      honba,
      riichiSticks,
    });
    return {
      yaku: yakumanList,
      han: count * 13,
      fu: 0,
      isYakuman: true,
      payment,
    };
  }

  static _finalizeNormal(ctx, yaku, fu, allTiles) {
    if (yaku.length === 0) return null;

    // Count Dora, Red Dora, Ura Dora
    let dora = 0;
    let redDora = 0;
    let uraDora = 0;

    for (const tile of allTiles) {
      if (tile.isRed) redDora++;
      for (const dt of ctx.doraTypes || []) {
        if (tile.type === dt) dora++;
      }
      if (ctx.isRiichi || ctx.isDoubleRiichi) {
        for (const ut of ctx.uraDoraTypes || []) {
          if (tile.type === ut) uraDora++;
        }
      }
    }

    const fullYaku = [...yaku];
    if (dora > 0) fullYaku.push({ name: 'ドラ', han: dora });
    if (redDora > 0) fullYaku.push({ name: '赤ドラ', han: redDora });
    if (uraDora > 0) fullYaku.push({ name: '裏ドラ', han: uraDora });

    const totalHan = fullYaku.reduce((s, y) => s + y.han, 0);
    const payment = ScoreCalculator.calcPayment({
      han: totalHan,
      fu,
      isYakuman: false,
      yakumanCount: 0,
      isDealer: ctx.isDealer,
      isTsumo: ctx.isTsumo,
      honba: ctx.honba || 0,
      riichiSticks: ctx.riichiSticks || 0,
    });

    return {
      yaku: fullYaku,
      han: totalHan,
      fu,
      isYakuman: false,
      payment,
    };
  }

  static _isValuePair(pair, seatWind, roundWind) {
    return pair >= 31 || pair === seatWind || pair === roundWind;
  }

  static _hasRyanmenWait(concealedMelds, winType) {
    if (winType >= 27) return false;
    const n = winType % 9; // 0..8
    for (const m of concealedMelds) {
      if (m.type !== 'shuntsu') continue;
      // Waiting on low side (m.tile) when sequence isn't 7-8-9 (so m.tile%9 !== 6 -> wait isn't 7 on 89)
      if (m.tile === winType && m.tile % 9 < 6) return true;
      // Waiting on high side (m.tile + 2) when sequence isn't 1-2-3 (so m.tile%9 > 0 -> wait isn't 3 on 12)
      if (m.tile + 2 === winType && m.tile % 9 > 0) return true;
    }
    return false;
  }

  static _isTanyao(allCounts) {
    for (const idx of YAOCHU) {
      if (allCounts[idx] > 0) return false;
    }
    return true;
  }

  static _isHonroutou(allCounts) {
    let hasHonor = false;
    let hasTerm = false;
    for (let i = 0; i < 34; i++) {
      if (allCounts[i] === 0) continue;
      if (!MahjongTile.isYaochu(i)) return false;
      if (MahjongTile.isHonor(i)) hasHonor = true;
      else hasTerm = true;
    }
    return hasHonor && hasTerm;
  }

  static _groupHasYaochu(g) {
    if (g.type === 'shuntsu') {
      const n = g.tile % 9;
      return n === 0 || n === 6;
    }
    return MahjongTile.isYaochu(g.tile);
  }

  static _groupHasTerminal(g) {
    if (g.type === 'shuntsu') {
      const n = g.tile % 9;
      return n === 0 || n === 6;
    }
    return MahjongTile.isTerminal(g.tile);
  }

  static _isJunchan(pair, groups) {
    if (!MahjongTile.isTerminal(pair)) return false;
    let hasSeq = false;
    for (const g of groups) {
      if (g.type === 'shuntsu') hasSeq = true;
      if (!YakuEvaluator._groupHasTerminal(g)) return false;
    }
    return hasSeq;
  }

  static _isChanta(pair, groups) {
    if (!MahjongTile.isYaochu(pair)) return false;
    let hasSeq = false;
    for (const g of groups) {
      if (g.type === 'shuntsu') hasSeq = true;
      if (!YakuEvaluator._groupHasYaochu(g)) return false;
    }
    return hasSeq;
  }

  static _hasSanshoku(groups) {
    for (let n = 0; n <= 8; n++) {
      const hasM = groups.some((g) => g.tile === n);
      const hasP = groups.some((g) => g.tile === 9 + n);
      const hasS = groups.some((g) => g.tile === 18 + n);
      if (hasM && hasP && hasS) return true;
    }
    return false;
  }

  static _hasIttsu(shuntsu) {
    for (const base of [0, 9, 18]) {
      const a = shuntsu.some((g) => g.tile === base);
      const b = shuntsu.some((g) => g.tile === base + 3);
      const c = shuntsu.some((g) => g.tile === base + 6);
      if (a && b && c) return true;
    }
    return false;
  }

  static _flushYaku(allCounts, isMenzen) {
    let suits = new Set();
    let hasHonor = false;
    for (let i = 0; i < 34; i++) {
      if (allCounts[i] === 0) continue;
      if (i >= 27) hasHonor = true;
      else suits.add(Math.floor(i / 9));
    }
    if (suits.size === 1) {
      if (!hasHonor) return { name: '清一色', han: isMenzen ? 6 : 5 };
      return { name: '混一色', han: isMenzen ? 3 : 2 };
    }
    return null;
  }
}
