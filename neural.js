import * as THREE from './assets/vendor/three.module.js';

// Original procedural artwork: woven signal ribbons and their surface topology.
const stage = document.getElementById('neural-stage');
const status = document.getElementById('neural-status');
const root = document.documentElement;
const introPlayer = document.querySelector('.intro-player');
const modeButtons = [...document.querySelectorAll('button[data-neural-mode], [role="button"][data-neural-mode]')];
const resetButton = document.getElementById('neural-reset');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pointer = new THREE.Vector2();
const segments = window.innerWidth < 640 ? 96 : 144;
const filaments = [];
const pulseData = [];
let renderer, scene, camera, sculpture, orbitalTracks, environmentTarget;
let frameId = 0;
let lastRendered = 0;
let motionEpoch = performance.now();
let inView = true;
let failed = false;
let mode = 'structure';

function animationsEnabled() {
  return !reducedMotion.matches && !root.classList.contains('motion-paused');
}
function introActive() {
  return root.classList.contains('is-speaking') || Boolean(introPlayer?.classList.contains('is-speaking'));
}
function setMode(next) {
  mode = next === 'signal' ? 'signal' : 'structure';
  if (stage) stage.dataset.neuralMode = mode;
  modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.neuralMode === mode)));
  requestFrame();
}
modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.neuralMode)));
resetButton?.addEventListener('click', () => {
  pointer.set(0, 0);
  motionEpoch = performance.now();
  if (sculpture) sculpture.rotation.set(0.14, -0.14, -0.055);
  setMode('structure');
});
setMode('structure');

function showPoster() {
  if (!stage || failed) return;
  failed = true;
  cancelAnimationFrame(frameId);
  frameId = 0;
  try { environmentTarget?.dispose(); renderer?.dispose(); } catch (_) {}
  const image = document.createElement('img');
  image.src = './assets/neural-poster.png';
  image.alt = 'Interwoven metallic neural ribbons with luminous mint and cyan connections.';
  image.className = 'neural-poster';
  image.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain';
  image.addEventListener('error', () => {
    const message = document.createElement('p');
    message.className = 'neural-preview-unavailable';
    message.textContent = 'Neural structure preview';
    message.style.cssText = 'color:#a5bdba;font-size:14px;text-align:center;padding:40px';
    stage.replaceChildren(message);
  }, { once: true });
  stage.replaceChildren(image);
  stage.dataset.neuralRenderer = 'poster';
  modeButtons.forEach(button => { if (button.tagName === 'BUTTON') button.disabled = true; });
  if (resetButton) resetButton.disabled = true;
  if (status) status.textContent = 'Neural structure';
}

function createStudioEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#121b20';
  context.fillRect(0, 0, 512, 256);
  const panels = [
    { x: 108, y: 67, radius: 108, color: 'rgba(245,255,244,1)' },
    { x: 357, y: 82, radius: 93, color: 'rgba(184,232,233,.95)' },
    { x: 465, y: 143, radius: 52, color: 'rgba(160,238,195,.7)' }
  ];
  panels.forEach(panel => {
    const gradient = context.createRadialGradient(panel.x, panel.y, 0, panel.x, panel.y, panel.radius);
    gradient.addColorStop(0, panel.color);
    gradient.addColorStop(0.44, panel.color);
    gradient.addColorStop(1, 'rgba(18,27,32,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 256);
  });
  context.fillStyle = 'rgba(236,255,248,.7)';
  context.fillRect(212, 29, 12, 120);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer);
  environmentTarget = generator.fromEquirectangular(texture);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 1.15;
  texture.dispose();
  generator.dispose();
}

function sampleRibbon(data, t, u, lift = 0) {
  const parameter = THREE.MathUtils.euclideanModulo(t, 1);
  const index = parameter * data.segments;
  const low = Math.floor(index);
  const high = (low + 1) % data.segments;
  const blend = index - low;
  const center = data.curve.getPointAt(parameter);
  const normal = data.frames.normals[low].clone().lerp(data.frames.normals[high], blend).normalize();
  const binormal = data.frames.binormals[low].clone().lerp(data.frames.binormals[high], blend).normalize();
  const tangent = data.frames.tangents[low].clone().lerp(data.frames.tangents[high], blend).normalize();
  const twist = parameter * Math.PI * 4 * data.direction + data.phase;
  const across = normal.multiplyScalar(Math.cos(twist)).add(binormal.multiplyScalar(Math.sin(twist))).normalize();
  const surfaceNormal = tangent.cross(across).normalize();
  const width = data.width * (1 + Math.sin(parameter * Math.PI * 4) * 0.10);
  return center.addScaledVector(across, u * width).addScaledVector(surfaceNormal, 0.044 * (1 - u * u) + lift);
}

function makeFilament(group, points, color) {
  const path = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86 });
  group.add(new THREE.Mesh(new THREE.TubeGeometry(path, segments, 0.010, 6, true), material));
  filaments.push(material);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(path, segments, 0.036, 5, true), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.042, blending: THREE.AdditiveBlending, depthWrite: false
  })));
}

function createRibbon(options, materials) {
  const group = new THREE.Group();
  group.position.copy(options.position);
  group.rotation.set(...options.rotation);
  sculpture.add(group);
  const centerPoints = [];
  for (let i = 0; i < 96; i += 1) {
    const angle = i / 96 * Math.PI * 2;
    centerPoints.push(new THREE.Vector3(Math.cos(angle) * options.radiusX, Math.sin(angle) * options.radiusY, Math.sin(angle * 2 + options.phase) * options.depth));
  }
  const curve = new THREE.CatmullRomCurve3(centerPoints, true, 'centripetal', 0.5);
  const data = { ...options, group, curve, segments, frames: curve.computeFrenetFrames(segments, true) };
  const acrossSegments = 8;
  const positions = [];
  const materialIndices = [[], [], []];
  for (let i = 0; i <= segments; i += 1) {
    for (let j = 0; j <= acrossSegments; j += 1) {
      const point = sampleRibbon(data, i / segments, j / acrossSegments * 2 - 1);
      positions.push(point.x, point.y, point.z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < acrossSegments; j += 1) {
      const a = i * (acrossSegments + 1) + j;
      const b = a + acrossSegments + 1;
      const materialIndex = j === 0 || j === acrossSegments - 1 ? 1 : i % 24 > 19 ? 2 : 0;
      materialIndices[materialIndex].push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // Three batches preserve the alternating metal panels without per-panel draw calls.
  const indices = [];
  materialIndices.forEach((batch, materialIndex) => {
    geometry.addGroup(indices.length, batch.length, materialIndex);
    indices.push(...batch);
  });
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  group.add(new THREE.Mesh(geometry, materials));
  const lanes = [-1, -0.5, 0, 0.5, 1];
  const latticePositions = [];
  const nodePositions = [];
  lanes.forEach((lane, laneIndex) => {
    const points = [];
    for (let i = 0; i < segments; i += 1) {
      points.push(sampleRibbon(data, i / segments, lane, 0.017));
      if (i % 4 === 0) nodePositions.push(points[points.length - 1]);
    }
    if (laneIndex === 0 || laneIndex === lanes.length - 1) makeFilament(group, points, options.color);
    else group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#b9e6dc', transparent: true, opacity: 0.22, depthWrite: false })));
  });
  for (let i = 0; i < segments; i += 4) {
    for (let j = 0; j < lanes.length - 1; j += 1) {
      const a = sampleRibbon(data, i / segments, lanes[j], 0.018);
      const b = sampleRibbon(data, i / segments, lanes[j + 1], 0.018);
      latticePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const lattice = new THREE.BufferGeometry();
  lattice.setAttribute('position', new THREE.Float32BufferAttribute(latticePositions, 3));
  group.add(new THREE.LineSegments(lattice, new THREE.LineBasicMaterial({ color: options.color, transparent: true, opacity: 0.34 })));
  const nodeMaterial = new THREE.MeshPhysicalMaterial({ color: '#eef7ed', roughness: 0.22, metalness: 0.45, clearcoat: 0.8, emissive: options.color, emissiveIntensity: 0.13 });
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 10, 7), nodeMaterial, nodePositions.length);
  const matrix = new THREE.Matrix4();
  nodePositions.forEach((position, index) => { matrix.makeTranslation(position.x, position.y, position.z); nodes.setMatrixAt(index, matrix); });
  nodes.instanceMatrix.needsUpdate = true;
  group.add(nodes);
  for (let i = 0; i < 3; i += 1) {
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 10), new THREE.MeshBasicMaterial({ color: '#f1ffe2' }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.080, 12, 8), new THREE.MeshBasicMaterial({ color: options.color, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(pulse, halo);
    pulseData.push({ ribbon: data, pulse, halo, offset: i / 3 + options.phase * 0.1, side: i % 2 ? -0.97 : 0.97 });
  }
}

function createNeuralStructure() {
  sculpture = new THREE.Group();
  sculpture.rotation.set(0.14, -0.14, -0.055);
  scene.add(sculpture);
  const metal = new THREE.MeshPhysicalMaterial({ color: '#c5d3d1', metalness: 0.9, roughness: 0.23, clearcoat: 0.85, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  const graphite = new THREE.MeshPhysicalMaterial({ color: '#23393e', metalness: 0.82, roughness: 0.31, clearcoat: 0.6, side: THREE.DoubleSide });
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#edf3e8', metalness: 0.2, roughness: 0.30, clearcoat: 0.5, side: THREE.DoubleSide });
  const materials = [metal, graphite, ceramic];
  createRibbon({ radiusX: 1.52, radiusY: 1.15, depth: 0.26, width: 0.26, direction: 1, phase: 0.38, color: '#c2ff79', position: new THREE.Vector3(-0.16, -0.02, 0.04), rotation: [0.24, 0.22, -0.42] }, materials);
  createRibbon({ radiusX: 1.35, radiusY: 1.06, depth: 0.23, width: 0.24, direction: -1, phase: 1.05, color: '#79dcce', position: new THREE.Vector3(0.34, 0.10, -0.05), rotation: [-0.16, 1.15, 0.53] }, materials);
  orbitalTracks = new THREE.Group();
  sculpture.add(orbitalTracks);
  for (let track = 0; track < 2; track += 1) {
    const points = [];
    for (let i = 0; i <= 128; i += 1) {
      const angle = -0.35 + i / 128 * Math.PI * (track ? 1.25 : 1.65);
      const radius = track ? 1.97 : 2.08;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.76, Math.sin(angle) * (track ? -0.68 : 0.72)));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: track ? '#7ea9b4' : '#b1d4c5', transparent: true, opacity: 0.16, depthWrite: false }));
    line.rotation.z = track ? -0.42 : 0.24;
    orbitalTracks.add(line);
    const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints(points.filter((_, index) => index % 8 === 0)), new THREE.PointsMaterial({ color: '#b0d6cf', size: 0.025, transparent: true, opacity: 0.6, depthWrite: false }));
    dots.rotation.copy(line.rotation);
    orbitalTracks.add(dots);
  }
}

function resizeScene() {
  if (!renderer || !stage || failed) return;
  const width = Math.max(stage.clientWidth, 1);
  const height = Math.max(stage.clientHeight, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 640 ? 1.5 : 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  const minimumHorizontalSpan = 4.24;
  const fitDistance = minimumHorizontalSpan / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  camera.position.z = Math.max(6.1, fitDistance);
  camera.updateProjectionMatrix();
  lastRendered = 0;
  requestFrame();
}

function renderFrame(now) {
  frameId = 0;
  if (!renderer || failed || document.hidden || !inView) return;
  const animated = animationsEnabled();
  const interval = 1000 / 30;
  const elapsed = now - lastRendered;
  if (animated && elapsed < interval - 0.2) { frameId = requestAnimationFrame(renderFrame); return; }
  lastRendered = animated ? now - (elapsed % interval) : now;
  const time = animated ? (now - motionEpoch) / 1000 : 0;
  const activeSignal = mode === 'signal' || introActive();
  if (animated) {
    sculpture.rotation.x = THREE.MathUtils.lerp(sculpture.rotation.x, 0.14 + pointer.y * 0.09 + Math.sin(time * 0.21) * 0.025, 0.08);
    sculpture.rotation.y = THREE.MathUtils.lerp(sculpture.rotation.y, -0.14 + pointer.x * 0.17 + Math.sin(time * 0.17) * 0.11, 0.08);
    sculpture.rotation.z = -0.055 + Math.sin(time * 0.19) * 0.018;
    sculpture.position.y = Math.sin(time * 0.75) * 0.035;
    orbitalTracks.rotation.y = Math.sin(time * 0.12) * 0.1;
  } else {
    sculpture.rotation.set(0.14, -0.14, -0.055);
    sculpture.position.y = 0;
    orbitalTracks.rotation.y = 0;
  }
  filaments.forEach(material => { material.opacity = activeSignal ? 0.86 + (animated ? Math.sin(time * 2.2) * 0.1 : 0) : 0.65; });
  pulseData.forEach((data, index) => {
    const parameter = data.offset + (activeSignal ? time * 0.10 : time * 0.026) * data.ribbon.direction;
    const position = sampleRibbon(data.ribbon, parameter, data.side, 0.035);
    data.pulse.position.copy(position);
    data.halo.position.copy(position);
    data.pulse.visible = activeSignal || index % 3 === 0;
    data.halo.visible = data.pulse.visible;
  });
  try { renderer.render(scene, camera); } catch (_) { showPoster(); return; }
  if (animated) frameId = requestAnimationFrame(renderFrame);
}

function requestFrame() {
  if (!renderer || failed || document.hidden || !inView || frameId) return;
  frameId = requestAnimationFrame(renderFrame);
}

function initializeScene() {
  if (!stage) return;
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', 'Interactive three-dimensional neural structure with interwoven metallic ribbons and luminous connections.');
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); showPoster(); });
    stage.replaceChildren(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 0.12, 6.1);
    camera.lookAt(0, 0.05, 0);
    scene.add(new THREE.HemisphereLight('#dff5ee', '#112330', 1.7));
    const key = new THREE.DirectionalLight('#f3ffee', 3.4);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#c2ff79', 2.8);
    rim.position.set(1, 3, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight('#79dcce', 2.0);
    fill.position.set(4, -1, 2);
    scene.add(fill);
    try { createStudioEnvironment(); } catch (_) {}
    createNeuralStructure();
    stage.dataset.neuralRenderer = 'webgl';
    if (status) status.textContent = 'Interactive 3D';
    resizeScene();
    if ('ResizeObserver' in window) new ResizeObserver(resizeScene).observe(stage);
    else window.addEventListener('resize', resizeScene, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      inView = entries[0]?.isIntersecting ?? true;
      if (inView) { lastRendered = 0; requestFrame(); }
      else { cancelAnimationFrame(frameId); frameId = 0; }
    }, { threshold: 0.02 }).observe(stage);
    stage.addEventListener('pointermove', event => {
      if (!animationsEnabled()) return;
      const bounds = stage.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
      pointer.y = THREE.MathUtils.clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
      requestFrame();
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { pointer.set(0, 0); });
  } catch (_) { showPoster(); }
}

initializeScene();
new MutationObserver(requestFrame).observe(root, { attributes: true, attributeFilter: ['class'] });
if (introPlayer) new MutationObserver(requestFrame).observe(introPlayer, { attributes: true, attributeFilter: ['class'] });
if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', () => { lastRendered = 0; requestFrame(); });
else reducedMotion.addListener(() => { lastRendered = 0; requestFrame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; }
  else { lastRendered = 0; requestFrame(); }
});
window.addEventListener('pageshow', () => { lastRendered = 0; requestFrame(); });

