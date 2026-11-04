import * as THREE from 'three';

const WORK = [
  ['Musicon', 'certifications/MusiconImg1.jpeg', 'https://github.com/nageswararao32/Musicon'],
  ['SocialSphere', 'certifications/SocialSphere.png', 'https://github.com/nageswararao32/SocailSphere'],
  ['ShopNest Cart', 'certifications/Shopnest.jpg', 'https://github.com/nageswararao32/shopnest'],
  ['Employee Management System', 'certifications/Ems.png', 'https://github.com/nageswararao32/EmsProject1'],
  ['Quizster', 'certifications/Quiz.png', 'https://quizster.onrender.com/'],
  ['Customer Survey Form', 'certifications/Form.png', 'https://nageswararao32.github.io/CustomerSurveyForm.github.io/'],
  ['Calculator', 'certifications/Calc.png', 'https://nageswararao32.github.io/Calculator.github.io/'],
  ['Java Full Stack', 'images/hero-java.png', '#projects'],
];
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const out = t => 1 - (1 - t) ** 3;
const span = (p, a, b) => clamp((p - a) / (b - a));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const track = $('home'), stage = $('rhStage'), canvas = $('rhGl');
const L1 = $('rhL1'), L2 = $('rhL2'), CAP = $('rhCap'), RULE = $('rhRule'), GRIDCAP = $('rhGridCap'), nameEl = $('rhName');
const INTRO = [$('rhHint'), $('rhCross'), $('rhGlow')];
const NAME_INTRO = $('rhIntro'), NAME_INTRO_TOP = $('rhIntroTop');

/* ---------- renderer ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
} catch (err) {
  track.classList.add('rh-static');
  throw err;
}
renderer.setClearColor(0, 0);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const scene = new THREE.Scene();
const FOV = 35, camera = new THREE.PerspectiveCamera(FOV, 1, .1, 100);

/* ---------- ribbon path ---------- */
let path, PATH_L = 1;
const SAMPLES = 1200, pathP = [], pathT = [];
const PH0 = -1.5, PH1 = Math.PI * 2 + 1.35;
function buildPath() {
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160, ph = mix(PH0, PH1, t), cs = Math.cos(ph), u = 2 * t - 1;
    // a shallow arc close to the camera, then long runs far behind it
    const depth = cs > 0 ? 7.6 + 16.4 * cs ** .9 : 7.6 + 2.2 * cs;
    const edge = .84 + .5 * span(.14 - t, 0, .14) + .8 * span(t, .84, 1);
    pts.push(new THREE.Vector3(edge * Math.sin(ph) * depth * .561, .5 * Math.sign(u) * Math.abs(u) ** 1.4 * depth * .63, -depth));
  }
  path = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  path.arcLengthDivisions = 1500;
  PATH_L = path.getLength(); pathP.length = pathT.length = 0;
  for (let i = 0; i <= SAMPLES; i++) { const u = i / SAMPLES; pathP.push(path.getPointAt(u)); pathT.push(path.getTangentAt(u)); }
}
const at = (s, op, ot) => {
  const f = clamp(s / PATH_L) * SAMPLES, i = Math.min(SAMPLES - 1, Math.floor(f)), k = f - i;
  op.lerpVectors(pathP[i], pathP[i + 1], k); ot.lerpVectors(pathT[i], pathT[i + 1], k).normalize();
};

/* ---------- cards ---------- */
const CARD_W = 2.1, CARD_H = 1.32, GAP = .03, STEP = CARD_W + GAP, NX = 28, NY = 3;
const vs = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fs = `uniform sampler2D map;uniform vec2 cover;uniform float aspect,ready,radius;varying vec2 vUv;
void main(){
  vec2 q=(abs(vUv-.5)-.5)*vec2(aspect,1.)+radius;
  float d=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
  float px=fwidth(d),a=1.-smoothstep(-px,px,d);
  if(a<.01)discard;
  vec2 uv=vUv;if(!gl_FrontFacing)uv.x=1.-uv.x;
  vec3 c=mix(vec3(.93,.94,.98),texture2D(map,(uv-.5)*cover+.5).rgb,ready);
  float edge=smoothstep(-.012-px,-.012,d);
  gl_FragColor=vec4(mix(c,vec3(.39,.4,.95),edge*.55),a);
}`;
const loader = new THREE.TextureLoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const cards = WORK.map(([title, src, href], i) => {
  const geo = new THREE.PlaneGeometry(1, 1, NX, NY);
  const mat = new THREE.ShaderMaterial({vertexShader:vs, fragmentShader:fs, transparent:true, side:THREE.DoubleSide,
    uniforms:{map:{value:null}, cover:{value:new THREE.Vector2(1, 1)}, aspect:{value:CARD_W / CARD_H}, ready:{value:0}, radius:{value:.018}}});
  const tex = loader.load(src, t => {
    const ia = t.image.width / t.image.height, ca = CARD_W / CARD_H;
    mat.uniforms.cover.value.set(ia > ca ? ca / ia : 1, ia > ca ? 1 : ia / ca);
    mat.uniforms.ready.value = 1;
    dirty = true;
  });
  tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = maxAniso;
  mat.uniforms.map.value = tex;
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);
  return {i, title, href, geo, mat, mesh, rect:null};
});

/* ---------- layout ---------- */
const GZ = 8;
let W = 1, H = 1, asp = 1, cols = 3, rows = 2, tanH = .3153;
function resize() {
  W = innerWidth; H = innerHeight; asp = W / H;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W, H, false);
  camera.aspect = asp; camera.fov = asp < 16 / 9 ? Math.atan(.561 / asp) * 360 / Math.PI : FOV; camera.updateProjectionMatrix();
  tanH = Math.tan(camera.fov * Math.PI / 360);
  cols = asp < .9 ? 2 : 3; rows = asp < .9 ? 3 : 2;
  RULE.style.display = rows === 2 ? '' : 'none';
  // travel far enough that the longer name line fully leaves the screen
  const w1 = L1.firstElementChild.offsetWidth, w2 = L2.firstElementChild.offsetWidth;
  runEnd = Math.max(76, 50 + ((Math.max(w1, w2) / W) * 100 + 15) / 2 + 2);
  dirty = true;
}
let runEnd = 76;
let dirty = true;
addEventListener('resize', resize); resize(); buildPath();
document.fonts.ready.then(resize);
const GRID_TOP_PX = 124; // room above the grid for the navbar and the grid label
function grid(i) {
  const vh = 2 * GZ * tanH, vw = vh * asp;
  let gw = vw * (cols === 3 ? .74 : .88);
  // every grid size scales with gw, so shrink it on short windows until it clears the navbar
  const ghPerGw = ((1 - .017 * (cols - 1)) / cols / (CARD_W / CARD_H)) * rows + .017 * 1.6 * (rows - 1);
  gw = Math.min(gw, vh * Math.max(.4, 1 - 2 * GRID_TOP_PX / H) / ghPerGw);
  const gap = gw * .017;
  const cw = (gw - gap * (cols - 1)) / cols, ch = cw / (CARD_W / CARD_H), gh = ch * rows + gap * 1.6 * (rows - 1);
  const c = i % cols, r = Math.floor(i / cols);
  return {x:-gw / 2 + cw / 2 + c * (cw + gap), y:gh / 2 - ch / 2 - r * (ch + gap * 1.6), w:cw, h:ch, vw, vh, c, r};
}

/* ---------- scroll ---------- */
let target = 0, p = 0;
const readScroll = () => { target = clamp(-track.getBoundingClientRect().top / (track.offsetHeight - innerHeight)); };
addEventListener('scroll', readScroll, {passive:true}); readScroll();
let onScreen = true;
new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; }).observe(track);

/* ---------- pose ---------- */
const op = new THREE.Vector3(), ot = new THREE.Vector3(), up = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), vp = new THREE.Vector3();
function poseRibbon(c, head) {
  const pos = c.geo.attributes.position, centre = head - c.i * STEP;
  for (let iy = 0; iy <= NY; iy++) for (let ix = 0; ix <= NX; ix++) {
    const k = iy * (NX + 1) + ix, lu = ix / NX - .5, lv = .5 - iy / NY;
    at(centre + lu * CARD_W, op, ot);
    // keep the sheet upright: world Y made perpendicular to the tangent
    up.copy(Y).addScaledVector(ot, -Y.dot(ot)).normalize();
    vp.copy(op).addScaledVector(up, lv * CARD_H);
    pos.setXYZ(k, vp.x, vp.y, vp.z);
  }
  pos.needsUpdate = true;
}
function poseGrid(c, q) {
  const g = grid(c.i), pos = c.geo.attributes.position;
  const dx = (g.c - (cols - 1) / 2) * 1.2, dy = g.r < rows / 2 ? 1 : -1;
  const ox = dx * g.vw * .62 * (1 - q), oy = dy * g.vh * (g.c === 1 ? .95 : .34) * (1 - q), tilt = (1 - q) * .22 * (g.c - 1 || .5) * dy;
  const cs = Math.cos(tilt), sn = Math.sin(tilt);
  for (let iy = 0; iy <= NY; iy++) for (let ix = 0; ix <= NX; ix++) {
    const k = iy * (NX + 1) + ix, x = (ix / NX - .5) * g.w, y = (.5 - iy / NY) * g.h;
    pos.setXYZ(k, g.x + ox + x * cs - y * sn, g.y + oy + x * sn + y * cs, -GZ - (1 - q) * .6 * Math.sin(ix / NX * Math.PI));
  }
  pos.needsUpdate = true;
  c.rect = g;
}

const RIB_A = .14, RIB_B = .63;
function render() {
  const pp = p;
  // the two name lines glide past each other in opposite directions
  const rise = 1 - out(span(pp, 0, .12));
  const run = mix(-50, runEnd, span(pp, 0, .58));
  L1.style.transform = `translate3d(${run}vw,${rise * 34}vh,0)`;
  L2.style.transform = `translate3d(${-run}vw,${rise * 34}vh,0)`;
  // first screen shows the full name; the moving lines fade in as soon as scrolling starts
  const introOut = span(pp, 0, .03), linesIn = span(pp, .028, .055);
  NAME_INTRO.style.opacity = NAME_INTRO_TOP.style.opacity = 1 - introOut;
  NAME_INTRO.style.transform = `translateY(${-introOut * 28}px)`;
  NAME_INTRO.style.visibility = NAME_INTRO_TOP.style.visibility = introOut < 1 ? 'visible' : 'hidden';
  L1.style.opacity = L2.style.opacity = linesIn;
  // the caption steps aside while the two name lines cross the centre
  CAP.style.opacity = linesIn * (1 - span(pp, .1, .15) + span(pp, .3, .36)) * (1 - span(pp, .52, .57));
  CAP.style.transform = `translate(-50%,calc(-50% + ${rise * 34}vh))`;
  const intro = 1 - span(pp, 0, .05);
  for (const el of INTRO) el.style.opacity = intro;
  RULE.style.transform = `scaleX(${ease(span(pp, .72, .86))})`;
  const capIn = span(pp, .8, .9);
  GRIDCAP.style.opacity = capIn;
  if (capIn > 0) {
    // sit the label just above the top row of the landed grid
    const g0 = grid(0), topPx = H / 2 - ((g0.y + g0.h / 2) / (g0.vh / 2)) * (H / 2);
    GRIDCAP.style.top = Math.max(72, topPx - 40) + 'px';
  }
  // ribbon, then the grid
  const pr = span(pp, RIB_A, RIB_B), head = mix(0, PATH_L + cards.length * STEP, pr);
  for (const c of cards) {
    const s = head - c.i * STEP, end = PATH_L - CARD_W;
    if (s < end) {
      c.mesh.visible = s > CARD_W; c.rect = null;
      if (c.mesh.visible) poseRibbon(c, head);
    } else if (c.i < cols * rows) {
      // each card flies to its slot the moment it leaves the rail
      const st = mix(RIB_A, RIB_B, (end + c.i * STEP) / (PATH_L + cards.length * STEP)), q = out(span(pp, st, st + .13));
      c.mesh.visible = q > .001;
      if (c.mesh.visible) poseGrid(c, q);
    } else { c.mesh.visible = false; c.rect = null; }
  }
  renderer.render(scene, camera);
}

/* ---------- hover & click on the landed grid ---------- */
let hovered = null;
stage.addEventListener('pointermove', e => {
  let hit = null;
  if (p > .86) {
    const nx = (e.clientX / W - .5), ny = (.5 - e.clientY / H);
    for (const c of cards) { const g = c.rect; if (!g) continue; const x = nx * g.vw, y = ny * g.vh; if (Math.abs(x - g.x) < g.w / 2 && Math.abs(y - g.y) < g.h / 2) hit = c; }
  }
  hovered = hit;
  stage.classList.toggle('pointer', !!hit);
  nameEl.style.opacity = hit ? 1 : 0;
  if (hit) { nameEl.textContent = hit.title; nameEl.style.transform = `translate(${e.clientX + 14}px,${e.clientY + 16}px)`; }
});
stage.addEventListener('pointerleave', () => { hovered = null; nameEl.style.opacity = 0; stage.classList.remove('pointer'); });
stage.addEventListener('click', e => {
  if (!hovered || e.target.closest('a')) return;
  if (hovered.href.startsWith('#')) document.querySelector(hovered.href).scrollIntoView({behavior:'smooth'});
  else window.open(hovered.href, '_blank', 'noopener');
});

/* ---------- loop ---------- */
let lastP = -1;
function loop() {
  p = reduceMotion ? target : p + (target - p) * .09;
  if (Math.abs(target - p) < .00005) p = target;
  if (onScreen && (p !== lastP || dirty)) { render(); lastP = p; dirty = false; }
  requestAnimationFrame(loop);
}
loop();
