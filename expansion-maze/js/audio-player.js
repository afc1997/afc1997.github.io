const tracks = [
  { src: 'assets/audio/zone-of-interest.mp3',      label: 'ZONE OF INTEREST' },
  { src: 'assets/audio/zone-of-interest-full.mp3',  label: 'ZONE OF INTEREST (FULL)' },
  { src: 'assets/audio/under-the-skin.mp3',         label: 'UNDER THE SKIN' },
];

let currentIndex = 0;
let ctx = null;
let analyser = null;
let source = null;
let waveData = null;

const player  = document.getElementById('audio-player');
const audio   = document.getElementById('ap-audio');
const btnPlay = document.getElementById('ap-play');
const btnPrev = document.getElementById('ap-prev');
const btnNext = document.getElementById('ap-next');
const label   = document.getElementById('ap-label');
const waveCanvas = document.getElementById('ap-wave');
const waveCtx    = waveCanvas.getContext('2d');

function initAudio() {
  if (ctx) return;
  ctx     = new AudioContext();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.8;
  waveData = new Uint8Array(analyser.frequencyBinCount);
  source   = ctx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(ctx.destination);
}

function loadTrack(index, autoplay) {
  currentIndex = index;
  label.textContent = tracks[index].label;
  audio.src = tracks[index].src;
  audio.load();
  if (autoplay) {
    audio.play().then(updatePlayBtn).catch(() => {});
  } else {
    updatePlayBtn();
  }
}

function updatePlayBtn() {
  btnPlay.textContent = audio.paused ? '▶' : '❚❚';
}

btnPlay.addEventListener('click', () => {
  initAudio();
  if (ctx.state === 'suspended') ctx.resume();
  if (audio.paused) {
    audio.play().then(updatePlayBtn).catch(() => {});
  } else {
    audio.pause();
    updatePlayBtn();
  }
});

btnPrev.addEventListener('click', () => {
  initAudio();
  if (ctx.state === 'suspended') ctx.resume();
  loadTrack((currentIndex - 1 + tracks.length) % tracks.length, !audio.paused);
});

btnNext.addEventListener('click', () => {
  initAudio();
  if (ctx.state === 'suspended') ctx.resume();
  loadTrack((currentIndex + 1) % tracks.length, !audio.paused);
});

audio.addEventListener('ended', () => {
  loadTrack((currentIndex + 1) % tracks.length, true);
});

audio.addEventListener('play',  updatePlayBtn);
audio.addEventListener('pause', updatePlayBtn);

// Resize wave canvas to match its CSS size
function resizeWave() {
  waveCanvas.width  = waveCanvas.offsetWidth  * devicePixelRatio;
  waveCanvas.height = waveCanvas.offsetHeight * devicePixelRatio;
}
resizeWave();
addEventListener('resize', resizeWave);

function drawWave() {
  requestAnimationFrame(drawWave);

  const w = waveCanvas.width;
  const h = waveCanvas.height;
  waveCtx.clearRect(0, 0, w, h);

  if (!analyser || audio.paused) {
    // Flat line when paused
    waveCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    waveCtx.lineWidth = 1 * devicePixelRatio;
    waveCtx.beginPath();
    waveCtx.moveTo(0, h / 2);
    waveCtx.lineTo(w, h / 2);
    waveCtx.stroke();
    return;
  }

  analyser.getByteTimeDomainData(waveData);

  waveCtx.strokeStyle = 'rgba(255,255,255,0.7)';
  waveCtx.lineWidth = 1.5 * devicePixelRatio;
  waveCtx.lineJoin = 'round';
  waveCtx.beginPath();

  const sliceW = w / waveData.length;
  for (let i = 0; i < waveData.length; i++) {
    const v = waveData[i] / 128.0;
    const y = (v * h) / 2;
    if (i === 0) waveCtx.moveTo(0, y);
    else waveCtx.lineTo(i * sliceW, y);
  }
  waveCtx.stroke();
}

loadTrack(0, false);
drawWave();
