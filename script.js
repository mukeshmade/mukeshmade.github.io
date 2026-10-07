(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-button');
  let motionPaused = reducedMotion.matches;
  try { motionPaused = reducedMotion.matches || localStorage.getItem('portfolio-motion') === 'paused'; } catch (_) {}
  function updateMotion(save = false) {
    root.classList.toggle('motion-paused', motionPaused);
    motionButton.setAttribute('aria-pressed', String(motionPaused));
    const label = motionPaused ? 'Enable animations' : 'Pause animations';
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    motionButton.querySelector('.sr-only').textContent = label;
    motionButton.querySelector('.motion-icon').textContent = motionPaused ? '▷' : 'Ⅱ';
    if (save) { try { localStorage.setItem('portfolio-motion', motionPaused ? 'paused' : 'active'); } catch (_) {} }
  }
  updateMotion();
  motionButton.addEventListener('click', () => { motionPaused = !motionPaused; updateMotion(true); });
  reducedMotion.addEventListener('change', event => { motionPaused = event.matches; updateMotion(); });

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-nav');
  function closeMenu() { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open menu'); mobileMenu.hidden = true; }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileMenu.hidden = !open;
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileMenu.hidden) { closeMenu(); menuButton.focus(); } });
  window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    root.classList.add('js-reveal');
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  }

  const progress = document.querySelector('.scroll-progress');
  let scrollScheduled = false;
  function updateScroll() { const distance = root.scrollHeight - window.innerHeight; progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, window.scrollY / distance) : 0})`; scrollScheduled = false; }
  window.addEventListener('scroll', () => { if (!scrollScheduled) { requestAnimationFrame(updateScroll); scrollScheduled = true; } }, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('.copy-email').addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try { await navigator.clipboard.writeText('madepallimukesh@gmail.com'); status.textContent = 'Email address copied.'; }
    catch (_) { status.textContent = 'Email: madepallimukesh@gmail.com'; }
  });

})();
