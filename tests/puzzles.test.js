import test from 'node:test';
import assert from 'node:assert/strict';
import { JigsawEngine } from '../js/games/jigsaw/JigsawEngine.js';
import { JigsawArtwork } from '../js/games/jigsaw/JigsawArtwork.js';
import { SudokuGenerator } from '../js/games/sudoku/SudokuGenerator.js';
import { SudokuEngine } from '../js/games/sudoku/SudokuEngine.js';
import { Game2048Engine } from '../js/games/game2048/Game2048Engine.js';
import { SlidingEngine } from '../js/games/sliding/SlidingEngine.js';
import { MinesweeperEngine } from '../js/games/minesweeper/MinesweeperEngine.js';
import { LightsOutEngine } from '../js/games/lightsout/LightsOutEngine.js';

test('Jigsaw: generates matching interlocking edges, locks placed pieces, and completes', () => {
  const engine = new JigsawEngine({ difficulty: 'beginner', theme: 'fuji' });
  const state = engine.getState();
  assert.equal(state.gridSize, 3);
  assert.equal(state.totalPieces, 9);
  // Check adjacent edge tabs cancel out (sum to 0)
  assert.equal(state.pieces[0].edges.right + state.pieces[1].edges.left, 0);
  assert.equal(state.pieces[0].edges.bottom + state.pieces[3].edges.top, 0);
  assert.ok(JigsawArtwork.getSvgDataUrl('fuji').startsWith('data:image/svg+xml'));

  for (let i = 0; i < 9; i++) {
    assert.equal(engine.applyMove({ type: 'place', pieceId: i, slotIndex: i }).ok, true);
  }
  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 1);
});

test('Sudoku: generates unique-solution puzzle and completes via hints', () => {
  const { puzzle, solution } = SudokuGenerator.generate('beginner');
  const copy = puzzle.map((r) => [...r]);
  assert.equal(SudokuGenerator.countSolutions(copy, 2), 1);

  const engine = new SudokuEngine({ difficulty: 'beginner' });
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!engine.fixed[r][c]) {
        engine.applyMove({ r, c, value: engine.solution[r][c], isNote: false });
      }
    }
  }
  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 1);
  assert.equal(solution.length, 9);
});

test('Game2048: merges tiles accurately and detects target win', () => {
  const merged = Game2048Engine.slideLine([2, 2, 4, 4]);
  assert.deepEqual(merged.line, [4, 8, 0, 0]);
  assert.equal(merged.gained, 12);

  const engine = new Game2048Engine({ difficulty: 'beginner' }); // target 512
  engine.board = [
    [256, 256, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  assert.equal(engine.applyMove({ dir: 'left' }).ok, true);
  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 1);
});

test('Sliding: supports multi-tile strip slide and detects solved state', () => {
  const engine = new SlidingEngine({ difficulty: 'beginner' }); // 3x3
  engine.tiles = [1, 2, 3, 4, 5, 6, 0, 7, 8];
  // Click index 8 (tile 8) to slide both 7 and 8 left in one move!
  assert.equal(engine.applyMove({ index: 8 }).ok, true);
  assert.deepEqual(engine.tiles, [1, 2, 3, 4, 5, 6, 7, 8, 0]);
  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 1);
});

test('Minesweeper: first click is always safe and reveals cleanly', () => {
  const engine = new MinesweeperEngine({ difficulty: 'beginner' });
  assert.equal(engine.applyMove({ type: 'reveal', r: 4, c: 4 }).ok, true);
  assert.equal(engine.isGameOver(), false);
  assert.equal(engine.mines[4][4], false);
  assert.equal(engine.counts[4][4], 0);
  assert.ok(engine.revealedCount >= 9);

  // Flag toggle
  assert.equal(engine.applyMove({ type: 'flag', r: 0, c: 0 }).ok, !engine.revealed[0][0]);
});

test('LightsOut: generated board is guaranteed solvable using tracked solution parity', () => {
  const engine = new LightsOutEngine({ difficulty: 'intermediate' });
  assert.ok(engine.countLit() > 0);
  for (let r = 0; r < engine.size; r++) {
    for (let c = 0; c < engine.size; c++) {
      if (engine.solutionParity[r][c]) {
        engine.applyMove({ r, c });
      }
    }
  }
  assert.equal(engine.countLit(), 0);
  assert.equal(engine.isGameOver(), true);
  assert.equal(engine.getResult().winner, 1);
});
