import { Chess } from 'chess.js';

const PV = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const PST = {
  p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};

function evalBoard(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -99999 : 99999;
  if (chess.isDraw()) return 0;
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      const idx = p.color === 'w' ? r*8+f : (7-r)*8+f;
      const val = PV[p.type] + (PST[p.type]?.[idx] || 0);
      score += p.color === 'w' ? val : -val;
    }
  return score;
}

function orderMoves(moves) {
  return [...moves].sort((a, b) => {
    let sa = 0, sb = 0;
    if (a.captured) sa += PV[a.captured]*10 - PV[a.piece];
    if (b.captured) sb += PV[b.captured]*10 - PV[b.piece];
    if (a.flags?.includes('p')) sa += 800;
    if (b.flags?.includes('p')) sb += 800;
    return sb - sa;
  });
}

function alphabeta(chess, depth, alpha, beta, maximizing) {
  if (depth === 0 || chess.isGameOver()) return evalBoard(chess);
  const moves = orderMoves(chess.moves({ verbose: true }));
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      chess.move(m); best = Math.max(best, alphabeta(chess, depth-1, alpha, beta, false)); chess.undo();
      alpha = Math.max(alpha, best); if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      chess.move(m); best = Math.min(best, alphabeta(chess, depth-1, alpha, beta, true)); chess.undo();
      beta = Math.min(beta, best); if (beta <= alpha) break;
    }
    return best;
  }
}

function minimaxMove(fen, depth, poolSize = 1) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  const isMax = chess.turn() === 'w';
  const scored = orderMoves(moves).map(m => {
    chess.move(m);
    const score = alphabeta(chess, Math.max(1, depth-1), -Infinity, Infinity, !isMax);
    chess.undo();
    return { m, score };
  });
  scored.sort((a, b) => isMax ? b.score - a.score : a.score - b.score);
  const pool = scored.slice(0, Math.min(poolSize, scored.length));
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return chosen ? chosen.m.from + chosen.m.to + (chosen.m.promotion || '') : null;
}

// ── Worker (public/stockfish.js) ─────────────────────────────────────────
let worker = null;
let workerReady = false;
let initPromise = null;

function initWorker() {
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve) => {
    try {
      worker = new Worker('/stockfish.js');
    } catch {
      resolve(false); return;
    }

    let resolved = false;
    const done = (v) => { if (!resolved) { resolved = true; resolve(v); } };

    worker.onmessage = (e) => {
      const line = e.data;
      if (line === 'uciok' || line === 'readyok') {
        workerReady = true; done(true);
      }
    };
    worker.onerror = () => { worker = null; done(false); };

    worker.postMessage('uci');
    worker.postMessage('isready');
    setTimeout(() => done(false), 3000);
  });
  return initPromise;
}

function workerMove(fen, depth, multiPV = 1) {
  return new Promise((resolve) => {
    if (!worker || !workerReady) { resolve(null); return; }

    let resolved = false;
    const topMoves = [];

    worker.onmessage = (e) => {
      const line = e.data;
      if (line.startsWith('info') && line.includes('multipv')) {
        const mpvMatch = line.match(/multipv (\d+)/);
        const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (mpvMatch && pvMatch) topMoves[parseInt(mpvMatch[1]) - 1] = pvMatch[1];
      }
      if (line.startsWith('bestmove')) {
        if (resolved) return;
        resolved = true;
        const best = line.split(' ')[1];
        const pool = topMoves.filter(Boolean);
        const finalPool = pool.length ? pool : (best && best !== '(none)' && best !== '0000' ? [best] : []);
        resolve(finalPool.length ? finalPool[Math.floor(Math.random() * finalPool.length)] : null);
      }
    };

    worker.postMessage(`setoption name MultiPV value ${multiPV}`);
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
    setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 6000);
  });
}

export function createStockfish() {
  initWorker();
  return {
    getBestMove: async (fen, depth, useTopMoves = false) => {
      const ready = await initWorker();
      if (ready && worker) {
        const move = await workerMove(fen, depth, useTopMoves ? 3 : 1);
        if (move) return move;
      }
      return new Promise(resolve => {
        setTimeout(() => resolve(minimaxMove(fen, Math.min(depth, 5), useTopMoves ? 3 : 1)), 10);
      });
    },
    terminate: () => {
      if (worker) { worker.terminate(); worker = null; workerReady = false; initPromise = null; }
    }
  };
    }
