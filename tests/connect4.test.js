import test from 'node:test';
import assert from 'node:assert/strict';
import { Connect4Engine } from '../js/games/connect4/Connect4Engine.js';
import { Connect4AI } from '../js/games/connect4/Connect4AI.js';

test('Connect4: gravity drop, 4-in-a-row detection, and undo', () => {
  const engine = new Connect4Engine();
  const seq = [0, 1, 0, 1, 0, 1, 0];
  for (const c of seq) {
    assert.equal(engine.applyMove({ c }).ok, true);
  }
  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 1);
  assert.equal(engine.getState().winLine.length, 4);

  engine.undo();
  assert.equal(engine.isGameOver(), false);
});

test('Connect4: all 3 AI levels take immediate winning move', () => {
  const engine = new Connect4Engine();
  engine.applyMove({ c: 2 }); engine.applyMove({ c: 0 });
  engine.applyMove({ c: 3 }); engine.applyMove({ c: 0 });
  engine.applyMove({ c: 4 }); engine.applyMove({ c: 0 });

  const ai = new Connect4AI();
  for (const diff of ['beginner', 'intermediate', 'advanced']) {
    const move = ai.chooseMove(engine.getState(), diff);
    assert.ok(move.c === 1 || move.c === 5, `AI (${diff}) missed win: ${JSON.stringify(move)}`);
  }
});
