import test from 'node:test';
import assert from 'node:assert/strict';
import { OthelloEngine } from '../js/games/othello/OthelloEngine.js';
import { OthelloAI } from '../js/games/othello/OthelloAI.js';

test('Othello: initial position has 4 legal moves and flips correctly', () => {
  const engine = new OthelloEngine();
  assert.equal(engine.getLegalMoves().length, 4);
  const res = engine.applyMove({ r: 2, c: 3 });
  assert.equal(res.ok, true);
  assert.equal(res.flippedCount, 1);
  const state = engine.getState();
  assert.equal(state.counts.black, 4);
  assert.equal(state.counts.white, 1);
  assert.equal(state.currentPlayer, 2);

  engine.undo();
  assert.equal(engine.getState().counts.black, 2);
  assert.equal(engine.getState().counts.white, 2);
});

test('Othello: all 3 AI levels return valid legal moves', () => {
  const engine = new OthelloEngine();
  const ai = new OthelloAI();
  for (const diff of ['beginner', 'intermediate', 'advanced']) {
    const move = ai.chooseMove(engine.getState(), diff);
    assert.ok(move, `Expected move for ${diff}`);
    const legal = engine.getLegalMoves();
    assert.ok(legal.some((m) => m.r === move.r && m.c === move.c));
  }
});
