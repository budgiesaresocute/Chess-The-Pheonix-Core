import React from 'react';
import MoveArrows from './MoveArrows';

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
  game,
  selectedSquare,
  legalMoves = [],
  lastMove,
  onSquareClick,
  checkSquare,
  arrows = [],   // ✅ NEW
  flipped = false
}) {
  const board = game.board();

  return (
    <div className="relative inline-block">

      {/* ♟️ MOVE ARROWS OVERLAY */}
      <MoveArrows arrows={arrows} flipped={flipped} />

      <div className="flex">

        {/* Rank labels */}
        <div className="flex flex-col" style={{ width: '18px' }}>
          {RANKS.map(rank => (
            <div key={rank} className="flex items-center justify-center text-xs font-bold opacity-70"
              style={{ width: '18px', height: '44px' }}>
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
                const isLastMove = lastMove &&
                  (lastMove.from === square || lastMove.to === square);
                const isCheck = checkSquare === square;

                let bg = isLight ? '#f0d9b5' : '#b58863';
                if (isLastMove) bg = '#cdd16f';
                if (isSelected) bg = '#f6f669';
                if (isCheck) bg = '#ff6b6b';

                return (
                  <div
                    key={square}
                    onClick={() => onSquareClick(square)}
                    style={{
                      width: '44px',
                      height: '44px',
                      backgroundColor: bg,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                  >

                    {/* legal move dot */}
                    {isLegal && !piece && (
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.25)',
                        position: 'absolute'
                      }} />
                    )}

                    {/* capture ring */}
                    {isLegal && piece && (
                      <div style={{
                        inset: 0,
                        position: 'absolute',
                        border: '3px solid rgba(0,0,0,0.3)'
                      }} />
                    )}

                    {/* piece */}
                    {piece && (
                      <img
                        src={PIECE_IMAGES[piece.color + piece.type]}
                        alt=""
                        style={{
                          width: '38px',
                          height: '38px',
                          zIndex: 5,
                          pointerEvents: 'none'
                        }}
                      />
                    )}

                  </div>
                );
              })}
            </div>
          ))}

          {/* file labels */}
          <div className="flex">
            {FILES.map(f => (
              <div key={f} style={{ width: '44px' }}
                className="text-xs text-center opacity-70 font-bold">
                {f}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
                        }
