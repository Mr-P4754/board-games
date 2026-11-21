import { MahjongTile } from './MahjongTile.js';
import { ShantenCalculator } from './ShantenCalculator.js';
import { YakuEvaluator } from './YakuEvaluator.js';
import { ScoreCalculator } from './ScoreCalculator.js';

const WIND_NAMES = ['東', '南', '西', '北'];

/**
 * 4人リーチ麻雀（半荘戦・東1局〜南4局・CPU対戦専用）の対局状態エンジン
 */
export class MahjongEngine {
  constructor(options = {}) {
    this.options = {
      redDora: options.redDora !== false,
      tobi: options.tobi !== false,
    };
    this.reset(this.options);
  }

  reset(options = this.options) {
    this.options = {
      redDora: options.redDora !== false,
      tobi: options.tobi !== false,
    };

    const names = ['あなた', 'CPU 下家', 'CPU 対面', 'CPU 上家'];
    this.players = [0, 1, 2, 3].map((seat) => ({
      seat,
      initialSeat: seat,
      name: names[seat],
      isHuman: seat === 0,
      score: 25000,
      hand: [],
      drawnTile: null,
      melds: [],
      discards: [],
      isRiichi: false,
      isDoubleRiichi: false,
      isIppatsu: false,
      tempFuriten: false,
      riichiFuriten: false,
      justCalledKuikaeTypes: [],
    }));

    this.roundIndex = 0; // 0..3 = East 1..4, 4..7 = South 1..4
    this.dealerSeat = 0;
    this.honba = 0;
    this.riichiSticks = 0;
    this.phase = 'turn'; // 'turn' | 'claim' | 'round_end' | 'match_end'
    this.roundResult = null;
    this.matchResult = null;

    this.startRound();
  }

  getRoundWind() {
    return this.roundIndex < 4 ? 27 : 28; // 27: East, 28: South
  }

  getSeatWind(seat) {
    return 27 + ((seat - this.dealerSeat + 4) % 4);
  }

  getRoundLabel() {
    const wind = this.roundIndex < 4 ? '東' : '南';
    const num = (this.roundIndex % 4) + 1;
    return `${wind}${num}局`;
  }

  getDoraIndicators() {
    const inds = [];
    for (let i = 0; i < this.doraCount; i++) {
      inds.push(this.deadWall[4 + i * 2]);
    }
    return inds;
  }

  getDoraTypes() {
    return this.getDoraIndicators().map((t) => MahjongTile.doraFromIndicator(t.type));
  }

  getUraDoraIndicators() {
    const inds = [];
    for (let i = 0; i < this.doraCount; i++) {
      inds.push(this.deadWall[5 + i * 2]);
    }
    return inds;
  }

  getUraDoraTypes() {
    return this.getUraDoraIndicators().map((t) => MahjongTile.doraFromIndicator(t.type));
  }

  startRound() {
    const fullWall = MahjongTile.createWall(this.options.redDora);
    this.deadWall = fullWall.slice(-14);
    this.wall = fullWall.slice(0, fullWall.length - 14);
    this.rinshanIdx = 0;
    this.totalKans = 0;
    this.doraCount = 1;
    this.firstGoAround = true;
    this.lastActionWasKanDraw = false;
    this.lastDiscard = null; // { seat, tile }
    this.pendingClaims = new Map(); // seat -> claimOptions
    this.claimResponses = new Map(); // seat -> chosenAction
    this.roundResult = null;
    this.phase = 'turn';
    this.currentTurn = this.dealerSeat;

    for (const p of this.players) {
      p.hand = MahjongTile.sortTiles(this.wall.splice(0, 13));
      p.drawnTile = null;
      p.melds = [];
      p.discards = [];
      p.isRiichi = false;
      p.isDoubleRiichi = false;
      p.isIppatsu = false;
      p.tempFuriten = false;
      p.riichiFuriten = false;
      p.justCalledKuikaeTypes = [];
    }

    this._drawForSeat(this.dealerSeat, false);
  }

  _drawForSeat(seat, isRinshan = false) {
    const p = this.players[seat];
    p.tempFuriten = false;
    p.justCalledKuikaeTypes = [];

    let tile;
    if (isRinshan) {
      tile = this.deadWall[this.rinshanIdx++];
      this.lastActionWasKanDraw = true;
    } else {
      if (this.wall.length === 0) {
        this._resolveExhaustiveDraw();
        return;
      }
      tile = this.wall.shift();
      this.lastActionWasKanDraw = false;
    }

    p.drawnTile = tile;
    this.currentTurn = seat;
    this.phase = 'turn';
  }

  _getAllConcealed(player) {
    return player.drawnTile ? [...player.hand, player.drawnTile] : [...player.hand];
  }

  isMenzen(player) {
    return player.melds.every((m) => !m.open);
  }

  getWaitsForSeat(seat) {
    const p = this.players[seat];
    const counts = MahjongTile.toCounts(p.hand);
    return ShantenCalculator.getWaits(counts, p.melds.length);
  }

  isFuriten(seat) {
    const p = this.players[seat];
    if (p.tempFuriten || p.riichiFuriten) return true;
    const waits = this.getWaitsForSeat(seat);
    if (waits.length === 0) return false;
    const waitSet = new Set(waits);
    for (const d of p.discards) {
      if (waitSet.has(d.tile.type)) return true;
    }
    return false;
  }

  getTurnActions(seat = this.currentTurn) {
    if (this.phase !== 'turn' || seat !== this.currentTurn) return null;
    const p = this.players[seat];
    const allConcealed = this._getAllConcealed(p);

    // 1. Tsumo check
    let tsumoEval = null;
    if (p.drawnTile) {
      const counts = MahjongTile.toCounts(allConcealed);
      if (ShantenCalculator.calcShanten(counts, p.melds.length) === -1) {
        const isFirstUninterrupted = this.firstGoAround && p.discards.length === 0;
        tsumoEval = YakuEvaluator.evaluate({
          concealedTiles: allConcealed,
          melds: p.melds,
          winTile: p.drawnTile,
          isTsumo: true,
          seatWind: this.getSeatWind(seat),
          roundWind: this.getRoundWind(),
          isRiichi: p.isRiichi,
          isDoubleRiichi: p.isDoubleRiichi,
          isIppatsu: p.isIppatsu,
          isRinshan: this.lastActionWasKanDraw,
          isHaitei: this.wall.length === 0 && !this.lastActionWasKanDraw,
          isTenhou: isFirstUninterrupted && seat === this.dealerSeat,
          isChiihou: isFirstUninterrupted && seat !== this.dealerSeat,
          doraTypes: this.getDoraTypes(),
          uraDoraTypes: this.getUraDoraTypes(),
          isDealer: seat === this.dealerSeat,
          honba: this.honba,
          riichiSticks: this.riichiSticks,
        });
      }
    }

    // 2. Riichi candidates
    const riichiDiscardIds = [];
    if (
      !p.isRiichi &&
      this.isMenzen(p) &&
      p.score >= 1000 &&
      this.wall.length >= 4 &&
      allConcealed.length === 14
    ) {
      for (const tile of allConcealed) {
        const rem = allConcealed.filter((t) => t.id !== tile.id);
        const counts = MahjongTile.toCounts(rem);
        if (ShantenCalculator.calcShanten(counts, p.melds.length) === 0) {
          riichiDiscardIds.push(tile.id);
        }
      }
    }

    // 3. Ankan & Kakan options
    const ankanTypes = [];
    const kakanTypes = [];
    if (this.totalKans < 4 && this.wall.length > 0 && p.drawnTile) {
      const counts = MahjongTile.toCounts(allConcealed);
      for (let t = 0; t < 34; t++) {
        if (counts[t] === 4) {
          if (!p.isRiichi) {
            ankanTypes.push(t);
          } else if (p.drawnTile.type === t) {
            // Allow Riichi ankan only if waits remain identical
            const beforeWaits = this.getWaitsForSeat(seat).join(',');
            const testCounts = Int8Array.from(counts);
            testCounts[t] -= 4;
            const afterWaits = ShantenCalculator.getWaits(testCounts, p.melds.length + 1).join(',');
            if (beforeWaits === afterWaits) ankanTypes.push(t);
          }
        }
      }
      if (!p.isRiichi) {
        for (const m of p.melds) {
          if (m.kind === 'pon' && counts[m.tiles[0].type] >= 1) {
            kakanTypes.push(m.tiles[0].type);
          }
        }
      }
    }

    // 4. Discardable tiles
    let discardableIds;
    if (p.isRiichi && p.drawnTile) {
      discardableIds = [p.drawnTile.id];
    } else {
      const forbidden = new Set(p.justCalledKuikaeTypes || []);
      const filtered = allConcealed.filter((t) => !forbidden.has(t.type));
      discardableIds = (filtered.length > 0 ? filtered : allConcealed).map((t) => t.id);
    }

    return {
      canTsumo: Boolean(tsumoEval),
      tsumoEval,
      riichiDiscardIds,
      ankanTypes,
      kakanTypes,
      discardableIds,
    };
  }

  applyTurnAction(seat, action) {
    if (this.phase !== 'turn' || seat !== this.currentTurn) {
      return { ok: false, reason: '現在は行動できません' };
    }

    const p = this.players[seat];
    const legal = this.getTurnActions(seat);

    if (action.type === 'tsumo') {
      if (!legal.canTsumo) return { ok: false, reason: 'ツモ和了できません' };
      this._resolveTsumo(seat, legal.tsumoEval);
      return { ok: true, event: 'tsumo' };
    }

    if (action.type === 'ankan') {
      if (!legal.ankanTypes.includes(action.tileType)) return { ok: false };
      const all = this._getAllConcealed(p);
      const quad = all.filter((t) => t.type === action.tileType);
      p.hand = MahjongTile.sortTiles(all.filter((t) => t.type !== action.tileType));
      p.drawnTile = null;
      p.melds.push({ kind: 'ankan', tiles: quad, open: false });
      this.totalKans++;
      this.doraCount = Math.min(5, this.doraCount + 1);
      this._clearAllIppatsuAndFirstTurn();
      this._drawForSeat(seat, true);
      return { ok: true, event: 'kan' };
    }

    if (action.type === 'kakan') {
      if (!legal.kakanTypes.includes(action.tileType)) return { ok: false };
      const all = this._getAllConcealed(p);
      const idx = all.findIndex((t) => t.type === action.tileType);
      const added = all.splice(idx, 1)[0];
      p.hand = MahjongTile.sortTiles(all);
      p.drawnTile = null;
      const ponMeld = p.melds.find((m) => m.kind === 'pon' && m.tiles[0].type === action.tileType);
      ponMeld.kind = 'kakan';
      ponMeld.tiles.push(added);
      this.totalKans++;
      this.doraCount = Math.min(5, this.doraCount + 1);
      this._clearAllIppatsuAndFirstTurn();
      this._drawForSeat(seat, true);
      return { ok: true, event: 'kan' };
    }

    if (action.type === 'riichi' || action.type === 'discard') {
      const tileId = action.tileId;
      const isRiichiAction = action.type === 'riichi';

      if (isRiichiAction && !legal.riichiDiscardIds.includes(tileId)) {
        return { ok: false, reason: 'その牌ではリーチできません' };
      }
      if (!isRiichiAction && !legal.discardableIds.includes(tileId)) {
        return { ok: false, reason: 'その牌は切れません' };
      }

      const all = this._getAllConcealed(p);
      const idx = all.findIndex((t) => t.id === tileId);
      if (idx === -1) return { ok: false };
      const discarded = all.splice(idx, 1)[0];

      p.hand = MahjongTile.sortTiles(all);
      p.drawnTile = null;
      p.justCalledKuikaeTypes = [];

      if (isRiichiAction) {
        p.isRiichi = true;
        if (this.firstGoAround && p.discards.length === 0) {
          p.isDoubleRiichi = true;
        }
        p.isIppatsu = true;
        p.score -= 1000;
        this.riichiSticks += 1;
      } else {
        p.isIppatsu = false;
      }

      p.discards.push({
        tile: discarded,
        isRiichiDiscard: isRiichiAction,
        isCalled: false,
      });

      if (p.discards.length >= 1 && seat === (this.dealerSeat + 3) % 4) {
        this.firstGoAround = false;
      }

      this.lastDiscard = { seat, tile: discarded };
      this._openClaimWindow(seat, discarded);
      return { ok: true, event: isRiichiAction ? 'riichi' : 'discard' };
    }

    return { ok: false };
  }

  _clearAllIppatsuAndFirstTurn() {
    this.firstGoAround = false;
    for (const pl of this.players) {
      pl.isIppatsu = false;
    }
  }

  _openClaimWindow(discarderSeat, tile) {
    this.pendingClaims = new Map();
    this.claimResponses = new Map();

    for (let offset = 1; offset <= 3; offset++) {
      const seat = (discarderSeat + offset) % 4;
      const opts = this._computeClaimsForSeat(seat, discarderSeat, tile);
      if (opts) {
        this.pendingClaims.set(seat, opts);
      }
    }

    if (this.pendingClaims.size > 0) {
      this.phase = 'claim';
    } else {
      const nextSeat = (discarderSeat + 1) % 4;
      this._drawForSeat(nextSeat, false);
    }
  }

  _computeClaimsForSeat(seat, discarderSeat, tile) {
    const p = this.players[seat];
    const counts = MahjongTile.toCounts(p.hand);
    const options = {
      ronEval: null,
      canPon: false,
      canMinkan: false,
      chiCombos: [],
    };

    // 1. Ron check (must not be furiten and must have at least 1 yaku)
    if (!this.isFuriten(seat)) {
      const testHand = [...p.hand, tile];
      const testCounts = MahjongTile.toCounts(testHand);
      if (ShantenCalculator.calcShanten(testCounts, p.melds.length) === -1) {
        const evalRes = YakuEvaluator.evaluate({
          concealedTiles: testHand,
          melds: p.melds,
          winTile: tile,
          isTsumo: false,
          seatWind: this.getSeatWind(seat),
          roundWind: this.getRoundWind(),
          isRiichi: p.isRiichi,
          isDoubleRiichi: p.isDoubleRiichi,
          isIppatsu: p.isIppatsu,
          isHoutei: this.wall.length === 0,
          doraTypes: this.getDoraTypes(),
          uraDoraTypes: this.getUraDoraTypes(),
          isDealer: seat === this.dealerSeat,
          honba: this.honba,
          riichiSticks: this.riichiSticks,
        });
        if (evalRes) options.ronEval = evalRes;
      }
    }

    // 2. Calls (only if not riichi and wall has at least 1 tile left)
    if (!p.isRiichi && this.wall.length > 0) {
      if (counts[tile.type] >= 2) {
        options.canPon = true;
      }
      if (counts[tile.type] >= 3 && this.totalKans < 4) {
        options.canMinkan = true;
      }

      // Chi only from kamicha (discarderSeat is previous player)
      const isFromKamicha = (discarderSeat + 1) % 4 === seat;
      if (isFromKamicha && tile.type < 27) {
        const n = tile.type % 9;
        const base = tile.type - n;
        const pairs = [
          [n - 2, n - 1],
          [n - 1, n + 1],
          [n + 1, n + 2],
        ];
        for (const [a, b] of pairs) {
          if (a >= 0 && b <= 8 && counts[base + a] >= 1 && counts[base + b] >= 1) {
            options.chiCombos.push([base + a, base + b]);
          }
        }
      }
    }

    const hasAny =
      Boolean(options.ronEval) ||
      options.canPon ||
      options.canMinkan ||
      options.chiCombos.length > 0;
    return hasAny ? options : null;
  }

  submitClaimResponse(seat, action) {
    if (this.phase !== 'claim' || !this.pendingClaims.has(seat)) {
      return { ok: false };
    }
    const opts = this.pendingClaims.get(seat);
    // Track missed ron -> furiten!
    if (opts.ronEval && action.type !== 'ron') {
      const p = this.players[seat];
      p.tempFuriten = true;
      if (p.isRiichi) p.riichiFuriten = true;
    }

    this.claimResponses.set(seat, action);

    if (this.claimResponses.size === this.pendingClaims.size) {
      return this._resolveClaims();
    }
    return { ok: true, pending: true };
  }

  _resolveClaims() {
    const { seat: discarderSeat, tile } = this.lastDiscard;
    const order = [1, 2, 3].map((o) => (discarderSeat + o) % 4);

    // Priority 1: Ron (atamahane / closest in turn order)
    for (const seat of order) {
      const resp = this.claimResponses.get(seat);
      if (resp && resp.type === 'ron') {
        const evalRes = this.pendingClaims.get(seat).ronEval;
        this._resolveRon(seat, discarderSeat, tile, evalRes);
        return { ok: true, event: 'ron' };
      }
    }

    // Priority 2: Pon / Daiminkan
    for (const seat of order) {
      const resp = this.claimResponses.get(seat);
      if (resp && (resp.type === 'pon' || resp.type === 'minkan')) {
        this._executeOpenMeld(seat, discarderSeat, tile, resp.type);
        return { ok: true, event: resp.type };
      }
    }

    // Priority 3: Chi
    for (const seat of order) {
      const resp = this.claimResponses.get(seat);
      if (resp && resp.type === 'chi') {
        this._executeChi(seat, discarderSeat, tile, resp.combo);
        return { ok: true, event: 'chi' };
      }
    }

    // All passed -> next seat draws
    this.pendingClaims.clear();
    this.claimResponses.clear();
    this._drawForSeat((discarderSeat + 1) % 4, false);
    return { ok: true, event: 'pass' };
  }

  _markLastDiscardCalled(discarderSeat) {
    const disc = this.players[discarderSeat].discards;
    if (disc.length > 0) {
      disc[disc.length - 1].isCalled = true;
    }
  }

  _executeOpenMeld(seat, discarderSeat, tile, kind) {
    const p = this.players[seat];
    const need = kind === 'minkan' ? 3 : 2;
    const taken = [];
    const remaining = [];
    for (const t of p.hand) {
      if (t.type === tile.type && taken.length < need) taken.push(t);
      else remaining.push(t);
    }
    p.hand = MahjongTile.sortTiles(remaining);
    p.melds.push({ kind, tiles: [tile, ...taken], open: true });
    this._markLastDiscardCalled(discarderSeat);
    this._clearAllIppatsuAndFirstTurn();
    this.pendingClaims.clear();
    this.claimResponses.clear();

    if (kind === 'minkan') {
      this.totalKans++;
      this.doraCount = Math.min(5, this.doraCount + 1);
      this._drawForSeat(seat, true);
    } else {
      p.justCalledKuikaeTypes = [tile.type];
      this.currentTurn = seat;
      this.phase = 'turn';
    }
  }

  _executeChi(seat, discarderSeat, tile, combo) {
    const p = this.players[seat];
    const [t1, t2] = combo;
    let found1 = null;
    let found2 = null;
    const remaining = [];
    for (const t of p.hand) {
      if (!found1 && t.type === t1) found1 = t;
      else if (!found2 && t.type === t2) found2 = t;
      else remaining.push(t);
    }
    p.hand = MahjongTile.sortTiles(remaining);
    const tiles = MahjongTile.sortTiles([tile, found1, found2]);
    p.melds.push({ kind: 'chi', tiles, open: true });
    this._markLastDiscardCalled(discarderSeat);
    this._clearAllIppatsuAndFirstTurn();
    this.pendingClaims.clear();
    this.claimResponses.clear();

    // Kuikae restriction: cannot immediately discard same tile or suji opposite end of chi
    const kuikae = [tile.type];
    const minT = tiles[0].type;
    const maxT = tiles[2].type;
    if (tile.type === minT && maxT % 9 < 8) kuikae.push(maxT + 1);
    if (tile.type === maxT && minT % 9 > 0) kuikae.push(minT - 1);
    p.justCalledKuikaeTypes = kuikae;

    this.currentTurn = seat;
    this.phase = 'turn';
  }

  _resolveTsumo(winnerSeat, evalRes) {
    const deltas = [0, 0, 0, 0];
    const isDealer = winnerSeat === this.dealerSeat;
    const pay = evalRes.payment;

    for (let s = 0; s < 4; s++) {
      if (s === winnerSeat) continue;
      const loss = isDealer ? pay.dealerPay : s === this.dealerSeat ? pay.dealerPay : pay.nonDealerPay;
      deltas[s] -= loss;
      deltas[winnerSeat] += loss;
    }
    deltas[winnerSeat] += this.riichiSticks * 1000;

    for (let s = 0; s < 4; s++) this.players[s].score += deltas[s];
    const collectedSticks = this.riichiSticks;
    this.riichiSticks = 0;

    const winner = this.players[winnerSeat];
    this.roundResult = {
      type: 'tsumo',
      roundLabel: this.getRoundLabel(),
      honba: this.honba,
      winnerSeat,
      winnerName: winner.name,
      loserSeat: null,
      winTile: winner.drawnTile,
      hand: MahjongTile.sortTiles(winner.hand),
      melds: structuredClone(winner.melds),
      evalRes,
      doraIndicators: this.getDoraIndicators(),
      uraDoraIndicators: winner.isRiichi ? this.getUraDoraIndicators() : [],
      deltas,
      collectedSticks,
      renchan: winnerSeat === this.dealerSeat,
    };
    this.phase = 'round_end';
  }

  _resolveRon(winnerSeat, loserSeat, winTile, evalRes) {
    const deltas = [0, 0, 0, 0];
    const pay = evalRes.payment;
    deltas[loserSeat] -= pay.ronPay;
    deltas[winnerSeat] += pay.ronPay + this.riichiSticks * 1000;

    for (let s = 0; s < 4; s++) this.players[s].score += deltas[s];
    const collectedSticks = this.riichiSticks;
    this.riichiSticks = 0;

    const winner = this.players[winnerSeat];
    this.roundResult = {
      type: 'ron',
      roundLabel: this.getRoundLabel(),
      honba: this.honba,
      winnerSeat,
      winnerName: winner.name,
      loserSeat,
      loserName: this.players[loserSeat].name,
      winTile,
      hand: MahjongTile.sortTiles(winner.hand),
      melds: structuredClone(winner.melds),
      evalRes,
      doraIndicators: this.getDoraIndicators(),
      uraDoraIndicators: winner.isRiichi ? this.getUraDoraIndicators() : [],
      deltas,
      collectedSticks,
      renchan: winnerSeat === this.dealerSeat,
    };
    this.phase = 'round_end';
  }

  _resolveExhaustiveDraw() {
    const tenpaiSeats = [];
    for (let s = 0; s < 4; s++) {
      if (this.getWaitsForSeat(s).length > 0) tenpaiSeats.push(s);
    }

    const deltas = [0, 0, 0, 0];
    if (tenpaiSeats.length > 0 && tenpaiSeats.length < 4) {
      const gain = 3000 / tenpaiSeats.length;
      const loss = 3000 / (4 - tenpaiSeats.length);
      for (let s = 0; s < 4; s++) {
        deltas[s] = tenpaiSeats.includes(s) ? gain : -loss;
        this.players[s].score += deltas[s];
      }
    }

    const dealerTenpai = tenpaiSeats.includes(this.dealerSeat);
    this.roundResult = {
      type: 'draw',
      roundLabel: this.getRoundLabel(),
      honba: this.honba,
      tenpaiSeats,
      deltas,
      renchan: dealerTenpai,
    };
    this.phase = 'round_end';
  }

  /**
   * 局終了から次局または半荘終了へ遷移する
   */
  advanceAfterRound() {
    if (this.phase !== 'round_end' || !this.roundResult) return;

    // 1. Tobi check
    if (this.options.tobi && this.players.some((p) => p.score < 0)) {
      this._finishMatch('トビ（箱割れ）により終局');
      return;
    }

    const rr = this.roundResult;
    const isAllLast = this.roundIndex === 7;

    if (rr.renchan) {
      // Agari-yame on All Last if dealer won and is currently 1st
      if (isAllLast && rr.type !== 'draw') {
        const sorted = [...this.players].sort((a, b) => b.score - a.score || a.initialSeat - b.initialSeat);
        if (sorted[0].seat === this.dealerSeat) {
          this._finishMatch('オーラス親のトップ上がりやめにより終局');
          return;
        }
      }
      this.honba += 1;
      this.startRound();
      return;
    }

    // Rotate dealer
    this.roundIndex += 1;
    if (this.roundIndex >= 8) {
      this._finishMatch('南4局終了（半荘完走）');
      return;
    }

    this.dealerSeat = (this.dealerSeat + 1) % 4;
    this.honba = rr.type === 'draw' ? this.honba + 1 : 0;
    this.startRound();
  }

  _finishMatch(reason) {
    // Remaining riichi sticks go to 1st place
    if (this.riichiSticks > 0) {
      const top = [...this.players].sort((a, b) => b.score - a.score || a.initialSeat - b.initialSeat)[0];
      top.score += this.riichiSticks * 1000;
      this.riichiSticks = 0;
    }
    const standings = ScoreCalculator.calcFinalSettlement(this.players);
    this.matchResult = { reason, standings };
    this.phase = 'match_end';
  }

  getVisibleCounts(forSeat) {
    const vis = new Int8Array(34);
    const p = this.players[forSeat];
    for (const t of this._getAllConcealed(p)) vis[t.type]++;
    for (const pl of this.players) {
      for (const m of pl.melds) {
        for (const t of m.tiles) vis[t.type]++;
      }
      for (const d of pl.discards) {
        if (!d.isCalled) vis[d.tile.type]++;
      }
    }
    for (const ind of this.getDoraIndicators()) vis[ind.type]++;
    return vis;
  }

  getState() {
    const human = this.players[0];
    const humanWaits = this.getWaitsForSeat(0);
    return {
      phase: this.phase,
      roundIndex: this.roundIndex,
      roundLabel: this.getRoundLabel(),
      roundWind: this.getRoundWind(),
      dealerSeat: this.dealerSeat,
      currentTurn: this.currentTurn,
      honba: this.honba,
      riichiSticks: this.riichiSticks,
      tilesRemaining: this.wall.length,
      doraIndicators: this.getDoraIndicators(),
      doraTypes: this.getDoraTypes(),
      lastDiscard: this.lastDiscard ? { ...this.lastDiscard } : null,
      players: this.players.map((p) => ({
        seat: p.seat,
        name: p.name,
        isHuman: p.isHuman,
        wind: WIND_NAMES[(p.seat - this.dealerSeat + 4) % 4],
        seatWind: this.getSeatWind(p.seat),
        isDealer: p.seat === this.dealerSeat,
        score: p.score,
        hand: p.hand.map((t) => ({ ...t })),
        drawnTile: p.drawnTile ? { ...p.drawnTile } : null,
        melds: structuredClone(p.melds),
        discards: structuredClone(p.discards),
        isRiichi: p.isRiichi,
        isDoubleRiichi: p.isDoubleRiichi,
      })),
      humanTurnActions: this.phase === 'turn' && this.currentTurn === 0 ? this.getTurnActions(0) : null,
      humanClaimOptions: this.phase === 'claim' ? this.pendingClaims.get(0) || null : null,
      humanWaits,
      humanFuriten: this.isFuriten(0),
      roundResult: this.roundResult,
      matchResult: this.matchResult,
    };
  }
}
