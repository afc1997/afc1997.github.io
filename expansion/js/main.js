import { initMaze } from './maze.js';

// ── Scroll state ──────────────────────────────────────────────────────────
const DESCENT_PX   = innerHeight;        // one viewport scroll = full descent
const autoSpeed    = 28;                 // px/s during autoscroll
const lerpAmount   = 0.075;
const cursorIdleMs = 3000;

let targetY        = 0;
let virtualY       = 0;
let lastCursorMove = performance.now();

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t)    { return a + (b - a) * t; }
function maxScroll()       { return DESCENT_PX; }

// ── Input ─────────────────────────────────────────────────────────────────
addEventListener('mousemove',  () => { lastCursorMove = performance.now(); });
addEventListener('touchstart', () => { lastCursorMove = performance.now(); }, { passive: true });

addEventListener('wheel', e => {
  e.preventDefault();
  targetY = clamp(targetY + e.deltaY, 0, maxScroll());
}, { passive: false });

let touchY = null;
addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => {
  if (!touchY) return;
  const ny = e.touches[0].clientY;
  targetY = clamp(targetY + (touchY - ny) * 1.5, 0, maxScroll());
  touchY = ny;
}, { passive: true });
addEventListener('touchend', () => { touchY = null; });

addEventListener('keydown', e => {
  const step = innerHeight * 0.9;
  if      (e.key === 'ArrowDown' || e.key === ' ')   { e.preventDefault(); targetY = clamp(targetY + step, 0, maxScroll()); }
  else if (e.key === 'ArrowUp')                       { e.preventDefault(); targetY = clamp(targetY - step, 0, maxScroll()); }
  else if (e.key === 'Home')                          { targetY = 0; }
  else if (e.key === 'End')                           { targetY = maxScroll(); }
});

// ── DOM refs ──────────────────────────────────────────────────────────────
const heroOver  = document.getElementById('hero-over');
const heroBylne = document.querySelector('.hero-byline');

// ── Custom cursor ─────────────────────────────────────────────────────────
function initCursor() {
  if (window !== window.top) {
    document.addEventListener('mousemove', e => {
      window.parent.postMessage({ type: 'gmp_cursor', x: e.clientX, y: e.clientY }, '*');
    });
    document.addEventListener('mouseleave', () => {
      window.parent.postMessage({ type: 'gmp_cursor_leave' }, '*');
    });
    document.addEventListener('click', () => {
      window.parent.postMessage({ type: 'gmp_interaction' }, '*');
    }, true);
    document.addEventListener('keydown', () => {
      window.parent.postMessage({ type: 'gmp_interaction' }, '*');
    }, true);
    return;
  }
  const cur = document.createElement('div');
  cur.className = 'cursor';
  document.body.appendChild(cur);
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.classList.add('visible');
    const over = e.target.closest('.gmp, .maze-label-wrap');
    cur.classList.toggle('expanded', !!over);
  });
  document.addEventListener('mouseleave', () => cur.classList.remove('visible'));
  (function loop() {
    cx += (mx - cx) * 0.1; cy += (my - cy) * 0.1;
    cur.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 50%))`;
    requestAnimationFrame(loop);
  })();
}

// ── Music player ──────────────────────────────────────────────────────────
function initGMP() {
  const tracks = [
    'pitch-assets/audio/zone-of-interest-full.mp3',
    'pitch-assets/audio/under-the-skin.mp3',
  ];
  let current = 0;
  const audio   = new Audio();
  const playBtn = document.getElementById('gmp-play');
  const prevBtn = document.getElementById('gmp-prev');
  const nextBtn = document.getElementById('gmp-next');
  if (!playBtn) return;
  function load(idx, play) { audio.src = tracks[idx]; if (play) audio.play(); }
  playBtn.addEventListener('click', () => { audio.paused ? audio.play() : audio.pause(); });
  audio.addEventListener('play',  () => { playBtn.innerHTML = '&#9646;&#9646;'; });
  audio.addEventListener('pause', () => { playBtn.innerHTML = '&#9654;'; });
  audio.addEventListener('ended', () => { current = (current + 1) % tracks.length; load(current, true); });
  prevBtn.addEventListener('click', () => { current = (current - 1 + tracks.length) % tracks.length; load(current, !audio.paused); });
  nextBtn.addEventListener('click', () => { current = (current + 1) % tracks.length; load(current, !audio.paused); });
  load(0, false);
}

// ── Maze canvas ───────────────────────────────────────────────────────────
const mazeCanvas = document.createElement('canvas');
mazeCanvas.className = 'maze-canvas';
document.body.appendChild(mazeCanvas);

// ── Tick ─────────────────────────────────────────────────────────────────
let tLast = performance.now();
let maze  = null;

function tick(tNow) {
  const dt = tNow - tLast; tLast = tNow;

  // Autoscroll after cursor idle
  if ((tNow - lastCursorMove) > cursorIdleMs && targetY < maxScroll()) {
    targetY = clamp(targetY + autoSpeed * dt / 1000, 0, maxScroll());
  }

  virtualY += (targetY - virtualY) * lerpAmount;

  // Scroll fraction 0 (top) → 1 (descended)
  const frac = clamp(virtualY / maxScroll(), 0, 1);

  // ── Sticky title ──────────────────────────────────────────────────────────
  // Derive pinnedY so the visual top edge of the shrunken title lands at
  // exactly NAV_TOP px from the viewport top — matching .site-topnav exactly.
  const NAV_TOP    = 8;                // px — must match padding-top in CSS
  const NAV_PX     = 11;              // target visual font-size — must match .site-topnav font-size
  const heroFontPx = Math.min(124, Math.max(52, innerWidth * 0.085));
  const elH        = heroOver.offsetHeight || heroFontPx;
  // visual_top = pinnedY + elH/2 × (1 − scale). Solve for pinnedY so visual_top = NAV_TOP.
  const pinnedY    = NAV_TOP - elH / 2 * (1 - NAV_PX / heroFontPx);
  const travelPx   = Math.max(0, innerHeight / 2 - pinnedY - elH / 2);

  // Translation: 1-to-1 with scroll until pinned
  const transY = Math.min(virtualY, travelPx);

  // Shrink: starts only after pinning, smoothstepped
  const rawShrink  = clamp((virtualY - travelPx) / Math.max(1, maxScroll() - travelPx), 0, 1);
  const shrinkFrac = rawShrink * rawShrink * (3 - 2 * rawShrink);
  const scale      = lerp(1, NAV_PX / heroFontPx, shrinkFrac);

  // Byline fades during scroll-up, gone before shrink
  const bylineOpacity = clamp(1 - (virtualY / Math.max(1, travelPx)) * 1.4, 0, 1);

  heroOver.style.transform = `translate(-50%, calc(-50% - ${transY}px)) scale(${scale})`;
  heroBylne.style.opacity  = bylineOpacity.toFixed(3);

  // Pass descent to maze
  if (maze) maze.setScroll(frac);

  requestAnimationFrame(tick);
}

window.addEventListener('load', () => {
  initCursor();
  if (window !== window.top) {
    document.getElementById('gmp')?.style.setProperty('display', 'none');
  } else {
    initGMP();
  }
  maze = initMaze(mazeCanvas, {
    fov: 100,
    onNavigate: href => { if (window.frameElement) window.frameElement.src = href; else window.top.location.href = href; },
  });
  maze.show();
  requestAnimationFrame(tick);
});
