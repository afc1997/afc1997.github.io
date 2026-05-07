// js/contact-maze.js — L-shaped two-corridor maze for the contact page
import * as THREE from 'three';

export function initContactMaze(canvas, opts = {}) {
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x000000, 1);

  // ── Scene + fog ───────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.009);

  // ── Camera ────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(100, W() / H(), 0.05, 160);
  camera.position.set(0, 1.65, 0);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = 0;

  // ── Constants ─────────────────────────────────────────────────────────────
  const CW  = 1.05;
  const CL  = 130;
  const WH  = 7.5;
  const WT  = 0.12;
  const SEG = 5.5;

  // ── Materials ─────────────────────────────────────────────────────────────
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.97, metalness: 0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.99 });
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 1 });
  const seamMat  = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 1 });
  const runMat   = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 });
  const edgeMat  = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xd4c8a0, emissiveIntensity: 0.28, roughness: 1 });
  const doorMat  = new THREE.MeshStandardMaterial({ color: 0x001500, emissive: 0x00cc44, emissiveIntensity: 0.5, roughness: 0.85, side: THREE.FrontSide });

  // ── Geometry helper ───────────────────────────────────────────────────────
  function addBox(x, y, z, sx, sy, sz, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  // ── Floor & ceiling ───────────────────────────────────────────────────────
  const big = new THREE.PlaneGeometry(300, 300);
  const fl = new THREE.Mesh(big, floorMat);
  fl.rotation.x = -Math.PI / 2;
  scene.add(fl);
  const ce = new THREE.Mesh(big.clone(), ceilMat);
  ce.rotation.x = Math.PI / 2;
  ce.position.y = WH;
  scene.add(ce);

  // ── Corridor builder ──────────────────────────────────────────────────────
  function buildCorridor(axis, sign) {
    const mid   = CW + CL / 2;
    const seams = Math.floor(CL / SEG);

    if (axis === 'z') {
      addBox(-(CW + WT / 2), WH / 2, sign * mid, WT, WH, CL, wallMat);
      addBox(  CW + WT / 2,  WH / 2, sign * mid, WT, WH, CL, wallMat);
      addBox(-(CW + WT / 2), WH - 0.04, sign * mid, 0.06, 0.06, CL, edgeMat);
      addBox(  CW + WT / 2,  WH - 0.04, sign * mid, 0.06, 0.06, CL, edgeMat);
      const runner = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, CL), runMat);
      runner.rotation.x = -Math.PI / 2;
      runner.position.set(0, 0.002, sign * mid);
      scene.add(runner);
      for (let i = 1; i < seams; i++) {
        const zp = sign * (CW + i * SEG);
        addBox(-(CW + WT * 0.6), WH / 2, zp, WT * 0.2, WH, WT * 0.2, seamMat);
        addBox(  CW + WT * 0.6,  WH / 2, zp, WT * 0.2, WH, WT * 0.2, seamMat);
        const cl2 = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2 + WT, 0.03), seamMat);
        cl2.rotation.x = Math.PI / 2; cl2.position.set(0, WH - 0.01, zp); scene.add(cl2);
        const fl2 = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2 + WT, 0.025), seamMat);
        fl2.rotation.x = -Math.PI / 2; fl2.position.set(0, 0.003, zp); scene.add(fl2);
      }
    } else {
      addBox(sign * mid, WH / 2, -(CW + WT / 2), CL, WH, WT, wallMat);
      addBox(sign * mid, WH / 2,   CW + WT / 2,  CL, WH, WT, wallMat);
      addBox(sign * mid, WH - 0.04, -(CW + WT / 2), CL, 0.06, 0.06, edgeMat);
      addBox(sign * mid, WH - 0.04,   CW + WT / 2,  CL, 0.06, 0.06, edgeMat);
      const runner = new THREE.Mesh(new THREE.PlaneGeometry(CL, CW * 2), runMat);
      runner.rotation.x = -Math.PI / 2;
      runner.position.set(sign * mid, 0.002, 0);
      scene.add(runner);
      for (let i = 1; i < seams; i++) {
        const xp = sign * (CW + i * SEG);
        addBox(xp, WH / 2, -(CW + WT * 0.6), WT * 0.2, WH, WT * 0.2, seamMat);
        addBox(xp, WH / 2,   CW + WT * 0.6,  WT * 0.2, WH, WT * 0.2, seamMat);
        const cl2 = new THREE.Mesh(new THREE.PlaneGeometry(0.03, CW * 2 + WT), seamMat);
        cl2.rotation.x = Math.PI / 2; cl2.position.set(xp, WH - 0.01, 0); scene.add(cl2);
        const fl2 = new THREE.Mesh(new THREE.PlaneGeometry(0.025, CW * 2 + WT), seamMat);
        fl2.rotation.x = -Math.PI / 2; fl2.position.set(xp, 0.003, 0); scene.add(fl2);
      }
    }
  }

  // ── Build the L: forward (-z → EXPANSION) and right (+x → ARCHIVE) ───────
  buildCorridor('z', -1);
  buildCorridor('x', +1);

  // Close the two unused directions right at the junction
  // Back wall (+z side) — immediately behind the camera start
  addBox(0,              WH / 2, CW + WT / 2, CW * 2 + WT * 2, WH, WT,      wallMat);
  // Left wall (-x side) — immediately to the left
  addBox(-(CW + WT / 2), WH / 2, 0,           WT,               WH, CW * 2 + WT * 2, wallMat);

  // Corner fill blocks for areas that would otherwise be open
  const CO  = CW + CL / 2;
  addBox(-CO, WH / 2, -CO, CL, WH, CL, wallMat); // -x, -z corner
  addBox(-CO, WH / 2,  CO, CL, WH, CL, wallMat); // -x, +z corner (seals left)
  addBox( CO, WH / 2,  CO, CL, WH, CL, wallMat); // +x, +z corner (seals back-right)

  // End wall for -z corridor (EXPANSION side) — plain
  const END = CW + CL + WT / 2;
  addBox(0, WH / 2, -END, CW * 2, WH, WT, wallMat);

  // End wall for +x corridor (ARCHIVE side) — wall surround with green door
  addBox(END, WH / 2, 0, WT, WH, CW * 2, wallMat);

  // Green door plane — centered in end wall, door proportions
  const DW = 1.1, DH = 2.5;
  const doorPlane = new THREE.Mesh(new THREE.PlaneGeometry(DW, DH), doorMat);
  doorPlane.position.set(END - 0.04, DH / 2, 0);
  doorPlane.rotation.y = Math.PI / 2; // face -x (toward camera)
  scene.add(doorPlane);

  // Thin emissive frame around the door
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff55, emissiveIntensity: 0.6, roughness: 1 });
  const FT = 0.04; // frame thickness
  // top bar
  addBox(END - 0.03, DH + FT / 2,        0, FT, FT, DW + FT * 2, frameMat);
  // bottom bar
  addBox(END - 0.03, FT / 2,             0, FT, FT, DW + FT * 2, frameMat);
  // left stile
  addBox(END - 0.03, DH / 2, -(DW / 2), FT, DH, FT,             frameMat);
  // right stile
  addBox(END - 0.03, DH / 2,  (DW / 2), FT, DH, FT,             frameMat);

  // Green glow point light near the door
  const doorLight = new THREE.PointLight(0x00ff55, 1.8, 24, 2);
  doorLight.position.set(END - 4, 2.2, 0);
  scene.add(doorLight);

  // ── Sections ──────────────────────────────────────────────────────────────
  const SECTIONS = [
    {
      label: 'EXPANSION',
      href:  'index.html',
      yaw:    0,
      dir:    new THREE.Vector3(0, 0, -1),
    },
    {
      label: 'Archive',
      href:  'archive.html',  // copied from expansion-pitch-repo/story/archive.html
      yaw:   -Math.PI / 2,
      dir:    new THREE.Vector3(1, 0, 0),
    },
  ];

  // ── Lighting ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.012));

  const driftLights = [];
  SECTIONS.forEach(sec => {
    const ceilY  = WH - 0.4;
    const farBase = sec.dir.clone().multiplyScalar(CW + CL * 0.85);
    const pl1 = new THREE.PointLight(0xfff8f0, 2.6, 55, 2);
    pl1.position.copy(farBase); pl1.position.y = ceilY;
    scene.add(pl1);
    driftLights.push({ light: pl1, base: farBase.clone(), dir: sec.dir });

    const midBase = sec.dir.clone().multiplyScalar(CW + CL * 0.42);
    const pl2 = new THREE.PointLight(0xffffff, 0.4, 28, 2);
    pl2.position.copy(midBase); pl2.position.y = ceilY;
    scene.add(pl2);
    driftLights.push({ light: pl2, base: midBase.clone(), dir: sec.dir });
  });

  // ── Vignette overlay ──────────────────────────────────────────────────────
  const vignetteEl = document.createElement('div');
  Object.assign(vignetteEl.style, {
    position: 'fixed', inset: '0', zIndex: '23', pointerEvents: 'none', opacity: '0',
    background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.92) 100%)',
  });
  document.body.appendChild(vignetteEl);

  const grainEl = document.createElement('div');
  Object.assign(grainEl.style, {
    position: 'fixed', inset: '0', zIndex: '24', opacity: '0',
    pointerEvents: 'none', transition: 'opacity 0.8s ease',
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    backgroundSize: '160px 160px',
  });
  document.body.appendChild(grainEl);

  // ── Label overlay ─────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '24',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none', opacity: '0', transition: 'opacity 0.5s ease',
  });
  document.body.appendChild(overlay);

  const labelEl = document.createElement('div');
  labelEl.className = 'maze-label';
  overlay.appendChild(labelEl);

  const hintEl = document.createElement('div');
  hintEl.className = 'maze-hint';
  hintEl.textContent = 'click to enter';
  overlay.appendChild(hintEl);

  // ── State ─────────────────────────────────────────────────────────────────
  let currentYaw   = 0;
  let currentPitch = 0;
  let activeIdx    = -1;
  let navigating   = false;
  let isVisible    = false;
  let lastMove     = 0;
  let mouseX = 0.5, mouseY = 0.5;
  let yawVel = 0;

  window.addEventListener('mousemove', e => {
    if (!isVisible || navigating) return;
    lastMove = performance.now();
    mouseX = e.clientX / W();
    mouseY = e.clientY / H();
  });

  window.addEventListener('click', e => {
    if (!isVisible || navigating || activeIdx < 0) return;
    if (e.target.closest('button, a, input, select, textarea')) return;
    navigate(activeIdx);
  });

  // ── Navigate ──────────────────────────────────────────────────────────────
  function navigate(idx) {
    if (navigating) return;
    navigating = true;
    overlay.style.opacity = '0';

    const sec = SECTIONS[idx];

    if (opts.onNavigate) {
      const startPos   = camera.position.clone();
      const endPos     = sec.dir.clone().multiplyScalar(CL * 0.78);
      endPos.y = 1.65;
      const startYaw   = currentYaw;
      const startPitch = currentPitch;
      const TOTAL_MS   = 3600;
      const HAND_OFF   = 1800;
      const t0 = performance.now();
      let handed = false;
      function stepEmbed() {
        const elapsed  = performance.now() - t0;
        const progress = Math.min(elapsed / TOTAL_MS, 1);
        const ease = 1 - Math.pow(1 - progress, 2.2);
        camera.position.lerpVectors(startPos, endPos, ease);
        let dyaw = sec.yaw - startYaw;
        dyaw = ((dyaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        camera.rotation.y = startYaw + dyaw * Math.min(progress * 3, 1);
        camera.rotation.x = startPitch * (1 - Math.min(progress * 4, 1));
        renderer.render(scene, camera);
        if (elapsed >= HAND_OFF && !handed) { handed = true; opts.onNavigate(sec.href); }
        if (!handed) requestAnimationFrame(stepEmbed);
      }
      requestAnimationFrame(stepEmbed);
      return;
    }

    const startPos   = camera.position.clone();
    const endPos     = sec.dir.clone().multiplyScalar(CL * 0.78);
    endPos.y = 1.65;
    const startYaw   = currentYaw;
    const startPitch = currentPitch;
    const TOTAL_MS   = 3600;

    // Always use fade transition
    const frame = document.createElement('iframe');
    frame.src = sec.href;
    Object.assign(frame.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      border: 'none', zIndex: '95', opacity: '0',
      transition: 'none', pointerEvents: 'none',
    });
    document.body.appendChild(frame);

    const siteNav = document.getElementById('site-topnav');
    if (siteNav) siteNav.classList.add('visible');
    const parentCursor = document.querySelector('.cursor');
    if (parentCursor) parentCursor.style.display = 'none';

    const t0f = performance.now();
    const FADE_START = 800, FADE_DUR = 2400;

    function stepFade() {
      const elapsed  = performance.now() - t0f;
      const progress = Math.min(elapsed / TOTAL_MS, 1);
      const ease = 1 - Math.pow(1 - progress, 2.2);

      camera.position.lerpVectors(startPos, endPos, ease);
      let dyaw = sec.yaw - startYaw;
      dyaw = ((dyaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      camera.rotation.y = startYaw + dyaw * Math.min(progress * 3, 1);
      camera.rotation.x = startPitch * (1 - Math.min(progress * 4, 1));
      renderer.render(scene, camera);

      if (elapsed >= FADE_START) {
        frame.style.opacity = String(Math.min((elapsed - FADE_START) / FADE_DUR, 1));
      }

      if (elapsed < FADE_START + FADE_DUR) {
        requestAnimationFrame(stepFade);
      } else {
        frame.style.pointerEvents = 'auto';
        frame.style.opacity = '1';
      }
    }
    stepFade();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function angDist(a, b) {
    const d = ((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return Math.abs(d);
  }

  // ── Scroll-driven descent ─────────────────────────────────────────────────
  const CAM_HIGH = 7.0;
  const CAM_EYE  = 1.65;
  let scrollFrac = 0;

  function setScroll(frac) {
    scrollFrac = frac;
    grainEl.style.opacity = (frac * 0.07).toFixed(3);
    const vigOp = Math.max(0, Math.min((frac - 0.3) / 0.45, 1));
    vignetteEl.style.opacity = vigOp.toFixed(3);
  }

  function show() { isVisible = true; }
  function hide() { isVisible = false; }

  // ── Resize ────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  });

  // ── Render loop ───────────────────────────────────────────────────────────
  function render() {
    requestAnimationFrame(render);
    if (navigating) return;
    if (!isVisible && scrollFrac === 0) return;

    const now  = performance.now();
    const idle = now - lastMove;
    const descended = scrollFrac > 0.85;

    if (descended) {
      if (idle > 2000) {
        yawVel *= 0.88;
        let best = SECTIONS[0], bestD = Infinity;
        SECTIONS.forEach(sec => { const d = angDist(currentYaw, sec.yaw); if (d < bestD) { bestD = d; best = sec; } });
        let snap = best.yaw - currentYaw;
        snap = ((snap + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        currentYaw   += snap * 0.018;
        currentPitch += (0 - currentPitch) * 0.04;
      } else {
        const MAX_VEL = 0.0006, DAMPING = 0.96;
        yawVel = yawVel * DAMPING - (mouseX - 0.5) * MAX_VEL * 2;
        currentYaw   += yawVel;
        currentPitch += ((mouseY - 0.5) * 0.12 - currentPitch) * 0.04;
      }
    } else {
      yawVel = 0;
    }

    const t = now * 0.001;
    const descentEase = 1 - Math.pow(1 - scrollFrac, 2.5);
    camera.position.y = CAM_HIGH + (CAM_EYE - CAM_HIGH) * descentEase + Math.sin(t * 0.5) * (0.008 * scrollFrac);
    camera.rotation.x = currentPitch + (-0.18 * (1 - descentEase));
    camera.rotation.y = currentYaw;

    const drift = Math.sin(t * 0.16) * 18;
    driftLights.forEach(({ light, base, dir }) => {
      light.position.x = base.x + dir.x * drift;
      light.position.z = base.z + dir.z * drift;
    });

    let bestIdx = -1, bestDist = Infinity;
    SECTIONS.forEach((sec, i) => {
      const d = angDist(currentYaw, sec.yaw);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    const THRESH = Math.PI / 5;
    activeIdx = bestDist < THRESH ? bestIdx : -1;

    if (descended && isVisible && activeIdx >= 0) {
      const strength = 1 - bestDist / THRESH;
      labelEl.textContent   = SECTIONS[activeIdx].label.toUpperCase();
      overlay.style.opacity = (strength * 0.95).toFixed(3);
    } else {
      overlay.style.opacity = '0';
    }

    renderer.render(scene, camera);
  }
  render();

  return { show, hide, setScroll };
}
