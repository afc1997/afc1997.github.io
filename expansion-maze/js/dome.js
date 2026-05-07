/**
 * dome.js — barrel-distortion lens applied to .fb-media video/image elements.
 * Each media element gets a WebGL canvas that renders its content through a
 * fisheye/barrel shader, replacing the original element visually.
 */

const VERT = `
  attribute vec2 a_pos;
  varying   vec2 v_uv;
  void main() {
    v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  varying   vec2      v_uv;
  uniform   sampler2D u_tex;
  uniform   float     u_ar;
  uniform   float     u_k1;

  vec2 distort(vec2 uv) {
    vec2 p = (uv - 0.5) * vec2(u_ar, 1.0);
    float r2 = dot(p, p);
    float warp = 1.0 + u_k1 * r2;
    p = p * warp;
    return p / vec2(u_ar, 1.0) + 0.5;
  }

  void main() {
    vec2 uv = distort(v_uv);
    uv = clamp(uv, 0.0, 1.0);
    gl_FragColor = texture2D(u_tex, uv);
  }
`;

function makeGL(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false });
  if (!gl) return null;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const uTex = gl.getUniformLocation(prog, 'u_tex');
  const uAr  = gl.getUniformLocation(prog, 'u_ar');
  const uK1  = gl.getUniformLocation(prog, 'u_k1');
  gl.uniform1i(uTex, 0);

  return { gl, tex, uAr, uK1 };
}

function applyDomeTo(media, k1) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    pointer-events: none;
  `;
  media.parentNode.insertBefore(canvas, media);
  media.style.display = 'none';

  const ctx = makeGL(canvas);
  if (!ctx) { media.style.display = ''; canvas.remove(); return; }

  const { gl, tex, uAr, uK1 } = ctx;

  function resize() {
    const w = canvas.offsetWidth  || innerWidth;
    const h = canvas.offsetHeight || innerHeight;
    canvas.width  = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform1f(uAr, w / h);
    gl.uniform1f(uK1, k1);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const isImage = media.tagName === 'IMG';
  let imageUploaded = false;

  function uploadAndDraw() {
    if (isImage) {
      if (!imageUploaded && media.complete && media.naturalWidth > 0) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
        imageUploaded = true;
      }
    } else {
      if (media.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
      }
    }
    if (imageUploaded || (!isImage && media.readyState >= 2)) {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    requestAnimationFrame(uploadAndDraw);
  }

  if (isImage && !media.complete) {
    media.addEventListener('load', uploadAndDraw, { once: true });
  }
  uploadAndDraw();
}

export function initDome(k1 = -0.28, selector = '.fb-media') {
  document.querySelectorAll(selector).forEach(el => applyDomeTo(el, k1));
}
