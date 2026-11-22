const DIG_COUNT = {
  beginner: 34,
  intermediate: 45,
  advanced: 53,
};

/**
 * 唯一解保証付きの数独（9×9）自動生成・検証クラス
 */
export class SudokuGenerator {
  static generate(difficulty = 'intermediate') {
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    SudokuGenerator._fillBoard(solution);

    const puzzle = solution.map((row) => [...row]);
    const targetHoles = DIG_COUNT[difficulty] || 45;

    // Shuffled list of 81 positions
    const coords = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) coords.push([r, c]);
    }
    SudokuGenerator._shuffle(coords);

    let holes = 0;
    for (const [r, c] of coords) {
      if (holes >= targetHoles) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      const copy = puzzle.map((row) => [...row]);
      if (SudokuGenerator.countSolutions(copy, 2) === 1) {
        holes++;
      } else {
        puzzle[r][c] = backup;
      }
    }

    return { puzzle, solution };
  }

  static _fillBoard(board) {
    const empty = SudokuGenerator._findEmpty(board);
    if (!empty) return true;
    const [r, c] = empty;
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    SudokuGenerator._shuffle(nums);

    for (const num of nums) {
      if (SudokuGenerator.isValid(board, r, c, num)) {
        board[r][c] = num;
        if (SudokuGenerator._fillBoard(board)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }

  static countSolutions(board, limit = 2) {
    // Pick empty cell with fewest candidates (MRV heuristic) for speed
    let bestCell = null;
    let bestCands = null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0) continue;
        const cands = [];
        for (let n = 1; n <= 9; n++) {
          if (SudokuGenerator.isValid(board, r, c, n)) cands.push(n);
        }
        if (cands.length === 0) return 0;
        if (!bestCands || cands.length < bestCands.length) {
          bestCell = [r, c];
          bestCands = cands;
          if (cands.length === 1) break;
        }
      }
      if (bestCands && bestCands.length === 1) break;
    }

    if (!bestCell) return 1;

    const [r, c] = bestCell;
    let total = 0;
    for (const n of bestCands) {
      board[r][c] = n;
      total += SudokuGenerator.countSolutions(board, limit - total);
      board[r][c] = 0;
      if (total >= limit) return total;
    }
    return total;
  }

  static isValid(board, r, c, num) {
    for (let i = 0; i < 9; i++) {
      if (board[r][i] === num || board[i][c] === num) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        if (board[br + dr][bc + dc] === num) return false;
      }
    }
    return true;
  }

  static _findEmpty(board) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  static _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
}
