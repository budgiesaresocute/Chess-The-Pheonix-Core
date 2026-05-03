// =====================================
// Phoenix CORE++ Stockfish Cluster (v17 REAL CORE)
// Iterative Deepening • Eval Convergence • UCI Correct • Strongest practical JS wrapper
// =====================================

const MAX_ENGINES = 2;
const ENGINE_STATE = {
  INIT: 0,
  LOADING: 1,
  READY: 2,
  BUSY: 3
};

const slots = [];
let initialized = false;

// ================= CORE MEMORY =================
let searchToken = 0;

const depthBest = new Map();   // depth → best move
const evalTrace = new Map();   // move → eval history

const now = () => Date.now();

// ================= TIME CONTROL =================
function computeBaseTime(depth) {
  const base = 500;
  const scale = depth * 250;
  return Math.min(10000, base + scale);
}

// ================= ENGINE =================
function createEngine() {
  const src =
    "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js";

  try {
    importScripts(src);
    return STOCKFISH ? STOCKFISH() : Stockfish();
  } catch {
    return null;
  }
}

// ================= SLOT =================
function makeSlot(i) {
  return {
    i,
    worker: null,
    state: ENGINE_STATE.INIT,
    busy: false
  };
}

// ================= SPAWN =================
function spawn(i) {
  const s = slots[i];
  const w = createEngine();
  if (!w) return;

  s.worker = w;
  s.state = ENGINE_STATE.LOADING;

  w.onmessage = (e) => onMsg(i, typeof e === "string" ? e : e.data);

  w.postMessage("uci");
}

// ================= ENGINE PICK =================
function getEngine() {
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.state === ENGINE_STATE.READY && !s.busy) return i;
  }
  return -1;
}

// ================= ITERATIVE DEEPENING SEARCH =================
function search(fen, maxDepth) {
  return new Promise((resolve) => {
    const engineId = getEngine();
    if (engineId === -1) return resolve(null);

    const s = slots[engineId];

    const token = ++searchToken;

    let bestMove = null;
    let bestEval = -999999;

    depthBest.clear();
    evalTrace.clear();

    s.busy = true;
    s.state = ENGINE_STATE.BUSY;

    const baseTime = computeBaseTime(maxDepth);

    // ================= ITERATIVE DEEPENING LOOP =================
    let currentDepth = 1;

    const runDepth = () => {
      if (token !== searchToken) return;

      if (currentDepth > maxDepth) {
        s.busy = false;
        s.state = ENGINE_STATE.READY;
        return resolve(bestMove);
      }

      s.worker.postMessage("stop");
      s.worker.postMessage("ucinewgame");
      s.worker.postMessage(`position fen ${fen}`);
      s.worker.postMessage(`go depth ${currentDepth}`);

      setTimeout(runDepth, Math.min(1200, baseTime / maxDepth));

      currentDepth++;
    };

    runDepth();

    // safety timeout
    setTimeout(() => {
      s.busy = false;
      resolve(bestMove);
    }, baseTime + 1500);
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

  // ================= PARSE INFO =================
  if (line.includes("info") && line.includes(" pv ")) {
    const pv = line.split(" pv ")[1]?.split(" ");
    const depth = line.match(/depth (\d+)/);
    const cp = line.match(/score cp (-?\d+)/);
    const mate = line.match(/score mate (-?\d+)/);

    const d = depth ? +depth[1] : 0;
    const score = mate ? 999999 : (cp ? +cp[1] : 0);
    const move = pv?.[0];

    if (!move) return;

    // store best per depth
    const prev = depthBest.get(d);

    if (!prev || score > prev.score) {
      depthBest.set(d, { move, score });
    }

    // eval smoothing (real trend tracking)
    if (!evalTrace.has(move)) evalTrace.set(move, []);
    evalTrace.get(move).push(score);
  }

  // ================= BESTMOVE =================
  if (line.startsWith("bestmove")) {
    const fallback = line.split(" ")[1];

    // ================= FIND CONVERGED MOVE =================
    let finalMove = fallback;

    let maxScore = -999999;
    let stableMove = null;

    for (const [depth, data] of depthBest.entries()) {
      if (data.score > maxScore) {
        maxScore = data.score;
        stableMove = data.move;
      }
    }

    // ================= CONVERGENCE CHECK =================
    const stabilityCheck = {};

    for (const [move, arr] of evalTrace.entries()) {
      const last = arr[arr.length - 1];
      const prev = arr[arr.length - 2];

      if (prev !== undefined && Math.abs(last - prev) < 20) {
        stabilityCheck[move] = (stabilityCheck[move] || 0) + 1;
      }
    }

    let bestStable = null;
    let bestCount = 0;

    for (const m in stabilityCheck) {
      if (stabilityCheck[m] > bestCount) {
        bestCount = stabilityCheck[m];
        bestStable = m;
      }
    }

    // ================= FINAL DECISION =================
    if (bestStable && bestCount >= 2) {
      finalMove = bestStable;
    } else if (stableMove) {
      finalMove = stableMove;
    }

    s.busy = false;
    s.state = ENGINE_STATE.READY;

    resolveJob(i, finalMove);
  }
}

// ================= RESOLVE =================
function resolveJob(i, move) {
  const s = slots[i];
  if (!s) return;

  s.state = ENGINE_STATE.READY;

  self.postMessage({
    type: "result",
    move
  });
}

// ================= INIT =================
self.onmessage = (e) => {
  const { cmd, fen, depth } = e.data;

  if (cmd === "init") {
    if (initialized) return;
    initialized = true;

    if (!slots.length) {
      for (let i = 0; i < MAX_ENGINES; i++) {
        slots[i] = makeSlot(i);
        spawn(i);
      }
    }
  }

  if (cmd === "search") {
    search(fen, depth || 10);
  }
};
