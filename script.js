(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const motionButton = document.querySelector('.motion-button');
  const counterFrames = new Map();
  let paused = reduced.matches;
  try { paused ||= localStorage.getItem('portfolio-motion') === 'paused'; } catch (_) {}
  function moving() { return !paused && !reduced.matches && !document.hidden; }
  function finishCounter(element) {
    const decimals = Number(element.dataset.decimals || 0);
    element.textContent = Number(element.dataset.count).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    cancelAnimationFrame(counterFrames.get(element)); counterFrames.delete(element);
  }
  function setMotion(save = false) {
    root.classList.toggle('motion-paused', paused || reduced.matches);
    motionButton.setAttribute('aria-pressed', String(paused || reduced.matches));
    motionButton.disabled = reduced.matches;
    const label = reduced.matches ? 'Reduced motion enabled' : paused ? 'Enable animations' : 'Pause animations';
    motionButton.setAttribute('aria-label', label); motionButton.title = label;
    motionButton.querySelector('.motion-icon').textContent = paused || reduced.matches ? '▷' : 'Ⅱ';
    if (!moving()) {
      document.querySelectorAll('.magnetic').forEach(e => { e.style.transform = ''; });
      counterFrames.forEach((_, e) => finishCounter(e));
    }
    if (save) { try { localStorage.setItem('portfolio-motion', paused ? 'paused' : 'active'); } catch (_) {} }
  }
  setMotion();
  motionButton.addEventListener('click', () => { paused = !paused; setMotion(true); });
  reduced.addEventListener('change', event => { paused = event.matches; setMotion(); });
  document.addEventListener('visibilitychange', () => { root.classList.toggle('page-hidden', document.hidden); if (document.hidden) counterFrames.forEach((_, e) => finishCounter(e)); });

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  function closeMenu() { mobileMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open menu'); }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    mobileMenu.hidden = !open; menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mobileMenu.hidden) { closeMenu(); menuButton.focus(); } });
  matchMedia('(min-width: 801px)').addEventListener('change', e => { if (e.matches) closeMenu(); });

  function count(element) {
    if (!moving()) { finishCounter(element); return; }
    const value = Number(element.dataset.count), decimals = Number(element.dataset.decimals || 0);
    const start = performance.now(), duration = 1100;
    function frame(now) {
      if (!moving()) { finishCounter(element); return; }
      const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
      element.textContent = (value * eased).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      if (t < 1) counterFrames.set(element, requestAnimationFrame(frame)); else finishCounter(element);
    }
    counterFrames.set(element, requestAnimationFrame(frame));
  }
  if ('IntersectionObserver' in window) {
    root.classList.add('js-reveal');
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); } });
    }, { threshold: .04, rootMargin: '0px 0px -25px 0px' });
    document.querySelectorAll('.reveal').forEach(e => reveal.observe(e));
    const counters = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { count(entry.target); counters.unobserve(entry.target); } });
    }, { threshold: .6 });
    document.querySelectorAll('[data-count]').forEach(e => counters.observe(e));
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('offscreen', !entry.isIntersecting));
    }, { rootMargin: '100px' });
    document.querySelectorAll('.hero,.case-study,.toolkit-card,.about-orbit,.skill-loop,.contact-section').forEach(e => visibility.observe(e));
    const sections = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) document.querySelectorAll('.desktop-nav a').forEach(link => link.classList.toggle('active', link.hash === '#' + entry.target.id)); });
    }, { rootMargin: '-12% 0px -70% 0px' });
    document.querySelectorAll('main > section[id]').forEach(e => sections.observe(e));
  }

  document.querySelectorAll('.magnetic').forEach(element => {
    element.addEventListener('pointermove', e => {
      if (!finePointer.matches || !moving()) return;
      const b = element.getBoundingClientRect();
      const x = Math.max(-5, Math.min(5, (e.clientX - b.left - b.width / 2) * .06));
      const y = Math.max(-4, Math.min(4, (e.clientY - b.top - b.height / 2) * .12));
      element.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }, { passive: true });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });
  document.querySelectorAll('.glow-card').forEach(card => {
    let pointerFrame = 0, x = 0, y = 0;
    card.addEventListener('pointermove', e => {
      if (!finePointer.matches || !moving()) return;
      const b = card.getBoundingClientRect(); x = e.clientX - b.left; y = e.clientY - b.top;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
        card.style.setProperty('--glow-x', x + 'px'); card.style.setProperty('--glow-y', y + 'px'); pointerFrame = 0;
      });
    }, { passive: true });
  });

  const steps = [
    'Start with missing values, aggregation, and the right unit of analysis.',
    'Create driver-level, location, and time features from the original records.',
    'Compare tree-based classifiers and tune the Random Forest with GridSearchCV.',
    'Examine class-wise precision, recall, and F1 alongside the preprocessing choices.'
  ];
  const tabs = [...document.querySelectorAll('[data-step]')];
  const panel = document.querySelector('#process-panel');
  function selectStep(index) {
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    panel.setAttribute('aria-labelledby', tabs[index].id);
    panel.querySelector('p').textContent = steps[index];
    const strip = document.querySelector('.process-strip');
    strip.classList.remove('changing'); requestAnimationFrame(() => strip.classList.add('changing'));
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectStep(i));
    tab.addEventListener('keydown', e => {
      let next = i;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault(); selectStep(next); tabs[next].focus();
    });
  });
  const models = {
    forest: ['Random Forest', 'Combines predictions from multiple decision trees. Tuned with GridSearchCV in the notebook.', ['FEATURES', 'TREES', 'VOTES']],
    boost: ['XGBoost', 'Builds an ensemble sequentially, using each new tree to improve on earlier predictions.', ['FEATURES', 'TREES', 'UPDATES']],
    tree: ['Decision Tree', 'Splits the feature space into decision rules. A single-tree model compared with the ensembles.', ['FEATURES', 'SPLITS', 'RULES']]
  };
  const modelButtons = [...document.querySelectorAll('[data-model]')];
  modelButtons.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.model, data = models[key];
    modelButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelector('.classifier-visual').dataset.model = key;
    document.querySelector('#model-name').textContent = data[0]; document.querySelector('#model-copy').textContent = data[1];
    document.querySelectorAll('.network-diagram .diagram-labels text').forEach((label, i) => { label.textContent = data[2][i]; });
    document.querySelector('.network-diagram').setAttribute('aria-label', 'Illustrative ' + data[0] + ' workflow using driver-level features.');
  }));
  const journeyButtons = [...document.querySelectorAll('[data-journey]')];
  journeyButtons.forEach(button => button.addEventListener('click', () => {
    const estimate = button.dataset.journey === 'estimate';
    journeyButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelector('.logistics-visual').dataset.journey = button.dataset.journey;
    document.querySelector('#journey-name').textContent = estimate ? 'Routing estimate' : 'Actual journey';
    document.querySelector('#journey-copy').textContent = estimate ? 'Compare actual travel time and distance with the OSRM routing estimates in the dataset.' : 'Combine the partial shipment records before analyzing the complete trip.';
  }));

  const progress = document.querySelector('.scroll-progress'); let scheduled = false;
  function updateProgress() {
    const total = root.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (total > 0 ? Math.min(1, scrollY / total) : 0) + ')'; scheduled = false;
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  addEventListener('resize', updateProgress, { passive: true }); updateProgress();
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('.copy-email').addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try { await navigator.clipboard.writeText('madepallimukesh@gmail.com'); status.textContent = 'Copied'; }
    catch (_) { status.textContent = 'madepallimukesh@gmail.com'; }
  });
})();
