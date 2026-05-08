// ============================================
// Game Analysis Engine
// Classifies moves as: Best, Good, Decent, Inaccuracy, Mistake, Blunder, Brilliant
// ============================================

export const MOVE_CLASSIFICATIONS = {
  BEST: 'Best',
  GOOD: 'Good',
  DECENT: 'Decent',
  INACCURACY: 'Inaccuracy',
  MISTAKE: 'Mistake',
  BLUNDER: 'Blunder',
  BRILLIANT: 'Brilliant',
};

export const CLASSIFICATION_EMOJI = {
  'Best': '✅',
  'Good': '👍',
  'Decent': '➖',
  'Inaccuracy': '⚠️',
  'Mistake': '❌',
  'Blunder': '💥',
  'Brilliant': '💎',
};

export const CLASSIFICATION_COLOR = {
  'Best': '#00cc00',
  'Good': '#66ff66',
  'Decent': '#ffff99',
  'Inaccuracy': '#ff9900',
  'Mistake': '#ff6600',
  'Blunder': '#ff0000',
  'Brilliant': '#0066ff',
};

// Threshold evaluation differences (in centipawns)
const THRESHOLDS = {
  BEST: 5,           // Within 5 cp of best
  GOOD: 25,          // Within 25 cp
  DECENT: 50,        // Within 50 cp
  INACCURACY: 100,   // 50-100 cp loss
  MISTAKE: 200,      // 100-200 cp loss
  BLUNDER: 300,      // 200+ cp loss
};

/**
 * Classify a single move based on evaluation loss
 * @param {number} bestEval - Evaluation of best move (in centipawns)
 * @param {number} playedEval - Evaluation of played move (in centipawns)
 * @returns {string} Classification type
 */
export function classifyMove(bestEval, playedEval) {
  // Handle mate scenarios
  if (bestEval === null || playedEval === null) {
    return MOVE_CLASSIFICATIONS.DECENT;
  }

  const evalLoss = Math.abs(bestEval - playedEval);

  // Check for brilliant (opposite side's eval)
  if (Math.sign(bestEval) !== Math.sign(playedEval) && evalLoss > 300) {
    return MOVE_CLASSIFICATIONS.BRILLIANT;
  }

  if (evalLoss <= THRESHOLDS.BEST) return MOVE_CLASSIFICATIONS.BEST;
  if (evalLoss <= THRESHOLDS.GOOD) return MOVE_CLASSIFICATIONS.GOOD;
  if (evalLoss <= THRESHOLDS.DECENT) return MOVE_CLASSIFICATIONS.DECENT;
  if (evalLoss <= THRESHOLDS.INACCURACY) return MOVE_CLASSIFICATIONS.INACCURACY;
  if (evalLoss <= THRESHOLDS.MISTAKE) return MOVE_CLASSIFICATIONS.MISTAKE;
  return MOVE_CLASSIFICATIONS.BLUNDER;
}

/**
 * Analyze a complete game
 * @param {Array} moves - Array of move objects with evaluations
 * @returns {Object} Comprehensive game analysis
 */
export function analyzeGame(moves, fen_history) {
  const analysis = {
    total_moves: moves.length,
    classifications: {},
    accuracy: 0,
    best_move_turn: null,
    worst_move_turn: null,
    brilliant_moves: [],
    blunders: [],
    turning_point: null,
    highlights: [],
  };

  // Initialize classification counts
  Object.values(MOVE_CLASSIFICATIONS).forEach(cls => {
    analysis.classifications[cls] = 0;
  });

  let accuracyScore = 0;
  let prev_eval = 0;

  moves.forEach((move, index) => {
    if (!move.bestEval || !move.playedEval) return;

    const classification = classifyMove(move.bestEval, move.playedEval);
    analysis.classifications[classification]++;

    // Track accuracy (percentage of best/good moves)
    if (classification === MOVE_CLASSIFICATIONS.BEST || 
        classification === MOVE_CLASSIFICATIONS.GOOD) {
      accuracyScore += 100;
    } else if (classification === MOVE_CLASSIFICATIONS.DECENT) {
      accuracyScore += 70;
    } else if (classification === MOVE_CLASSIFICATIONS.INACCURACY) {
      accuracyScore += 40;
    } else if (classification === MOVE_CLASSIFICATIONS.MISTAKE) {
      accuracyScore += 20;
    } else if (classification === MOVE_CLASSIFICATIONS.BRILLIANT) {
      accuracyScore += 110;
      analysis.brilliant_moves.push(index + 1);
    }

    // Track blunders
    if (classification === MOVE_CLASSIFICATIONS.BLUNDER) {
      analysis.blunders.push({
        turn: index + 1,
        move: move.san,
        eval_loss: Math.abs(move.bestEval - move.playedEval),
      });
    }

    // Find turning point (biggest eval swing)
    const eval_change = Math.abs(move.playedEval - prev_eval);
    if (!analysis.turning_point || eval_change > 300) {
      analysis.turning_point = index + 1;
    }

    prev_eval = move.playedEval;
  });

  // Calculate overall accuracy percentage
  analysis.accuracy = Math.round(accuracyScore / moves.length);

  return analysis;
}

/**
 * Generate explanations for moves
 * @param {string} classification - Move classification
 * @param {number} evalLoss - Evaluation loss in centipawns
 * @param {string} context - Board state context
 * @returns {string} Explanation
 */
export function getExplanation(classification, evalLoss, context = '') {
  const explanations = {
    'Best': 'This was the strongest move available in this position.',
    'Good': 'A solid move that maintains your advantage.',
    'Decent': 'A reasonable move, though better options existed.',
    'Inaccuracy': `You missed a better move. This cost you about ${Math.round(evalLoss)} centipawns.`,
    'Mistake': `This was a significant error. You lost approximately ${Math.round(evalLoss)} centipawns here.`,
    'Blunder': `This was a critical blunder. You lost roughly ${Math.round(evalLoss)} centipawns! ${context}`,
    'Brilliant': 'An exceptional move! You found something surprising.',
  };

  return explanations[classification] || 'Unknown move classification';
}

/**
 * Coach commentary with different personas
 */
export const COACH_PERSONAS = {
  BRUTAL: {
    name: 'Brutal Coach',
    emoji: '🔥',
    getComment: (analysis, classification) => {
      if (analysis.blunders.length > 5) {
        return `You made ${analysis.blunders.length} blunders. Time to study the basics.`;
      }
      if (analysis.accuracy < 50) {
        return 'Your play was extremely poor. Too many inaccuracies.';
      }
      if (analysis.accuracy < 70) {
        return 'Sloppy. You need to slow down and think more carefully.';
      }
      return 'Not terrible, but could be much better.';
    }
  },
  
  FRIENDLY: {
    name: 'Friendly Coach',
    emoji: '😊',
    getComment: (analysis) => {
      if (analysis.brilliant_moves.length > 0) {
        return `Great game! You found ${analysis.brilliant_moves.length} brilliant move(s). Nice work!`;
      }
      if (analysis.accuracy > 80) {
        return 'Excellent play! You made mostly strong moves.';
      }
      if (analysis.accuracy > 60) {
        return 'Good effort! You had some solid moments. Keep practicing!';
      }
      return 'Not bad! Everyone makes mistakes. Learn from them!';
    }
  },

  MEME: {
    name: 'Meme Coach',
    emoji: '🤡',
    getComment: (analysis) => {
      if (analysis.blunders.length > 3) {
        return 'Sir this is a Wendy\'s... I mean, this is chess. 💀';
      }
      if (analysis.accuracy < 40) {
        return 'POV: You\'re playing blindfolded 🙈';
      }
      if (analysis.brilliant_moves.length > 0) {
        return 'Even a broken clock is right twice a day. Nice one though! ⏰';
      }
      return 'It\'s chess, not checkers my friend 😅';
    }
  },

  ANALYTICAL: {
    name: 'Analytical Coach',
    emoji: '🧠',
    getComment: (analysis) => {
      const total = analysis.total_moves;
      const bestPercent = Math.round((analysis.classifications['Best'] / total) * 100);
      const blunderPercent = Math.round((analysis.classifications['Blunder'] / total) * 100);
      
      return `Move statistics: ${bestPercent}% best moves, ${blunderPercent}% blunders. Accuracy: ${analysis.accuracy}%.`;
    }
  }
};

/**
 * Find "How did I lose?" - turning point
 */
export function findTurningPoint(moves) {
  let biggest_loss = 0;
  let turning_point_index = 0;
  let eval_swings = [];

  for (let i = 0; i < moves.length - 1; i++) {
    const current = moves[i].playedEval;
    const next = moves[i + 1].playedEval;
    const swing = Math.abs(next - current);

    eval_swings.push({
      turn: i + 1,
      move: moves[i].san,
      swing: swing,
    });

    if (swing > biggest_loss) {
      biggest_loss = swing;
      turning_point_index = i;
    }
  }

  return {
    turning_point: turning_point_index + 1,
    biggest_swing: biggest_loss,
    top_swings: eval_swings.sort((a, b) => b.swing - a.swing).slice(0, 5),
  };
}

/**
 * Opening weakness analysis
 */
export function analyzeOpeningWeaknesses(gameHistory) {
  const openingStats = {};

  gameHistory.forEach(game => {
    const opening = game.opening || 'Unknown';
    if (!openingStats[opening]) {
      openingStats[opening] = { wins: 0, losses: 0, draws: 0, games: 0 };
    }

    if (game.result === 'win') openingStats[opening].wins++;
    else if (game.result === 'loss') openingStats[opening].losses++;
    else openingStats[opening].draws++;
    
    openingStats[opening].games++;
  });

  // Sort by weakness (lowest win rate)
  return Object.entries(openingStats)
    .map(([opening, stats]) => ({
      opening,
      winRate: stats.games > 0 ? (stats.wins / stats.games * 100).toFixed(1) : 0,
      ...stats,
    }))
    .sort((a, b) => a.winRate - b.winRate);
}

/**
 * Career statistics dashboard
 */
export function generateCareerStats(gameHistory) {
  const stats = {
    total_games: gameHistory.length,
    wins_white: 0,
    wins_black: 0,
    losses_white: 0,
    losses_black: 0,
    draws: 0,
    average_accuracy: 0,
    average_opponent_rating: 0,
    total_blunders: 0,
    winstreak: 0,
    best_accuracy_game: null,
    worst_accuracy_game: null,
  };

  let accuracy_sum = 0;
  let accuracy_count = 0;
  let rating_sum = 0;

  gameHistory.forEach(game => {
    if (game.result === 'win') {
      if (game.color === 'white') stats.wins_white++;
      else stats.wins_black++;
    } else if (game.result === 'loss') {
      if (game.color === 'white') stats.losses_white++;
      else stats.losses_black++;
    } else {
      stats.draws++;
    }

    if (game.accuracy) {
      accuracy_sum += game.accuracy;
      accuracy_count++;
      
      if (!stats.best_accuracy_game || game.accuracy > stats.best_accuracy_game.accuracy) {
        stats.best_accuracy_game = game;
      }
      if (!stats.worst_accuracy_game || game.accuracy < stats.worst_accuracy_game.accuracy) {
        stats.worst_accuracy_game = game;
      }
    }

    if (game.opponent_rating) {
      rating_sum += game.opponent_rating;
    }

    stats.total_blunders += game.blunders?.length || 0;
  });

  stats.average_accuracy = Math.round(accuracy_sum / accuracy_count) || 0;
  stats.average_opponent_rating = Math.round(rating_sum / gameHistory.length) || 0;
  stats.win_percentage = gameHistory.length > 0 
    ? Math.round((stats.wins_white + stats.wins_black) / gameHistory.length * 100) 
    : 0;

  return stats;
}
