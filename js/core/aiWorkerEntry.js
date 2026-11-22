const AI_MODULE_MAP = {
  othello: () => import('../games/othello/OthelloAI.js').then((m) => new m.OthelloAI()),
  gomoku: () => import('../games/gomoku/GomokuAI.js').then((m) => new m.GomokuAI()),
  chess: () => import('../games/chess/ChessAI.js').then((m) => new m.ChessAI()),
  shogi: () => import('../games/shogi/ShogiAI.js').then((m) => new m.ShogiAI()),
  go: () => import('../games/go/GoAI.js').then((m) => new m.GoAI()),
  mahjong: () => import('../games/mahjong/MahjongAI.js').then((m) => new m.MahjongAI()),
  checkers: () => import('../games/checkers/CheckersAI.js').then((m) => new m.CheckersAI()),
  connect4: () => import('../games/connect4/Connect4AI.js').then((m) => new m.Connect4AI()),
  mancala: () => import('../games/mancala/MancalaAI.js').then((m) => new m.MancalaAI()),
};

const cache = new Map();

async function getAI(gameId) {
  if (!cache.has(gameId)) {
    const loader = AI_MODULE_MAP[gameId];
    if (!loader) throw new Error(`Unknown AI gameId: ${gameId}`);
    cache.set(gameId, await loader());
  }
  return cache.get(gameId);
}

self.addEventListener('message', async (event) => {
  const { requestId, gameId, state, difficulty, options } = event.data;
  try {
    const ai = await getAI(gameId);
    const move = ai.chooseMove(state, difficulty, options);
    self.postMessage({ requestId, ok: true, move });
  } catch (err) {
    self.postMessage({
      requestId,
      ok: false,
      error: err?.message || String(err),
    });
  }
});
