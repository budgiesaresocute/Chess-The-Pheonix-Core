// =====================================
// Phoenix Chess Engine Worker v12
// Tries real Stockfish CDN → falls back to strong minimax
// =====================================

const MAX_PV = 7;
const CACHE = new Map();
const CACHE_TTL = 20000;

// ── PV Map for MultiPV tracking ──────────────────────────────────────────
const pvMap = new Map();

// ── State ─────────────────────────────────────────────────────────────────
let sf = null;
let sfReady = false;
let sfFailed = false;
let session = 0;
let pending = null;
let initDone = false;
let initResolve = null;
let initPromise = new Promise(r => { initResolve = r; });

// ── Piece values & PST for minimax fallback ───────────────────────────────
const PV = { p:100, n:320, b:330, r:500, q:900, k:20000 };
const PST = {
  p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};

// ── Minimax engine ────────────────────────────────────────────────────────
const FILES_ARR = ['a','b','c','d','e','f','g','h'];

function fenToState(fen) {
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  const board = [];
  for (let r = 0; r < 8; r++) {
    board[r] = [];
    let f = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { for (let i = 0; i < +ch; i++) board[r][f++] = null; }
      else { board[r][f++] = { type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' }; }
    }
  }
  return { board, turn: parts[1], castling: parts[2] || '-', ep: parts[3] || '-' };
}

function rc2sq(r, f) { return FILES_ARR[f] + (8 - r); }
function sq2rc(sq) { return { r: 8 - parseInt(sq[1]), f: FILES_ARR.indexOf(sq[0]) }; }
function inB(r, f) { return r >= 0 && r < 8 && f >= 0 && f < 8; }

function genMoves(st) {
  const moves = [], b = st.board, t = st.turn;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (!p || p.color !== t) continue;
      const from = rc2sq(r, f);
      if (p.type === 'p') {
        const dir = t === 'w' ? -1 : 1, sr = t === 'w' ? 6 : 1, pr = t === 'w' ? 0 : 7;
        if (inB(r+dir,f) && !b[r+dir][f]) {
          if (r+dir===pr) ['q','r','b','n'].forEach(pp=>moves.push(from+rc2sq(r+dir,f)+pp));
          else { moves.push(from+rc2sq(r+dir,f)); if(r===sr&&!b[r+dir*2][f]) moves.push(from+rc2sq(r+dir*2,f)); }
        }
        for (const df of [-1,1]) {
          if (!inB(r+dir,f+df)) continue;
          const tgt = b[r+dir][f+df];
          const toSq = rc2sq(r+dir,f+df);
          if (tgt && tgt.color!==t) { if(r+dir===pr) ['q','r','b','n'].forEach(pp=>moves.push(from+toSq+pp)); else moves.push(from+toSq); }
          if (st.ep&&st.ep!=='-'&&toSq===st.ep) moves.push(from+toSq);
        }
      }
      if (p.type==='n') for(const[dr,df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) { if(inB(r+dr,f+df)&&(!b[r+dr][f+df]||b[r+dr][f+df].color!==t)) moves.push(from+rc2sq(r+dr,f+df)); }
      if (p.type==='b'||p.type==='q') for(const[dr,df] of [[-1,-1],[-1,1],[1,-1],[1,1]]) { let nr=r+dr,nf=f+df; while(inB(nr,nf)){if(b[nr][nf]){if(b[nr][nf].color!==t)moves.push(from+rc2sq(nr,nf));break;}moves.push(from+rc2sq(nr,nf));nr+=dr;nf+=df;} }
      if (p.type==='r'||p.type==='q') for(const[dr,df] of [[-1,0],[1,0],[0,-1],[0,1]]) { let nr=r+dr,nf=f+df; while(inB(nr,nf)){if(b[nr][nf]){if(b[nr][nf].color!==t)moves.push(from+rc2sq(nr,nf));break;}moves.push(from+rc2sq(nr,nf));nr+=dr;nf+=df;} }
      if (p.type==='k') {
        for(const[dr,df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) { if(inB(r+dr,f+df)&&(!b[r+dr][f+df]||b[r+dr][f+df].color!==t)) moves.push(from+rc2sq(r+dr,f+df)); }
        if(t==='w'&&r===7&&f===4){if(st.castling.includes('K')&&!b[7][5]&&!b[7][6])moves.push('e1g1');if(st.castling.includes('Q')&&!b[7][3]&&!b[7][2]&&!b[7][1])moves.push('e1c1');}
        if(t==='b'&&r===0&&f===4){if(st.castling.includes('k')&&!b[0][5]&&!b[0][6])moves.push('e8g8');if(st.castling.includes('q')&&!b[0][3]&&!b[0][2]&&!b[0][1])moves.push('e8c8');}
      }
    }
  }
  return moves;
}

function applyMv(st, mv) {
  const nb = st.board.map(r=>r.slice());
  const from=sq2rc(mv.slice(0,2)), to=sq2rc(mv.slice(2,4)), pr=mv[4]||null;
  const piece = nb[from.r][from.f];
  if (!piece) return null;
  nb[from.r][from.f] = null;
  nb[to.r][to.f] = pr ? {type:pr,color:piece.color} : piece;
  if(piece.type==='p'&&st.ep&&st.ep!=='-'&&mv.slice(2,4)===st.ep){const d=piece.color==='w'?1:-1;nb[to.r+d][to.f]=null;}
  if(piece.type==='k'){if(mv==='e1g1'){nb[7][5]=nb[7][7];nb[7][7]=null;}if(mv==='e1c1'){nb[7][3]=nb[7][0];nb[7][0]=null;}if(mv==='e8g8'){nb[0][5]=nb[0][7];nb[0][7]=null;}if(mv==='e8c8'){nb[0][3]=nb[0][0];nb[0][0]=null;}}
  let nep='-';
  if(piece.type==='p'&&Math.abs(from.r-to.r)===2) nep=rc2sq((from.r+to.r)/2,from.f);
  return {board:nb,turn:st.turn==='w'?'b':'w',castling:st.castling,ep:nep};
}

function kingAttacked(st, color) {
  let kr=-1,kf=-1;
  for(let r=0;r<8;r++) for(let f=0;f<8;f++) if(st.board[r][f]?.type==='k'&&st.board[r][f].color===color){kr=r;kf=f;}
  if(kr===-1) return true;
  const opp=color==='w'?'b':'w';
  const oppMvs=genMoves({board:st.board,turn:opp,castling:'-',ep:'-'});
  const ksq=rc2sq(kr,kf);
  return oppMvs.some(m=>m.slice(2,4)===ksq);
}

function mvScore(st, mv) {
  const fr=sq2rc(mv.slice(0,2)),to=sq2rc(mv.slice(2,4));
  const atk=st.board[fr.r][fr.f], vic=st.board[to.r][to.f];
  let s=0;
  if(vic) s+=PV[vic.type]*10-(atk?PV[atk.type]:0);
  if(mv[4]) s+=800;
  return s;
}

function evalSt(st) {
  let score=0;
  for(let r=0;r<8;r++) for(let f=0;f<8;f++) {
    const p=st.board[r][f];
    if(!p) continue;
    const idx=p.color==='w'?r*8+f:(7-r)*8+f;
    score+=(p.color==='w'?1:-1)*(PV[p.type]+(PST[p.type]?.[idx]||0));
  }
  return score;
}

function ab(st, depth, alpha, beta, max) {
  if (depth===0) return evalSt(st);
  const mvs = genMoves(st).filter(m=>{ const ns=applyMv(st,m); return ns&&!kingAttacked(ns,st.turn); });
  if (!mvs.length) return kingAttacked(st,st.turn)?(max?-99999:99999):0;
  mvs.sort((a,b)=>mvScore(st,b)-mvScore(st,a));
  if (max) {
    let best=-Infinity;
    for(const m of mvs){const ns=applyMv(st,m);if(!ns)continue;best=Math.max(best,ab(ns,depth-1,alpha,beta,false));alpha=Math.max(alpha,best);if(beta<=alpha)break;}
    return best;
  } else {
    let best=Infinity;
    for(const m of mvs){const ns=applyMv(st,m);if(!ns)continue;best=Math.min(best,ab(ns,depth-1,alpha,beta,true));beta=Math.min(beta,best);if(beta<=alpha)break;}
    return best;
  }
}

function minimaxSearch(fen, depth, poolSize) {
  const st = fenToState(fen);
  const allMvs = genMoves(st).filter(m=>{ const ns=applyMv(st,m); return ns&&!kingAttacked(ns,st.turn); });
  if (!allMvs.length) return [];
  const isMax = st.turn==='w';
  allMvs.sort((a,b)=>mvScore(st,b)-mvScore(st,a));
  const scored = allMvs.map(m => {
    const ns = applyMv(st,m);
    if(!ns) return {move:m,score:isMax?-99999:99999};
    return {move:m, score:ab(ns,Math.max(1,depth-1),-Infinity,Infinity,!isMax)};
  });
  scored.sort((a,b)=>isMax?b.score-a.score:a.score-b.score);
  return scored.slice(0,poolSize).map(s=>s.move);
}

// ── Try loading real Stockfish from CDN ───────────────────────────────────
function tryLoadCDN() {
  const sources = [
    'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js',
    'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-16-single.js',
    'https://unpkg.com/stockfish@16.0.0/src/stockfish-nnue-16-single.js',
  ];

  for (const src of sources) {
    try {
      importScripts(src);
      sf = typeof STOCKFISH !== 'undefined' ? STOCKFISH()
         : typeof Stockfish !== 'undefined' ? Stockfish()
         : null;
      if (sf) break;
    } catch { continue; }
  }

  if (!sf) { sfFailed = true; initResolve(false); return; }

  sf.onmessage = (e) => {
    const line = typeof e === 'string' ? e : e.data;
    if (!line) return;
    if (line === 'uciok' || line === 'readyok') {
      sfReady = true;
      initResolve(true);
      self.postMessage({ type: 'ready', engine: 'stockfish' });
      return;
    }
    if (line.startsWith('info') && line.includes(' pv ')) {
      const mpvM = line.match(/multipv (\d+)/);
      const pvIdx = line.indexOf(' pv ');
      const move = pvIdx !== -1 ? line.slice(pvIdx+4).trim().split(/\s+/)[0] : null;
      const depM = line.match(/ depth (\d+)/);
      const cpM = line.match(/score cp (-?\d+)/);
      const id = mpvM ? +mpvM[1] : 1;
      const d = depM ? +depM[1] : 0;
      const prev = pvMap.get(id);
      if (move && (!prev || d >= prev.depth)) pvMap.set(id, { move, depth: d, score: cpM ? +cpM[1] : 0 });
    }
    if (line.startsWith('bestmove')) {
      const best = line.split(' ')[1];
      if (pending) {
        const moves = [...pvMap.values()].sort((a,b)=>b.depth-a.depth).map(v=>v.move).filter(Boolean);
        const final = moves.length ? moves : (best && best !== '(none)' && best !== '0000' ? [best] : []);
        pending(final);
        pending = null;
      }
      pvMap.clear();
    }
  };

  sf.onerror = () => { sfFailed = true; initResolve(false); };
  sf.postMessage('uci');
  sf.postMessage('isready');
  setTimeout(() => { if (!sfReady) { sfFailed = true; initResolve(false); } }, 10000);
}

// Try loading CDN Stockfish at startup
try { tryLoadCDN(); } catch { sfFailed = true; initResolve(false); }

// ── Message handler ───────────────────────────────────────────────────────
self.onmessage = async (e) => {
  const { cmd, fen, depth, mpv } = e.data;

  if (cmd === 'init') {
    initPromise.then(ok => {
      self.postMessage({ type: ok ? 'ready' : 'fallback', engine: ok ? 'stockfish' : 'minimax' });
    });
    return;
  }

  if (cmd === 'search') {
    const mySession = ++session;

    // Check cache
    const cacheKey = `${fen}|${depth}|${mpv}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
      self.postMessage({ type: 'result', moves: cached.moves });
      return;
    }

    const poolSize = Math.min(mpv || 1, MAX_PV);

    // Try real Stockfish first
    const sfOk = await initPromise;

    if (sfOk && sf && sfReady && !sfFailed) {
      // Use real Stockfish
      pvMap.clear();
      const moves = await new Promise((resolve) => {
        pending = resolve;
        try {
          sf.postMessage('stop');
          sf.postMessage('ucinewgame');
          sf.postMessage(`setoption name MultiPV value ${poolSize}`);
          sf.postMessage(`position fen ${fen}`);
          sf.postMessage(`go depth ${depth} movetime ${Math.min(depth * 500, 8000)}`);
        } catch { resolve([]); }
        setTimeout(() => { if (pending === resolve) { pending = null; resolve([]); } }, 9000);
      });

      if (moves.length > 0 && session === mySession) {
        CACHE.set(cacheKey, { moves, t: Date.now() });
        self.postMessage({ type: 'result', moves });
        return;
      }
    }

    // Fallback to minimax — strong enough at depth 5-6
    if (session !== mySession) return;
    const fallbackDepth = Math.min(depth, 6);
    const moves = minimaxSearch(fen, fallbackDepth, poolSize);
    if (session !== mySession) return;
    CACHE.set(cacheKey, { moves, t: Date.now() });
    self.postMessage({ type: 'result', moves });
  }

  if (cmd === 'stop') {
    session++;
    pending = null;
    pvMap.clear();
    try { sf?.postMessage('stop'); } catch {}
  }
};
