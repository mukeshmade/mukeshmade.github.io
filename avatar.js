import * as THREE from './assets/vendor/three.module.js';

// An original, stylized character. This is not a likeness or a cloned voice.
const stage = document.getElementById('avatar-stage');
const playButton = document.getElementById('intro-play');
const stopButton = document.getElementById('intro-stop');
const status = document.getElementById('intro-status');
const transcript = document.getElementById('intro-transcript');
const introCard = playButton?.closest('.voice-intro');
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const phrases = [
  'Hi, I’m Mukesh Sai Madepalli, a software developer at Oracle.',
  'I work on banking payment systems with Java and JavaScript,',
  'and explore machine learning through projects in driver churn prediction and logistics analysis.',
  'I graduated from VIT Chennai in computer science.',
  'Take a look around,',
  'and let’s connect if you have an interesting role or problem in mind.'
];

let speaking = false;
let speechStarted = 0;
let speechSession = 0;
let nextPhraseTimer = 0;
let speechWatchdog = 0;
let activeUtterance = null;
const speechSupported = Boolean(window.speechSynthesis) && typeof window.SpeechSynthesisUtterance === 'function';

function setStatus(message) {
  if (status) status.textContent = message;
}

function revealTranscript() {
  if (!transcript) return;
  const details = transcript.matches('details') ? transcript : transcript.closest('details');
  if (details) details.open = true;
}

function updateButtons(active) {
  const restoreFocus = !active && stopButton && document.activeElement === stopButton;
  if (playButton) playButton.disabled = active || !speechSupported;
  if (stopButton) stopButton.hidden = !active;
  introCard?.classList.toggle('is-speaking', active);
  if (restoreFocus && playButton && !playButton.disabled) playButton.focus({ preventScroll: true });
}

function chooseVoice() {
  const voices = window.speechSynthesis.getVoices();
  const maleNames = /\b(david|ravi|rishi|arjun|aaron|daniel|alex|guy|mark|george|arthur|thomas|oliver|james|eric|brian|christopher|fred)\b/i;
  return voices
    .filter(voice => /^en(?:[-_]|$)/i.test(voice.lang))
    .map(voice => {
      const language = voice.lang.replace('_', '-').toLowerCase();
      let score = language === 'en-in' ? 220 : language === 'en-us' ? 180 : language === 'en-gb' ? 100 : 70;
      if (maleNames.test(voice.name)) score += 35;
      if (/natural|neural|online/i.test(voice.name)) score += 12;
      return { voice, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

function stopIntroduction(message = 'Introduction stopped. You can play it again anytime.') {
  const wasSpeaking = speaking;
  speechSession += 1;
  clearTimeout(nextPhraseTimer);
  clearTimeout(speechWatchdog);
  speaking = false;
  activeUtterance = null;
  if (speechSupported && wasSpeaking) window.speechSynthesis.cancel();
  updateButtons(false);
  if (wasSpeaking && message) setStatus(message);
  requestAvatarFrame();
}

function playIntroduction() {
  if (!speechSupported) {
    revealTranscript();
    return;
  }
  stopIntroduction(null);
  const session = ++speechSession;
  const voice = chooseVoice();
  speaking = true;
  speechStarted = performance.now();
  updateButtons(true);
  setStatus('Playing introduction. The synthesized voice depends on your browser and device.');
  requestAvatarFrame();

  function speakPhrase(index) {
    if (session !== speechSession || !speaking) return;
    if (index >= phrases.length) {
      speaking = false;
      activeUtterance = null;
      updateButtons(false);
      setStatus('Introduction complete. You can play it again anytime.');
      requestAvatarFrame();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(phrases[index]);
    activeUtterance = utterance;
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-IN';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => {
      if (session !== speechSession) return;
      clearTimeout(speechWatchdog);
      nextPhraseTimer = window.setTimeout(() => speakPhrase(index + 1), 100);
    };
    utterance.onerror = event => {
      if (session !== speechSession) return;
      if (event.error === 'canceled' || event.error === 'interrupted') {
        stopIntroduction();
        return;
      }
      stopIntroduction('Voice playback is unavailable right now. The full introduction is available below.');
      revealTranscript();
    };

    // Some engines silently stall. Keep the controls usable if no end event arrives.
    clearTimeout(speechWatchdog);
    speechWatchdog = window.setTimeout(() => {
      if (session !== speechSession) return;
      stopIntroduction('Voice playback paused unexpectedly. Try again, or read the introduction below.');
      revealTranscript();
    }, 24000);
    try {
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      stopIntroduction('Voice playback is unavailable. The full introduction is available below.');
      revealTranscript();
    }
  }

  // Start synchronously within the click event to preserve the audio gesture.
  speakPhrase(0);
}

playButton?.addEventListener('click', playIntroduction);
stopButton?.addEventListener('click', () => stopIntroduction());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && speaking) stopIntroduction();
});
updateButtons(false);
setStatus(speechSupported
  ? 'Play a short introduction. The synthesized voice varies by browser and device.'
  : 'Voice playback is not supported in this browser. Read the introduction below.');
if (!speechSupported) revealTranscript();

let renderer;
let scene;
let camera;
let character;
let head;
let eyes = [];
let pupils = [];
let mouth;
let tongue;
let waveShoulder;
let waveElbow;
let frameId = 0;
let failed = false;
let lastFrame = 0;
let nextBlink = 0;
let blinkStarted = -1000;
let waveAmount = 0;
const pointer = { x: 0, y: 0 };

function motionAllowed() {
  return !reducedMotion.matches && !root.classList.contains('motion-paused');
}

function showStaticAvatar() {
  if (!stage || failed) return;
  failed = true;
  cancelAnimationFrame(frameId);
  frameId = 0;
  renderer?.dispose();
  const fallback = document.createElement('div');
  fallback.className = 'avatar-fallback';
  fallback.style.cssText = 'width:100%;height:100%;display:grid;place-items:center';
  // Original vector art keeps the same human character when WebGL is unavailable.
  fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 330" width="100%" height="100%" aria-hidden="true">
    <defs><linearGradient id="avatar-shirt" x2="1" y2="1"><stop stop-color="#263b4b"/><stop offset="1" stop-color="#122532"/></linearGradient><linearGradient id="avatar-skin" x2="1" y2="1"><stop stop-color="#dba584"/><stop offset="1" stop-color="#b37558"/></linearGradient></defs>
    <ellipse cx="210" cy="301" rx="106" ry="12" fill="#233644" opacity=".11"/>
    <path d="M110 301v-40q0-56 74-63h52q74 7 74 63v40" fill="url(#avatar-shirt)"/>
    <path d="M185 177h50v42q-25 22-50 0z" fill="url(#avatar-skin)"/>
    <path d="m183 205 27 20-17 21-24-32m68-9-27 20 17 21 24-32" fill="#455868"/>
    <path d="M209 230v71" stroke="#526472" stroke-width="2"/>
    <circle cx="220" cy="254" r="2" fill="#9caaaf"/><circle cx="220" cy="277" r="2" fill="#9caaaf"/>
    <ellipse cx="155" cy="136" rx="11" ry="20" fill="#be8161"/><ellipse cx="265" cy="136" rx="11" ry="20" fill="#be8161"/>
    <path d="M153 108q0-62 57-62t57 62v34q-1 61-57 65-56-4-57-65z" fill="url(#avatar-skin)"/>
    <path d="M153 127q-16-50 7-72 26-32 69-19 43 6 42 57l-6 33-9-37q-50 14-79-5-12 17-24 43" fill="#252b2e"/>
    <path d="M167 113q13-8 26-1m34 0q13-7 26 1" fill="none" stroke="#303035" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="183" cy="129" rx="12" ry="7" fill="#fff4e7"/><ellipse cx="239" cy="129" rx="12" ry="7" fill="#fff4e7"/>
    <ellipse cx="184" cy="129" rx="4" ry="6" fill="#293639"/><ellipse cx="238" cy="129" rx="4" ry="6" fill="#293639"/>
    <path d="M210 132v19q7 6 13 0" fill="none" stroke="#a5684e" stroke-width="3" stroke-linecap="round"/>
    <path d="M190 170q20 15 40 0" fill="none" stroke="#653d36" stroke-width="3" stroke-linecap="round"/>
    <circle cx="175" cy="156" r="9" fill="#cf8671" opacity=".35"/><circle cx="246" cy="156" r="9" fill="#cf8671" opacity=".35"/>
  </svg>`;
  stage.replaceChildren(fallback);
  stage.dataset.avatarMode = 'static';
}

function material(color, roughness = 0.78) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function ellipsoid(parent, colorMaterial, position, scale, width = 40, height = 28) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, width, height), colorMaterial);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function capsule(parent, colorMaterial, radius, length, position) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 16), colorMaterial);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function curve(parent, points, radius, colorMaterial) {
  const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 24, radius, 7, false), colorMaterial);
  parent.add(mesh);
  return mesh;
}

function makeCharacter() {
  const skin = material('#c58d6c');
  const warmSkin = material('#b67b5f');
  const blush = material('#bc7a66');
  const hair = material('#242b2d');
  const hairHighlight = material('#303739');
  const shirt = material('#203746');
  const collar = material('#344e5c');
  const button = material('#8c9da3', 0.46);
  const eyeWhite = material('#fff5e8', 0.36);
  const iris = material('#303c3b', 0.4);
  const pupil = material('#182424', 0.34);
  const lip = material('#704d41');
  const innerMouth = material('#553532');
  const tongueMaterial = material('#b87c70');

  character = new THREE.Group();
  character.position.y = 0.13;
  scene.add(character);
  ellipsoid(character, shirt, [0, 0.71, 0], [0.89, 0.84, 0.42]);
  capsule(character, skin, 0.225, 0.27, [0, 1.58, 0]);

  // A tailored shirt, collar, placket, and small buttons give the bust a work-ready feel.
  for (const side of [-1, 1]) {
    const collarShape = new THREE.Shape();
    collarShape.moveTo(side * 0.08, 1.49);
    collarShape.lineTo(side * 0.27, 1.60);
    collarShape.lineTo(side * 0.46, 1.31);
    collarShape.lineTo(side * 0.20, 1.16);
    collarShape.closePath();
    const collarMesh = new THREE.Mesh(new THREE.ShapeGeometry(collarShape), collar);
    collarMesh.position.z = 0.38;
    character.add(collarMesh);
  }
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.93, 0.022), collar);
  placket.position.set(0, 0.73, 0.417);
  character.add(placket);
  [1.02, 0.74, 0.46].forEach(y => ellipsoid(character, button, [0, y, 0.436], [0.028, 0.028, 0.013], 14, 10));

  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.76, 1.12, 0);
    shoulder.rotation.z = side * 0.16;
    character.add(shoulder);
    capsule(shoulder, shirt, 0.185, 0.29, [0, -0.24, 0]);
    const elbow = new THREE.Group();
    elbow.position.y = -0.57;
    shoulder.add(elbow);
    capsule(elbow, skin, 0.125, 0.25, [0, -0.20, 0]);
    ellipsoid(elbow, skin, [0, -0.48, 0.01], [0.13, 0.16, 0.083], 24, 16);
    [-0.085, -0.028, 0.032, 0.088].forEach((x, index) => {
      const finger = capsule(elbow, skin, 0.031, [0.09, 0.13, 0.12, 0.075][index], [x, -0.66, 0.015]);
      finger.rotation.z = (index - 1.5) * -0.08;
    });
    const thumb = capsule(elbow, skin, 0.041, 0.095, [-side * 0.14, -0.48, 0.045]);
    thumb.rotation.z = side * 0.8;
    return { shoulder, elbow };
  }
  makeArm(-1);
  const rightArm = makeArm(1);
  waveShoulder = rightArm.shoulder;
  waveElbow = rightArm.elbow;

  head = new THREE.Group();
  head.position.set(0, 2.08, 0);
  character.add(head);
  ellipsoid(head, skin, [0, 0, 0], [0.585, 0.705, 0.47]);
  ellipsoid(head, skin, [0, -0.40, 0.065], [0.405, 0.315, 0.355]);
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [side * 0.575, -0.015, -0.005], [0.12, 0.19, 0.105], 24, 16);
    ellipsoid(head, warmSkin, [side * 0.61, -0.022, 0.078], [0.05, 0.105, 0.024], 20, 14);
    ellipsoid(head, blush, [side * 0.36, -0.18, 0.349], [0.09, 0.048, 0.027], 20, 14);
  }

  // A close-fitting hair cap and asymmetric swept locks remain clearly human.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.61, 48, 24, 0, Math.PI * 2, 0, 1.38), hair);
  cap.scale.set(1.02, 1.21, 0.84);
  cap.position.set(0, 0.065, -0.035);
  cap.castShadow = true;
  head.add(cap);
  ellipsoid(head, hair, [-0.515, 0.12, -0.08], [0.09, 0.31, 0.26]);
  ellipsoid(head, hair, [0.515, 0.14, -0.08], [0.085, 0.29, 0.25]);
  const locks = [
    [-0.31, 0.43, 0.35, 0.29, 0.115, 0.14, -0.27],
    [-0.10, 0.49, 0.38, 0.33, 0.13, 0.13, -0.15],
    [0.16, 0.49, 0.37, 0.28, 0.13, 0.12, 0.09],
    [0.35, 0.44, 0.31, 0.18, 0.115, 0.13, 0.25]
  ];
  locks.forEach((lock, index) => {
    const [x, y, z, sx, sy, sz, angle] = lock;
    const strand = ellipsoid(head, index === 1 ? hairHighlight : hair, [x, y, z], [sx, sy, sz]);
    strand.rotation.z = angle;
  });

  for (const side of [-1, 1]) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.205, 0.11, 0.419);
    head.add(eyeGroup);
    ellipsoid(eyeGroup, eyeWhite, [0, 0, 0], [0.125, 0.073, 0.041], 28, 18);
    const pupilGroup = new THREE.Group();
    pupilGroup.position.z = 0.037;
    eyeGroup.add(pupilGroup);
    ellipsoid(pupilGroup, iris, [0, 0, 0], [0.049, 0.060, 0.015], 24, 16);
    ellipsoid(pupilGroup, pupil, [0, 0, 0.01], [0.023, 0.036, 0.01], 20, 14);
    ellipsoid(pupilGroup, eyeWhite, [-0.012, 0.023, 0.020], [0.010, 0.010, 0.004], 12, 8);
    eyes.push(eyeGroup);
    pupils.push(pupilGroup);
    curve(head, [
      [side * 0.34, 0.25, 0.38],
      [side * 0.24, 0.287, 0.435],
      [side * 0.12, 0.264, 0.448]
    ], 0.025, hair);
  }

  ellipsoid(head, skin, [0, -0.026, 0.458], [0.080, 0.154, 0.087], 28, 20);
  ellipsoid(head, skin, [0, -0.098, 0.520], [0.101, 0.074, 0.092], 28, 20);
  ellipsoid(head, warmSkin, [-0.065, -0.133, 0.528], [0.023, 0.014, 0.013], 14, 10);
  ellipsoid(head, warmSkin, [0.065, -0.133, 0.528], [0.023, 0.014, 0.013], 14, 10);
  mouth = ellipsoid(head, innerMouth, [0, -0.247, 0.462], [0.108, 0.012, 0.021], 28, 16);
  tongue = ellipsoid(head, tongueMaterial, [0, -0.256, 0.481], [0.064, 0.007, 0.006], 22, 12);
  curve(head, [
    [-0.165, -0.212, 0.430], [-0.080, -0.248, 0.46],
    [0, -0.252, 0.465], [0.080, -0.248, 0.46], [0.165, -0.212, 0.430]
  ], 0.014, lip);
}

function resizeAvatar() {
  if (!stage || !renderer || failed) return;
  const width = Math.max(stage.clientWidth, 1);
  const height = Math.max(stage.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  // Keep the full character in frame on narrower layouts.
  camera.position.z = width / height < 1 ? 7.4 : 6.25;
  camera.updateProjectionMatrix();
  requestAvatarFrame();
}

function renderAvatar(now) {
  frameId = 0;
  if (!renderer || failed || document.hidden) return;
  const animated = motionAllowed();
  const time = now / 1000;
  const delta = Math.min((now - lastFrame) / 1000 || 0.016, 0.05);
  lastFrame = now;
  if (animated) {
    character.position.y = 0.13 + Math.sin(time * 1.55) * 0.009;
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, pointer.y * 0.11 + Math.sin(time * 0.8) * 0.023, 0.06);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, pointer.x * 0.20 - 0.08 + Math.sin(time * 0.55) * 0.035, 0.06);
    head.rotation.z = Math.sin(time * 0.7) * 0.022;
    pupils.forEach(eye => {
      eye.position.x = pointer.x * 0.023;
      eye.position.y = -pointer.y * 0.014;
    });
    if (now > nextBlink) {
      blinkStarted = now;
      nextBlink = now + 2800 + Math.random() * 2200;
    }
    const blinkProgress = (now - blinkStarted) / 170;
    const eyeScale = blinkProgress >= 0 && blinkProgress < 1 ? 1 - Math.sin(blinkProgress * Math.PI) * 0.97 : 1;
    eyes.forEach(eye => { eye.scale.y = eyeScale; });
    const waveTarget = speaking && now - speechStarted < 4400 ? 1 : 0;
    waveAmount = THREE.MathUtils.damp(waveAmount, waveTarget, 4.5, delta);
    waveShoulder.rotation.z = 0.16 + waveAmount * (1.42 + Math.sin(time * 5) * 0.07);
    waveElbow.rotation.z = waveAmount * (1.2 + Math.sin(time * 6) * 0.14);
    const open = speaking ? 0.018 + Math.abs(Math.sin(time * 11.7) * Math.cos(time * 4.1)) * 0.054 : 0.012;
    mouth.scale.y = THREE.MathUtils.lerp(mouth.scale.y, open, 0.45);
    tongue.scale.y = speaking ? 0.011 : 0.007;
    tongue.position.y = -0.247 - mouth.scale.y * 0.52;
  } else {
    character.position.y = 0.13;
    head.rotation.set(0, -0.08, 0);
    eyes.forEach(eye => { eye.scale.y = 1; });
    pupils.forEach(eye => { eye.position.x = 0; eye.position.y = 0; });
    waveAmount = 0;
    waveShoulder.rotation.z = 0.16;
    waveElbow.rotation.z = 0;
    mouth.scale.y = 0.012;
    tongue.scale.y = 0.007;
    tongue.position.y = -0.256;
  }
  try {
    renderer.render(scene, camera);
  } catch (_) {
    showStaticAvatar();
    return;
  }
  if (animated) frameId = requestAnimationFrame(renderAvatar);
}

function requestAvatarFrame() {
  if (!renderer || failed || document.hidden || frameId) return;
  frameId = requestAnimationFrame(renderAvatar);
}

function initializeAvatar() {
  if (!stage) return;
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', 'An original stylized human avatar introducing Mukesh’s work.');
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      showStaticAvatar();
    });
    stage.replaceChildren(renderer.domElement);
    stage.dataset.avatarMode = 'webgl';
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 1.55, 6.25);
    camera.lookAt(0, 1.46, 0);
    scene.add(new THREE.HemisphereLight('#fff5e3', '#b5c3bf', 2.25));
    const keyLight = new THREE.DirectionalLight('#fff1dd', 3.1);
    keyLight.position.set(-3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#d3e3ec', 1.4);
    fillLight.position.set(3, 2, 2);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight('#efc397', 2.1);
    rimLight.position.set(1, 4, -3);
    scene.add(rimLight);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(27,44,50,0.22)');
      gradient.addColorStop(1, 'rgba(27,44,50,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.14;
      scene.add(shadow);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.99, 0.11, 64), material('#d1cfc3'));
    base.position.y = -0.11;
    scene.add(base);
    makeCharacter();
    resizeAvatar();
    if ('ResizeObserver' in window) new ResizeObserver(resizeAvatar).observe(stage);
    else window.addEventListener('resize', resizeAvatar, { passive: true });
    stage.addEventListener('pointermove', event => {
      if (!motionAllowed()) return;
      const bounds = stage.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
      pointer.y = THREE.MathUtils.clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });
  } catch (_) {
    showStaticAvatar();
  }
}

initializeAvatar();
new MutationObserver(requestAvatarFrame).observe(root, { attributes: true, attributeFilter: ['class'] });
if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', requestAvatarFrame);
else reducedMotion.addListener(requestAvatarFrame);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopIntroduction('Introduction stopped when you left the page. You can play it again.');
    cancelAnimationFrame(frameId);
    frameId = 0;
  } else {
    lastFrame = performance.now();
    requestAvatarFrame();
  }
});
window.addEventListener('pagehide', () => stopIntroduction(null));
