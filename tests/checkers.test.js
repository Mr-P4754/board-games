import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckersEngine } from '../js/games/checkers/CheckersEngine.js';
import { CheckersAI } from '../js/games/checkers/CheckersAI.js';

test('Checkers: initial position has 7 legal moves and enforces mandatory multi-jump', () => {
  const engine = new CheckersEngine();
  assert.equal(engine.getLegalMoves().length, 7);

  // Set up double jump for Red (1) from (5,0) -> (3,2) -> (1,4)
  engine.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  engine.board[5][0] = { owner: 1, king: false };
  engine.board[4][1] = { owner: 2, king: false };
  engine.board[2][3] = { owner: 2, king: false };
  engine.board[0][7] = { owner: 2, king: false };
  engine.currentPlayer = 1;

  const legal = engine.getLegalMoves();
  assert.equal(legal.length, 1);
  assert.equal(legal[0].captures.length, 2);
  assert.deepEqual(legal[0].to, { r: 1, c: 4 });

  assert.equal(engine.applyMove(legal[0]).ok, true);
  assert.equal(engine.getState().counts.p2, 1);
  engine.undo();
  assert.equal(engine.getState().counts.p2, 3);
});

test('Checkers: all 3 AI levels return valid legal moves', () => {
  const engine = new CheckersEngine();
  const ai = new CheckersAI();
  for (const diff of ['beginner', 'intermediate', 'advanced']) {
    const move = ai.chooseMove(engine.getState(), diff);
    assert.ok(move, `Expected move for ${diff}`);
    const testEngine = new CheckersEngine();
    assert.equal(testEngine.applyMove(move).ok, true);
  }
});
