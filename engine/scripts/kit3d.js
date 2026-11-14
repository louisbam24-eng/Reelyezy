// Browser-side Three.js kit for scripts/render3d.mjs: renderer, stylised characters and props.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const Grade = {
  uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, vig: { value: 0.32 }, grain: { value: 0.035 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float seed, vig, grain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c += mix(vec3(-0.012, 0.004, 0.02), vec3(0.025, 0.008, -0.018), smoothstep(0.2, 0.8, l));
      vec2 d = vUv - 0.5; d.x *= 0.84;
      c *= 1.0 - vig * smoothstep(0.25, 0.75, length(d));
      c += (h(vUv * 1000.0) - 0.5) * grain;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export { THREE };
export const canvas = document.getElementById('c');
export const W = canvas.width, H = canvas.height;
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
const envMap = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const seg = (t, a, b) => ease((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stage({ sky, env = 0.45, exposure = 1, fov = 35, dof, bloom = 0.35, ao = 1, rim = 1.6, rimColor = 0xfff1e0, shake = 1 } = {}) {
  const scene = new THREE.Scene();
  scene.environment = envMap;
  scene.environmentIntensity = env;
  scene.background = sky ? gradient(sky) : new THREE.Color(0x05060a);
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.02, 400);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  if (ao) {
    const g = new GTAOPass(scene, camera, W, H);
    g.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.5, scale: 1, samples: 16 });
    g.blendIntensity = ao;
    // a texture background takes the override material and draws as a 2m plane at the origin
    const ro = g.renderOverride.bind(g);
    g.renderOverride = (...a) => { const bg = scene.background; scene.background = null; ro(...a); scene.background = bg; };
    composer.addPass(g);
  }
  const bokeh = dof && new BokehPass(scene, camera, { focus: dof.focus, aperture: dof.aperture ?? 0.0025, maxblur: dof.max ?? 0.008 });
  if (bokeh) composer.addPass(bokeh);
  const bloomPass = bloom && new UnrealBloomPass(new THREE.Vector2(W, H), bloom, 0.55, 1.05);
  if (bloomPass) composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(Grade);
  composer.addPass(grade);
  const rimL = new THREE.DirectionalLight(rimColor, rim);
  scene.add(rimL, rimL.target);
  const st = { scene, camera, bokeh, bloomPass, exposure, grade, shake, t: 0 };
  const tgt = new THREE.Vector3();
  st.look = (pos, target, f) => {
    camera.position.set(...pos); camera.lookAt(...target); tgt.set(...target);
    if (f) { camera.fov = f; camera.updateProjectionMatrix(); }
    const back = tgt.clone().sub(camera.position).setY(0).normalize();
    rimL.position.copy(tgt).addScaledVector(back, 4).add(new THREE.Vector3(0, 3, 0));
    rimL.target.position.copy(tgt);
  };
  st.focus = (d) => { if (bokeh) bokeh.uniforms.focus.value = d; };
  st.render = () => {
    renderer.toneMappingExposure = st.exposure;
    grade.uniforms.seed.value = (st.t * 30) % 97;
    const q = camera.quaternion.clone(), t = st.t, a = 0.0035 * st.shake;
    camera.rotateX((Math.sin(t * 1.3) + Math.sin(t * 2.9 + 1) * 0.5) * a);
    camera.rotateY((Math.sin(t * 0.9 + 2) + Math.sin(t * 2.3) * 0.4) * a);
    composer.render();
    camera.quaternion.copy(q);
  };
  st.dispose = () => {
    scene.traverse((o) => { o.geometry?.dispose(); [o.material].flat().forEach((m) => { if (!m) return; Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose(); }); });
    composer.passes.forEach((p) => p.dispose?.());
    composer.renderTarget1.dispose(); composer.renderTarget2.dispose();
  };
  return st;
}

export function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.redraw = (fn) => { fn(g, w, h); t.needsUpdate = true; };
  t.canvas = c;
  return t;
}
export const gradient = (stops) => tex(4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([p, c]) => gr.addColorStop(p, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

export const G = {
  box: (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)),
  sph: (r, ws = 32, hs = 22) => new THREE.SphereGeometry(r, ws, hs),
  cyl: (rt, rb, h, s = 32) => new THREE.CylinderGeometry(rt, rb, h, s),
  cap: (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
  lathe: (pts, s = 40) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s),
};
export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
export const glow = (color, k = 1, o = {}) => { const m = new THREE.MeshBasicMaterial({ color, ...o }); m.color.multiplyScalar(k); return m; };
export function add(parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  Array.isArray(scale) ? m.scale.set(...scale) : m.scale.setScalar(scale);
  m.castShadow = m.receiveShadow = !material.transparent;
  parent.add(m);
  return m;
}
export function group(parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...pos); g.rotation.set(...rot);
  parent.add(g);
  return g;
}
const place = (g, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) => g.applyMatrix4(new THREE.Matrix4().compose(
  new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s]))));

export function sun(scene, { dir = [5, 8, 4], color = 0xfff1dd, i = 2.6, target = [0, 1, 0], span = 4, sky = 0xbfd8ff, ground = 0x8a7a66, hemi = 0.7 } = {}) {
  const d = new THREE.DirectionalLight(color, i);
  d.position.set(target[0] + dir[0], target[1] + dir[1], target[2] + dir[2]);
  d.target.position.set(...target);
  d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  Object.assign(d.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 0.1, far: 80 });
  d.shadow.bias = -0.0003; d.shadow.normalBias = 0.02; d.shadow.radius = 5;
  scene.add(d, d.target);
  if (hemi) scene.add(new THREE.HemisphereLight(sky, ground, hemi));
  return d;
}
export function point(scene, pos, color, i, dist = 0, shadow = false) {
  const l = new THREE.PointLight(color, i, dist, 2);
  l.position.set(...pos);
  if (shadow) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.002; l.shadow.radius = 6; }
  scene.add(l);
  return l;
}

// ---------- characters ----------

export function person(o) {
  const f = !!o.female, R = rng(o.seed ?? 1);
  const skin = new THREE.MeshPhysicalMaterial({ color: o.skin, roughness: 0.52, sheen: 0.5, sheenRoughness: 0.55, sheenColor: new THREE.Color(o.skin).offsetHSL(0, 0.25, 0.12), emissive: new THREE.Color(o.skin).multiply(new THREE.Color(0xff5030)), emissiveIntensity: 0.012 });
  const curls = o.style === 'afro' || o.style === 'curly';
  const hairM = mat(o.hair, { roughness: curls ? 0.62 : 0.42 });
  const topM = o.topMat ?? mat(o.top, { roughness: 0.85 });
  const botM = o.botMat ?? mat(o.bottom ?? o.top, { roughness: 0.85 });
  const root = new THREE.Group();
  if (f) root.scale.setScalar(0.94);
  const hips = group(root, [0, 0.92, 0]);
  const j = { root, hips, mats: { skin, topM, botM, hairM } };

  add(hips, G.sph(1), o.dress ? skin : botM, [0, 0, 0], undefined, [f ? 0.145 : 0.15, 0.11, 0.11]);
  for (const side of [1, -1]) {
    const hip = group(hips, [side * (f ? 0.08 : 0.085), -0.02, 0]);
    add(hip, G.cap(f ? 0.064 : 0.07, 0.45), o.dress ? skin : botM, [0, -0.225, 0]);
    const knee = group(hip, [0, -0.45, 0]);
    add(knee, G.cap(f ? 0.05 : 0.058, 0.42), o.dress ? skin : botM, [0, -0.21, 0]);
    const ankle = group(knee, [0, -0.42, 0]);
    add(ankle, G.box(0.1, 0.075, 0.24, 0.035), mat(o.shoe ?? 0xf4f4f4, { roughness: 0.55 }), [0, -0.012, 0.045]);
    add(ankle, G.box(0.106, 0.025, 0.25, 0.012), mat(o.sole ?? 0xffffff, { roughness: 0.6 }), [0, -0.04, 0.045]);
    j[side > 0 ? 'legL' : 'legR'] = { hip, knee, ankle };
  }
  if (o.dress) {
    const sk = add(hips, G.lathe([[0, -0.5], [0.27, -0.5], [0.265, -0.47], [0.2, -0.22], [0.155, 0], [0.145, 0.12], [0, 0.12]]), o.dress, [0, 0, 0], undefined, [1, 1, 0.8]);
    sk.material.side = THREE.DoubleSide;
    j.skirt = sk;
  }

  const spine = group(hips, [0, 0.03, 0]);
  j.spine = spine;
  const sw = f ? 0.17 : 0.2;
  const prof = f
    ? [[0, -0.02], [0.14, -0.01], [0.135, 0.1], [0.123, 0.19], [0.138, 0.3], [0.15, 0.38], [0.142, 0.44], [0.095, 0.5], [0.05, 0.52], [0, 0.52]]
    : [[0, -0.02], [0.152, -0.01], [0.154, 0.1], [0.152, 0.2], [0.167, 0.32], [0.18, 0.41], [0.162, 0.47], [0.09, 0.52], [0.05, 0.53], [0, 0.53]];
  add(spine, G.lathe(prof), topM, [0, 0, 0], undefined, [1, 1, 0.66]);
  if (o.strip) add(spine, G.box(0.075, 0.36, 0.02, 0.008), o.strip, [0, 0.2, f ? 0.088 : 0.095]);
  if (o.collar) for (const side of [1, -1]) add(spine, G.box(0.075, 0.012, 0.06, 0.005), topM, [side * 0.045, 0.5, 0.05], [0.3, side * 0.5, side * 0.35]);

  const neck = group(spine, [0, 0.5, 0]);
  add(neck, G.cyl(0.052, 0.06, 0.12), skin, [0, 0.03, 0]);
  const head = group(neck, [0, 0.075, 0]);
  j.head = head;
  const sk = group(head, [0, 0.14, 0.01]);
  j.skull = sk;

  const ells = [[0, 0, 0, 0.141, 0.15, 0.144], [0, -0.045, 0.012, f ? 0.104 : 0.115, 0.11, 0.119]];
  const K = 0.008, smax = (a, b) => Math.max(a, b) + Math.max(K - Math.abs(a - b), 0) ** 2 / (4 * K);
  const headG = new THREE.SphereGeometry(1, 72, 54), hv = headG.attributes.position, d = new THREE.Vector3();
  for (let i = 0; i < hv.count; i++) {
    d.fromBufferAttribute(hv, i).normalize();
    const [r1, r2] = ells.map(([x, y, z, a, b, c]) => {
      const px = -x / a, py = -y / b, pz = -z / c, qx = d.x / a, qy = d.y / b, qz = d.z / c;
      const qq = qx * qx + qy * qy + qz * qz, pq = px * qx + py * qy + pz * qz, pp = px * px + py * py + pz * pz;
      return (-pq + Math.sqrt(pq * pq - qq * (pp - 1))) / qq;
    });
    hv.setXYZ(i, ...d.multiplyScalar(smax(r1, r2)).toArray());
  }
  headG.computeVertexNormals();
  add(sk, headG, skin).castShadow = false;
  const surfN = (x, y) => {
    const hit = ells.map(([cx, cy, cz, a, b, c]) => {
      const q = 1 - ((x - cx) / a) ** 2 - ((y - cy) / b) ** 2;
      if (q <= 0) return null;
      const z = cz + c * Math.sqrt(q);
      return { z, n: new THREE.Vector3((x - cx) / a / a, (y - cy) / b / b, (z - cz) / c / c).normalize() };
    });
    const [A, B] = hit;
    if (!A || !B) return A ?? B ?? { z: -1 };
    const w = clamp(0.5 + (A.z - B.z) / (2 * K));
    return { z: smax(A.z, B.z), n: B.n.clone().lerp(A.n, w).normalize() };
  };
  const surf = (x, y) => surfN(x, y).z;

  // eyes
  const eyeR = 0.038;
  const white = mat(0xfbfbf8, { roughness: 0.18 });
  const irisM = mat(o.eyes, { roughness: 0.2, emissive: o.eyes, emissiveIntensity: 0.25 });
  const black = mat(0x080808, { roughness: 0.15 });
  const lashM = mat(0x17100c, { roughness: 0.6 });
  const browM = mat(o.brow ?? o.hair, { roughness: 0.6 });
  const eyes = [];
  for (const side of [1, -1]) {
    const ex = side * 0.056, ey = 0.006;
    const at = group(sk, [ex, ey, surf(ex, ey) - eyeR + 0.012]);
    const ball = group(at);
    add(ball, G.sph(eyeR, 32, 24), white);
    add(ball, new THREE.SphereGeometry(eyeR * 1.004, 32, 8, 0, Math.PI * 2, 0, 0.62), irisM, [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(ball, new THREE.SphereGeometry(eyeR * 1.008, 32, 6, 0, Math.PI * 2, 0, 0.3), black, [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(ball, G.sph(0.0058, 12, 8), glow(0xffffff, 1.4), [-0.009, 0.011, eyeR * 0.97]);
    const lid = add(at, new THREE.SphereGeometry(eyeR * 1.09, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin);
    add(lid, new THREE.TorusGeometry(eyeR * 1.09, f ? 0.0045 : 0.0032, 8, 40, Math.PI), lashM, [0, 0, 0], [Math.PI / 2, 0, 0]);
    if (f) add(lid, G.cap(0.0028, 0.012), lashM, [side * eyeR * 1.02, 0.002, eyeR * 0.35], [0, 0, side * -1.1]);
    const low = add(at, new THREE.SphereGeometry(eyeR * 1.025, 32, 8, 0, Math.PI * 2, Math.PI * 0.8, Math.PI * 0.2), skin);
    const by = 0.071, bx = side * 0.058;
    const brow = add(sk, G.cap(0.0085, 0.042), browM, [bx, by, surf(bx, by) + 0.002], [0, side * 0.35, Math.PI / 2]);
    at.traverse((m) => (m.castShadow = false)); brow.castShadow = false;
    eyes.push({ side, ball, lid, low, brow, by });
  }
  add(sk, G.sph(0.021), skin, [0, -0.03, surf(0, -0.03) - 0.005], undefined, [1, 0.85, 1.05]);
  for (const side of [1, -1]) add(sk, G.sph(0.034), skin, [side * 0.137, -0.012, -0.01], undefined, [0.42, 1, 0.72]);

  // mouth, rebuilt from open/smile/width
  const MY = -0.08;
  const mouthM = mat(0x4f1c1f, { roughness: 0.5 }), teethM = mat(0xf6f4ee, { roughness: 0.3 }), tongueM = mat(0xc06464, { roughness: 0.5 });
  const lipM = mat(new THREE.Color(o.skin).multiplyScalar(0.82), { roughness: 0.45 });
  const parts = [new THREE.Mesh(new THREE.BufferGeometry(), lipM), new THREE.Mesh(new THREE.BufferGeometry(), mouthM), new THREE.Mesh(new THREE.BufferGeometry(), teethM), new THREE.Mesh(new THREE.BufferGeometry(), tongueM)];
  parts.forEach((p) => sk.add(p));
  const project = (pts, dz) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ShapeGeometry(shape);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, surf(p.getX(i), p.getY(i)) + dz);
    g.computeVertexNormals();
    return g;
  };
  // narrow quads follow the curved face; a ShapeGeometry's long chords let the layers cross
  const strip = (top, bot, dz) => {
    const P = [], I = [];
    top.forEach(([x, y], i) => {
      P.push(x, y, surf(x, y) + dz, bot[i][0], bot[i][1], surf(bot[i][0], bot[i][1]) + dz);
      if (i) { const a = 2 * i - 2; I.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setIndex(I); g.computeVertexNormals();
    return g;
  };
  let mkey = '';
  function setMouth(open, smile, width) {
    const k = `${open.toFixed(4)},${smile.toFixed(3)},${width.toFixed(3)}`;
    if (k === mkey) return;
    mkey = k;
    const hw = 0.03 * width, cy = smile * 0.012, N = 18, up = [], lo = [];
    for (let i = 0; i <= N; i++) {
      const u = -1 + (2 * i) / N, x = u * hw, b = 1 - u * u;
      up.push([x, MY + cy * u * u + b * (open * 0.25 + Math.max(0, -smile) * 0.004)]);
      lo.push([x, MY + cy * u * u - b * (open * 0.75 + 0.0032 + Math.max(0, smile) * 0.006)]);
    }
    parts.forEach((p) => p.geometry.dispose());
    parts[0].geometry = strip(up.map(([x, y]) => [x * 1.12, y + 0.0035]), lo.map(([x, y]) => [x * 1.12, y - 0.004]), 0.0014);
    parts[1].geometry = strip(up, lo, 0.0034);
    if (open > 0.004) {
      const th = Math.min(open * 0.4, 0.0075), band = up.slice(3, N - 2).map(([x, y]) => [x, y - 0.0006]);
      const bottom = band.map(([x, y], i) => [x, Math.min(y - 0.0004, Math.max(y - th, lo[i + 3][1] + 0.0008))]);
      parts[2].geometry = strip(band, bottom, 0.0046);
    } else parts[2].geometry = new THREE.BufferGeometry();
    if (open > 0.009) {
      const cyT = lo[N / 2][1] + open * 0.22, ell = [];
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; ell.push([Math.cos(a) * hw * 0.55, cyT + Math.sin(a) * open * 0.2]); }
      parts[3].geometry = project(ell, 0.0042);
    } else parts[3].geometry = new THREE.BufferGeometry();
  }

  // hair
  const hp = [];
  const blob = (r, p, s = [1, 1, 1], rot = [0, 0, 0], seg = 20) => hp.push(place(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), p, s, rot));
  const capG = (r, theta, tilt, p = [0, 0.012, -0.004], s = [0.955, 1, 0.98]) => hp.push(place(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, theta), p, s, [tilt, 0, 0]));
  const back = (r = 0.15, z = -0.03) => blob(r, [0, -0.004, z], [0.97, 1, 0.97], [0, 0, 0], 40);
  const style = o.style;
  if (style === 'swept') {
    capG(0.157, 1.05, -0.32); back();
    blob(0.1, [0, 0.112, 0.0], [1.3, 0.6, 1.35]);
    blob(0.07, [0.035, 0.128, 0.085], [1.25, 0.42, 0.75], [0.35, 0, -0.35]);
    blob(0.066, [-0.042, 0.133, 0.07], [1.2, 0.45, 0.8], [0.3, 0, 0.28]);
    blob(0.06, [0.08, 0.112, 0.06], [0.9, 0.45, 0.9], [0.2, 0, -0.6]);
    blob(0.055, [-0.092, 0.1, 0.04], [0.8, 0.5, 0.9], [0.1, 0, 0.6]);
    for (const s of [1, -1]) blob(0.03, [s * 0.13, 0.0, 0.03], [0.4, 1, 0.6]);
  } else if (style === 'curly') {
    capG(0.152, 1.12, -0.25); back(0.148, -0.025);
    for (let i = 0; i < 420; i++) {
      const a = R() * Math.PI * 2, e = Math.acos(1 - R() * 1.25);
      const d = new THREE.Vector3(Math.sin(e) * Math.sin(a), Math.cos(e), Math.sin(e) * Math.cos(a)).applyEuler(new THREE.Euler(-0.3, 0, 0));
      if (d.z > 0.55 && d.y < 0.75) continue;
      blob(0.015 + R() * 0.008, [d.x * 0.152, d.y * 0.158 + 0.012, d.z * 0.15 - 0.006], 1, [R(), R(), R()], 9);
    }
  } else if (style === 'ponytail') {
    capG(0.155, 1.3, -0.12); back(0.151, -0.028);
    for (const s of [1, -1]) blob(0.075, [s * 0.105, 0.055, 0.02], [0.55, 1, 0.95]);
    blob(0.07, [0.03, 0.135, 0.07], [1.3, 0.4, 0.8], [0.3, 0, -0.25]);
  } else if (style === 'afro') {
    capG(0.16, 1.35, -0.1); back(0.152, -0.03);
    const shell = new THREE.SphereGeometry(0.19, 64, 48), sp = shell.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < sp.count; i++) {
      v.fromBufferAttribute(sp, i);
      const n = Math.sin(v.x * 95 + v.y * 40) * Math.sin(v.y * 110 - v.z * 60) * Math.sin(v.z * 80 + v.x * 50);
      sp.setXYZ(i, ...v.multiplyScalar(1 + n * 0.09).toArray());
    }
    hp.push(place(shell, [0, 0, -0.075], [1.05, 1.05, 0.85]));
    for (let i = 0; i < 720; i++) {
      const a = R() * Math.PI * 2, y = -0.34 + R() * 0.58;
      const top = y > 0.05;
      const r = top ? Math.sqrt(Math.max(0, 0.215 ** 2 - (y - 0.03) ** 2 * 1.4)) : 0.2 + (-y + 0.05) * 0.18;
      const x = Math.sin(a) * r, z = Math.cos(a) * r * 0.9 - 0.03;
      if (Math.cos(a) > 0.2 && y < 0.115 && Math.abs(x) < 0.15) continue;
      if (Math.cos(a) > 0.6 && y < 0.115) continue;
      blob(0.026 + R() * 0.014, [x, y, z], 1, [R(), R(), R()], 10);
    }
  } else if (style === 'wavy') {
    capG(0.156, 1.2, -0.2); back();
    blob(0.15, [0, -0.15, -0.075], [1.08, 1.65, 0.55], [0, 0, 0], 32);
    for (const s of [1, -1]) {
      blob(0.06, [s * 0.128, -0.11, 0.015], [0.85, 2.3, 0.75]);
      blob(0.05, [s * 0.15, -0.02, -0.005], [0.7, 1.3, 0.7]);
      blob(0.05, [s * 0.14, -0.24, -0.01], [0.9, 1.3, 0.8]);
    }
    blob(0.072, [0.03, 0.128, 0.085], [1.35, 0.45, 0.72], [0.32, 0, -0.32]);
  }
  let beardG;
  if (o.beard) {
    const st = 0.002, nx = 132, ny = 92, x0 = -0.132, y0 = -0.18, P = [], A = [], idx = [], id = {};
    const inside = (x0, y0) => {
      const j = 0.001 * (Math.sin(x0 * 900 + y0 * 400) + Math.sin(y0 * 1300 - x0 * 500)) / 2, x = x0 + j, y = y0 + j;
      const mustache = Math.abs(x) < 0.042 && y > -0.07 && y < -0.052 + 0.01 * (1 - Math.abs(x) / 0.042);
      const chin = y < -0.098 + Math.max(0, Math.abs(x) - 0.03) * 0.5;
      const side = Math.abs(x) > 0.08 && y < -0.04 - Math.max(0, 0.115 - Math.abs(x)) * 0.6;
      return (mustache || chin || side) && surfN(x0, y0).z > 0.015;
    };
    const vert = (i, k) => {
      const key = i + ',' + k;
      if (id[key] !== undefined) return id[key];
      const x = x0 + i * st, y = y0 + k * st, s = surfN(x, y);
      let cov = 0;
      for (let a = 0; a < 12; a++) cov += inside(x + Math.cos(a * 0.5236) * 0.009, y + Math.sin(a * 0.5236) * 0.009) ? 1 / 12 : 0;
      const e = clamp((cov - 0.4) / 0.55), d = 0.0012 + e * (0.0045 + 0.0015 * Math.sin(i * 1.7 + k * 2.3));
      P.push(x + s.n.x * d, y + s.n.y * d, s.z + s.n.z * d);
      A.push(1, 1, 1, e * e * (3 - 2 * e));
      return (id[key] = P.length / 3 - 1);
    };
    for (let i = 0; i < nx; i++) for (let k = 0; k < ny; k++) {
      const x = x0 + i * st, y = y0 + k * st;
      if (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([a, b]) => inside(x + a * st, y + b * st))) continue;
      const a = vert(i, k), b = vert(i + 1, k), c = vert(i, k + 1), d = vert(i + 1, k + 1);
      idx.push(a, b, d, a, d, c);
    }
    beardG = new THREE.BufferGeometry();
    beardG.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    beardG.setAttribute('color', new THREE.Float32BufferAttribute(A, 4));
    beardG.setIndex(idx);
    beardG.computeVertexNormals();
  }
  if (hp.length) add(sk, mergeGeometries(hp), hairM);
  if (beardG) add(sk, beardG, mat(new THREE.Color(o.hair).offsetHSL(0, 0, 0.05), { roughness: 0.95, vertexColors: true, transparent: true })).renderOrder = 1;
  if (style === 'ponytail') {
    const tail = group(sk, [0, 0.11, -0.14]);
    add(tail, new THREE.TorusGeometry(0.03, 0.009, 8, 20), mat(0x222222), [0, 0, -0.005], [0.6, 0, 0]);
    const tp = [];
    [[0, 0.015, -0.04, 0.05], [0, -0.03, -0.075, 0.055], [0, -0.09, -0.09, 0.05], [0, -0.16, -0.085, 0.043], [0, -0.23, -0.07, 0.034], [0, -0.29, -0.05, 0.024]]
      .forEach(([x, y, z, r]) => tp.push(place(new THREE.SphereGeometry(r, 20, 14), [x, y, z], [1, 1.3, 1])));
    add(tail, mergeGeometries(tp), hairM);
    j.tail = tail;
  }

  // arms
  const sleeve = o.sleeve ?? 'short';
  const armM = sleeve === 'none' ? skin : topM;
  const foreM = sleeve === 'long' ? topM : skin;
  for (const side of [1, -1]) {
    const sh = group(spine, [side * (sw - 0.008), 0.43, 0]);
    add(sh, G.sph(f ? 0.05 : 0.056), armM, [0, -0.015, 0]);
    add(sh, G.cap(f ? 0.044 : 0.05, 0.26), sleeve === 'short' ? skin : armM, [0, -0.13, 0]);
    if (sleeve === 'short') add(sh, G.cyl(0.063, 0.068, 0.15, 24), topM, [0, -0.06, 0]);
    const el = group(sh, [0, -0.27, 0]);
    const fore = [add(el, G.cap(f ? 0.038 : 0.043, 0.22), foreM, [0, -0.11, 0])];
    if (sleeve === 'rolled') fore.push(add(el, G.cyl(0.056, 0.056, 0.06, 24), topM, [0, -0.02, 0]));
    if (o.watch && side > 0) fore.push(add(el, new THREE.TorusGeometry(0.042, 0.009, 8, 24), mat(0xd8dde3, { metalness: 1, roughness: 0.25 }), [0, -0.2, 0], [Math.PI / 2, 0, 0]));
    const wr = group(el, [0, -0.235, 0]);
    fore.push(add(wr, G.box(0.046, 0.088, 0.08, 0.022), skin, [0, -0.044, 0]));
    fore.push(add(wr, G.cap(0.022, 0.03), skin, [0, -0.088, 0.012], [Math.PI / 2, 0, 0], [1, 1, 1.25]));
    fore.push(add(wr, G.cap(0.0155, 0.032), skin, [-side * 0.006, -0.03, 0.047], [0.55, 0, -side * 0.25]));
    j[side > 0 ? 'armL' : 'armR'] = { sh, el, wr, fore };
  }
  const cross = group(spine, [0, 0.2, 0.135]);
  cross.visible = false;
  for (const side of [1, -1]) {
    add(cross, G.cap(f ? 0.038 : 0.044, 0.27), foreM, [0, side * 0.018, side * 0.01], [0, side * 0.12, Math.PI / 2 + side * 0.13]);
    add(cross, G.box(0.08, 0.075, 0.05, 0.02), skin, [side * 0.175, side * 0.02 + 0.01, -0.02]);
  }
  j.cross = (on) => {
    cross.visible = on;
    for (const a of [j.armL, j.armR]) a.fore.forEach((m) => (m.visible = !on));
    if (on) for (const [a, side] of [[j.armL, 1], [j.armR, -1]]) { a.sh.rotation.set(-0.42, 0, side * 0.2); a.el.rotation.set(0, 0, 0); }
  };

  // face and pose helpers
  const base = { open: 0, smile: o.smile ?? 0.25, width: 1, lid: 0, lower: 0, brow: 0, tilt: 0, lookX: 0, lookY: 0, arch: 0 };
  const blinkAt = R() * 2;
  j.face = (p = {}, t) => {
    const s = { ...base, ...p };
    let lid = s.lid;
    if (t !== undefined && !p.noBlink) { const ph = (t + blinkAt) % 2.9; lid = Math.max(lid, ph < 0.14 ? 1 - Math.abs(ph - 0.07) / 0.07 : 0); }
    setMouth(Math.max(0, s.open), s.smile, s.width);
    if (t !== undefined) j.spine.position.y = 0.03 + Math.sin(t * 2.3 + blinkAt * 3) * 0.0035;
    for (const e of eyes) {
      e.ball.rotation.set(-s.lookY, s.lookX, 0);
      e.lid.rotation.x = -0.6 + clamp(lid, -0.35, 1) * 2.15;
      e.low.rotation.x = -s.lower * 0.45;
      e.brow.position.y = e.by + s.brow + (e.side > 0 ? s.arch : 0);
      e.brow.rotation.z = Math.PI / 2 - e.side * s.tilt * 0.45;
    }
  };
  j.walk = (ph, amt = 1) => {
    for (const [l, k] of [[j.legL, 0], [j.legR, Math.PI]]) {
      const s = Math.sin(ph + k);
      l.hip.rotation.x = -s * 0.42 * amt;
      l.knee.rotation.x = Math.max(0, Math.sin(ph + k - 1.2)) * 0.75 * amt;
      l.ankle.rotation.x = 0;
    }
    j.hips.position.y = 0.92 - Math.abs(Math.cos(ph)) * 0.025 * amt;
  };
  j.swing = (ph, amt = 1) => {
    for (const [a, k, side] of [[j.armL, Math.PI, 1], [j.armR, 0, -1]]) {
      a.sh.rotation.set(-Math.sin(ph + k) * 0.35 * amt, 0, side * 0.08);
      a.el.rotation.x = -0.25 - Math.max(0, Math.sin(ph + k)) * 0.3 * amt;
    }
  };
  j.sit = (k = 1) => {
    for (const l of [j.legL, j.legR]) { l.hip.rotation.x = -1.5 * k; l.knee.rotation.x = 1.5 * k; }
    j.hips.position.y = lerp(0.92, 0.5, k);
  };
  j.rest = (side = 0.08) => {
    for (const [a, s] of [[j.armL, 1], [j.armR, -1]]) { a.sh.rotation.set(0.02, 0, s * side); a.el.rotation.set(-0.12, 0, 0); a.wr.rotation.set(0, 0, 0); }
  };
  j.rest();
  j.face({});
  return j;
}

// ---------- props ----------

export function cup() {
  const g = new THREE.Group();
  const plastic = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.05 });
  add(g, G.cyl(0.04, 0.03, 0.15, 24), mat(0xc08a55, { roughness: 0.3 }), [0, 0.066, 0], undefined, [0.94, 0.85, 0.94]);
  add(g, G.cyl(0.042, 0.032, 0.155, 24), plastic, [0, 0.077, 0]);
  add(g, new THREE.SphereGeometry(0.043, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), plastic, [0, 0.155, 0], undefined, [1, 0.45, 1]);
  add(g, G.cyl(0.0055, 0.0055, 0.13, 10), mat(0x3aa66b, { roughness: 0.4 }), [0.008, 0.2, 0], [0, 0, 0.12]);
  return g;
}

export function parcel(w, h, d, seed = 1) {
  const R = rng(seed);
  const g = new THREE.Group();
  const kraft = new THREE.Color(0xc79a63).offsetHSL((R() - 0.5) * 0.02, 0, (R() - 0.5) * 0.08);
  add(g, G.box(w, h, d, 0.012), mat(kraft, { roughness: 0.9 }), [0, h / 2, 0]);
  add(g, G.box(w + 0.004, 0.006, Math.min(0.07, d * 0.3), 0.002), mat(0xd8b884, { roughness: 0.35 }), [0, h - 0.001, 0]);
  add(g, G.box(Math.min(0.07, w * 0.3), h * 0.35, d + 0.006, 0.002), mat(0xd8b884, { roughness: 0.35 }), [0, h * 0.82, 0]);
  add(g, G.plane(w * 0.34, Math.min(h, d) * 0.3), mat(0xfafafa, { roughness: 0.8 }), [w * 0.18, h + 0.004, d * 0.2], [-Math.PI / 2, 0, 0.1]);
  return g;
}

export function tree(parent, pos, s = 1, seed = 1) {
  const R = rng(seed);
  const g = group(parent, pos);
  g.scale.setScalar(s);
  add(g, G.cyl(0.09, 0.13, 2.6, 12), mat(0x5b4232, { roughness: 0.9 }), [0, 1.3, 0]);
  const leaves = [];
  for (let i = 0; i < 14; i++) leaves.push(place(new THREE.SphereGeometry(0.55 + R() * 0.35, 14, 10), [(R() - 0.5) * 1.6, 2.8 + R() * 1.5, (R() - 0.5) * 1.6]));
  add(g, mergeGeometries(leaves), mat(new THREE.Color(0x4f8a3c).offsetHSL(0, 0, (R() - 0.5) * 0.05), { roughness: 0.85 }));
  return g;
}

function extrude(shape, depth, bevel = 0.06) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 5, curveSegments: 28 });
  g.translate(0, 0, -depth / 2);
  return g;
}
function wheel(parent, x, z, r, rim, hubs = 5) {
  const w = group(parent, [x, r, z]);
  add(w, G.cyl(r, r, 0.25, 32), mat(0x161616, { roughness: 0.85 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
  const s = Math.sign(z);
  add(w, G.cyl(r * 0.66, r * 0.66, 0.02, 32), rim, [0, 0, s * 0.125], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < hubs; i++) add(w, G.box(0.04, r * 1.2, 0.02, 0.008), rim, [0, 0, s * 0.137], [0, 0, (i / hubs) * Math.PI]);
  add(w, G.cyl(r * 0.16, r * 0.16, 0.03, 16), mat(0x333333, { metalness: 0.8, roughness: 0.3 }), [0, 0, s * 0.145], [Math.PI / 2, 0, 0]);
  return w;
}

export function sportsCar(parent) {
  const g = group(parent);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xc8ccd3, metalness: 0.85, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0d1118, metalness: 0.4, roughness: 0.05, clearcoat: 1 });
  const s = new THREE.Shape();
  s.moveTo(2.18, 0.28);
  s.lineTo(2.26, 0.46);
  s.quadraticCurveTo(2.26, 0.6, 1.95, 0.64);
  s.quadraticCurveTo(1.3, 0.72, 0.75, 0.8);
  s.lineTo(-1.6, 0.84);
  s.quadraticCurveTo(-2.1, 0.84, -2.22, 0.74);
  s.lineTo(-2.26, 0.5);
  s.lineTo(-2.15, 0.28);
  s.lineTo(-1.8, 0.28);
  s.absarc(-1.36, 0.3, 0.44, Math.PI, 0, true);
  s.lineTo(0.92, 0.28);
  s.absarc(1.36, 0.3, 0.44, Math.PI, 0, true);
  s.lineTo(2.18, 0.28);
  add(g, extrude(s, 1.7, 0.08), paint);
  const c = new THREE.Shape();
  c.moveTo(0.78, 0.78);
  c.quadraticCurveTo(0.35, 1.02, 0.0, 1.11);
  c.lineTo(-0.85, 1.12);
  c.quadraticCurveTo(-1.35, 1.05, -1.75, 0.83);
  c.lineTo(0.78, 0.78);
  add(g, extrude(c, 1.2, 0.07), glass);
  add(g, G.box(0.9, 0.03, 1.25, 0.015), paint, [-0.42, 1.18, 0]);
  const red = new THREE.MeshPhysicalMaterial({ color: 0xd2232a, metalness: 0.6, roughness: 0.3, clearcoat: 1 });
  for (const x of [1.36, -1.36]) for (const z of [0.82, -0.82]) wheel(g, x, z, 0.33, red);
  const carbon = mat(0x15171a, { roughness: 0.35, metalness: 0.3 });
  for (const z of [0.62, -0.62]) add(g, G.box(0.06, 0.28, 0.06, 0.02), carbon, [-1.95, 0.98, z]);
  add(g, G.box(0.42, 0.04, 1.75, 0.015), carbon, [-1.98, 1.13, 0], [0, 0, 0.1]);
  for (const z of [0.93, -0.93]) add(g, G.box(1.75, 0.09, 0.04, 0.015), carbon, [0, 0.36, z]);
  g.scale.set(1, 0.9, 1);
  g.userData.heads = [];
  for (const z of [0.6, -0.6]) {
    g.userData.heads.push(add(g, G.box(0.06, 0.07, 0.3, 0.02), glow(0xfff4dc, 2), [2.27, 0.52, z]));
    add(g, G.box(0.05, 0.06, 0.35, 0.02), glow(0xff2a2a, 1.3), [-2.27, 0.62, z]);
  }
  return g;
}

export function hatchback(parent, seed = 7) {
  const g = group(parent);
  const paint = mat(0xb5362b, { roughness: 0.55, metalness: 0.15 });
  const primer = mat(0x8b8f93, { roughness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ef, transparent: true, opacity: 0.22, roughness: 0.05 });
  const s = new THREE.Shape();
  s.moveTo(1.66, 0.3);
  s.lineTo(1.74, 0.55);
  s.quadraticCurveTo(1.72, 0.76, 1.4, 0.8);
  s.lineTo(0.9, 0.86);
  s.lineTo(-1.64, 0.88);
  s.lineTo(-1.7, 0.55);
  s.lineTo(-1.62, 0.3);
  s.lineTo(-1.45, 0.3);
  s.absarc(-1.08, 0.31, 0.37, Math.PI, 0, true);
  s.lineTo(0.71, 0.3);
  s.absarc(1.08, 0.31, 0.37, Math.PI, 0, true);
  s.lineTo(1.66, 0.3);
  add(g, extrude(s, 1.42, 0.07), paint);
  add(g, G.box(0.9, 0.5, 0.02, 0.02), primer, [-0.15, 0.6, 0.78]);
  add(g, G.box(1.95, 0.05, 1.5, 0.03), paint, [-0.48, 1.43, 0]);
  const pillar = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    for (const z of [0.72, -0.72]) add(g, G.box(len, 0.06, 0.06, 0.02), paint, [(x0 + x1) / 2, (y0 + y1) / 2, z], [0, 0, a]);
  };
  pillar(0.88, 0.88, 0.47, 1.42); pillar(-0.3, 0.88, -0.3, 1.42); pillar(-1.6, 0.88, -1.42, 1.42);
  add(g, G.box(0.05, 0.56, 1.42, 0.01), glass, [0.68, 1.15, 0], [0, 0, 0.9]);
  add(g, G.box(0.04, 0.54, 1.42, 0.01), glass, [-1.52, 1.15, 0], [0, 0, -0.32]);
  for (const z of [0.73, -0.73]) add(g, G.box(2.3, 0.54, 0.02, 0.01), glass, [-0.45, 1.15, z]);
  const R = rng(seed);
  for (let x = -1.35; x < 0.55; x += 0.34) for (let y = 0.9; y < 1.38; y += 0.24) for (const z of [0.38, -0.38]) {
    const p = parcel(0.3 + R() * 0.04, 0.22, 0.68, Math.floor(R() * 99));
    p.position.set(x + (R() - 0.5) * 0.04, y, z * (0.98 + R() * 0.04));
    p.rotation.set(0, (R() - 0.5) * 0.2, (R() - 0.5) * 0.15);
    g.add(p);
  }
  for (const z of [0.55, -0.55]) add(g, G.box(1.8, 0.04, 0.04, 0.01), mat(0x222222), [-0.48, 1.5, z]);
  const top = [];
  [[-1.1, 1.52, 0.1, 0.5, 0.32, 0.8], [-0.5, 1.52, -0.1, 0.55, 0.3, 0.9], [0.05, 1.52, 0.05, 0.45, 0.36, 0.7], [-0.8, 1.84, 0, 0.5, 0.28, 0.6], [-0.25, 1.82, 0.05, 0.42, 0.3, 0.62]]
    .forEach(([x, y, z, w, h, d], i) => { const p = parcel(w, h, d, 40 + i); p.position.set(x, y, z); p.rotation.y = (R() - 0.5) * 0.25; g.add(p); top.push(p); });
  g.userData.top = top;
  for (const x of [-0.9, -0.2]) add(g, new THREE.TorusGeometry(0.42, 0.012, 6, 32, Math.PI), mat(0xe0442c, { roughness: 0.6 }), [x, 1.5, 0], [0, Math.PI / 2, 0], [1.15, 1.55, 1]);
  g.rotation.z = 0.022;
  const rim = mat(0x9a9ea3, { metalness: 0.7, roughness: 0.4 });
  for (const x of [1.08, -1.08]) for (const z of [0.66, -0.66]) wheel(g, x, z, 0.3, x > 0 && z > 0 ? mat(0x2a2a2a) : rim, 4);
  for (const z of [0.5, -0.5]) {
    add(g, G.sph(0.08, 16, 12), glow(0xfff4dc, 1.6), [1.72, 0.62, z], undefined, [0.4, 1, 1]);
    add(g, G.box(0.04, 0.16, 0.12, 0.02), glow(0xff2a2a, 1.2), [-1.7, 0.7, z]);
  }
  return g;
}

export function laptop(parent, screen, { lidLogo } = {}) {
  const g = group(parent);
  const alu = mat(0xb9bcc2, { metalness: 0.8, roughness: 0.35 });
  add(g, G.box(0.34, 0.016, 0.24, 0.008), alu, [0, 0.008, 0]);
  add(g, G.box(0.3, 0.002, 0.11, 0.001), mat(0x1c1c1e, { roughness: 0.6 }), [0, 0.0165, -0.03]);
  add(g, G.box(0.11, 0.002, 0.065, 0.001), mat(0x9fa2a8, { metalness: 0.6, roughness: 0.4 }), [0, 0.0165, 0.075]);
  const lid = group(g, [0, 0.016, -0.118], [-0.28, 0, 0]);
  add(lid, G.box(0.34, 0.22, 0.008, 0.006), alu, [0, 0.11, -0.004]);
  add(lid, G.plane(0.322, 0.2), screen ? glow(0xffffff, 1.15, { map: screen }) : glow(0x101010), [0, 0.112, 0.0005]);
  if (lidLogo) add(lid, G.plane(0.07, 0.07), new THREE.MeshStandardMaterial({ map: lidLogo, transparent: true, roughness: 0.5 }), [0, 0.11, -0.0085], [0, Math.PI, 0]);
  g.userData.lid = lid;
  return g;
}

export function phone(parent, screen) {
  const g = group(parent);
  add(g, G.box(0.075, 0.156, 0.009, 0.009), mat(0x111214, { metalness: 0.5, roughness: 0.3 }));
  if (screen) add(g, G.plane(0.069, 0.15), glow(0xffffff, 1.15, { map: screen }), [0, 0, 0.0047]);
  return g;
}
