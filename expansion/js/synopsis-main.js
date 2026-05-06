import * as THREE from 'three';

// ── Filmstrip — one bg image per slide ────────────────────────────────────
const imageList = [
  'pitch-assets/images/House.png',                                                         //  0 logline 1
  'pitch-assets/images/Synopsis 3.png',                                                    //  1 logline 2
  'pitch-assets/images/Cobra - 1986.png',                                                  //  2 logline 3
  'pitch-assets/images/House.png',                                                         //  3 logline 4
  'pitch-assets/images/A Different Man - 2024.png',                                        //  4 statement
  'pitch-assets/images/House.png',                                                         //  5 theme
];
const NUM_SLIDES = imageList.length;

// ── Scroll state ──────────────────────────────────────────────────────────
const autoSpeed    = 30;
const manualPauseMs = 2000;
const lerpAmount   = 0.085;
const bulge        = 0.65;

let targetY  = 0;
let virtualY = 0;
let manualTimer = 0;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function slideStride() { return innerHeight; }
function maxScroll() { return (NUM_SLIDES - 1) * slideStride(); }

addEventListener('wheel', (e) => {
  if (document.body.dataset.lbOpen) return;
  e.preventDefault();
  targetY = clamp(targetY + e.deltaY, 0, maxScroll());
  manualTimer = manualPauseMs;
}, { passive: false });

let touchY = null;
addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', (e) => {
  if (!touchY || document.body.dataset.lbOpen) return;
  const ny = e.touches[0].clientY;
  targetY = clamp(targetY + (touchY - ny) * 1.5, 0, maxScroll());
  touchY = ny; manualTimer = manualPauseMs;
}, { passive: true });
addEventListener('touchend', () => { touchY = null; });

addEventListener('keydown', (e) => {
  if (document.body.dataset.lbOpen) return;
  const step = innerHeight * 0.9;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
    e.preventDefault(); targetY = clamp(targetY + step, 0, maxScroll()); manualTimer = manualPauseMs;
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault(); targetY = clamp(targetY - step, 0, maxScroll()); manualTimer = manualPauseMs;
  } else if (e.key === 'Home') { targetY = 0; manualTimer = manualPauseMs; }
    else if (e.key === 'End')  { targetY = maxScroll(); manualTimer = manualPauseMs; }
});

window.scrollToSlide = function(i) {
  targetY = clamp(i * slideStride(), 0, maxScroll());
  manualTimer = manualPauseMs;
};

// ── DOM refs ──────────────────────────────────────────────────────────────
const scroller    = document.getElementById('scroller');
const runningHead = document.getElementById('running-head');
const rhSection   = runningHead.querySelector('.rh-section');
const rhPage      = runningHead.querySelector('.rh-page');

// ── Slide metadata — [section label, page number] ─────────────────────────
const SLIDE_META = [
  ['Synopsis',          '1'],  //  0
  ['Synopsis',          '2'],  //  1
  ['Synopsis',          '3'],  //  2
  ['Synopsis',          '4'],  //  3
  ['Theme',             '5'],  //  4
  ['Theme',             '6'],  //  5
];
let lastSlideIdx = -1;

// ── Three.js ──────────────────────────────────────────────────────────────
const canvas = document.querySelector('.warp-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.autoClear = false;

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const filmFragmentShader = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D tex1;
  uniform vec2 planeSize;
  uniform float time;
  uniform float saturation;
  uniform float displacement;
  uniform float textureScale;
  uniform float opacity;
  uniform float scrollFrac;
  uniform float numSlides;

  vec2 filmUv(vec2 uv) {
    float pa = planeSize.x / planeSize.y;
    vec2 tileUv;
    if (pa >= 1.0) {
      tileUv = vec2(uv.x, 0.5 + (0.5 - uv.y) / pa);
    } else {
      tileUv = vec2(0.5 + (uv.x - 0.5) * pa, 1.0 - uv.y);
    }
    tileUv = clamp(tileUv, 0.0001, 0.9999);
    float tileY = (scrollFrac + tileUv.y) / numSlides;
    return vec2(tileUv.x, tileY);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 cUv = vUv - 0.5;
    float outCircle = (0.5 - length(cUv)) * (textureScale * 10.0);
    vec2 nUv = vUv - 0.5;
    nUv *= 1.0 + 0.5 * displacement - (1.0 - outCircle) * displacement * 0.5;
    nUv += 0.5;

    vec4 color = texture2D(tex1, filmUv(nUv));
    float avg = (color.r + color.g + color.b) / 3.0;

    float grain = hash(vUv + fract(sin(vec2(time * 0.001, time * 0.0013)) * 100.0));
    color.rgb += vec3(grain * 0.04 - 0.02);
    color.rgb = color.rgb * saturation + vec3(1.0 - avg) * 0.4 * (1.0 - saturation);

    gl_FragColor = vec4(color.rgb, opacity);
  }
`;

const feedbackFragmentShader = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D currentFrame;
  uniform sampler2D prevFrame;
  uniform vec2 resolution;
  uniform float time;

  void main() {
    vec2 px = 2.0 / resolution;
    vec2 uv = vUv;
    vec4 tex = texture2D(currentFrame, uv);

    vec4 tex2 = texture2D(prevFrame, uv - 0.5 * px);
    tex2 += texture2D(prevFrame, uv + px);
    uv.y -= px.y;
    tex2 += texture2D(prevFrame, uv);
    uv.x -= px.x - 0.008 * sin(time * 0.0001);
    uv.y += px.y + 0.005 * cos(time * 0.0001);
    tex2 += texture2D(prevFrame, uv);
    tex2 /= 4.013;
    tex2 = clamp(tex2 * 1.02 - 0.012, 0.0, 1.0);

    float newG = min(tex.g, max(tex.r, tex.b));
    float d = abs(tex.g - newG);

    tex = max(
      clamp(tex * (1.0 - d), 0.0, 1.0),
      mix(tex, tex2, smoothstep(-0.3, 0.23, d))
    );

    gl_FragColor = vec4(tex.rgb, 1.0);
  }
`;

const blitFragmentShader = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D map;
  void main() { gl_FragColor = texture2D(map, vUv); }
`;

// ── Filmstrip texture ─────────────────────────────────────────────────────
const TILE = 512;
const filmCanvas = document.createElement('canvas');
filmCanvas.width = TILE;
filmCanvas.height = TILE * NUM_SLIDES;
const filmCtx = filmCanvas.getContext('2d');
filmCtx.fillStyle = '#000';
filmCtx.fillRect(0, 0, filmCanvas.width, filmCanvas.height);

const filmTex = new THREE.CanvasTexture(filmCanvas);
filmTex.minFilter = THREE.LinearFilter;
filmTex.generateMipmaps = false;
filmTex.flipY = false;

function drawCover(img, dx, dy, dw, dh) {
  const ia = img.naturalWidth / img.naturalHeight, da = dw / dh;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ia > da) { sw = sh * da; sx = (img.naturalWidth - sw) / 2; }
  else         { sh = sw / da; sy = (img.naturalHeight - sh) / 2; }
  filmCtx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

imageList.forEach((src, i) => {
  const img = new Image();
  img.onload = () => { drawCover(img, 0, i * TILE, TILE, TILE); filmTex.needsUpdate = true; };
  img.src = src;
});

// ── Hidden videos for fullbleed video slides (drawn into filmstrip) ───────
const slideVideoSrcs = {
  0: 'pitch-assets/video/compressed/Intro.mov',
  5: 'pitch-assets/video/compressed/safe1_00052058.mp4',
};
const slideVideoEls = {};
const loadedSlideVideos = new Set();

const hiddenVideoWrap = document.createElement('div');
hiddenVideoWrap.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
document.body.appendChild(hiddenVideoWrap);

Object.entries(slideVideoSrcs).forEach(([idxStr, src]) => {
  const v = document.createElement('video');
  v.src = src; v.muted = true; v.loop = true; v.playsInline = true;
  hiddenVideoWrap.appendChild(v);
  slideVideoEls[Number(idxStr)] = v;
});

// ── Scenes ────────────────────────────────────────────────────────────────
const filmCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 100);
filmCamera.position.z = 10;
const filmScene = new THREE.Scene();

const filmMat = new THREE.ShaderMaterial({
  uniforms: {
    tex1:         { value: filmTex },
    planeSize:    { value: new THREE.Vector2(1, 1) },
    time:         { value: 0 },
    saturation:   { value: 1 },
    displacement: { value: bulge },
    textureScale: { value: 0.7 },
    opacity:      { value: 1 },
    scrollFrac:   { value: 0 },
    numSlides:    { value: NUM_SLIDES },
  },
  vertexShader,
  fragmentShader: filmFragmentShader,
});
const filmMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 64, 32), filmMat);
filmScene.add(filmMesh);

const quadCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 100);
quadCamera.position.z = 10;

const feedbackScene = new THREE.Scene();
const feedbackMat = new THREE.ShaderMaterial({
  uniforms: {
    currentFrame: { value: null },
    prevFrame:    { value: null },
    resolution:   { value: new THREE.Vector2(1, 1) },
    time:         { value: 0 },
  },
  vertexShader,
  fragmentShader: feedbackFragmentShader,
});
feedbackScene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), feedbackMat));

const blitScene = new THREE.Scene();
const blitMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: null } },
  vertexShader,
  fragmentShader: blitFragmentShader,
});
blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blitMat));

// ── Render targets ────────────────────────────────────────────────────────
function makeRT(w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
}

let filmRT, feedbackA, feedbackB, readTarget, writeTarget;

function resize() {
  const w = innerWidth, h = innerHeight;
  const dpr = renderer.getPixelRatio();
  const pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);

  renderer.setSize(w, h, false);

  for (const cam of [filmCamera, quadCamera]) {
    cam.left = -w/2; cam.right = w/2;
    cam.top = h/2;   cam.bottom = -h/2;
    cam.updateProjectionMatrix();
  }

  for (const scene of [filmScene, feedbackScene, blitScene]) {
    scene.children[0].scale.set(w, h, 1);
  }

  filmMat.uniforms.planeSize.value.set(w, h);
  feedbackMat.uniforms.resolution.value.set(pw, ph);

  if (filmRT) { filmRT.dispose(); feedbackA.dispose(); feedbackB.dispose(); }
  filmRT    = makeRT(pw, ph);
  feedbackA = makeRT(pw, ph);
  feedbackB = makeRT(pw, ph);
  readTarget  = feedbackA;
  writeTarget = feedbackB;

  targetY = clamp(targetY, 0, maxScroll());
}

addEventListener('resize', resize);
resize();

// ── Lazy video loading ────────────────────────────────────────────────────
function initLazyVideos() {
  const videos = Array.from(document.querySelectorAll('video[preload="none"]'));
  const loaded = new Set();

  function check() {
    const margin = innerHeight * 1.5;
    videos.forEach(video => {
      const slide = video.closest('.slide');
      if (!slide) return;
      const slideIndex = Array.from(scroller.children).indexOf(slide);
      const slideTop   = slideIndex * slideStride();
      const inRange    = slideTop < virtualY + innerHeight + margin && slideTop + innerHeight > virtualY - margin;

      if (inRange && !loaded.has(video)) {
        const src = video.querySelector('source[data-src]');
        if (src) {
          src.src = src.dataset.src;
          src.removeAttribute('data-src');
          video.load();
          video.play().catch(() => {});
          loaded.add(video);
        }
      } else if (!inRange && loaded.has(video)) {
        video.pause();
      } else if (inRange && loaded.has(video)) {
        if (video.paused && !document.body.dataset.lbOpen) video.play().catch(() => {});
      }
    });
  }

  (function loop() { check(); requestAnimationFrame(loop); })();
}

// ── Lightbox ──────────────────────────────────────────────────────────────
function initLightbox() {
  const lb      = document.getElementById('lightbox');
  const content = document.getElementById('lb-content');
  const caption = document.getElementById('lb-caption');
  const closeBtn = document.getElementById('lb-close');
  const prevBtn  = document.getElementById('lb-prev');
  const nextBtn  = document.getElementById('lb-next');
  const thumbs   = Array.from(document.querySelectorAll('.vt-panel-media.clickable'));
  let idx = 0;

  function media(thumb) {
    const hq  = thumb.dataset.hqSrc;
    const vid = thumb.querySelector('video source');
    const img = thumb.querySelector('img');
    if (vid) return { type: 'video', src: hq || vid.getAttribute('src') || vid.dataset.src };
    if (img) return { type: 'image', src: img.src };
    return null;
  }

  function show(i) {
    idx = i;
    const m = media(thumbs[i]);
    if (!m) return;
    content.innerHTML = '';
    if (m.type === 'video') {
      const v = document.createElement('video');
      v.src = m.src; v.controls = true; v.autoplay = true; v.playsInline = true;
      content.appendChild(v);
    } else {
      const im = document.createElement('img'); im.src = m.src;
      content.appendChild(im);
    }
    const cap = thumbs[i].querySelector('.vt-cap');
    caption.textContent = cap ? cap.textContent : '';
  }

  function open(i) {
    show(i); lb.classList.add('is-open');
    document.body.dataset.lbOpen = '1';
    prevBtn.style.display = ''; nextBtn.style.display = '';
  }

  function close() {
    lb.classList.remove('is-open');
    delete document.body.dataset.lbOpen;
    const v = content.querySelector('video');
    if (v) { v.pause(); v.src = ''; }
    content.innerHTML = '';
  }

  thumbs.forEach((t, i) => t.addEventListener('click', e => { e.stopPropagation(); open(i); }));
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show((idx - 1 + thumbs.length) % thumbs.length));
  nextBtn.addEventListener('click', () => show((idx + 1) % thumbs.length));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  document.querySelectorAll('.aix-card[data-vimeo]').forEach(card => {
    card.addEventListener('click', () => {
      content.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = card.dataset.vimeo;
      Object.assign(iframe, { width: 1280, height: 720 });
      iframe.style.cssText = 'max-width:85vw;max-height:80vh;border:none;';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      content.appendChild(iframe);
      lb.classList.add('is-open');
      document.body.dataset.lbOpen = '1';
      prevBtn.style.display = 'none'; nextBtn.style.display = 'none';
    });
  });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft')  prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
  });
}

// ── Inline audio players ──────────────────────────────────────────────────
function initAudioPlayers() {
  document.querySelectorAll('.inline-audio-player').forEach(player => {
    const src     = player.dataset.src;
    const playBtn = player.querySelector('.iap-play');
    const waveEl  = player.querySelector('.iap-waveform');
    const cvs     = waveEl.querySelector('canvas');
    const progress = waveEl.querySelector('.iap-progress');
    const timeEl  = player.querySelector('.iap-time');
    const audio   = new Audio(); audio.preload = 'none'; audio.src = src;
    let loaded = false, drawn = false;

    function fmt(s) { const m = Math.floor(s/60); return m + ':' + String(Math.floor(s%60)).padStart(2,'0'); }

    function drawPlaceholder() {
      const ctx = cvs.getContext('2d'), dpr = window.devicePixelRatio || 1;
      const w = cvs.clientWidth, h = cvs.clientHeight;
      cvs.width = w * dpr; cvs.height = h * dpr; ctx.scale(dpr, dpr);
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      const bars = Math.floor(w / 3);
      for (let i = 0; i < bars; i++) {
        const barH = Math.random() * h * 0.6 + 2;
        ctx.fillRect(i*3, (h-barH)/2, 1.5, barH);
      }
    }

    drawPlaceholder();

    playBtn.addEventListener('click', () => {
      if (!loaded) { audio.load(); loaded = true; }
      if (audio.paused) {
        audio.play(); playBtn.innerHTML = '&#10074;&#10074;';
      } else {
        audio.pause(); playBtn.innerHTML = '&#9654;';
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        progress.style.width = (audio.currentTime / audio.duration * 100) + '%';
        timeEl.textContent = fmt(audio.currentTime);
      }
    });
    audio.addEventListener('ended', () => {
      playBtn.innerHTML = '&#9654;'; progress.style.width = '0%'; timeEl.textContent = '0:00';
    });
    player._audio = audio;
  });
}

// ── Custom cursor ─────────────────────────────────────────────────────────
function initCursor() {
  const cur = document.createElement('div');
  cur.className = 'cursor'; document.body.appendChild(cur);
  let mx = innerWidth/2, my = innerHeight/2, cx = mx, cy = my;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY; cur.classList.add('visible');
    const over = e.target.closest('.gmp, .aix-card, .aix-press-row, .vt-panel-media.clickable, .lb-close, .lb-arrow');
    cur.classList.toggle('expanded', !!over);
  });
  document.addEventListener('mouseleave', () => cur.classList.remove('visible'));
  (function loop() {
    cx += (mx-cx)*0.1; cy += (my-cy)*0.1;
    cur.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 50%))`;
    requestAnimationFrame(loop);
  })();
}

// ── Main animation loop ───────────────────────────────────────────────────
let tLast = performance.now();

function tick(tNow) {
  const dt = tNow - tLast; tLast = tNow;

  if (manualTimer > 0) manualTimer -= dt;
  else targetY = clamp(targetY + autoSpeed * dt / 1000, 0, maxScroll());

  virtualY += (targetY - virtualY) * lerpAmount;

  scroller.style.transform = `translate3d(0, ${-virtualY}px, 0)`;

  // Draw off-DOM video frames into filmstrip
  const nearSlide = virtualY / slideStride();
  Object.entries(slideVideoEls).forEach(([idxStr, v]) => {
    const idx = Number(idxStr);
    const dist = Math.abs(idx - nearSlide);
    if (dist <= 2 && !loadedSlideVideos.has(idx)) {
      loadedSlideVideos.add(idx);
      v.load(); v.play().catch(() => {});
    }
    if (dist > 3 && !v.paused) v.pause();
    if (dist <= 2 && v.readyState >= 2) {
      drawCover(v, 0, idx * TILE, TILE, TILE);
      filmTex.needsUpdate = true;
    }
  });

  // Running head
  const slideIdx = Math.round(virtualY / slideStride());
  if (slideIdx !== lastSlideIdx) {
    lastSlideIdx = slideIdx;
    const meta = SLIDE_META[slideIdx];
    if (meta) {
      rhSection.textContent = meta[0];
      rhPage.textContent    = meta[1];
      runningHead.classList.add('is-visible');
    } else {
      runningHead.classList.remove('is-visible');
    }
  }

  // Pass 1 — film + dome
  filmMat.uniforms.scrollFrac.value = virtualY / slideStride();
  filmMat.uniforms.time.value = tNow;
  renderer.setRenderTarget(filmRT);
  renderer.clear();
  renderer.render(filmScene, filmCamera);

  // Pass 2 — feedback
  feedbackMat.uniforms.currentFrame.value = filmRT.texture;
  feedbackMat.uniforms.prevFrame.value = readTarget.texture;
  feedbackMat.uniforms.time.value = tNow;
  renderer.setRenderTarget(writeTarget);
  renderer.clear();
  renderer.render(feedbackScene, quadCamera);

  // Pass 3 — blit to screen
  blitMat.uniforms.map.value = writeTarget.texture;
  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(blitScene, quadCamera);

  [readTarget, writeTarget] = [writeTarget, readTarget];

  requestAnimationFrame(tick);
}

window.addEventListener('load', () => {
  initCursor();
  initLazyVideos();
  if (document.getElementById('lightbox')) initLightbox();
  if (document.querySelector('.inline-audio-player')) initAudioPlayers();
  requestAnimationFrame(tick);
});

addEventListener('resize', resize);

// ── Global Music Player — skip when inside shell iframe ──────────────────
if (window === window.top) {
  import('./shared.js').then(({ initGMP }) => initGMP()).catch(() => {});
} else {
  document.getElementById('gmp')?.style.setProperty('display', 'none');
}
