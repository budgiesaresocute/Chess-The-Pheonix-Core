// =====================================
// Phoenix Stockfish Core (v15 STABLE)
// NNUE-safe • Race-free • No instant moves
// =====================================

let sf = null;
let engineReady = false;

let searchLock = false;
let session = 0;
let pendingResolve = null;

let topMoves = [];
let initPromise = null;

const MAX_PV = 7;
const MIN_TIME = 3500;

// ================= INIT =================
function loadStockfish() {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    const sources = [
      "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js",
      "https://unpkg.com/stockfish@16.0.0/src/stockfish-nnue-16-single.js"
    ];

    const tryLoad = (i = 0) => {
      if (i >= sources.length) {
        resolve(false);
        return;
      }

      try {
        importScripts(sources[i]);

        sf =
          typeof STOCKFISH !== "undefined"
            ? STOCKFISH()
            : typeof Stockfish !== "undefined"
            ? Stockfish()
            : null;

        if (!sf) return tryLoad(i + 1);

        sf.onmessage = (e) => {
          const line = typeof e === "string" ? e : e.data;
          handle(line);
        };

        sf.postMessage("uci");

        resolve(true);
      } catch {
        tryLoad(i + 1);
      }
    };

    tryLoad();
  });

  return initPromise;
}

// ================= HANDLE =================
function handle(line) {
  if (!line) return;

  if (line === "uciok") {
    sf.postMessage("isready");
  }

  if (line === "readyok") {
    engineReady = true;
    return;
  }

  // DEBUG: uncomment if needed
  // if (line.startsWith("info")) console.log(line);

  if (line.startsWith("info") && line.includes(" pv ")) {
    const pvIndex = line.indexOf(" pv ");
    const pv = line.slice(pvIndex + 4).split(/\s+/);

    const mpv = line.match(/multipv (\d+)/);
    const depth = line.match(/ depth (\d+)/);

    const id = mpv ? +mpv[1] : 1;
    const d = depth ? +depth[1] : 0;

    const prev = topMoves[id];

    if (!prev || d > prev.depth) {
      topMoves[id] = {
        move: pv[0],
        depth: d
      };
    }
  }

  if (line.startsWith("bestmove")) {
    const best = line.split(" ")[1];

    if (pendingResolve) {
      const moves = Object.values(topMoves)
        .filter(Boolean)
        .sort((a, b) => b.depth - a.depth)
        .map(m => m.move);

      pendingResolve(
        moves.length ? moves : [best]
      );
    }

    pendingResolve = null;
    searchLock = false;
    topMoves = [];
  }
}

// ================= SEARCH =================
async function search(fen, depth = 12, mpv = 5) {
  const ready = await loadStockfish();
  if (!ready || !sf) return [];

  // 🔥 BLOCK parallel searches (VERY IMPORTANT)
  if (searchLock) return [];

  searchLock = true;
  session++;

  topMoves = [];

  return new Promise((resolve) => {
    pendingResolve = resolve;

    if (!engineReady) {
      searchLock = false;
      resolve([]);
      return;
    }

    try {
      sf.postMessage("stop"); // cancel only old search

      const pv = Math.min(Math.max(1, mpv), MAX_PV);

      sf.postMessage(`setoption name MultiPV value ${pv}`);
      sf.postMessage(`position fen ${fen}`);

      const time = Math.max(MIN_TIME, depth * 400);

      sf.postMessage(`go movetime ${time}`);

      // safety fallback
      setTimeout(() => {
        if (pendingResolve) {
          pendingResolve([]);
          pendingResolve = null;
          searchLock = false;
        }
      }, time + 2000);

    } catch {
      searchLock = false;
      resolve([]);
    }
  });
}

// ================= API =================
export function createStockfish() {
  loadStockfish();

  return {
    getBestMove: async (fen, depth = 12) => {
      const moves = await search(fen, depth, 1);
      return moves[0] || null;
    },

    getBestMoveFromPool: async (fen, depth = 12, mpv = 7) => {
      return await search(fen, depth, mpv);
    },

    stop: () => {
      session++;
      searchLock = false;
      pendingResolve = null;
      topMoves = [];

      try {
        sf?.postMessage("stop");
      } catch {}
    }
  };
}
