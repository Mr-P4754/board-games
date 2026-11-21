import test from 'node:test';
import assert from 'node:assert/strict';
import { GomokuEngine } from '../js/games/gomoku/GomokuEngine.js';
import { GomokuAI } from '../js/games/gomoku/GomokuAI.js';

test('Gomoku: detects 5-in-a-row victory and undo', () => {
  const engine = new GomokuEngine({ renju: false });
  const moves = [
    { r: 7, c: 3 }, { r: 8, c: 3 },
    { r: 7, c: 4 }, { r: 8, c: 4 },
    { r: 7, c: 5 }, { r: 8, c: 5 },
    { r: 7, c: 6 }, { r: 8, c: 6 },
    { r: 7, c: 7 },
  ];
  for (const m of moves) {
    assert.equal(engine.applyMove(m).ok, true);
  }
  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 1);
  assert.equal(engine.getState().winLine.length, 5);

  engine.undo();
  assert.equal(engine.isGameOver(), false);
});

test('Gomoku: Renju detects Black overline forbidden move', () => {
  const engine = new GomokuEngine({ renju: true });
  // Place 5 black stones with a gap at (7,7) making 6 in a row if placed
  const board = engine.board;
  board[7][4] = 1;
  board[7][5] = 1;
  board[7][6] = 1;
  board[7][8] = 1;
  board[7][9] = 1;
  assert.equal(GomokuEngine.isForbiddenForBlack(board, 7, 7), true);
  assert.equal(engine.applyMove({ r: 7, c: 7 }).ok, false);
});

test('Gomoku: all 3 AI levels take immediate winning move', () => {
  const engine = new GomokuEngine({ renju: false });
  engine.board[7][3] = 1;
  engine.board[7][4] = 1;
  engine.board[7][5] = 1;
  engine.board[7][6] = 1;
  engine.board[8][3] = 2;
  engine.board[8][4] = 2;
  engine.board[8][5] = 2;
  engine.currentPlayer = 1;

  const ai = new GomokuAI();
  for (const diff of ['beginner', 'intermediate', 'advanced']) {
    const move = ai.chooseMove(engine.getState(), diff);
    assert.ok(move.r === 7 && (move.c === 2 || move.c === 7), `AI (${diff}) missed win: ${JSON.stringify(move)}`);
  }
});
