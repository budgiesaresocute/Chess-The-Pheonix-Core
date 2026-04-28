export function createStockfish() {
  const stockfish = new Worker(
    'https://cdn.jsdelivr.net/npm/stockfish@16/src/stockfish.js'
  );

  let bestMoveResolver = null;
  let moveBuffer = [];

  stockfish.onmessage = (e) => {
    const line = e.data;

    // Collect MultiPV lines (optional future upgrade)
    if (line.startsWith('info') && line.includes(' pv ')) {
      const match = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
      if (match) {
        moveBuffer.push(match[1]);
      }
    }

    // Final move
    if (line.startsWith('bestmove')) {
      const move = line.split(' ')[1];

      if (bestMoveResolver) {
        bestMoveResolver(move);
        bestMoveResolver = null;
      }

      moveBuffer = [];
    }
  };

  const send = (cmd) => stockfish.postMessage(cmd);

  send('uci');
  send('isready');

  return {
    getBestMove: (fen, depth = 15, multiPV = 3) => {
      return new Promise((resolve) => {
        bestMoveResolver = resolve;

        send(`ucinewgame`);
        send(`setoption name MultiPV value ${multiPV}`);
        send(`position fen ${fen}`);
        send(`go depth ${depth}`);
      });
    }
  };
    }
