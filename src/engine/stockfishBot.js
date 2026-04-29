export function createStockfish() {
  let stockfish = null;
  let bestMoveResolver = null;
  let topMoves = [];
  let ready = false;
  let readyResolver = null;

  try {
    stockfish = new Worker(
      'https://cdn.jsdelivr.net/npm/stockfish@16/src/stockfish.js'
    );
  } catch {
    return null;
  }

  stockfish.onmessage = (e) => {
    const line = e.data;

    if (line === 'readyok') {
      ready = true;
      if (readyResolver) { readyResolver(); readyResolver = null; }
    }

    if (line.startsWith('info') && line.includes(' pv ')) {
      const match = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
      if (match) topMoves.push(match[1]);
    }

    if (line.startsWith('bestmove')) {
      const best = line.split(' ')[1];
      if (bestMoveResolver) {
        // For top 3 pool (Phoenix Prime), pick randomly from collected top moves
        const pool = topMoves.length > 0
          ? [...new Set(topMoves)].slice(0, 3)
          : [best];
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        bestMoveResolver(chosen !== '(none)' ? chosen : null);
        bestMoveResolver = null;
      }
      topMoves = [];
    }
  };

  stockfish.onerror = () => {
    if (bestMoveResolver) { bestMoveResolver(null); bestMoveResolver = null; }
  };

  const send = (cmd) => stockfish?.postMessage(cmd);

  send('uci');
  send('isready');

  const waitReady = () => new Promise(resolve => {
    if (ready) return resolve();
    readyResolver = resolve;
    setTimeout(resolve, 3000);
  });

  return {
    getBestMove: async (fen, depth = 15, useTopMoves = false) => {
      await waitReady();
      return new Promise((resolve) => {
        bestMoveResolver = resolve;
        topMoves = [];
        send('ucinewgame');
        if (useTopMoves) send('setoption name MultiPV value 3');
        else send('setoption name MultiPV value 1');
        send(`position fen ${fen}`);
        send(`go depth ${depth}`);
        setTimeout(() => {
          if (bestMoveResolver) {
            bestMoveResolver(null);
            bestMoveResolver = null;
          }
        }, 10000);
      });
    },
    terminate: () => { stockfish?.terminate(); stockfish = null; }
  };
              }
