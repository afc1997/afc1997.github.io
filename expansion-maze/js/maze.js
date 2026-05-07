// js/maze.js — first-person maze navigation hub
import * as THREE from 'three';

export function initMaze(canvas, opts = {}) {
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x000000, 1);

  // ── Scene + neutral fog ────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, opts.fogDensity !== undefined ? opts.fogDensity : 0.009);

  // ── Camera ───────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(opts.fov !== undefined ? opts.fov : 75, W() / H(), 0.05, 160);
  camera.position.set(0, 1.65, 0);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = opts.initialYaw !== undefined ? opts.initialYaw : 0;

  let prevYaw = 0; // for yaw velocity (rubberband)

  // ── Constants ─────────────────────────────────────────────────────────────
  const CW  = 1.05;
  const CL  = 130;
  const WH  = opts.wallHeight !== undefined ? opts.wallHeight : 7.5;
  const WT  = 0.12;
  const SEG = 5.5;

  // ── Materials — near-black ────────────────────────────────────────────────
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.97, metalness: 0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.99 });
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 1 });
  const seamMat  = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 1 });
  const runMat   = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 });
  // Emissive edge strip — glows along top wall corners like the reference
  const edgeMat      = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xd4c8a0, emissiveIntensity: 0.28, roughness: 1 });
  // Shaft floor plates — solid black, always dark
  const shaftPlateMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x060606, emissiveIntensity: 1.0, roughness: 1 });
  // Archive green door
  const greenDoorMat  = new THREE.MeshStandardMaterial({ color: 0x001a00, emissive: 0x00ff44, emissiveIntensity: 0.55, roughness: 0.8 });

  // ── Geometry helper ───────────────────────────────────────────────────────
  function addBox(x, y, z, sx, sy, sz, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  // ── Floor & ceiling — large enough to cover dolly galleries ─────────────
  const big = new THREE.PlaneGeometry(2000, 2000);
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
      // Emissive top-edge strips (wall-ceiling junction)
      addBox(-(CW + WT / 2), WH - 0.04, sign * mid, 0.06, 0.06, CL, edgeMat);
      addBox(  CW + WT / 2,  WH - 0.04, sign * mid, 0.06, 0.06, CL, edgeMat);
      const runner = new THREE.Mesh(new THREE.PlaneGeometry(CW, CL), runMat);
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
      // Emissive top-edge strips
      addBox(sign * mid, WH - 0.04, -(CW + WT / 2), CL, 0.06, 0.06, edgeMat);
      addBox(sign * mid, WH - 0.04,   CW + WT / 2,  CL, 0.06, 0.06, edgeMat);
      const runner = new THREE.Mesh(new THREE.PlaneGeometry(CL, CW), runMat);
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

  // ── Corridor directions — only build corridors that appear in SECTIONS ───
  // (SECTIONS is defined later but opts.sections is available now)
  const _secs = opts.sections || null; // null = build all 4
  const _hasDir = (dx, dz) => !_secs || _secs.some(s => Math.abs(s.dir.x - dx) < 0.01 && Math.abs(s.dir.z - dz) < 0.01);

  const ALL_CORR = [
    { axis: 'z', sign: -1, dx: 0,  dz: -1 }, // Story / Expansion
    { axis: 'x', sign: +1, dx: 1,  dz:  0 }, // Characters
    { axis: 'z', sign: +1, dx: 0,  dz:  1 }, // Visual Treatment
    { axis: 'x', sign: -1, dx: -1, dz:  0 }, // Contact / Archive
  ];

  const END = CW + CL + WT / 2;

  ALL_CORR.forEach(({ axis, sign, dx, dz }) => {
    if (_hasDir(dx, dz)) {
      buildCorridor(axis, sign);
      // End cap at corridor mouth
      if (axis === 'z') addBox(0,          WH/2, sign * END, CW*2, WH, WT, wallMat);
      else              addBox(sign * END,  WH/2, 0,          WT, WH, CW*2, wallMat);
    } else {
      // Blank off unused direction with a flat wall at the hub entrance
      if (axis === 'z') addBox(0,         WH/2, sign * CW, CW*2+WT, WH, WT, wallMat);
      else              addBox(sign * CW,  WH/2, 0,          WT, WH, CW*2+WT, wallMat);
    }
  });

  const CO = CW + CL / 2;
  addBox( CO, WH/2, -CO, CL, WH, CL, wallMat); addBox(-CO, WH/2, -CO, CL, WH, CL, wallMat);
  addBox( CO, WH/2,  CO, CL, WH, CL, wallMat); addBox(-CO, WH/2,  CO, CL, WH, CL, wallMat);

  // ── Gallery wall height — much taller than WH so tops never show ─────────
  const GALL_H = 50;

  // ── Lateral dolly gallery (Visual Treatment background) ───────────────────
  // Camera slides along X while facing +Z, passing 3 wide corridor openings.
  // Placed at Z=+300 — fog makes the hub invisible from here.
  const DOLLY_BASE_Z  = 300;
  const DOLLY_START_X = -120;
  const DOLLY_END_X   =    0;
  const OPEN_W        =  6.0;
  const OPEN_XS       = [-88, -44, 0];
  const FRONT_Z       = DOLLY_BASE_Z + 5;
  const STUB_LENGTHS  = [300, 18, 120]; // very long · very short · standard

  if (opts.buildDollyGallery) (function buildDollyGallery() {
    const wallY = GALL_H / 2;

    // Front wall with 3 openings (segments between gaps)
    const xs = [
      DOLLY_START_X - 25,
      ...OPEN_XS.flatMap(ox => [ox - OPEN_W / 2, ox + OPEN_W / 2]),
      DOLLY_END_X + 25,
    ];
    for (let i = 0; i < xs.length; i += 2) {
      const x1 = xs[i], x2 = xs[i + 1], w = x2 - x1;
      addBox((x1 + x2) / 2, wallY, FRONT_Z, w, GALL_H, WT, wallMat);
      addBox((x1 + x2) / 2, GALL_H - 0.04, FRONT_Z, w, 0.06, WT, edgeMat);
    }

    // Side cap walls
    const sideD = FRONT_Z - DOLLY_BASE_Z + 2;
    const sideMidZ = (DOLLY_BASE_Z + FRONT_Z) / 2;
    addBox(DOLLY_START_X - 25, wallY, sideMidZ, WT, GALL_H, sideD, wallMat);
    addBox(DOLLY_END_X   + 25, wallY, sideMidZ, WT, GALL_H, sideD, wallMat);

    // Three stub corridors — each a different depth
    OPEN_XS.forEach((ox, idx) => {
      const sl = STUB_LENGTHS[idx];
      const stubMidZ = FRONT_Z + WT / 2 + sl / 2;
      const lx = ox - OPEN_W / 2 - WT / 2;
      const rx = ox + OPEN_W / 2 + WT / 2;
      addBox(lx, wallY, stubMidZ, WT, GALL_H, sl, wallMat);
      addBox(rx, wallY, stubMidZ, WT, GALL_H, sl, wallMat);
      addBox(lx, GALL_H - 0.04, stubMidZ, 0.06, 0.06, sl, edgeMat);
      addBox(rx, GALL_H - 0.04, stubMidZ, 0.06, 0.06, sl, edgeMat);
      if (sl < 200) addBox(ox, wallY, FRONT_Z + WT / 2 + sl, OPEN_W + WT * 2, GALL_H, WT, wallMat);
      const lightZ = FRONT_Z + Math.min(sl * 0.18, 30);
      const pl = new THREE.PointLight(0xfff8f0, 2.2, 70, 2);
      pl.position.set(ox, 2.5, lightZ);
      scene.add(pl);
    });
  })();

  // ── Vertical shaft (Contact background) ──────────────────────────────────
  // Only built when opts.buildShaft is true (contact page).
  // Camera descends at hub center (0, Y, 0) facing –Z (Story direction).
  // Horizontal floor plates with a central gap create "floors above and below."
  // The existing hub corridors ARE the long hallways visible looking ahead.
  const VERT_CAM_HIGH  = 18;
  const SHAFT_HALF_X   = CW;
  const PLATE_THICK    = 0.9;   // thick slabs for a solid look
  const PLATE_SPAN_X   = 28;
  const PLATE_SPAN_Z   = 120;   // extends deep into the distance
  const SHAFT_FLOOR_YS = [9.5, 14.5];

  const shaftBayLights = [];
  if (opts.buildShaft) (function buildContactShaft() {
    const SHAFT_X   = CW + WT / 2;
    const WALL_H    = VERT_CAM_HIGH + 2;
    const WALL_HALF = WALL_H / 2;
    const SZ        = -65;  // center so near edge stays at Z=-5, far edge reaches Z=-125

    // Tall shaft walls
    addBox(-SHAFT_X, WALL_HALF, SZ, WT, WALL_H, PLATE_SPAN_Z, wallMat);
    addBox( SHAFT_X, WALL_HALF, SZ, WT, WALL_H, PLATE_SPAN_Z, wallMat);

    // Floor slabs
    SHAFT_FLOOR_YS.forEach(fy => {
      addBox(0, fy, SZ, PLATE_SPAN_X, PLATE_THICK, PLATE_SPAN_Z, shaftPlateMat);
    });

    // Ceiling cap above camera
    addBox(0, VERT_CAM_HIGH + 1, SZ, PLATE_SPAN_X, PLATE_THICK, PLATE_SPAN_Z, shaftPlateMat);

    // SpotLights at the TOP of each bay (just below the ceiling/plate above) pointing down
    const ceilingYs = [
      VERT_CAM_HIGH + 0.8,          // top of shaft, just below ceiling cap
      SHAFT_FLOOR_YS[1] - 0.1,      // just below plate at 14.5
      SHAFT_FLOOR_YS[0] - 0.1,      // just below plate at 9.5
    ];
    const downTarget = new THREE.Object3D();
    downTarget.position.set(0, -1000, SZ);
    scene.add(downTarget);
    ceilingYs.forEach(cy => {
      const sl = new THREE.SpotLight(0xffffff, 10.0, 26, Math.PI * 0.42, 0.25, 2);
      sl.position.set(0, cy, SZ);
      sl.target = downTarget;
      scene.add(sl);
      shaftBayLights.push(sl);
    });
  })();

  // ── Sections — configurable per-page via opts.sections ───────────────────
  const SECTIONS = opts.sections || [
    {
      label:     'Story',
      href:      'synopsis.html',
      transType: 'fade',
      transSrc:  '',
      yaw:        0,
      dir:        new THREE.Vector3(0, 0, -1),
    },
    {
      label:     'Characters',
      href:      'characters.html',
      transType: 'fade',
      transSrc:  '',
      yaw:       -Math.PI / 2,
      dir:        new THREE.Vector3(1, 0, 0),
    },
    {
      label:     'Visual Treatment',
      href:      'visual-treatment.html',
      transType: 'fade',
      transSrc:  'pitch-assets/images/Nostalghia - 1984 (6).png',
      yaw:        Math.PI,
      dir:        new THREE.Vector3(0, 0, 1),
    },
    {
      label:     'Contact',
      href:      'contact.html',
      transType: 'fade',
      transSrc:  '',
      yaw:        Math.PI / 2,
      dir:        new THREE.Vector3(-1, 0, 0),
    },
  ];

  // ── Lighting — corridor lights + slow roving overheads ──────────────────
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.035);
  scene.add(ambientLight);

  const driftLights = [];

  SECTIONS.forEach(sec => {
    const ceilY = WH - 0.4;
    const dir   = sec.dir.clone();

    const farBase = dir.clone().multiplyScalar(CW + CL * 0.85);
    const pl1 = new THREE.PointLight(0xfff8f0, 3.8, 70, 2);
    pl1.position.copy(farBase); pl1.position.y = ceilY; scene.add(pl1);
    driftLights.push({ light: pl1, base: farBase.clone(), dir });

    const midBase = dir.clone().multiplyScalar(CW + CL * 0.42);
    const pl2 = new THREE.PointLight(0xffffff, 1.2, 45, 2);
    pl2.position.copy(midBase); pl2.position.y = ceilY; scene.add(pl2);
    driftLights.push({ light: pl2, base: midBase.clone(), dir });

    // Near light — illuminates the hub junction end of each corridor
    const nearBase = dir.clone().multiplyScalar(CW + CL * 0.12);
    const pl3 = new THREE.PointLight(0xfff8f0, 1.6, 30, 2);
    pl3.position.copy(nearBase); pl3.position.y = ceilY; scene.add(pl3);
    driftLights.push({ light: pl3, base: nearBase.clone(), dir });
  });

  // ── Roving overhead lights — float slowly through Z and X space ──────────
  // Two lights travel the full Z axis (north–south corridors).
  // Two lights travel the full X axis (east–west corridors).
  // Each has a different phase so they never perfectly overlap.
  const rovingLights = [
    // Z-axis travelers
    { light: new THREE.PointLight(0xfff4e0, 2.4, 60, 2), axis: 'z', phase: 0,          speed: 0.028 },
    { light: new THREE.PointLight(0xfff4e0, 2.0, 50, 2), axis: 'z', phase: Math.PI,    speed: 0.021 },
    // X-axis travelers
    { light: new THREE.PointLight(0xfff4e0, 2.4, 60, 2), axis: 'x', phase: Math.PI / 2, speed: 0.025 },
    { light: new THREE.PointLight(0xfff4e0, 2.0, 50, 2), axis: 'x', phase: 3 * Math.PI / 2, speed: 0.019 },
  ];
  const ROVING_Y    = WH - 0.6;  // just below ceiling
  const ROVING_SPAN = CW + CL * 0.9; // how far they travel from center
  rovingLights.forEach(({ light }) => scene.add(light));

  // ── Archive green door — only when Archive section is present ───────────
  {
    const archiveSec = SECTIONS.find(s => s.href && s.href.includes('archive'));
    if (archiveSec) {
      const archiveEnd = archiveSec.dir.clone().multiplyScalar(CW + CL + WT);
      // Full-height door panel
      const door = new THREE.Mesh(new THREE.BoxGeometry(CW * 2, WH, WT * 2), greenDoorMat);
      door.position.copy(archiveEnd);
      door.position.y = WH / 2;
      scene.add(door);
      // Strong glow right at the door
      const glow = new THREE.PointLight(0x00ff44, 4.5, 80, 2);
      glow.position.copy(archiveEnd);
      glow.position.addScaledVector(archiveSec.dir, -5);
      glow.position.y = WH / 2;
      scene.add(glow);
      // Cascade of green lights stepping back toward the hub so the color is visible from the entrance
      [0.75, 0.5, 0.28].forEach((t, i) => {
        const gl = new THREE.PointLight(0x00ff44, [1.8, 1.2, 0.7][i], [70, 55, 40][i], 2);
        gl.position.copy(archiveSec.dir.clone().multiplyScalar(CW + CL * t));
        gl.position.y = WH / 2;
        scene.add(gl);
      });
    }
  }

  // ── Vignette + grain overlay ──────────────────────────────────────────────
  const vignetteEl = document.createElement('div');
  Object.assign(vignetteEl.style, {
    position: 'fixed', inset: '0', zIndex: '23',
    pointerEvents: 'none', opacity: '0',
    background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.92) 100%)',
  });
  document.body.appendChild(vignetteEl);

  const grainEl = document.createElement('div');
  Object.assign(grainEl.style, {
    position: 'fixed', inset: '0', zIndex: '24',
    opacity: '0', pointerEvents: 'none', transition: 'opacity 0.8s ease',
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    backgroundSize: '160px 160px',
  });
  document.body.appendChild(grainEl);


  // ── Transition media ──────────────────────────────────────────────────────
  // Shared wrapper
  const transWrap = document.createElement('div');
  Object.assign(transWrap.style, {
    position: 'fixed', inset: '0',
    zIndex: '90',
    opacity: '0',
    transition: 'opacity 1.6s ease',
    pointerEvents: 'none',
    background: '#000',
  });
  document.body.appendChild(transWrap);

  const transImg = document.createElement('img');
  Object.assign(transImg.style, { width:'100%', height:'100%', objectFit:'cover', display:'block', position:'absolute', inset:'0' });
  transWrap.appendChild(transImg);

  const transVid = document.createElement('video');
  transVid.muted = true; transVid.autoplay = true; transVid.loop = true; transVid.playsInline = true;
  Object.assign(transVid.style, { width:'100%', height:'100%', objectFit:'cover', display:'none', position:'absolute', inset:'0' });
  transWrap.appendChild(transVid);

  // ── Label overlay — centered, pointer-events:none always ─────────────────
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    zIndex: '24',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.5s ease',
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
  let currentYaw   = opts.initialYaw !== undefined ? opts.initialYaw : 0;
  let targetYaw    = 0;
  let currentPitch = 0;
  let targetPitch  = 0;
  let activeIdx    = -1;
  let navigating   = false;
  let isVisible    = false;
  let lastMove     = 0;

  // ── Input on window ───────────────────────────────────────────────────────
  // Velocity-based look: mouse offset from centre drives spin speed
  let mouseX = 0.5; // normalised 0–1, starts at centre
  let mouseY = 0.5;
  let yawVel = 0;   // radians/frame

  window.addEventListener('mousemove', e => {
    if (!isVisible || navigating) return;
    lastMove = performance.now();
    mouseX = e.clientX / W();
    mouseY = e.clientY / H();
  });

  window.addEventListener('click', e => {
    if (!isVisible || navigating || activeIdx < 0) return;
    // Don't intercept clicks on UI elements (buttons, links, etc.)
    if (e.target.closest('button, a, input, select, textarea')) return;
    navigate(activeIdx);
  });

  // ── Navigate ──────────────────────────────────────────────────────────────
  function navigate(idx) {
    if (navigating) return;
    navigating = true;
    overlay.style.opacity = '0';

    const sec = SECTIONS[idx];

    const startPos   = camera.position.clone();
    const endPos     = sec.dir.clone().multiplyScalar(CL * 0.78);
    endPos.y = 1.65;
    const startYaw   = currentYaw;
    const startPitch = currentPitch;
    const TOTAL_MS   = 3600;
    const IMG_START  = 600;

    // Prep transition media
    transImg.style.display = 'none';
    transVid.style.display = 'none';
    transWrap.style.transition = 'none';
    transWrap.style.opacity = '0';

    if (sec.transType === 'fade') {
      const FADE_START = 800;
      const FADE_DUR   = 2400;
      const t0f = performance.now();

      // Shell mode: let the parent shell handle the dissolve so there's no reload flash.
      // Standalone mode: create a local iframe and fade it in directly.
      const useShell = !!opts.onNavigate && window.parent !== window;
      let frame = null;
      let fadeSent = false;

      if (useShell) {
        // Tell shell to start loading the destination page now (in the background).
        window.parent.postMessage({ type: 'shell_nav_prepare', href: sec.href, fadeDur: FADE_DUR }, '*');
      } else {
        frame = document.createElement('iframe');
        frame.src = sec.href;
        Object.assign(frame.style, {
          position: 'fixed', inset: '0',
          width: '100%', height: '100%',
          border: 'none', zIndex: '95',
          opacity: '0', transition: 'none',
          pointerEvents: 'none',
        });
        document.body.appendChild(frame);
      }

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
          if (useShell) {
            if (!fadeSent) {
              fadeSent = true;
              window.parent.postMessage({ type: 'shell_nav_fade' }, '*');
            }
          } else {
            frame.style.opacity = String(Math.min((elapsed - FADE_START) / FADE_DUR, 1));
          }
        }

        if (elapsed < FADE_START + FADE_DUR) {
          requestAnimationFrame(stepFade);
        } else {
          if (useShell) {
            window.parent.postMessage({ type: 'shell_nav_done' }, '*');
          } else {
            frame.style.opacity = '1';
            if (opts.onNavigate) {
              opts.onNavigate(sec.href); // top-level hard navigate after dissolve
            } else {
              frame.style.pointerEvents = 'auto';
            }
          }
        }
      }
      stepFade();
      return;
    } else if (sec.transType === 'video') {
      transVid.src = sec.transSrc;
      transVid.style.display = 'block';
      transVid.load(); transVid.play().catch(() => {});
    } else {
      transImg.src = sec.transSrc;
      transImg.style.display = 'block';
    }

    let imgTriggered = false;
    const t0 = performance.now();

    function step() {
      const elapsed  = performance.now() - t0;
      const progress = Math.min(elapsed / TOTAL_MS, 1);
      const ease = 1 - Math.pow(1 - progress, 2.2);

      camera.position.lerpVectors(startPos, endPos, ease);
      let dyaw = sec.yaw - startYaw;
      dyaw = ((dyaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      camera.rotation.y = startYaw + dyaw * Math.min(progress * 3, 1);
      camera.rotation.x = startPitch * (1 - Math.min(progress * 4, 1));

      if (elapsed > IMG_START && !imgTriggered) {
        imgTriggered = true;
        transWrap.style.transition = 'opacity 3.2s ease';
        transWrap.style.opacity = '1';
      }

      renderer.render(scene, camera);
      if (progress < 1) requestAnimationFrame(step);
      else setTimeout(() => { window.location.href = sec.href; }, 2200);
    }
    step();
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  function angDist(a, b) {
    const d = ((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return Math.abs(d);
  }

  // ── Scroll-driven camera descent ─────────────────────────────────────────
  const CAM_HIGH = 5.5;
  const CAM_EYE  = opts.eyeHeight !== undefined ? opts.eyeHeight : 1.65;
  let scrollFrac = 0;     // 0 = top of descent, 1 = eye level

  function setScroll(frac) {
    scrollFrac = frac;
    grainEl.style.opacity = (frac * 0.07).toFixed(3);
    // Vignette only visible once maze descends into view
    const vigOp = Math.max(0, Math.min((frac - 0.3) / 0.45, 1));
    vignetteEl.style.opacity = vigOp.toFixed(3);
  }

  // ── Show / hide ───────────────────────────────────────────────────────────
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
    // Dolly modes: keep hub drift lights animating and overlay cleared
    if (dollyActive || vertDollyActive) {
      overlay.style.opacity = '0';
      const t = performance.now() * 0.001;
      const drift = Math.sin(t * 0.16) * 18;
      driftLights.forEach(({ light, base, dir }) => {
        light.position.x = base.x + dir.x * drift;
        light.position.z = base.z + dir.z * drift;
      });
      rovingLights.forEach(({ light, axis, phase, speed }) => {
        const pos = Math.sin(t * speed + phase) * ROVING_SPAN;
        light.position.set(axis === 'x' ? pos : 0, ROVING_Y, axis === 'z' ? pos : 0);
      });
      renderer.render(scene, camera);
      return;
    }
    // Skip GPU work entirely when maze is fully hidden
    if (!isVisible && scrollFrac === 0) return;

    const now  = performance.now();
    const idle = now - lastMove;

    const descended = scrollFrac > 0.85;

    if (descended) {
      if (idle > 2000) {
        // Idle: zero velocity, drift back toward nearest section
        yawVel *= 0.88;
        let best = SECTIONS[0], bestD = Infinity;
        SECTIONS.forEach(sec => { const d = angDist(currentYaw, sec.yaw); if (d < bestD) { bestD = d; best = sec; } });
        let snap = best.yaw - currentYaw;
        snap = ((snap + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        currentYaw += snap * 0.018;
        currentPitch += (0 - currentPitch) * 0.04;
      } else {
        // Active mouse: offset from centre (-0.5..0.5) drives angular velocity
        const MAX_VEL = 0.0006;  // radians/frame at full deflection — very slow
        const DAMPING = 0.96;    // inertia decay each frame
        const offset  = mouseX - 0.5; // left = negative, right = positive
        yawVel = yawVel * DAMPING - offset * MAX_VEL * 2;
        currentYaw   += yawVel;
        const pitchTarget = (mouseY - 0.5) * 0.12;
        currentPitch += (pitchTarget - currentPitch) * 0.04;
      }
    } else {
      yawVel = 0;
    }

    const t = now * 0.001;

    // Camera descends from CAM_HIGH → CAM_EYE with scroll, gentle bob at eye level
    const descentEase = 1 - Math.pow(1 - scrollFrac, 2.5);
    const baseY = CAM_HIGH + (CAM_EYE - CAM_HIGH) * descentEase;
    camera.position.y = baseY + Math.sin(t * 0.5) * (0.008 * scrollFrac);

    const basePitch = -0.18 * (1 - descentEase);
    camera.rotation.x = currentPitch + basePitch;
    camera.rotation.y = currentYaw;

    // Light drift
    const drift = Math.sin(t * 0.16) * 18;
    driftLights.forEach(({ light, base, dir }) => {
      light.position.x = base.x + dir.x * drift;
      light.position.z = base.z + dir.z * drift;
    });

    // Roving overheads — slow sinusoidal travel along their axis
    rovingLights.forEach(({ light, axis, phase, speed }) => {
      const pos = Math.sin(t * speed + phase) * ROVING_SPAN;
      light.position.set(
        axis === 'x' ? pos : 0,
        ROVING_Y,
        axis === 'z' ? pos : 0,
      );
    });

    // Labels appear only once fully descended
    let bestIdx = -1, bestDist = Infinity;
    SECTIONS.forEach((sec, i) => { const d = angDist(currentYaw, sec.yaw); if (d < bestDist) { bestDist = d; bestIdx = i; } });
    const THRESH = Math.PI / 5;
    activeIdx = bestDist < THRESH ? bestIdx : -1;

    if (descended && isVisible && activeIdx >= 0) {
      const strength = 1 - bestDist / THRESH;
      labelEl.textContent   = SECTIONS[activeIdx].label.toUpperCase();
      overlay.style.opacity = (strength * 0.95).toFixed(3);
    } else {
      overlay.style.opacity = '0';
    }

    prevYaw = currentYaw;
    renderer.render(scene, camera);
  }
  // ── Dolly modes ───────────────────────────────────────────────────────────
  let dollyActive     = false; // VT: lateral X movement
  let vertDollyActive = false; // Contact: vertical Y descent

  function setDollyFrac(frac) {
    if (navigating) return;
    dollyActive = true;
    // Slide camera laterally along X (left → right) inside the dolly gallery,
    // facing +Z so corridor openings pass by to the right of screen center.
    // Travel right → left: frac=0 starts at right (DOLLY_END_X), frac=1 ends at left (DOLLY_START_X)
    const x = DOLLY_END_X + (DOLLY_START_X - DOLLY_END_X) * Math.min(frac, 1);
    camera.position.set(x, CAM_EYE, DOLLY_BASE_Z);
    camera.rotation.x = 0;
    camera.rotation.y = Math.PI; // face +Z (into the stub corridors)
    // render loop handles the actual draw every rAF
  }

  function releaseDolly() {
    if (!dollyActive) return;
    dollyActive = false;
    camera.position.set(0, CAM_EYE, 0);
    currentYaw        = -Math.PI / 2; // face Characters
    camera.rotation.y = currentYaw;
    scrollFrac        = 1;
  }

  // ── Vertical dolly (Contact page) ────────────────────────────────────────
  function setVertDollyFrac(frac) {
    if (navigating) return;
    vertDollyActive = true;
    const f = Math.min(frac, 1);
    const y = VERT_CAM_HIGH + (CAM_EYE - VERT_CAM_HIGH) * f;
    camera.position.set(0, y, 0);
    camera.rotation.x = 0;
    // In the final 30% of descent, gradually turn toward opts.initialYaw
    // so the Archive corridor (with green door) comes into view at the bottom.
    const destYaw = opts.initialYaw !== undefined ? opts.initialYaw : 0;
    const yawBlend = Math.max(0, (f - 0.7) / 0.3);
    camera.rotation.y = destYaw * yawBlend;
    // Dim shaft bay lights as we near eye level so corridor lighting takes over
    shaftBayLights.forEach(pl => { pl.intensity = 6.0 * (1 - yawBlend); });
  }

  function releaseVertDolly() {
    if (!vertDollyActive) return;
    vertDollyActive = false;
    shaftBayLights.forEach(pl => { pl.intensity = 0; });
    currentYaw        = opts.initialYaw !== undefined ? opts.initialYaw : 0;
    camera.rotation.y = currentYaw;
    camera.rotation.x = 0;
    scrollFrac        = 1;
  }

  render();

  return { show, hide, setScroll, setDollyFrac, releaseDolly, setVertDollyFrac, releaseVertDolly };
}
