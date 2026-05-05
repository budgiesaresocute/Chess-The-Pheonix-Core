import { createStockfish } from "./stockfishBot.js";

let cluster = null;
let fallback = null;

// ================= INIT =================
export function initEngine() {
  if (!cluster) {
    cluster = new Worker("/stockfish-worker.js");
    cluster.postMessage({ cmd: "init" });
  }

  if (!fallback) {
    fallback = createStockfish();
  }
}

// ================= TIME CONTROL (REALISTIC CHESS THINKING) =================
function getThinkTime(depth) {
  const depthTimeMap = {
    10: 2000,     // Orion: 2 seconds
    16: 8000,     // TitanX: 8 seconds
    20: 15000,    // Vortex: 15 seconds
    24: 25000,    // Zenith: 25 seconds
    28: 35000     // Phoenix: 35 seconds
  };
  
  return depthTimeMap[depth] || 3000;
}

// ================= MAIN BOT API =================
export function getBestMove(fen, depth = 10, mpv = 1) {
  return new Promise((resolve) => {
    let done = false;
    let fallbackTriggered = false;

    const thinkTime = getThinkTime(depth);

    // ================= FALLBACK SAFETY =================
    const timeout = setTimeout(async () => {
      if (done || fallbackTriggered) return;

      fallbackTriggered = true;
      done = true;

      const move = await fallback.getBestMove(fen, depth, mpv);
      resolve(move);
    }, thinkTime + 1000);

    // ================= CLUSTER RESPONSE =================
    cluster.onmessage = (e) => {
      if (done) return;

      if (e.data?.type === "result") {
        fallbackTriggered = true;
        done = true;

        clearTimeout(timeout);

        resolve(e.data.moves?.[0] || null);
      }
    };

    // ================= SEND TO CLUSTER =================
    cluster.postMessage({
      cmd: "search",
      fen,
      depth,
      mpv
    });
  });
}

export function getBestMoveFromPool(fen, depth = 10, mpv = 7) {
  return new Promise((resolve) => {
    let done = false;
    let fallbackTriggered = false;

    const thinkTime = getThinkTime(depth);

    // ================= FALLBACK SAFETY =================
    const timeout = setTimeout(async () => {
      if (done || fallbackTriggered) return;

      fallbackTriggered = true;
      done = true;

      const moves = await fallback.getBestMoveFromPool(fen, depth, mpv);
      resolve(moves || []);
    }, thinkTime + 1000);

    // ================= CLUSTER RESPONSE =================
    cluster.onmessage = (e) => {
      if (done) return;

      if (e.data?.type === "result") {
        fallbackTriggered = true;
        done = true;

        clearTimeout(timeout);

        resolve(e.data.moves || []);
      }
    };

    // ================= SEND TO CLUSTER =================
    cluster.postMessage({
      cmd: "search",
      fen,
      depth,
      mpv
    });
  });
}
