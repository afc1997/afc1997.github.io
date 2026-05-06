// ============================================================
// PHASE MATH
// h-track-1: 6 panels (Hero, Intro, Synopsis, CharsA, CharsB, Statement)
// v-track:    7 panels (Card, Tone, Camera, ProdDesign, Music, Sound, Edit)
// h-track-3:  4 panels (Card, Bio, Work, Credits)
//
// P = scroll distance for phase (includes 1-unit dwell on last panel so it's readable)
// max = maximum track offset (= (panels-1) × unit)
// ============================================================
function getPhases() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const track1El = document.getElementById('h-track-1');
  const track1W  = track1El ? track1El.scrollWidth : 0;
  const maxH1    = Math.max(0, track1W - vw);
  const vTrackEl = document.getElementById('v-track');
  const vTrackH  = vTrackEl ? vTrackEl.scrollHeight : 0;
  const maxV     = Math.max(0, vTrackH - vh);
  return {
    P1:   maxH1,  maxH1,
    P2:   maxV > 0 ? maxV + vh * 0.5 : 0,  maxV,
    P3:   0,           maxH3: 0
  };
}


// ============================================================
// VIRTUAL SCROLL — driven by horizontal trackpad / wheel
// ============================================================
let target  = 0;
let current = 0;

function getMaxScroll() {
  const { P1, P2, P3 } = getPhases();
  return P1 + P2 + P3;
}

function getPanelOffsets() {
  const panels = document.querySelectorAll('#h-track-1 .panel');
  return Array.from(panels).map(p => p.offsetLeft);
}

window.addEventListener('wheel', e => {
  if (document.body.dataset.lightboxOpen) return;
  e.preventDefault();
  const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  target = Math.max(0, Math.min(target + delta, getMaxScroll()));
}, { passive: false });

// Arrow key navigation between panels
document.addEventListener('keydown', e => {
  if (document.body.dataset.lightboxOpen) return;
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
  const offsets = getPanelOffsets();
  if (!offsets.length) return;
  let idx = 0, minDist = Infinity;
  offsets.forEach((o, i) => { const d = Math.abs(target - o); if (d < minDist) { minDist = d; idx = i; } });

  // On the last panel (About Index), scroll through its columns
  const aboutScroll = document.querySelector('.panel-about-index .about-index-scroll');
  if (aboutScroll && idx === offsets.length - 1) {
    const cols = aboutScroll.querySelectorAll('.aix-col');
    if (cols.length) {
      const scrollLeft = aboutScroll.scrollLeft;
      const maxScroll = aboutScroll.scrollWidth - aboutScroll.clientWidth;
      if (forward && scrollLeft < maxScroll - 5) {
        // Find next column to scroll to
        for (const col of cols) {
          const colLeft = col.offsetLeft - aboutScroll.offsetLeft - 60;
          if (colLeft > scrollLeft + 5) {
            aboutScroll.scrollTo({ left: colLeft, behavior: 'smooth' });
            return;
          }
        }
        return;
      } else if (!forward && scrollLeft > 5) {
        // Find previous column
        for (let i = cols.length - 1; i >= 0; i--) {
          const colLeft = cols[i].offsetLeft - aboutScroll.offsetLeft - 60;
          if (colLeft < scrollLeft - 5) {
            aboutScroll.scrollTo({ left: colLeft, behavior: 'smooth' });
            return;
          }
        }
        aboutScroll.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
    }
  }

  if (forward) idx = Math.min(idx + 1, offsets.length - 1);
  else idx = Math.max(idx - 1, 0);
  target = Math.max(0, Math.min(offsets[idx], getMaxScroll()));
});

// Touch support for mobile
(function() {
  let lastX = 0, lastY = 0, touching = false;
  document.addEventListener('touchstart', function(e) {
    if (document.body.dataset.lightboxOpen) return;
    touching = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }, false);

  document.addEventListener('touchmove', function(e) {
    if (!touching || document.body.dataset.lightboxOpen) return;
    e.preventDefault();
    e.stopPropagation();
    var x = e.touches[0].clientX;
    var y = e.touches[0].clientY;
    var dx = lastX - x;
    var dy = lastY - y;
    var delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    target = Math.max(0, Math.min(target + delta * 2.5, getMaxScroll()));
    lastX = x;
    lastY = y;
  }, { passive: false });

  document.addEventListener('touchend', function() {
    touching = false;
  }, false);
})();


// ============================================================
// NAVIGATION
// ============================================================
function scrollToPanel(index) {
  target = Math.max(0, Math.min(index * window.innerWidth, getMaxScroll()));
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    target = Math.max(0, Math.min(el.offsetLeft, getMaxScroll()));
    return;
  }
  // Fallback for sections without IDs
  const { P1, P2 } = getPhases();
  const vw = window.innerWidth;
  const targets = {
    project:            vw * 2,
    characters:         vw * 4,
    directors:          P1 + P2
  };
  if (targets[sectionId] !== undefined) target = targets[sectionId];
}


// ============================================================
// NAV — highlight active section, hide on hero panel
// ============================================================
const tnavBtns = document.querySelectorAll('.tnav-btn');
const topnav   = document.querySelector('.topnav');

const progressBar = document.getElementById('progress-bar');

function updateProgress(scrollY) {
  const max = getMaxScroll();
  const pct = max > 0 ? (scrollY / max) * 100 : 0;
  if (progressBar) progressBar.style.width = pct + '%';
  if (progressBar) progressBar.classList.toggle('hidden', scrollY < window.innerWidth * 0.6);
}

function updateNav(scrollY) {
  const vw = window.innerWidth;
  const aboutEl = document.getElementById('about');
  const vtEl = document.getElementById('visual-treatment');
  const aboutPos = aboutEl ? aboutEl.offsetLeft - vw * 0.5 : Infinity;
  const vtPos = vtEl ? vtEl.offsetLeft - vw * 0.5 : Infinity;
  let active = '';
  if (scrollY >= aboutPos)        active = 'about';
  else if (scrollY >= vtPos)      active = 'visual-treatment';
  else if (scrollY >= vw * 5)     active = 'characters';
  else if (scrollY >= vw)         active = 'project';

  tnavBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === active);
  });

  // Hide nav while on hero panel (first panel)
  if (topnav) topnav.classList.toggle('hidden', scrollY < vw * 0.6);
}


// ============================================================
// CARD WORDS — fade in when card is centred in its track
// ============================================================
function updateCards(scrollY) {
  const { P1, P2, P3, maxH1, maxV, maxH3 } = getPhases();
  const vw = window.innerWidth, vh = window.innerHeight;

  document.querySelectorAll('#h-track-1 .panel-card').forEach(card => {
    const word = card.querySelector('.card-word');
    if (!word) return;
    const trackX = Math.min(scrollY, maxH1);
    word.classList.toggle('visible', Math.abs(trackX - card.offsetLeft) < vw * 0.75);
  });

  document.querySelectorAll('#v-track .panel-card').forEach(card => {
    const word = card.querySelector('.card-word');
    if (!word) return;
    const trackY = Math.max(0, Math.min(scrollY - P1, maxV));
    word.classList.toggle('visible', Math.abs(trackY - card.offsetTop) < vh * 0.75);
  });

  document.querySelectorAll('#h-track-3 .panel-card').forEach(card => {
    const word = card.querySelector('.card-word');
    if (!word) return;
    const trackX = Math.max(0, Math.min(scrollY - P1 - P2, maxH3));
    word.classList.toggle('visible', Math.abs(trackX - card.offsetLeft) < vw * 0.75);
  });
}


// ============================================================
// HERO TITLE — dynamic letter-spacing to fill screen width
// ============================================================
const heroTitle = document.querySelector('.hero-title');

function calcExpansionLetterSpacing() {
  if (!heroTitle) return;

  // Measure using canvas so we don't disturb the live animation
  const cs       = getComputedStyle(heroTitle);
  const fontSize = cs.fontSize; // e.g. "96px"
  const canvas   = document.createElement('canvas');
  const ctx      = canvas.getContext('2d');
  ctx.font = `300 ${fontSize} Cormorant Garamond, Georgia, serif`;
  const naturalW = ctx.measureText('EXPANSION').width;

  // "EXPANSION" = 9 chars; letter-spacing is applied after each character
  const ls = (window.innerWidth - naturalW) / 9;
  document.documentElement.style.setProperty('--ls-open', Math.max(0, ls) + 'px');
}

function initTitleHover() {
  if (!heroTitle) return;
  calcExpansionLetterSpacing();

  const fontSize = parseFloat(getComputedStyle(heroTitle).fontSize);
  const lsClose  = -0.02 * fontSize;

  let targetLs  = lsClose;
  let currentLs = lsClose;

  heroTitle.style.letterSpacing = lsClose + 'px';

  // Inertia loop — currentLs chases targetLs with lag
  (function lerpLoop() {
    currentLs += (targetLs - currentLs) * 0.015;
    heroTitle.style.letterSpacing = currentLs + 'px';
    requestAnimationFrame(lerpLoop);
  })();

  // X + Y both drive expansion — reaches full width at ~65% of diagonal
  document.addEventListener('mousemove', e => {
    const lsOpen = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--ls-open')
    ) || 0;
    const tx = e.clientX / window.innerWidth;
    const ty = e.clientY / window.innerHeight;
    // Scale so full expansion is reached before cursor hits the far corner
    const t  = Math.min((tx + ty) / 1.3, 1);
    const tEased = t * t;
    targetLs = lsClose + (lsOpen - lsClose) * tEased;
  });

  document.addEventListener('mouseleave', () => { targetLs = lsClose; });
}


// ============================================================
// INTRO — reveal image based on which half of page mouse is on
// ============================================================
function initIntroSups() {
  const imgWrap = document.getElementById('intro-img-wrap');
  if (!imgWrap) return;
  imgWrap.classList.add('visible');
}


// ============================================================
// THREE-TRACK SCROLL — lerp driven by window.scrollY
// ============================================================
const track1  = document.getElementById('h-track-1');
const vTrack  = document.getElementById('v-track');
const track3  = document.getElementById('h-track-3');
const spacer  = document.getElementById('spacer');

function initSpacer() {
  // No-op: overflow: hidden + virtual scroll replaces the tall spacer
}

function lerp(a, b, t) { return a + (b - a) * t; }

function tick() {
  current = lerp(current, target, 0.12);

  const { P1, P2, P3, maxH1, maxV, maxH3 } = getPhases();

  const x1 = Math.min(Math.max(current, 0), maxH1);
  const y2 = Math.min(Math.max(current - P1, 0), maxV);
  const x3 = Math.min(Math.max(current - P1 - P2, 0), maxH3);

  track1.style.transform = `translateX(${-x1}px)`;
  vTrack.style.transform  = `translateY(${-y2}px)`;
  track3.style.transform  = `translateX(${-x3}px)`;

  // h-track-1 stays on top; v-track and h-track-3 activate only when populated
  if (P2 > 0 || maxH3 > 0) {
    if (current < P1) {
      track1.style.zIndex = '3';
      vTrack.style.zIndex  = '2';
      track3.style.zIndex  = '1';
    } else if (current < P1 + P2) {
      track1.style.zIndex = '2';
      vTrack.style.zIndex  = '3';
      track3.style.zIndex  = '1';
    } else {
      track1.style.zIndex = '2';
      vTrack.style.zIndex  = '1';
      track3.style.zIndex  = '3';
    }
  }

  updateNav(current);
  updateCards(current);
  updateProgress(current);
  updateVtParallax(current);

  requestAnimationFrame(tick);
}

function updateVtParallax(scrollPos) {
  // parallax removed
}

function initSynopsisSlides() {
  const slides = document.querySelectorAll('.synopsis-slide');
  if (!slides.length) return;
  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('is-active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');
  }, 3000);
}

function initSynopsisBeats() {
  const beats = document.querySelectorAll('.synopsis-beat');
  const img   = document.getElementById('synopsisImg');
  if (!beats.length || !img) return;

  beats.forEach(beat => {
    beat.addEventListener('mouseenter', () => {
      beats.forEach(b => b.classList.remove('is-active'));
      beat.classList.add('is-active');
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = beat.dataset.img;
        img.style.opacity = '1';
      }, 200);
    });
  });
}

function initCharsTitle() {
  // No animation — static title
}

function initCharCarousels() {
  document.querySelectorAll('.char-carousel[data-hover-cycle]').forEach(carousel => {
    const imgs = carousel.querySelectorAll('.char-carousel-img');
    if (imgs.length < 2) return;
    let idx = 0;
    let timer = null;

    carousel.addEventListener('mouseenter', () => {
      timer = setInterval(() => {
        imgs[idx].classList.remove('is-active');
        idx = (idx + 1) % imgs.length;
        imgs[idx].classList.add('is-active');
      }, 1500);
    });

    carousel.addEventListener('mouseleave', () => {
      if (timer) { clearInterval(timer); timer = null; }
    });
  });
}

// ============================================================
// DRAGGABLE — click and move non-full-bleed elements
// ============================================================
function makeDraggable(el, centered) {
  let active = false, ox = 0, oy = 0, dx = 0, dy = 0;

  el.addEventListener('mousedown', e => {
    active = true;
    ox = e.clientX - dx;
    oy = e.clientY - dy;
    el.style.transition = 'none';
    el.style.zIndex = '50';
    el.style.opacity = '0.85';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!active) return;
    dx = e.clientX - ox;
    dy = e.clientY - oy;
    const base = centered ? 'translate(-50%, -50%)' : '';
    el.style.transform = `${base} translate(${dx}px, ${dy}px)`;
  });

  document.addEventListener('mouseup', () => {
    if (!active) return;
    active = false;
    el.style.transition = '';
    el.style.zIndex = '';
    el.style.opacity = '';
  });
}

function initDraggables() {
  const introImg = document.getElementById('intro-img-wrap');
  if (introImg) makeDraggable(introImg, true);

  document.querySelectorAll('.dir-vid').forEach(el => makeDraggable(el, false));
  document.querySelectorAll('.char-panel-img').forEach(el => {
    makeDraggable(el, el.classList.contains('char-panel-img--centered'));
  });
}


// ============================================================
// CUSTOM CURSOR — inverted circle with lerp lag
// ============================================================
function initCursor() {
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  document.body.appendChild(cursor);

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let cx = mx, cy = my;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.classList.add('visible');
  });

  document.addEventListener('mouseleave', () => cursor.classList.remove('visible'));

  // Expand on interactive elements
  const hoverTargets = 'a, button, [onclick], .dir-vid, .intro-img-wrap, .hero-title, .tnav-btn, .topnav-title, .vt-thumb';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(hoverTargets)) cursor.classList.add('hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(hoverTargets)) cursor.classList.remove('hover');
  });

  (function loop() {
    cx += (mx - cx) * 0.1;
    cy += (my - cy) * 0.1;
    cursor.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 50%))`;
    requestAnimationFrame(loop);
  })();
}


// ============================================================
// LIGHTBOX — for VT archive images/videos
// ============================================================
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const content = document.getElementById('lightbox-content');
  const caption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');

  // Collect all VT thumbs
  const thumbs = Array.from(document.querySelectorAll('.vt-thumb'));
  let currentIndex = 0;

  // Mark video thumbs
  thumbs.forEach(thumb => {
    if (thumb.querySelector('video')) thumb.classList.add('vt-thumb--has-video');
  });

  function getMediaSrc(thumb) {
    const yt = thumb.dataset.youtube;
    if (yt) {
      const id = yt.match(/[?&]v=([^&]+)/);
      if (id) return { type: 'youtube', src: id[1] };
    }
    const video = thumb.querySelector('video source');
    if (video) {
      // Use HQ source for lightbox if available, fall back to thumbnail source
      const hq = thumb.dataset.hqSrc;
      const src = hq || video.getAttribute('src') || video.dataset.src;
      return { type: 'video', src };
    }
    const img = thumb.querySelector('img');
    if (img) return { type: 'image', src: img.getAttribute('src') };
    return null;
  }

  function getCaption(thumb) {
    const cap = thumb.querySelector('.vt-caption');
    return cap ? cap.textContent : '';
  }

  function show(index) {
    currentIndex = index;
    const thumb = thumbs[index];
    const media = getMediaSrc(thumb);
    if (!media) return;

    content.innerHTML = '';
    if (media.type === 'youtube') {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${media.src}?autoplay=1&rel=0`;
      iframe.width = '1280';
      iframe.height = '720';
      iframe.style.maxWidth = '85vw';
      iframe.style.maxHeight = '80vh';
      iframe.style.border = 'none';
      iframe.allow = 'autoplay; encrypted-media';
      iframe.allowFullscreen = true;
      content.appendChild(iframe);
    } else if (media.type === 'video') {
      const vid = document.createElement('video');
      vid.src = media.src;
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      content.appendChild(vid);
    } else {
      const img = document.createElement('img');
      img.src = media.src;
      content.appendChild(img);
    }
    caption.textContent = getCaption(thumb);
  }

  function open(index) {
    show(index);
    lightbox.classList.add('is-open');
    // Pause horizontal scroll
    document.body.dataset.lightboxOpen = 'true';
  }

  function close() {
    lightbox.classList.remove('is-open');
    delete document.body.dataset.lightboxOpen;
    // Stop any playing video
    const vid = content.querySelector('video');
    if (vid) { vid.pause(); vid.src = ''; }
    content.innerHTML = '';
    prevBtn.style.display = '';
    nextBtn.style.display = '';
  }

  function prev() {
    const idx = (currentIndex - 1 + thumbs.length) % thumbs.length;
    show(idx);
  }

  function next() {
    const idx = (currentIndex + 1) % thumbs.length;
    show(idx);
  }

  // Click handlers
  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', (e) => {
      e.stopPropagation();
      open(i);
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  // Work sample cards — click to open Vimeo in lightbox
  document.querySelectorAll('.profile-card[data-vimeo]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      content.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = card.dataset.vimeo;
      iframe.width = '1280';
      iframe.height = '720';
      iframe.style.maxWidth = '85vw';
      iframe.style.maxHeight = '80vh';
      iframe.style.border = 'none';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      content.appendChild(iframe);
      const title = card.querySelector('.profile-card-title');
      caption.textContent = title ? title.textContent : '';
      lightbox.classList.add('is-open');
      document.body.dataset.lightboxOpen = 'true';
      // Hide arrows for work sample lightbox
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
    });
  });

}


// ============================================================
// LAZY VIDEO — load & play only when panel is near viewport
// ============================================================
function initLazyVideos() {
  const videos = document.querySelectorAll('video[preload="none"]');
  const loaded = new Set();
  const vw = window.innerWidth;

  // Pre-calculate each video's absolute position in the scroll timeline
  const videoPositions = [];
  videos.forEach(video => {
    const panel = video.closest('.panel');
    if (!panel) return;
    // offsetLeft gives position within the h-track
    const pos = panel.offsetLeft;
    videoPositions.push({ video, pos });
  });

  function checkVideos() {
    const scrollPos = current; // use the lerped scroll value from the main loop
    const margin = vw * 2.5;

    videoPositions.forEach(({ video, pos }) => {
      const inRange = pos < scrollPos + vw + margin && pos + vw > scrollPos - margin;

      if (inRange && !loaded.has(video)) {
        const source = video.querySelector('source[data-src]');
        if (source) {
          source.src = source.dataset.src;
          source.removeAttribute('data-src');
          video.load();
          video.play().catch(() => {});
          loaded.add(video);
        }
      } else if (!inRange && loaded.has(video)) {
        video.pause();
      } else if (inRange && loaded.has(video)) {
        if (video.paused && !document.body.dataset.lightboxOpen) video.play().catch(() => {});
      }
    });
  }

  function lazyTick() {
    checkVideos();
    requestAnimationFrame(lazyTick);
  }
  requestAnimationFrame(lazyTick);
}


// ============================================================
// CUSTOM AUDIO PLAYERS WITH WAVEFORM
// ============================================================
function initAudioPlayers() {
  document.querySelectorAll('.audio-player').forEach(player => {
    const src = player.dataset.src;
    const playBtn = player.querySelector('.ap-play');
    const waveformEl = player.querySelector('.ap-waveform');
    const canvas = waveformEl.querySelector('canvas');
    const progressEl = waveformEl.querySelector('.ap-waveform-progress');
    const timeEl = player.querySelector('.ap-time');
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = src;

    let loaded = false;
    let waveformDrawn = false;

    function fmt(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ':' + String(sec).padStart(2, '0');
    }

    function drawWaveform(buffer) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      const data = buffer.getChannelData(0);
      const bars = Math.floor(w / 3);
      const step = Math.floor(data.length / bars);

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += Math.abs(data[i * step + j]);
        }
        const avg = sum / step;
        const barH = Math.max(1, avg * h * 2.5);
        const x = i * 3;
        ctx.fillRect(x, (h - barH) / 2, 1.5, barH);
      }
      waveformDrawn = true;
    }

    function loadAndDraw() {
      if (waveformDrawn) return;
      fetch(src)
        .then(r => r.arrayBuffer())
        .then(buf => {
          const actx = new (window.AudioContext || window.webkitAudioContext)();
          return actx.decodeAudioData(buf);
        })
        .then(drawWaveform)
        .catch(() => {});
    }

    function drawPlaceholder() {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      const bars = Math.floor(w / 3);
      for (let i = 0; i < bars; i++) {
        const barH = Math.random() * h * 0.6 + 2;
        ctx.fillRect(i * 3, (h - barH) / 2, 1.5, barH);
      }
    }

    drawPlaceholder();

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadAndDraw();
        obs.disconnect();
      }
    }, { rootMargin: '200px' });
    obs.observe(player);

    playBtn.addEventListener('click', () => {
      if (!loaded) { audio.load(); loaded = true; }
      if (audio.paused) {
        document.querySelectorAll('.audio-player').forEach(p => {
          if (p !== player && p._audio && !p._audio.paused) {
            p._audio.pause();
            p.querySelector('.ap-play').innerHTML = '&#9654;';
          }
        });
        audio.play();
        playBtn.innerHTML = '&#10074;&#10074;';
      } else {
        audio.pause();
        playBtn.innerHTML = '&#9654;';
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        progressEl.style.width = (audio.currentTime / audio.duration * 100) + '%';
        timeEl.textContent = fmt(audio.currentTime);
      }
    });

    audio.addEventListener('ended', () => {
      playBtn.innerHTML = '&#9654;';
      progressEl.style.width = '0%';
      timeEl.textContent = '0:00';
    });

    waveformEl.addEventListener('click', e => {
      if (!loaded) { audio.load(); loaded = true; }
      const rect = waveformEl.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (audio.duration) {
        audio.currentTime = pct * audio.duration;
        if (audio.paused) {
          audio.play();
          playBtn.innerHTML = '&#10074;&#10074;';
        }
      }
    });

    player._audio = audio;
  });
}


window.addEventListener('load', () => {
  initSpacer();
  initCursor();
  initDraggables();
  initLightbox();
  initLazyVideos();
  // 'load' fires after all resources including fonts — safe to measure immediately
  initTitleHover();
  initIntroSups();
  initSynopsisBeats();
  initSynopsisSlides();
  initCharCarousels();
  initCharsTitle();
  initAudioPlayers();
  requestAnimationFrame(tick);
});

window.addEventListener('resize', () => {
  initSpacer();
  calcExpansionLetterSpacing();
});
