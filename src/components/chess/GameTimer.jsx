import React from 'react';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GameTimer({ whiteTime, blackTime, activeColor, isRunning }) {
  return (
    <div className="flex gap-2">
      <div className={`flex-1 rounded-xl p-3 text-center border transition-all ${
        activeColor === 'b' && isRunning
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : 'border-border bg-card'
      }`}>
        <div className="text-xs text-muted-foreground mb-1">Black</div>
        <div className={`font-mono font-bold text-lg ${
          blackTime <= 10 ? 'text-red-400' : 'text-foreground'
        }`}>
          {formatTime(blackTime)}
        </div>
      </div>
      <div className={`flex-1 rounded-xl p-3 text-center border transition-all ${
        activeColor === 'w' && isRunning
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : 'border-border bg-card'
      }`}>
        <div className="text-xs text-muted-foreground mb-1">White</div>
        <div className={`font-mono font-bold text-lg ${
          whiteTime <= 10 ? 'text-red-400' : 'text-foreground'
        }`}>
          {formatTime(whiteTime)}
        </div>
      </div>
    </div>
  );
      }
