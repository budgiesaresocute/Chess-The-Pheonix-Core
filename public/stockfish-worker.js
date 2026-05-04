// =====================================
// Phoenix CORE++ v16 FINAL GOD ENGINE
// Pure Stockfish • Clean strongest browser controller
// =====================================

const MAX_ENGINES = 1;

const ENGINE_STATE = {
  INIT: 0,
  LOADING: 1,
  READY: 2,
  BUSY: 3
};

const slots = [];
let initialized = false;
let jobSeq = 0;

const now = () => Date.now();

// ================= THINK TIME (STRONG MODE) =================
function computeThinkMs(depth) {
  const base = 20000;     // strong baseline thinking
  const scale = depth * 1200;
  return Math.min(60000, base + scale); // up to 60s brain time
}

// ================= ENGINE LOADER =================
function createEngine() {
  const sources = [
    "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js",
    "https://unpkg.com/stockfish@16.0.0/src/stockfish-nnue-16-single.js",
    "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-16-single.js"
  ];

  for (const src of sources) {
    try {
      importScripts(src);

      return typeof STOCKFISH !== "undefined"
        ? STOCKFISH()
        : typeof Stockfish !== "undefined"
        ? Stockfish()
        : null;
    } catch {}
  }

  return null;
}

// ================= SLOT =================
function makeSlot(i) {
  return {
    i,
    worker: null,
    state: ENGINE_STATE.INIT,
    job: null,
    configured: false,
    bestMove: null
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

  // init engine once
  w.postMessage("uci");
}

// ================= CONFIG =================
function configure(s) {
  if (s.configured || !s.worker) return;

  try {
    s.worker.postMessage("setoption name Hash value 256");
    s.worker.postMessage("setoption name Threads value 1");
    s.worker.postMessage("setoption name Ponder value false");
    s.worker.postMessage("setoption name UCI_LimitStrength value false");
    s.configured = true;
  } catch {}
}

// ================= GET ENGINE =================
function getEngine() {
  for (const s of slots) {
    if (s.state === ENGINE_STATE.READY && !s.job) return s;
  }
  return null;
}

// ================= SEARCH =================
function search(fen, depth = 24) {
  return new Promise((resolve) => {
    const s = getEngine();
    if (!s || !s.worker) return resolve(["0000"]);

    const myJob = ++jobSeq;
    const thinkMs = computeThinkMs(depth);

    s.job = {
      id: myJob,
      resolve,
      done: false
    };

    s.state = ENGINE_STATE.BUSY;
    s.bestMove = null;

    try {
      s.worker.postMessage("stop");
      configure(s);

      s.worker.postMessage(`position fen ${fen}`);

      // 🔥 PURE STRONG SEARCH (no interference)
      s.worker.postMessage(`go depth ${depth} movetime ${thinkMs}`);
    } catch {}

    // fallback safety only
    setTimeout(() => {
      if (!s.job || s.job.id !== myJob || s.job.done) return;

      s.job.done = true;
      s.job.resolve([s.bestMove || "0000"]);
      s.job = null;
      s.state = ENGINE_STATE.READY;
    }, thinkMs + 3000);
  });
}

// ================= ENGINE OUTPUT =================
function onMsg(i, line) {
  const s = slots[i];
  if (!s?.worker || !line) return;

  if (line === "uciok") {
    configure(s);
    s.worker.postMessage("isready");
    return;
  }

  if (line === "readyok") {
    s.state = ENGINE_STATE.READY;
    return;
  }

  if (s.state !== ENGINE_STATE.BUSY || !s.job) return;

  // 🔥 ONLY TRUST FINAL BESTMOVE
  if (line.startsWith("bestmove")) {
    const move = line.split(" ")[1];

    const job = s.job;
    if (!job || job.done) return;

    job.done = true;
    job.resolve([move && move !== "(none)" ? move : "0000"]);

    s.job = null;
    s.state = ENGINE_STATE.READY;
    s.bestMove = move;
  }

  // optional: track best seen line (debug only)
  if (line.startsWith("info") && line.includes(" pv ")) {
    const pvIndex = line.indexOf(" pv ");
    const pv = line.slice(pvIndex + 4).split(" ")[0];
    s.bestMove = pv;
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
    search(fen, depth).then((moves) => {
      self.postMessage({ type: "result", moves });
    });
  }

  if (cmd === "stop") {
    for (const s of slots) {
      if (!s) continue;
      s.job = null;
      s.bestMove = null;
      try {
        s.worker?.postMessage("stop");
      } catch {}
    }
  }
};
