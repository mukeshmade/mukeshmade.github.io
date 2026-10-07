import * as THREE from './assets/vendor/three.module.js';

// Original AI artwork: an open neural shell, a luminous core, and flowing signals.
const stage = document.getElementById('neural-stage');
const status = document.getElementById('neural-status');
const root = document.documentElement;
const introPlayer = document.querySelector('.intro-player');
const modeButtons = [...document.querySelectorAll('button[data-neural-mode], [role="button"][data-neural-mode]')];
const resetButton = document.getElementById('neural-reset');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const compact = window.innerWidth < 640;
const pointer = new THREE.Vector2();
const layers = [];
const signalRoutes = [];
const pulseCount = compact ? 8 : 12;
const trailLength = compact ? 9 : 10;
const accentMaterials = [];
const baseCoreColor = new THREE.Color('#69cabb');
const fieldCoreColor = new THREE.Color('#9b87df');
const baseCoreEmission = new THREE.Color('#26a79f');
const fieldCoreEmission = new THREE.Color('#7461d6');
const baseHaloColor = new THREE.Color('#52ebd9');
const fieldHaloColor = new THREE.Color('#9278fb');
let renderer, scene, camera, architecture, core, coreMaterial, coreEnergy, coreHalo;
let field, fieldMaterial, pulseMesh, pulseHalos, pulsePositions, trails;
let signalPaths, signalPathMaterial;
let glowTexture, environmentTarget;
let frameId = 0;
let lastRendered = 0;
let motionEpoch = performance.now();
let inView = true;
let failed = false;
let mode = 'structure';
let fieldBlend = 0;
let signalBlend = 0;
let viewDistance = 7.5;
let energyTime = 0;
let fieldAngle = 0;
let signalProgress = 0;

function animationsEnabled() {
  return !reducedMotion.matches && !root.classList.contains('motion-paused');
}
function introActive() {
  return root.classList.contains('is-speaking') || Boolean(introPlayer?.classList.contains('is-speaking'));
}
function setMode(next) {
  mode = ['structure', 'signal', 'field'].includes(next) ? next : 'structure';
  if (stage) stage.dataset.neuralMode = mode;
  modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.neuralMode === mode)));
  requestFrame();
}
modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.neuralMode)));
resetButton?.addEventListener('click', () => {
  pointer.set(0, 0);
  motionEpoch = performance.now();
  energyTime = fieldAngle = signalProgress = 0;
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
  image.src = './assets/neural-poster.png?v=3';
  image.alt = 'An open lattice of luminous neural connections surrounding a cyan and mint energy core.';
  image.className = 'neural-poster';
  image.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain';
  image.addEventListener('error', () => {
    const message = document.createElement('p');
    message.textContent = 'Neural architecture preview';
    message.style.cssText = 'color:#b8d7d1;font-size:14px;text-align:center;padding:40px';
    stage.replaceChildren(message);
  }, { once: true });
  stage.replaceChildren(image);
  stage.dataset.neuralRenderer = 'poster';
  modeButtons.forEach(button => { if (button.tagName === 'BUTTON') button.disabled = true; });
  if (resetButton) resetButton.disabled = true;
  if (status) status.textContent = 'Neural architecture';
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.13, 'rgba(255,255,255,.9)');
  gradient.addColorStop(0.38, 'rgba(255,255,255,.27)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,.04)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStudioEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#102027';
  context.fillRect(0, 0, 512, 256);
  [
    { x: 100, y: 70, radius: 103, color: 'rgba(230,255,237,1)' },
    { x: 352, y: 82, radius: 106, color: 'rgba(153,235,243,.95)' }
  ].forEach(panel => {
    const gradient = context.createRadialGradient(panel.x, panel.y, 2, panel.x, panel.y, panel.radius);
    gradient.addColorStop(0, panel.color);
    gradient.addColorStop(0.36, panel.color);
    gradient.addColorStop(1, 'rgba(16,32,39,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 256);
  });
  context.fillStyle = 'rgba(236,255,248,.7)';
  context.fillRect(220, 25, 12, 115);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer);
  environmentTarget = generator.fromEquirectangular(texture);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.9;
  texture.dispose();
  generator.dispose();
}

function shellPoint(phi, theta, options) {
  const modulation = 1 + Math.sin(theta * 3 + phi * 0.6) * Math.cos(phi) * 0.068;
  return new THREE.Vector3(
    Math.cos(phi) * Math.cos(theta) * options.radiusX * modulation,
    Math.sin(phi) * options.radiusY + Math.sin(theta * 3 + phi * 2.7) * Math.cos(phi) * 0.092,
    Math.cos(phi) * Math.sin(theta) * options.radiusZ * modulation
  );
}

function routePoint(route, parameter) {
  const phi = THREE.MathUtils.lerp(route.phiA, route.phiB, parameter);
  const theta = THREE.MathUtils.lerp(route.start, route.end, parameter);
  return shellPoint(phi, theta, route.layer.options).applyMatrix4(route.layer.group.matrix);
}

function createLayer(options) {
  const group = new THREE.Group();
  group.rotation.set(...options.rotation);
  group.updateMatrix();
  architecture.add(group);
  const nodePositions = [];
  const nodeColors = [];
  const linePositions = [];
  const lineColors = [];
  const rows = [];
  const cyan = new THREE.Color(options.color);
  const mint = new THREE.Color('#a7ffc8');
  function connectionColor(point, shift) {
    const front = THREE.MathUtils.clamp((point.z / options.radiusZ + 1) / 2, 0, 1);
    return cyan.clone().lerp(mint, front * 0.32 + shift).multiplyScalar(0.27 + front * 0.73);
  }
  for (let band = 0; band < options.bands; band += 1) {
    const phi = -options.latitude + band / (options.bands - 1) * options.latitude * 2;
    const row = [];
    for (let i = 0; i < options.nodes; i += 1) {
      const theta = options.start + i / (options.nodes - 1) * (options.end - options.start);
      const point = shellPoint(phi, theta, options);
      const color = connectionColor(point, band % 3 === 0 ? 0.24 : 0);
      nodePositions.push(point);
      nodeColors.push(color.r, color.g, color.b);
      row.push({ phi, theta });
    }
    rows.push(row);
  }
  function connect(a, b) {
    let previous = shellPoint(a.phi, a.theta, options);
    for (let segment = 1; segment <= 5; segment += 1) {
      const t = segment / 5;
      const next = shellPoint(THREE.MathUtils.lerp(a.phi, b.phi, t), THREE.MathUtils.lerp(a.theta, b.theta, t), options);
      linePositions.push(previous.x, previous.y, previous.z, next.x, next.y, next.z);
      for (const point of [previous, next]) {
        const color = connectionColor(point, 0);
        lineColors.push(color.r, color.g, color.b);
      }
      previous = next;
    }
  }
  rows.forEach((row, band) => row.forEach((node, index) => {
    if (index < row.length - 1) connect(node, row[index + 1]);
    if (band < rows.length - 1) {
      connect(node, rows[band + 1][Math.min(index + ((index + band) % 3 === 0 ? 1 : 0), row.length - 1)]);
    }
    if (!options.inner && band < rows.length - 2 && index % 6 === 0) {
      connect(node, rows[band + 2][Math.min(index + 2, row.length - 1)]);
    }
  }));
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  lines.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
  const linkMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: options.inner ? 0.29 : 0.48, depthWrite: false });
  group.add(new THREE.LineSegments(lines, linkMaterial));
  const material = new THREE.MeshPhysicalMaterial({
    color: '#e1faf0', metalness: 0.48, roughness: 0.29, clearcoat: 0.7,
    emissive: options.color, emissiveIntensity: options.inner ? 0.18 : 0.28,
    transparent: true, depthWrite: false
  });
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(options.inner ? 0.016 : 0.025, 10, 7), material, nodePositions.length);
  const matrix = new THREE.Matrix4();
  nodePositions.forEach((position, index) => {
    matrix.makeTranslation(position.x, position.y, position.z);
    nodes.setMatrixAt(index, matrix);
    nodes.setColorAt(index, new THREE.Color(...nodeColors.slice(index * 3, index * 3 + 3)));
  });
  nodes.instanceMatrix.needsUpdate = true;
  if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
  group.add(nodes);
  const halos = new THREE.BufferGeometry().setFromPoints(nodePositions);
  halos.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));
  const haloMaterial = new THREE.PointsMaterial({
    map: glowTexture, size: options.inner ? 0.14 : 0.19, vertexColors: true,
    transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false
  });
  group.add(new THREE.Points(halos, haloMaterial));
  const layer = { group, options, linkMaterial, material, haloMaterial, rows };
  layers.push(layer);
  if (!options.inner) {
    for (let index = 0; index < pulseCount; index += 1) {
      const row = rows[index % rows.length];
      signalRoutes.push({
        layer, phiA: row[0].phi,
        phiB: index % 4 === 0 ? rows[(index + 2) % rows.length][0].phi : row[0].phi,
        start: options.start, end: options.end, offset: index / pulseCount
      });
    }
  }
  return layer;
}

function createCore() {
  core = new THREE.Group();
  architecture.add(core);
  const geometry = new THREE.SphereGeometry(0.69, compact ? 48 : 64, 36);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i += 1) {
    vertex.fromBufferAttribute(positions, i);
    const normal = vertex.clone().normalize();
    const theta = Math.atan2(normal.z, normal.x);
    const phi = Math.asin(normal.y);
    vertex.multiplyScalar(1 + Math.sin(theta * 5) * Math.cos(phi * 3) * 0.052 + Math.sin(phi * 7) * 0.025);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  coreMaterial = new THREE.MeshPhysicalMaterial({
    color: '#69cabb', emissive: '#26a79f', emissiveIntensity: 0.55,
    metalness: 0.38, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.18
  });
  core.add(new THREE.Mesh(geometry, coreMaterial));
  coreEnergy = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uEnergy: { value: 0.68 }, uField: { value: 0 } },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uEnergy;
      uniform float uField;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vView;
      float hash(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
        );
      }
      float fieldNoise(vec3 p) {
        return noise(p) * 0.5 + noise(p * 2.06 + vec3(7,4,1)) * 0.25 +
               noise(p * 4.14 + vec3(2,8,3)) * 0.125;
      }
      void main() {
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.5);
        float pattern = fieldNoise(vPosition * 4.2 + vec3(uTime * 0.10, -uTime * 0.08, uTime * 0.06));
        float veins = pow(1.0 - abs(sin(pattern * 25.0 + uTime * 0.09)), 14.0);
        float blend = smoothstep(0.20, 0.65, pattern);
        vec3 color = mix(vec3(0.25, 0.93, 0.87), vec3(0.65, 1.0, 0.78), blend * 0.65);
        vec3 fieldColor = mix(vec3(0.59, 0.43, 1.0), vec3(0.44, 0.95, 0.93), blend);
        color = mix(color, fieldColor, uField);
        float alpha = (rim * 0.40 + veins * 0.33) * uEnergy;
        gl_FragColor = vec4(color * (1.0 + veins * 0.9 + rim), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const energy = new THREE.Mesh(geometry, coreEnergy);
  energy.scale.setScalar(1.006);
  core.add(energy);
  const coreWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.82, 3)),
    new THREE.LineBasicMaterial({ color: '#a0fff0', transparent: true, opacity: 0.13, depthWrite: false })
  );
  core.add(coreWire);
  for (let orbit = 0; orbit < 3; orbit += 1) {
    const points = [];
    for (let i = 0; i < 96; i += 1) {
      const angle = i / 96 * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * 1.01, Math.sin(angle) * 0.87, Math.sin(angle * 2) * 0.09));
    }
    const path = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    const ring = new THREE.Mesh(new THREE.TubeGeometry(path, compact ? 96 : 128, 0.006, 5, true),
      new THREE.MeshBasicMaterial({ color: orbit === 1 ? '#a7ffc8' : '#79dcce', transparent: true, opacity: 0.57 }));
    ring.rotation.set(orbit * 0.93 + 0.22, orbit * 0.59, orbit * 0.72);
    core.add(ring);
  }
  coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: '#52ebd9', transparent: true, opacity: 0.33,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  coreHalo.position.z = -0.30;
  coreHalo.scale.set(2.7, 2.7, 1);
  architecture.add(coreHalo);
}

function createAccents() {
  const silver = new THREE.MeshPhysicalMaterial({
    color: '#bcd7cd', metalness: 0.82, roughness: 0.28, clearcoat: 0.7,
    transparent: true, depthWrite: false
  });
  const filament = new THREE.LineBasicMaterial({ color: '#97d9cd', transparent: true, opacity: 0.18, depthWrite: false });
  accentMaterials.push(silver, filament);
  for (let arc = 0; arc < 3; arc += 1) {
    const points = [];
    const phi = [-0.84, 0.05, 0.84][arc];
    const options = { radiusX: 2.03, radiusY: 2.19, radiusZ: 1.64 };
    for (let i = 0; i <= 128; i += 1) points.push(shellPoint(phi, 2.38 + i / 128 * 4.36, options));
    const path = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    architecture.add(new THREE.Mesh(new THREE.TubeGeometry(path, compact ? 96 : 128, arc === 1 ? 0.013 : 0.009, 6, false), silver));
  }
  const points = [];
  for (let i = 0; i <= 128; i += 1) {
    const angle = -0.45 + i / 128 * 5.6;
    points.push(new THREE.Vector3(Math.cos(angle) * 2.22, Math.sin(angle) * 2.22, Math.sin(angle) * 0.33 - 0.22));
  }
  const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), filament);
  orbit.rotation.set(0.33, 0.18, -0.16);
  architecture.add(orbit);
}

function createField() {
  const count = compact ? 96 : 112;
  const positions = [];
  const colors = [];
  const color = new THREE.Color('#79dcce');
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.3999632297;
    const radius = 0.82 + (i % 19) / 19 * 0.94;
    positions.push(Math.cos(angle) * radius, Math.sin(angle * 0.61) * 1.45, Math.sin(angle) * radius * 0.7);
    const shade = color.clone().lerp(new THREE.Color(i % 3 === 0 ? '#b197ff' : '#a7ffc8'), i % 7 / 8);
    colors.push(shade.r, shade.g, shade.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  fieldMaterial = new THREE.PointsMaterial({
    map: glowTexture, size: 0.075, vertexColors: true, transparent: true,
    opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false
  });
  field = new THREE.Points(geometry, fieldMaterial);
  architecture.add(field);
}

function createSignals() {
  const pathPositions = [];
  signalRoutes.forEach(route => {
    let previous = routePoint(route, 0).multiplyScalar(1.003);
    for (let segment = 1; segment <= 80; segment += 1) {
      const next = routePoint(route, segment / 80).multiplyScalar(1.003);
      pathPositions.push(previous.x, previous.y, previous.z, next.x, next.y, next.z);
      previous = next;
    }
  });
  const pathGeometry = new THREE.BufferGeometry();
  pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pathPositions, 3));
  signalPathMaterial = new THREE.LineBasicMaterial({ color: '#83f6d8', transparent: true, opacity: 0, depthWrite: false });
  signalPaths = new THREE.LineSegments(pathGeometry, signalPathMaterial);
  architecture.add(signalPaths);
  pulseMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 12, 8),
    new THREE.MeshBasicMaterial({ color: '#eaffcb' }), pulseCount);
  pulseMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  architecture.add(pulseMesh);
  pulsePositions = new THREE.Float32BufferAttribute(new Float32Array(pulseCount * 3), 3);
  pulsePositions.setUsage(THREE.DynamicDrawUsage);
  const halos = new THREE.BufferGeometry();
  halos.setAttribute('position', pulsePositions);
  pulseHalos = new THREE.Points(halos, new THREE.PointsMaterial({
    map: glowTexture, color: '#a7ffc8', size: 0.31, transparent: true,
    opacity: 0.64, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  architecture.add(pulseHalos);
  const trailPositions = new Float32Array(pulseCount * trailLength * 3);
  const trailColors = [];
  for (let i = 0; i < pulseCount; i += 1) {
    for (let j = 0; j < trailLength; j += 1) {
      const color = new THREE.Color('#7ff9e8').multiplyScalar((1 - j / trailLength) * 0.82);
      trailColors.push(color.r, color.g, color.b);
    }
  }
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(trailColors, 3));
  trails = new THREE.Points(trailGeometry, new THREE.PointsMaterial({
    map: glowTexture, size: 0.10, vertexColors: true, transparent: true,
    opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  architecture.add(trails);
}

function createArchitecture() {
  architecture = new THREE.Group();
  architecture.rotation.set(0.07, -0.18, -0.27);
  scene.add(architecture);
  createLayer({
    bands: 9, nodes: compact ? 30 : 38, latitude: 1.06,
    start: 2.46, end: 6.69, radiusX: 1.88, radiusY: 2.06, radiusZ: 1.52,
    color: '#79dcce', inner: false, rotation: [0, 0, 0]
  });
  createLayer({
    bands: 5, nodes: compact ? 18 : 22, latitude: 1.02,
    start: 2.42, end: 6.72, radiusX: 1.30, radiusY: 1.42, radiusZ: 1.08,
    color: '#91e6cf', inner: true, rotation: [0.11, 0.22, 0.34]
  });
  createCore();
  createAccents();
  createField();
  createSignals();
}

function resizeScene() {
  if (!renderer || !stage || failed) return;
  const width = Math.max(stage.clientWidth, 1);
  const height = Math.max(stage.clientHeight, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 640 ? 1.5 : 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  const tangent = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  viewDistance = Math.max(4.55 / tangent, 4.70 / (tangent * camera.aspect));
  camera.position.z = viewDistance + fieldBlend * 0.35;
  camera.updateProjectionMatrix();
  lastRendered = 0;
  requestFrame();
}

const pulseMatrix = new THREE.Matrix4();
const pulseScale = new THREE.Vector3();
const pulseQuaternion = new THREE.Quaternion();
function updateSignals(progress, active) {
  const positions = trails.geometry.attributes.position;
  signalRoutes.forEach((route, index) => {
    const visible = active || index % 3 === 0;
    const parameter = THREE.MathUtils.euclideanModulo(route.offset + progress, 1);
    const position = routePoint(route, parameter);
    pulseScale.setScalar(visible ? 1 : 0);
    pulseMatrix.compose(position, pulseQuaternion, pulseScale);
    pulseMesh.setMatrixAt(index, pulseMatrix);
    pulsePositions.setXYZ(index, visible ? position.x : 100, visible ? position.y : 100, visible ? position.z : 100);
    for (let tail = 0; tail < trailLength; tail += 1) {
      const point = routePoint(route, THREE.MathUtils.euclideanModulo(parameter - tail * 0.0055, 1));
      positions.setXYZ(index * trailLength + tail, visible ? point.x : 100, visible ? point.y : 100, visible ? point.z : 100);
    }
  });
  pulseMesh.instanceMatrix.needsUpdate = true;
  pulsePositions.needsUpdate = true;
  positions.needsUpdate = true;
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
  const signal = mode === 'signal' || introActive();
  const emphasis = mode === 'field';
  const delta = Math.min(elapsed / 1000, 0.08);
  fieldBlend = animated ? THREE.MathUtils.damp(fieldBlend, emphasis ? 1 : 0, 6, delta) : emphasis ? 1 : 0;
  signalBlend = animated ? THREE.MathUtils.damp(signalBlend, signal ? 1 : 0, 6, delta) : signal ? 1 : 0;
  if (animated) {
    energyTime += delta * (1 + signalBlend * 0.6 - fieldBlend * 0.4);
    fieldAngle += delta * (0.018 + fieldBlend * 0.058);
    signalProgress += delta * (0.035 + signalBlend * 0.105);
  }
  if (animated) {
    architecture.rotation.x = THREE.MathUtils.lerp(architecture.rotation.x, 0.07 + pointer.y * 0.10 + Math.sin(time * 0.19) * 0.018, 0.08);
    architecture.rotation.y = THREE.MathUtils.lerp(architecture.rotation.y, -0.18 + pointer.x * 0.18 + Math.sin(time * 0.16) * 0.075, 0.08);
    architecture.rotation.z = -0.27 + Math.sin(time * 0.14) * 0.012;
    architecture.position.y = Math.sin(time * 0.7) * 0.022;
    core.rotation.set(Math.sin(time * 0.17) * 0.06, time * 0.085, 0.05);
    field.rotation.y = fieldAngle;
  } else {
    architecture.rotation.set(0.07, -0.18, -0.27);
    architecture.position.y = 0;
    core.rotation.set(0, 0, 0.05);
    field.rotation.y = 0;
  }
  const breathing = animated ? 1 + Math.sin(time * 1.5) * 0.018 : 1;
  core.scale.setScalar(breathing * (1 + fieldBlend * 0.15));
  coreMaterial.color.copy(baseCoreColor).lerp(fieldCoreColor, fieldBlend);
  coreMaterial.emissive.copy(baseCoreEmission).lerp(fieldCoreEmission, fieldBlend);
  coreMaterial.emissiveIntensity = 0.55 + signalBlend * 0.32 + fieldBlend * 0.15;
  coreEnergy.uniforms.uTime.value = animated ? energyTime : 0;
  coreEnergy.uniforms.uEnergy.value = 0.61 + signalBlend * 0.31 + fieldBlend * 0.12;
  coreEnergy.uniforms.uField.value = fieldBlend;
  coreHalo.material.color.copy(baseHaloColor).lerp(fieldHaloColor, fieldBlend);
  coreHalo.material.opacity = 0.46 + signalBlend * 0.07 + fieldBlend * 0.22;
  coreHalo.scale.setScalar((3 + fieldBlend * 1.3) * breathing);
  fieldMaterial.opacity = 0.14 + fieldBlend * 0.82;
  fieldMaterial.size = 0.065 + fieldBlend * 0.235;
  field.scale.setScalar(1 + fieldBlend * 0.18);
  camera.position.z = viewDistance + fieldBlend * 0.35;
  layers.forEach(layer => {
    const opacity = layer.options.inner ? 0.29 : 0.48;
    layer.linkMaterial.opacity = opacity * (1 - fieldBlend * 0.94) * (1 - signalBlend * 0.59);
    layer.haloMaterial.opacity = 0.55 * (1 - fieldBlend * 0.91) * (1 - signalBlend * 0.45);
    layer.material.opacity = (1 - fieldBlend * 0.91) * (1 - signalBlend * 0.53);
    layer.material.emissiveIntensity = 0.28 + signalBlend * 0.10 - fieldBlend * 0.16;
  });
  accentMaterials[0].opacity = (1 - fieldBlend * 0.92) * (1 - signalBlend * 0.61);
  accentMaterials[1].opacity = 0.18 * (1 - fieldBlend * 0.55);
  signalPaths.visible = signalBlend > 0.002;
  signalPathMaterial.opacity = signalBlend * 0.76 * (1 - fieldBlend * 0.5);
  trails.material.opacity = 0.35 + signalBlend * 0.60;
  trails.material.size = 0.075 + signalBlend * 0.05;
  pulseHalos.material.opacity = (0.48 + signalBlend * 0.4) * (1 - fieldBlend * 0.60);
  pulseMesh.visible = pulseHalos.visible = trails.visible = fieldBlend < 0.95 || signalBlend > 0.05;
  updateSignals(animated ? signalProgress : 0, signal);
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
  stage.setAttribute('aria-label', 'Interactive three-dimensional neural architecture with an open network of glowing nodes surrounding a luminous core.');
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); showPoster(); });
    stage.replaceChildren(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0.10, 7.5);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight('#ddfff0', '#09212b', 1.3));
    const key = new THREE.DirectionalLight('#efffe6', 2.9);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#c2ff79', 2.1);
    rim.position.set(2, 3, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight('#79dcce', 1.8);
    fill.position.set(4, -1, 2);
    scene.add(fill);
    const coreLight = new THREE.PointLight('#71e5d0', 3.5, 4.8, 2);
    scene.add(coreLight);
    glowTexture = createGlowTexture();
    try { createStudioEnvironment(); } catch (_) {}
    createArchitecture();
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

