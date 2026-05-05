// =====================================
// Phoenix Engine Manager (FINAL CLEAN)
// =====================================

import { createStockfish } from "./stockfishBot";

let engine = null;

export function initEngine() {
  if (!engine) {
    engine = createStockfish();
  }
}

export async function getBestMove(fen, depth = 10) {
  if (!engine) initEngine();
  return await engine.getBestMove(fen, depth);
}

export async function getMovePool(fen, depth = 10, mpv = 7) {
  if (!engine) initEngine();
  return await engine.getBestMoveFromPool(fen, depth, mpv);
}

export function stopEngine() {
  try {
    engine?.stop();
  } catch {}
}
