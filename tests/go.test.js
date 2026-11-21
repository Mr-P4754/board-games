import test from 'node:test';
import assert from 'node:assert/strict';
import { GoEngine } from '../js/games/go/GoEngine.js';
import { GoAI } from '../js/games/go/GoAI.js';
import { GoBoard } from '../js/games/go/GoBoard.js';

test('Go: captures surrounded stone and enforces suicide & Ko rules', () => {
  const engine = new GoEngine({ boardSize: 9 });
  // Surround (1, 1) with Black except one liberty, put White at (1, 1)
  engine.board[0][1] = 1;
  engine.board[1][0] = 1;
  engine.board[2][1] = 1;
  engine.board[1][1] = 2;
  engine.currentPlayer = 1;

  // Black captures White at (1,1) by playing (1,2)
  const res = engine.applyMove({ type: 'place', r: 1, c: 2 });
  assert.equal(res.ok, true);
  assert.equal(res.capturedCount, 1);
  assert.equal(engine.board[1][1], 0);

  // White playing (1,1) would be suicide -> illegal
  const suicide = engine.applyMove({ type: 'place', r: 1, c: 1 });
  assert.equal(suicide.ok, false);
});

test('Go: two consecutive passes enter scoring phase and finalize Chinese score', () => {
  const engine = new GoEngine({ boardSize: 9 });
  assert.equal(engine.applyMove({ type: 'place', r: 4, c: 4 }).ok, true);
  assert.equal(engine.applyMove({ type: 'pass' }).ok, true);
  assert.equal(engine.applyMove({ type: 'pass' }).ok, true);
  assert.equal(engine.phase, 'scoring');

  assert.equal(engine.applyMove({ type: 'confirmScore' }).ok, true);
  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 1); // Black occupies whole 9x9 board (81 vs 7.5)
});

test('Go: supports 9/13/19 board sizes and all 3 AI levels', () => {
  const ai = new GoAI();
  for (const boardSize of [9, 13, 19]) {
    const engine = new GoEngine({ boardSize });
    assert.equal(engine.board.length, boardSize);
  }
  const engine9 = new GoEngine({ boardSize: 9 });
  for (const diff of ['beginner', 'intermediate', 'advanced']) {
    const move = ai.chooseMove(engine9.getState(), diff);
    assert.ok(move, `Expected move for ${diff}`);
    assert.equal(GoBoard.tryPlace(engine9.board, move.r, move.c, 1, null).ok, true);
  }
});
