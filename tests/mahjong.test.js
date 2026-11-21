import test from 'node:test';
import assert from 'node:assert/strict';
import { MahjongTile } from '../js/games/mahjong/MahjongTile.js';
import { ShantenCalculator } from '../js/games/mahjong/ShantenCalculator.js';
import { YakuEvaluator } from '../js/games/mahjong/YakuEvaluator.js';
import { ScoreCalculator } from '../js/games/mahjong/ScoreCalculator.js';
import { MahjongEngine } from '../js/games/mahjong/MahjongEngine.js';
import { MahjongAI } from '../js/games/mahjong/MahjongAI.js';

function makeTiles(types) {
  return types.map((type, idx) => ({ id: idx + 1, type, isRed: false }));
}

test('Mahjong ShantenCalculator: detects complete hand, tenpai waits, and chiitoitsu', () => {
  // 123m 456p 789s 234m 5p (13 tiles, waiting on 5p tanki)
  const counts = MahjongTile.toCounts([0, 1, 2, 12, 13, 14, 24, 25, 26, 1, 2, 3, 13]);
  assert.equal(ShantenCalculator.calcShanten(counts, 0), 0);
  const waits = ShantenCalculator.getWaits(counts, 0);
  assert.ok(waits.includes(13));

  // Complete hand (+ 5p)
  counts[13]++;
  assert.equal(ShantenCalculator.calcShanten(counts, 0), -1);

  // Chiitoitsu complete (7 pairs)
  const chii = MahjongTile.toCounts([0, 0, 2, 2, 9, 9, 11, 11, 18, 18, 27, 27, 31, 31]);
  assert.equal(ShantenCalculator.calcShanten(chii, 0), -1);
});

test('Mahjong YakuEvaluator & ScoreCalculator: accurately scores Pinfu Tanyao Tsumo & Kokushi', () => {
  // 234m 345p 456s 678s 55p (win on 4m -> ryanmen)
  const hand = makeTiles([1, 2, 3, 11, 12, 13, 21, 22, 23, 23, 24, 25, 13, 13]);
  const res = YakuEvaluator.evaluate({
    concealedTiles: hand,
    melds: [],
    winTile: hand[2], // 4m
    isTsumo: true,
    seatWind: 28,
    roundWind: 27,
    isRiichi: true,
    isDealer: false,
  });
  assert.ok(res);
  const names = res.yaku.map((y) => y.name);
  assert.ok(names.includes('立直'));
  assert.ok(names.includes('門前清自摸和'));
  assert.ok(names.includes('平和'));
  assert.ok(names.includes('断么九'));
  assert.equal(res.fu, 20);
  assert.equal(res.han, 4);

  // Kokushi Musou
  const kokushi = makeTiles([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 33]);
  const kRes = YakuEvaluator.evaluate({
    concealedTiles: kokushi,
    melds: [],
    winTile: kokushi[13],
    isTsumo: false,
    seatWind: 27,
    roundWind: 27,
    isDealer: true,
  });
  assert.ok(kRes?.isYakuman);
  assert.equal(kRes.payment.ronPay, 48000);
});

test('Mahjong ScoreCalculator: Hanchan Uma/Oka settlement sums to zero', () => {
  const standings = ScoreCalculator.calcFinalSettlement([
    { seat: 0, initialSeat: 0, name: 'A', isHuman: true, score: 38200 },
    { seat: 1, initialSeat: 1, name: 'B', isHuman: false, score: 26400 },
    { seat: 2, initialSeat: 2, name: 'C', isHuman: false, score: 21100 },
    { seat: 3, initialSeat: 3, name: 'D', isHuman: false, score: 14300 },
  ]);
  assert.equal(standings[0].rank, 1);
  assert.equal(standings[3].rank, 4);
  const sum = Math.round(standings.reduce((s, x) => s + x.point, 0) * 10) / 10;
  assert.equal(sum, 0);
});

test('Mahjong full Hanchan simulation with 4 AIs completes cleanly without deadlock', () => {
  const engine = new MahjongEngine({ redDora: true, tobi: true });
  const ai = new MahjongAI();
  const diffs = ['advanced', 'intermediate', 'beginner', 'intermediate'];

  let steps = 0;
  const maxSteps = 3000;

  while (engine.phase !== 'match_end' && steps < maxSteps) {
    steps++;
    if (engine.phase === 'round_end') {
      engine.advanceAfterRound();
      continue;
    }

    const state = engine.getState();
    if (engine.phase === 'claim') {
      for (const [seat, opts] of [...engine.pendingClaims.entries()]) {
        if (engine.claimResponses.has(seat)) continue;
        const choice = ai.chooseClaimAction(state, seat, opts, diffs[seat]);
        engine.submitClaimResponse(seat, choice);
        if (engine.phase !== 'claim') break;
      }
      continue;
    }

    if (engine.phase === 'turn') {
      const seat = engine.currentTurn;
      const turnActions = engine.getTurnActions(seat);
      const choice = ai.chooseTurnAction(state, seat, turnActions, diffs[seat]);
      const res = engine.applyTurnAction(seat, choice);
      assert.equal(res.ok, true, `Failed turn action ${JSON.stringify(choice)} at step ${steps}`);
    }
  }

  assert.equal(engine.phase, 'match_end', `Simulation did not finish within ${maxSteps} steps`);
  assert.equal(engine.matchResult.standings.length, 4);
  const totalScore = engine.players.reduce((s, p) => s + p.score, 0);
  assert.equal(totalScore, 100000);
});
