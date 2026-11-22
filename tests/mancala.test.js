import test from 'node:test';
import assert from 'node:assert/strict';
import { MancalaEngine } from '../js/games/mancala/MancalaEngine.js';
import { MancalaAI } from '../js/games/mancala/MancalaAI.js';

test('Mancala: extra turn when landing in own store and opposite pit capture', () => {
  const engine = new MancalaEngine({ stonesPerPit: 4 });
  // Pit 2 has 4 stones -> lands in 3,4,5,6 (own store!) -> extra turn
  const res1 = engine.applyMove({ pit: 2 });
  assert.equal(res1.ok, true);
  assert.equal(res1.extraTurn, true);
  assert.equal(engine.getCurrentPlayer(), 1);
  assert.equal(engine.getState().pits[6], 1);

  // Set up capture: pit 0 has 2 stones, pit 2 is empty, opposite pit 10 has 5 stones
  engine.pits = [2, 0, 0, 0, 0, 1, 1, 1, 1, 1, 5, 1, 1, 0];
  engine.currentPlayer = 1;
  const res2 = engine.applyMove({ pit: 0 });
  assert.equal(res2.ok, true);
  assert.equal(res2.captured, true);
  assert.equal(engine.getState().pits[6], 7); // 1 + 1 + 5
  assert.equal(engine.getState().pits[2], 0);
  assert.equal(engine.getState().pits[10], 0);
});

test('Mancala: all 3 AI levels return valid legal moves', () => {
  const engine = new MancalaEngine({ stonesPerPit: 4 });
  const ai = new MancalaAI();
  for (const diff of ['beginner', 'intermediate', 'advanced']) {
    const move = ai.chooseMove(engine.getState(), diff);
    assert.ok(move && move.pit >= 0 && move.pit <= 5);
  }
});
