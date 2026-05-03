import { createStockfish } from "./stockfish.js";

let cluster = null;
let fallback = null;
let isInit = false;

// ================= INIT =================
export function initEngine() {
  if (isInit) return;
  isInit = true;

  // MAIN ENGINE (cluster worker)
  cluster = new Worker("/stockfish-worker.js");

  cluster.postMessage({ cmd: "init" });

  // FALLBACK ENGINE
  fallback = createStockfish();

  console.log("🔥 Engine Manager initialized");
}

// ================= MAIN BOT API =================
export function getBestMove(fen, depth = 10, mpv = 1) {
  return new Promise((resolve) => {
    if (!cluster) initEngine();

    let done = false;

    // ================= FALLBACK SAFETY =================
    const timeout = setTimeout(async () => {
      if (done) return;
      done = true;

      try {
        const move = await fallback.getBestMove(fen, depth, mpv);
        resolve(move || null);
      } catch {
        resolve(null);
      }
    }, 3500);

    // ================= CLUSTER RESPONSE =================
    const handler = (e) => {
      if (done) return;

      if (e.data?.type === "result") {
        done = true;
        clearTimeout(timeout);

        cluster.removeEventListener("message", handler);

        resolve(e.data.moves?.[0] || null);
      }
    };

    cluster.addEventListener("message", handler);

    cluster.postMessage({
      cmd: "search",
      fen,
      depth,
      mpv
    });
  });
}

// ================= OPTIONAL: TOP MOVES =================
export function getTopMoves(fen, depth = 10, mpv = 3) {
  return new Promise((resolve) => {
    let done = false;

    const timeout = setTimeout(async () => {
      if (done) return;
      done = true;

      const move = await fallback.getBestMoveFromPool(fen, depth, mpv);
      resolve(move ? [move] : []);
    }, 3500);

    const handler = (e) => {
      if (done) return;

      if (e.data?.type === "result") {
        done = true;
        clearTimeout(timeout);

        cluster.removeEventListener("message", handler);

        resolve(e.data.moves || []);
      }
    };

    cluster.addEventListener("message", handler);

    cluster.postMessage({
      cmd: "search",
      fen,
      depth,
      mpv
    });
  });
}
