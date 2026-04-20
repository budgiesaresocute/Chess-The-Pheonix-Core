const AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq, duration, type = 'sine', volume = 0.3) {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.start(c.currentTime);
    o.stop(c.currentTime + duration);
  } catch {}
}

export function playMoveSound() { beep(440, 0.1); }
export function playCaptureSound() { beep(280, 0.2, 'sawtooth', 0.4); }
export function playCheckSound() { beep(600, 0.3, 'square', 0.35); }
export function playCheckmateSound() {
  beep(300, 0.3, 'sawtooth', 0.5);
  setTimeout(() => beep(200, 0.5, 'sawtooth', 0.5), 300);
}
export function playPhoenixReviveSound() {
  beep(500, 0.2, 'sine', 0.4);
  setTimeout(() => beep(700, 0.2, 'sine', 0.4), 200);
  setTimeout(() => beep(900, 0.4, 'sine', 0.5), 400);
}
export function playDiceSound() { beep(350, 0.15, 'square', 0.25); }
export function playGameStartSound() {
  beep(520, 0.15, 'sine', 0.3);
  setTimeout(() => beep(660, 0.15, 'sine', 0.3), 150);
  setTimeout(() => beep(780, 0.25, 'sine', 0.35), 300);
       }
