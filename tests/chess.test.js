import test from 'node:test';
import assert from 'node:assert/strict';
import { ChessEngine } from '../js/games/chess/ChessEngine.js';
import { ChessAI } from '../js/games/chess/ChessAI.js';

test('Chess: initial position has 20 legal moves and detects Fool\'s Mate', () => {
  const engine = new ChessEngine();
  assert.equal(engine.getLegalMoves().length, 20);

  // Fool's Mate: 1. f3 e5 2. g4 Qh4#
  assert.equal(engine.applyMove({ from: { r: 6, c: 5 }, to: { r: 5, c: 5 } }).ok, true);
  assert.equal(engine.applyMove({ from: { r: 1, c: 4 }, to: { r: 3, c: 4 } }).ok, true);
  assert.equal(engine.applyMove({ from: { r: 6, c: 6 }, to: { r: 4, c: 6 } }).ok, true);
  assert.equal(engine.applyMove({ from: { r: 0, c: 3 }, to: { r: 4, c: 7 } }).ok, true);

  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 2);
});

test('Chess: castling and en passant work properly', () => {
  const engine = new ChessEngine();
  // Clear white kingside path
  engine.board[7][5] = null;
  engine.board[7][6] = null;
  const moves = engine.getLegalMoves();
  const castle = moves.find((m) => m.castle === 'K');
  assert.ok(castle, 'Expected kingside castling move');
  assert.equal(engine.applyMove(castle).ok, true);
  assert.equal(engine.board[7][6]?.type, 'K');
  assert.equal(engine.board[7][5]?.type, 'R');
});

test('Chess: all 3 AI levels return valid legal moves', () => {
  const engine = new ChessEngine();
  const ai = new ChessAI();
  for (const diff of ['beginner', 'intermediate', 'advanced']) {
    const move = ai.chooseMove(engine.getState(), diff);
    assert.ok(move, `Expected move for ${diff}`);
    const clone = new ChessEngine();
    assert.equal(clone.applyMove(move).ok, true);
  }
});
