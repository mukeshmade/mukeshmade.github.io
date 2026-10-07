(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.remove('no-js');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-button');
  let paused = motionPreference.matches;
  try { paused ||= localStorage.getItem('portfolio-motion') === 'paused'; } catch (_) {}

  function setMotion(save = false) {
    root.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    const label = paused ? 'Enable animations' : 'Pause animations';
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    motionButton.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
    if (save) { try { localStorage.setItem('portfolio-motion', paused ? 'paused' : 'active'); } catch (_) {} }
  }
  setMotion();
  motionButton.addEventListener('click', () => { paused = !paused; setMotion(true); });
  motionPreference.addEventListener('change', event => { paused = event.matches; setMotion(); });

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  function closeMenu() { mobileMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open menu'); }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    mobileMenu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileMenu.hidden) { closeMenu(); menuButton.focus(); } });
  window.matchMedia('(min-width: 801px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
    }, { threshold: .04, rootMargin: '0px 0px -25px 0px' });
    root.classList.add('js-reveal');
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) document.querySelectorAll('.desktop-nav a').forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`)); });
    }, { rootMargin: '-12% 0px -72% 0px', threshold: 0 });
    document.querySelectorAll('main > section[id]').forEach(section => sectionObserver.observe(section));
  }

  const progress = document.querySelector('.scroll-progress');
  let scheduled = false;
  function updateProgress() { const total = root.scrollHeight - innerHeight; progress.style.transform = `scaleX(${total > 0 ? Math.min(1, scrollY / total) : 0})`; scheduled = false; }
  addEventListener('scroll', () => { if (!scheduled) { requestAnimationFrame(updateProgress); scheduled = true; } }, { passive: true });
  addEventListener('resize', updateProgress, { passive: true });
  updateProgress();
  document.querySelector('#year').textContent = new Date().getFullYear();

  document.querySelector('.copy-email').addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try { await navigator.clipboard.writeText('madepallimukesh@gmail.com'); status.textContent = 'Copied'; }
    catch (_) { status.textContent = 'madepallimukesh@gmail.com'; }
  });
})();
