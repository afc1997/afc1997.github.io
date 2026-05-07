// shared.js — cursor + persistent music player

export function initCursor(hoverSelector = '.gmp, .hub-item, [data-clickable]') {
  // Skip cursor entirely on touch devices
  if (window.matchMedia('(pointer: coarse)').matches) {
    // Still wire up navigation relay for iframe context
    if (window !== window.top) {
      document.addEventListener('click', e => {
        window.parent.postMessage({ type: 'gmp_interaction' }, '*');
        const a = e.target.closest('a[target="_top"]');
        if (a) { e.preventDefault(); window.parent.postMessage({ type: 'navigate', href: a.href }, '*'); }
      }, true);
    }
    return;
  }

  // When inside the shell iframe: relay mouse + interaction events to shell
  if (window !== window.top) {
    document.addEventListener('mousemove', e => {
      window.parent.postMessage({ type: 'gmp_cursor', x: e.clientX, y: e.clientY }, '*');
    });
    document.addEventListener('mouseleave', () => {
      window.parent.postMessage({ type: 'gmp_cursor_leave' }, '*');
    });
    document.addEventListener('click', e => {
      window.parent.postMessage({ type: 'gmp_interaction' }, '*');
      const a = e.target.closest('a[target="_top"]');
      if (a) {
        e.preventDefault();
        window.parent.postMessage({ type: 'navigate', href: a.href }, '*');
      }
    }, true);
    document.addEventListener('keydown', () => {
      window.parent.postMessage({ type: 'gmp_interaction' }, '*');
    }, true);
    return; // shell owns the visible cursor
  }

  const cur = document.createElement('div');
  cur.className = 'cursor';
  document.body.appendChild(cur);
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;

  function move(x, y) {
    mx = x; my = y;
    cur.classList.add('visible');
  }

  document.addEventListener('mousemove', e => {
    move(e.clientX, e.clientY);
    const over = e.target.closest(hoverSelector);
    cur.classList.toggle('expanded', !!over);
  });
  document.addEventListener('mouseleave', () => cur.classList.remove('visible'));

  // Receive cursor position relayed from the iframe
  window.addEventListener('message', e => {
    if (e.data?.type === 'gmp_cursor') move(e.data.x, e.data.y);
    if (e.data?.type === 'gmp_cursor_leave') cur.classList.remove('visible');
  });

  (function loop() {
    cx += (mx - cx) * 0.1; cy += (my - cy) * 0.1;
    cur.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 50%))`;
    requestAnimationFrame(loop);
  })();
}

const TRACKS = [
  'pitch-assets/audio/2. under-the-skin.mp3',
  'pitch-assets/audio/3. 7.mp3',
  'pitch-assets/audio/1. zone of interest.mov',
  'pitch-assets/audio/4. Auld Lang Syne.mp3',
  'pitch-assets/audio/5. zone-of-interest.mp3',
  'pitch-assets/audio/6. Cannock Chase.mp3',
];

const STORAGE_KEY = 'gmp_state';

function saveState(audio, current, playing) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      track: current, time: audio.currentTime, playing,
    }));
  } catch (_) {}
}

function loadState() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch (_) { return null; }
}

export function initGMP() {
  const audio = document.getElementById('gmp-audio') || new Audio();
  const playBtn = document.getElementById('gmp-play');
  const prevBtn = document.getElementById('gmp-prev');
  const nextBtn = document.getElementById('gmp-next');
  if (!playBtn) return;

  let current = 0;

  function tryPlay() {
    return audio.play().catch(() => {});
  }

  function loadTrack(idx, play, seekTo) {
    current = idx;
    audio.src = TRACKS[idx];
    audio.load();
    audio.addEventListener('canplay', () => {
      if (seekTo) audio.currentTime = seekTo;
      if (play) tryPlay();
    }, { once: true });
    saveState(audio, current, play);
  }

  playBtn.addEventListener('click', () => {
    if (audio.paused) tryPlay(); else audio.pause();
  });
  prevBtn.addEventListener('click', () => {
    loadTrack((current - 1 + TRACKS.length) % TRACKS.length, !audio.paused, 0);
  });
  nextBtn.addEventListener('click', () => {
    loadTrack((current + 1) % TRACKS.length, !audio.paused, 0);
  });

  audio.addEventListener('play',  () => { playBtn.innerHTML = '&#9646;&#9646;'; saveState(audio, current, true); });
  audio.addEventListener('pause', () => { playBtn.innerHTML = '&#9654;'; saveState(audio, current, false); });
  audio.addEventListener('timeupdate', () => { saveState(audio, current, !audio.paused); });
  audio.addEventListener('ended', () => { loadTrack((current + 1) % TRACKS.length, true, 0); });

  // ── Restore or autoplay ───────────────────────────────────────────────────
  const saved = loadState();
  const firstVisit = !sessionStorage.getItem('gmp_started');

  if (firstVisit) {
    sessionStorage.setItem('gmp_started', '1');
    loadTrack(0, false, 0);
    audio.addEventListener('canplay', () => {
      audio.play().catch(() => {
        // Browser blocked autoplay — start on first interaction anywhere (shell or iframe)
        const start = () => {
          tryPlay();
          document.removeEventListener('click', start, true);
          document.removeEventListener('keydown', start, true);
          window.removeEventListener('message', onMsg);
        };
        const onMsg = e => { if (e.data?.type === 'gmp_interaction') start(); };
        document.addEventListener('click', start, true);
        document.addEventListener('keydown', start, true);
        window.addEventListener('message', onMsg);
      });
    }, { once: true });
  } else {
    loadTrack(saved?.track ?? 0, saved?.playing ?? false, saved?.time ?? 0);
  }
}
