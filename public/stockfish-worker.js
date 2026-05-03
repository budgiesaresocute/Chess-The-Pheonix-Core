// =====================================
// Phoenix CORE++ v18 LICHESS BRAIN
// Strongest practical browser controller
// =====================================

const MAX_ENGINES = 2;

const ENGINE_STATE = {
  INIT: 0,
  READY: 1,
  BUSY: 2
};

const slots = [];
let initialized = false;

const now = () => Date.now();

// ================= TIME MANAGER (REAL LICHESS STYLE) =================
function computeTimeMs(fen, depth) {
  // Simple but effective allocator
  // (NOT too restrictive, avoids under-thinking)

  const base = 800;
  const depthBonus = depth * 250;

  // late-game tends to need more precision
  const endgameBonus = fen.split(" ")[0].length < 20 ? 200 : 0;

  return Math.min(8000, base + depthBonus + endgameBonus);
}

// ================= ENGINE LOADER =================
function createEngine() {
  const src =
    "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js";

  importScripts(src);

  return typeof STOCKFISH !== "undefined"
    ? STOCKFISH()
    : Stockfish();
}

// ================= SLOT =================
function makeSlot(i) {
  return {
    i,
    worker: null,
    state: ENGINE_STATE.INIT,
    job: null,
    busyUntil: 0
  };
}

// ================= SPAWN =================
function spawn(i) {
  const s = slots[i];
  const w = createEngine();
  if (!w) return;

  s.worker = w;
  s.state = ENGINE_STATE.READY;

  w.onmessage = (e) => onMsg(i, typeof e === "string" ? e : e.data);

  w.postMessage("uci");
}

// ================= ENGINE PICK =================
function getEngine() {
  for (const s of slots) {
    if (s.state === ENGINE_STATE.READY && !s.job) return s;
  }
  return null;
}

// ================= SEARCH =================
function search(fen, depth = 12) {
  return new Promise((resolve) => {
    const s = getEngine();
    if (!s) return resolve(null);

    const thinkTime = computeTimeMs(fen, depth);

    let bestMove = null;
    let bestDepth = 0;

    s.job = { resolve, fen };
    s.state = ENGINE_STATE.BUSY;
    s.busyUntil = now() + thinkTime;

    s.worker.postMessage("stop");
    s.worker.postMessage("ucinewgame");
    s.worker.postMessage(`position fen ${fen}`);

    // 🔥 KEY: let engine run iterative deepening
    s.worker.postMessage(`go movetime ${thinkTime}`);

    // fallback safety (if engine stalls)
    setTimeout(() => {
      if (!s.job) return;
      s.job.resolve(bestMove);
      s.job = null;
    }, thinkTime + 500);
  });
}

// ================= ENGINE OUTPUT =================
function onMsg(i, line) {
  const s = slots[i];
  if (!s?.worker) return;

  if (line === "uciok") {
    s.worker.postMessage("isready");
    return;
  }

  if (line === "readyok") {
    s.state = ENGINE_STATE.READY;
    return;
  }

  if (s.state !== ENGINE_STATE.BUSY) return;

  // ================= TRACK BEST LINE =================
  if (line.startsWith("info") && line.includes(" pv ")) {
    const pvIndex = line.indexOf(" pv ");
    const pv = line.slice(pvIndex + 4).split(" ");

    const depthMatch = line.match(/depth (\d+)/);
    const depth = depthMatch ? +depthMatch[1] : 0;

    if (depth > s.bestDepth || !s.bestMove) {
      s.bestDepth = depth;
      s.bestMove = pv[0];
    }
  }

  // ================= FINAL MOVE =================
  if (line.startsWith("bestmove")) {
    const move = line.split(" ")[1];

    const job = s.job;
    s.job = null;
    s.state = ENGINE_STATE.READY;

    // prefer deepest seen move, fallback to bestmove
    job.resolve(s.bestMove || move || "0000");

    s.bestMove = null;
    s.bestDepth = 0;
  }
}

// ================= INIT =================
self.onmessage = (e) => {
  const { cmd, fen, depth } = e.data;

  if (cmd === "init") {
    if (initialized) return;
    initialized = true;

    for (let i = 0; i < MAX_ENGINES; i++) {
      slots[i] = makeSlot(i);
      spawn(i);
    }
  }

  if (cmd === "search") {
    search(fen, depth).then((move) => {
      self.postMessage({
        type: "result",
        move
      });
    });
  }
};
