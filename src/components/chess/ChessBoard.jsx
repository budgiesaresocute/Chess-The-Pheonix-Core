import React from 'react';

const PIECE_IMAGES = {
  wk: 'https://www.chess.com/chess-themes/pieces/neo/150/wk.png',
  wq: 'https://www.chess.com/chess-themes/pieces/neo/150/wq.png',
  wr: 'https://www.chess.com/chess-themes/pieces/neo/150/wr.png',
  wb: 'https://www.chess.com/chess-themes/pieces/neo/150/wb.png',
  wn: 'https://www.chess.com/chess-themes/pieces/neo/150/wn.png',
  wp: 'https://www.chess.com/chess-themes/pieces/neo/150/wp.png',
  bk: 'https://www.chess.com/chess-themes/pieces/neo/150/bk.png',
  bq: 'https://www.chess.com/chess-themes/pieces/neo/150/bq.png',
  br: 'https://www.chess.com/chess-themes/pieces/neo/150/br.png',
  bb: 'https://www.chess.com/chess-themes/pieces/neo/150/bb.png',
  bn: 'https://www.chess.com/chess-themes/pieces/neo/150/bn.png',
  bp: 'https://www.chess.com/chess-themes/pieces/neo/150/bp.png',
};

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = [8,7,6,5,4,3,2,1];

export default function ChessBoard({
  game, selectedSquare, legalMoves = [], lastMove,
  onSquareClick, checkSquare,
  phoenixSquares, phoenixMoves = [], phoenixSelected, activePhoenixColor
}) {
  const board = game.board();

  return (
    <div className="relative inline-block">
      {/* Rank labels */}
      <div className="flex">
        <div className="flex flex-col" style={{ width: '18px' }}>
          {RANKS.map(rank => (
            <div key={rank} style={{ width: '18px', height: '44px' }}
              className="flex items-center justify-center text-xs font-bold text-amber-900 opacity-70">
              {rank}
            </div>
          ))}
        </div>

        <div>
          {/* Board */}
          {RANKS.map((rank, ri) => (
            <div key={rank} className="flex">
              {FILES.map((file, fi) => {
                const square = file + rank;
                const piece = board[ri][fi];
                const isLight = (ri + fi) % 2 === 0;
                const isSelected = selectedSquare === square;
                const isLegal = legalMoves.includes(square);
                const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
                const isCheck = checkSquare === square;
                const isPhoenixMove = phoenixMoves.includes(square);
                const hasWhitePhoenix = phoenixSquares?.w === square;
                const hasBlackPhoenix = phoenixSquares?.b === square;

                let bgColor = isLight ? '#f0d9b5' : '#b58863';
                if (isLastMove) bgColor = isLight ? '#cdd16f' : '#aaa23a';
                if (isSelected) bgColor = '#f6f669';
                if (isCheck) bgColor = '#ff6b6b';

                return (
                  <div
                    key={square}
                    onClick={() => onSquareClick(square)}
                    style={{
                      width: '44px',
                      height: '44px',
                      backgroundColor: bgColor,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Legal move dot */}
                    {isLegal && !piece && (
                      <div style={{
                        position: 'absolute',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        zIndex: 10,
                      }} />
                    )}

                    {/* Legal capture ring */}
                    {isLegal && piece && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        border: '4px solid rgba(0,0,0,0.3)',
                        zIndex: 10,
                      }} />
                    )}

                    {/* Phoenix move highlight */}
                    {isPhoenixMove && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(255,165,0,0.35)',
                        border: '3px solid orange',
                        zIndex: 10,
                      }} />
                    )}

                    {/* Chess piece */}
                    {piece && (
                      <div style={{ position: 'relative', zIndex: 20 }}>
                        {/* Phoenix aura glow around king */}
                        {((hasWhitePhoenix && piece.color === 'w') ||
                          (hasBlackPhoenix && piece.color === 'b')) && (
                          <div style={{
                            position: 'absolute',
                            inset: '-6px',
                            borderRadius: '50%',
                            border: piece.color === 'w'
                              ? '3px solid rgba(100,180,255,0.9)'
                              : '3px solid rgba(255,80,80,0.9)',
                            boxShadow: piece.color === 'w'
                              ? '0 0 10px 4px rgba(100,180,255,0.6)'
                              : '0 0 10px 4px rgba(255,80,80,0.6)',
                            animation: 'phoenixPulse 1.5s ease-in-out infinite',
                            zIndex: 25,
                          }} />
                        )}
                        <img
  src={PIECE_IMAGES[piece.color + piece.type]}
  alt={piece.color + piece.type}
  style={{
    width: '38px',
    height: '38px',
    userSelect: 'none',
    pointerEvents: 'none',
    display: 'block',
  }}
/>
                      </div>
                    )}

                    {/* Phoenix on empty square (after moving away from king) */}
                    {(hasWhitePhoenix || hasBlackPhoenix) && !piece && (
                      <div style={{
                        position: 'absolute',
                        inset: '4px',
                        borderRadius: '50%',
                        border: hasWhitePhoenix
                          ? '3px solid rgba(100,180,255,0.9)'
                          : '3px solid rgba(255,80,80,0.9)',
                        boxShadow: hasWhitePhoenix
                          ? '0 0 12px 5px rgba(100,180,255,0.5)'
                          : '0 0 12px 5px rgba(255,80,80,0.5)',
                        animation: 'phoenixPulse 1.5s ease-in-out infinite',
                        zIndex: 15,
                      }} />
                    )}

                    {/* Rank number */}
                    {fi === 0 && (
                      <span style={{
                        position: 'absolute', top: '1px', left: '2px',
                        fontSize: '9px', fontWeight: 'bold', opacity: 0.7,
                        color: isLight ? '#b58863' : '#f0d9b5',
                        zIndex: 5,
                      }}>{rank}</span>
                    )}

                    {/* File letter */}
                    {ri === 7 && (
                      <span style={{
                        position: 'absolute', bottom: '1px', right: '2px',
                        fontSize: '9px', fontWeight: 'bold', opacity: 0.7,
                        color: isLight ? '#b58863' : '#f0d9b5',
                        zIndex: 5,
                      }}>{file}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* File labels bottom */}
          <div className="flex" style={{ height: '18px' }}>
            {FILES.map(file => (
              <div key={file} style={{ width: '44px' }}
                className="flex items-center justify-center text-xs font-bold text-amber-900 opacity-70">
                {file}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phoenix pulse animation */}
      <style>{`
        @keyframes phoenixPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
        }
