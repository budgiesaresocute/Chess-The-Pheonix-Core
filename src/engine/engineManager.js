// =====================================
// Phoenix Engine Manager (v2 CLEAN FINAL)
// Single engine • No conflicts • Predictable
// =====================================

import { createStockfish } from "./stockfishBot";

let engine = null;

// ================= INIT =================
export function initEngine() {
  if (!engine) {
    engine = createStockfish();
  }
}

// ================= GET SINGLE BEST MOVE =================
export async function getBestMove(fen, depth = 10) {
  if (!engine) initEngine();

  const move = await engine.getBestMove(fen, depth);
  return move || null;
}

// ================= GET MOVE POOL =================
export async function getMovePool(fen, depth = 10, mpv = 3) {
  if (!engine) initEngine();

  const moves = await engine.getBestMoveFromPool(fen, depth, mpv);
  return moves || [];
}

// ================= STOP =================
export function stopEngine() {
  try {
    engine?.stop();
  } catch {}
}
