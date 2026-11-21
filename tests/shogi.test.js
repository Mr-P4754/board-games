import test from 'node:test';
import assert from 'node:assert/strict';
import { ShogiEngine } from '../js/games/shogi/ShogiEngine.js';
import { ShogiAI } from '../js/games/shogi/ShogiAI.js';

test('Shogi: initial position has 30 legal moves', () => {
  const engine = new ShogiEngine();
  assert.equal(engine.getLegalMoves().length, 30);
});

test('Shogi: prevents Nifu (two pawns on same file) and Uchifuzume (drop pawn mate)', () => {
  const engine = new ShogiEngine();
  // Clear board for controlled test
  engine.board = Array.from({ length: 9 }, () => Array(9).fill(null));
  engine.board[0][4] = { type: 'OU', owner: 2 };
  engine.board[0][3] = { type: 'KY', owner: 2 };
  engine.board[0][5] = { type: 'KY', owner: 2 };
  engine.board[2][4] = { type: 'KI', owner: 1 };
  engine.board[8][4] = { type: 'OU', owner: 1 };
  // Existing Sente pawn on col 2 -> Nifu test
  engine.board[5][2] = { type: 'FU', owner: 1 };
  engine.hands[1].FU = 1;
  engine.currentPlayer = 1;

  const legal = engine.getLegalMoves();
  // Cannot drop FU anywhere on col 2 (Nifu)
  assert.equal(legal.some((m) => m.drop === 'FU' && m.to.c === 2), false);
  // Cannot drop FU at (1, 4) because it is Uchifuzume!
  assert.equal(legal.some((m) => m.drop === 'FU' && m.to.r === 1 && m.to.c === 4), false);
});

test('Shogi: all 3 AI levels return valid legal moves', () => {
  const engine = new ShogiEngine();
  const ai = new ShogiAI();
  for (const diff of ['beginner', 'intermediate', 'advanced']) {
    const move = ai.chooseMove(engine.getState(), diff);
    assert.ok(move, `Expected move for ${diff}`);
    const testEngine = new ShogiEngine();
    assert.equal(testEngine.applyMove(move).ok, true);
  }
});
