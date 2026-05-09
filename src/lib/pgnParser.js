// src/lib/pgnParser.js

import { Chess } from 'chess.js';

export function parsePgn(pgn) {
  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch (err) {
    throw new Error('Invalid PGN');
  }

  const history = chess.history({
    verbose: true,
  });

  chess.reset();

  const fenHistory = [];

  history.forEach((move) => {
    chess.move(move);

    fenHistory.push(
      chess.fen()
    );
  });

  return {
    history,
    fenHistory,
    finalFen: chess.fen(),
    headers: chess.header(),
  };
}
