// =====================================
// Phoenix Stockfish Bot (v14 FIXED)
// NNUE-safe • Stable search • Real thinking time
// =====================================

let sf = null;
let isReady = false;

let session = 0;
let pending = null;
let topMoves = [];
let initPromise = null;

const MAX_PV = 7;

// 🔥 higher floor = prevents instant moves
const MIN_THINK_TIME = 3500;

// ================= INIT =================
function loadStockfish() {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    const sources = [
      "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js",
      "https://unpkg.com/stockfish@16.0.0/src/stockfish-nnue-16-single.js"
    ];

    const tryNext = (i = 0) => {
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

        if (!sf) return tryNext(i + 1);

        sf.onmessage = (e) => {
          const line = typeof e === "string" ? e : e.data;
          handleMessage(line);
        };

        // ✅ Proper UCI handshake
        sf.postMessage("uci");

        resolve(true);
      } catch {
        tryNext(i + 1);
      }
    };

    tryNext();
  });

  return initPromise;
}

// ================= MESSAGE =================
function handleMessage(line) {
  if (!line) return;

  // 🔥 Proper readiness handling
  if (line === "uciok") {
    sf.postMessage("isready");
  }

  if (line === "readyok") {
    isReady = true;
    return;
  }

  // 🔥 DEBUG: see real thinking
  if (line.startsWith("info") && line.includes("depth")) {
    console.log("THINK:", line);
  }

  // ================= MULTIPV =================
  if (line.startsWith("info") && line.includes(" pv ")) {
    const pvIndex = line.indexOf(" pv ");
    const pv = line.slice(pvIndex + 4).trim().split(/\s+/);

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

  // ================= BESTMOVE =================
  if (line.startsWith("bestmove")) {
    const best = line.split(" ")[1];

    if (pending?.session === session) {
      const moves = Object.values(topMoves)
        .filter(Boolean)
        .sort((a, b) => b.depth - a.depth)
        .map(m => m.move);

      pending.resolve(
        moves.length
          ? moves
          : (best && best !== "(none)" ? [best] : [])
      );

      pending = null;
    }

    topMoves = [];
  }
}

// ================= SEARCH =================
function search(fen, depth = 12, mpv = 5) {
  return new Promise(async (resolve) => {
    const ready = await loadStockfish();
    if (!ready || !sf) return resolve([]);

    // 🔥 new session only (DO NOT reset engine)
    session++;
    const mySession = session;

    topMoves = [];

    pending = {
      session: mySession,
      resolve
    };

    try {
      // ❌ REMOVED: ucinewgame (this was breaking strength)

      const pv = Math.min(Math.max(1, mpv), MAX_PV);

      sf.postMessage(`setoption name MultiPV value ${pv}`);
      sf.postMessage(`position fen ${fen}`);

      // 🔥 REAL thinking control (safe NNUE behavior)
      const time = Math.max(MIN_THINK_TIME, depth * 400);

      sf.postMessage(`go movetime ${time}`);

    } catch {
      resolve([]);
      return;
    }

    // safety timeout
    setTimeout(() => {
      if (pending?.session === mySession) {
        pending.resolve([]);
        pending = null;
      }
    }, time + 2000);
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
      session++; // cancels current search safely
      pending = null;
      topMoves = [];
      try {
        sf?.postMessage("stop");
      } catch {}
    }
  };
}
