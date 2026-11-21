import { BaseAI } from '../../core/BaseAI.js';
import { MahjongTile } from './MahjongTile.js';
import { ShantenCalculator } from './ShantenCalculator.js';

/**
 * 4人麻雀 3段階CPU思考クラス
 * 初級：向聴数ベースの単純牌効率・鳴き少なめ・防御なし
 * 中級：有効牌最大化＋ドラ/役牌鳴き＋他家リーチ時の簡易現物ベタオリ
 * 上級：打点・手役志向＋危険度推定（現物/スジ/壁/字牌）に基づく押し引き判断
 */
export class MahjongAI extends BaseAI {
  chooseMove(state, difficulty = 'intermediate', options = {}) {
    if (options.decision === 'claim') {
      return this.chooseClaimAction(state, options.seat, options.claimOptions, difficulty);
    }
    return this.chooseTurnAction(state, options.seat, options.turnActions, difficulty);
  }

  chooseTurnAction(state, seat, turnActions, difficulty = 'intermediate') {
    if (!turnActions) return null;

    // 1. Always Tsumo!
    if (turnActions.canTsumo) {
      return { type: 'tsumo' };
    }

    const player = state.players[seat];
    const allTiles = player.drawnTile ? [...player.hand, player.drawnTile] : [...player.hand];
    const discardableSet = new Set(turnActions.discardableIds);
    const discardableTiles = allTiles.filter((t) => discardableSet.has(t.id));

    // If in Riichi, only drawn tile can be discarded (or wait-preserving ankan)
    if (player.isRiichi) {
      if (turnActions.ankanTypes.length > 0 && difficulty !== 'beginner') {
        return { type: 'ankan', tileType: turnActions.ankanTypes[0] };
      }
      return { type: 'discard', tileId: discardableTiles[0].id };
    }

    // 2. Ankan / Kakan (only if no opponent is riichi)
    const riichiOpps = state.players.filter((p) => p.seat !== seat && p.isRiichi);
    if (difficulty !== 'beginner' && riichiOpps.length === 0) {
      if (turnActions.ankanTypes.length > 0) {
        return { type: 'ankan', tileType: turnActions.ankanTypes[0] };
      }
      if (turnActions.kakanTypes.length > 0 && Math.random() < 0.7) {
        return { type: 'kakan', tileType: turnActions.kakanTypes[0] };
      }
    }

    // 3. Evaluate all discard candidates
    const visibleCounts = this._buildVisibleCounts(state, seat);
    const analyses = ShantenCalculator.analyzeDiscards(allTiles, player.melds.length, visibleCounts);
    const analysisByType = new Map(analyses.map((a) => [a.tileType, a]));

    // 4. Riichi decision when tenpai candidates exist
    if (turnActions.riichiDiscardIds.length > 0) {
      const riichiSet = new Set(turnActions.riichiDiscardIds);
      const riichiChoices = discardableTiles
        .filter((t) => riichiSet.has(t.id))
        .map((t) => ({ tile: t, info: analysisByType.get(t.type) }))
        .sort((a, b) => (b.info?.ukeire || 0) - (a.info?.ukeire || 0));

      const bestRiichi = riichiChoices[0];
      if (bestRiichi) {
        const shouldRiichi =
          difficulty === 'beginner'
            ? Math.random() < 0.65
            : difficulty === 'intermediate'
              ? (bestRiichi.info?.ukeire || 0) >= 2 || Math.random() < 0.8
              : (bestRiichi.info?.ukeire || 0) >= 3 || state.tilesRemaining > 16;

        if (shouldRiichi) {
          return { type: 'riichi', tileId: bestRiichi.tile.id };
        }
      }
    }

    // 5. Choose best discard based on difficulty
    if (difficulty === 'beginner') {
      return this._chooseBeginnerDiscard(discardableTiles, analysisByType);
    }

    const bestShanten = analyses[0]?.shanten ?? 4;
    if (difficulty === 'intermediate') {
      return this._chooseIntermediateDiscard(
        state,
        seat,
        discardableTiles,
        analysisByType,
        riichiOpps,
        bestShanten
      );
    }

    return this._chooseAdvancedDiscard(
      state,
      seat,
      discardableTiles,
      analysisByType,
      riichiOpps,
      visibleCounts,
      bestShanten
    );
  }

  _chooseBeginnerDiscard(discardableTiles, analysisByType) {
    const scored = discardableTiles.map((tile) => {
      const info = analysisByType.get(tile.type);
      const sh = info ? info.shanten : 5;
      const uk = info ? info.ukeire : 0;
      const noise = Math.random() * 14;
      const keepRed = tile.isRed ? -5 : 0;
      return { tile, score: -sh * 22 + uk * 0.4 + keepRed + noise };
    });
    scored.sort((a, b) => b.score - a.score);
    return { type: 'discard', tileId: scored[0].tile.id };
  }

  _chooseIntermediateDiscard(state, seat, discardableTiles, analysisByType, riichiOpps, bestShanten) {
    const doraSet = new Set(state.doraTypes || []);

    // Simple defense: fold with genbutsu if an opponent declared riichi and we are >= 2 shanten
    if (riichiOpps.length > 0 && bestShanten >= 2) {
      const safe = discardableTiles.filter((t) => this._isGenbutsuToAll(t.type, riichiOpps));
      if (safe.length > 0) {
        return { type: 'discard', tileId: safe[0].id };
      }
    }

    const scored = discardableTiles.map((tile) => {
      const info = analysisByType.get(tile.type);
      const sh = info ? info.shanten : 5;
      const uk = info ? info.ukeire : 0;
      const doraPenalty = (doraSet.has(tile.type) ? 18 : 0) + (tile.isRed ? 14 : 0);
      const yaoBonus = MahjongTile.isYaochu(tile.type) ? 2.5 : 0;
      return {
        tile,
        score: -sh * 120 + uk * 3.5 + yaoBonus - doraPenalty,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return { type: 'discard', tileId: scored[0].tile.id };
  }

  _chooseAdvancedDiscard(state, seat, discardableTiles, analysisByType, riichiOpps, visibleCounts, bestShanten) {
    const player = state.players[seat];
    const doraSet = new Set(state.doraTypes || []);
    const allTiles = player.drawnTile ? [...player.hand, player.drawnTile] : [...player.hand];
    const doraInHand = allTiles.reduce((s, t) => s + (t.isRed ? 1 : 0) + (doraSet.has(t.type) ? 1 : 0), 0);

    // Push/Fold factor against opponent riichi
    let defenseWeight = 0;
    if (riichiOpps.length > 0) {
      if (bestShanten >= 2) defenseWeight = 160; // Full fold (beta-ori)
      else if (bestShanten === 1 && doraInHand < 2) defenseWeight = 48; // Cautious push/fold
      else if (bestShanten === 0) defenseWeight = 10; // Push tenpai
    } else if (state.tilesRemaining < 14 && bestShanten >= 2) {
      defenseWeight = 18;
    }

    // Suit concentration bonus (Honitsu potential)
    const suitCounts = [0, 0, 0];
    for (const t of allTiles) {
      if (t.type < 27) suitCounts[Math.floor(t.type / 9)]++;
    }
    const dominantSuit = suitCounts.indexOf(Math.max(...suitCounts));
    const chaseFlush = suitCounts[dominantSuit] >= 9;

    const scored = discardableTiles.map((tile) => {
      const info = analysisByType.get(tile.type);
      const sh = info ? info.shanten : 5;
      const uk = info ? info.ukeire : 0;

      // Value retention
      let valueKeep = 0;
      if (doraSet.has(tile.type)) valueKeep += 24;
      if (tile.isRed) valueKeep += 20;
      if (tile.type >= 31 || tile.type === player.seatWind || tile.type === state.roundWind) {
        const cnt = allTiles.filter((x) => x.type === tile.type).length;
        if (cnt >= 2) valueKeep += 14;
      }
      if (chaseFlush && tile.type < 27 && Math.floor(tile.type / 9) === dominantSuit) {
        valueKeep += 12;
      }

      // Offense score
      const offense = -sh * 150 + uk * 4.5 - valueKeep + (MahjongTile.isYaochu(tile.type) ? 3 : 0);

      // Danger estimation against Riichi opponents
      let danger = 0;
      if (defenseWeight > 0) {
        for (const opp of riichiOpps) {
          danger += this._estimateDanger(tile.type, opp, visibleCounts, doraSet);
        }
      }

      return {
        tile,
        score: offense - danger * defenseWeight,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return { type: 'discard', tileId: scored[0].tile.id };
  }

  _isGenbutsuToAll(tileType, riichiOpps) {
    return riichiOpps.every((opp) => opp.discards.some((d) => d.tile.type === tileType));
  }

  _estimateDanger(tileType, opp, visibleCounts, doraSet) {
    // Genbutsu = 0 danger
    if (opp.discards.some((d) => d.tile.type === tileType)) return 0;

    // Honors: very safe if 2+ already visible
    if (tileType >= 27) {
      const seen = visibleCounts[tileType] || 0;
      if (seen >= 3) return 0.1;
      if (seen === 2) return 0.25;
      return 0.55;
    }

    const n = tileType % 9;
    const base = tileType - n;
    let danger = n === 0 || n === 8 ? 0.55 : n === 1 || n === 7 ? 0.72 : 1.0;

    // Suji check (4->1/7, 5->2/8, 6->3/9)
    const oppDiscSet = new Set(opp.discards.map((d) => d.tile.type));
    if (n <= 2 && oppDiscSet.has(base + n + 3)) danger *= 0.45;
    if (n >= 6 && oppDiscSet.has(base + n - 3)) danger *= 0.45;
    if (n >= 3 && n <= 5 && oppDiscSet.has(base + n - 3) && oppDiscSet.has(base + n + 3)) {
      danger *= 0.35;
    }

    // Kabe (No-chance): all 4 copies of adjacent blocking tile visible
    if (n === 0 && visibleCounts[base + 1] >= 4) danger *= 0.25;
    if (n === 8 && visibleCounts[base + 7] >= 4) danger *= 0.25;

    // Dora is extra dangerous
    if (doraSet.has(tileType)) danger += 0.35;

    return danger;
  }

  chooseClaimAction(state, seat, claimOptions, difficulty = 'intermediate') {
    if (!claimOptions) return { type: 'pass' };

    // 1. Always Ron!
    if (claimOptions.ronEval) {
      return { type: 'ron' };
    }

    const player = state.players[seat];
    const riichiOpps = state.players.filter((p) => p.seat !== seat && p.isRiichi);
    const tile = state.lastDiscard?.tile;
    if (!tile) return { type: 'pass' };

    const isYakuhai =
      tile.type >= 31 || tile.type === player.seatWind || tile.type === state.roundWind;
    const currentCounts = MahjongTile.toCounts(player.hand);
    const currentShanten = ShantenCalculator.calcShanten(currentCounts, player.melds.length);

    // Beginner: only calls Yakuhai pon occasionally
    if (difficulty === 'beginner') {
      if (claimOptions.canPon && isYakuhai && Math.random() < 0.7) {
        return { type: 'pon' };
      }
      return { type: 'pass' };
    }

    // Avoid opening hand carelessly against opponent Riichi unless advancing to tenpai
    if (riichiOpps.length > 0 && currentShanten >= 2) {
      return { type: 'pass' };
    }

    // Check if Pon improves shanten and aligns with a clear yaku (yakuhai / tanyao / already open / tenpai)
    const alreadyOpen = player.melds.some((m) => m.open);
    const allSimple = player.hand.every((t) => MahjongTile.isSimple(t.type)) && MahjongTile.isSimple(tile.type);

    if (claimOptions.canPon) {
      const testCounts = Int8Array.from(currentCounts);
      testCounts[tile.type] -= 2;
      const afterShanten = ShantenCalculator.calcShanten(testCounts, player.melds.length + 1);
      if (
        isYakuhai ||
        (afterShanten < currentShanten && (alreadyOpen || allSimple || afterShanten === 0))
      ) {
        return { type: 'pon' };
      }
    }

    // Chi evaluation (prefer when already open or tanyao or reaching tenpai)
    if (claimOptions.chiCombos.length > 0 && (alreadyOpen || allSimple || currentShanten <= 1)) {
      let bestCombo = null;
      let bestAfter = currentShanten;
      for (const combo of claimOptions.chiCombos) {
        const testCounts = Int8Array.from(currentCounts);
        testCounts[combo[0]]--;
        testCounts[combo[1]]--;
        const after = ShantenCalculator.calcShanten(testCounts, player.melds.length + 1);
        if (after < bestAfter) {
          bestAfter = after;
          bestCombo = combo;
        }
      }
      if (bestCombo && (alreadyOpen || allSimple || (bestAfter === 0 && difficulty === 'advanced'))) {
        return { type: 'chi', combo: bestCombo };
      }
    }

    return { type: 'pass' };
  }

  _buildVisibleCounts(state, seat) {
    const vis = new Int8Array(34);
    const me = state.players[seat];
    for (const t of me.hand) vis[t.type]++;
    if (me.drawnTile) vis[me.drawnTile.type]++;
    for (const pl of state.players) {
      for (const m of pl.melds) {
        for (const t of m.tiles) vis[t.type]++;
      }
      for (const d of pl.discards) {
        if (!d.isCalled) vis[d.tile.type]++;
      }
    }
    for (const ind of state.doraIndicators || []) vis[ind.type]++;
    return vis;
  }
}
