(() => {
  'use strict';
  const player = document.querySelector('.intro-player');
  const play = document.querySelector('#intro-play');
  const stop = document.querySelector('#intro-stop');
  const status = document.querySelector('#intro-status');
  const transcript = document.querySelector('#intro-transcript');
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  if (supported) speechSynthesis.getVoices();
  const phrases = transcript.querySelector('p').textContent.trim().split(/(?<=[.!?])\s+/);
  let session = 0, active = false, continuation = 0, watchdog = 0, utterance = null;

  function updateControls() {
    const restoreFocus = !active && document.activeElement === stop;
    play.disabled = active || !supported;
    play.querySelector('span').textContent = active ? 'Playing' : 'Listen';
    stop.hidden = !active;
    player.classList.toggle('is-speaking', active);
    if (restoreFocus) play.focus({ preventScroll: true });
  }
  function cancel(message = '') {
    const wasActive = active;
    session++;
    clearTimeout(continuation); clearTimeout(watchdog);
    active = false; utterance = null;
    if (supported && wasActive) speechSynthesis.cancel();
    updateControls();
    if (message) status.textContent = message;
  }
  function selectVoice() {
    return speechSynthesis.getVoices().filter(voice => /^en(?:[-_]|$)/i.test(voice.lang)).map(voice => {
      const language = voice.lang.toLowerCase();
      let score = language === 'en-in' ? 200 : language === 'en-us' ? 150 : 100;
      if (/ravi|rishi|david|mark|daniel|alex|guy|george|brian/i.test(voice.name)) score += 25;
      if (/natural|neural|online/i.test(voice.name)) score += 15;
      return { voice, score };
    }).sort((a, b) => b.score - a.score)[0]?.voice;
  }
  function start() {
    if (!supported) { transcript.open = true; return; }
    cancel();
    active = true;
    const thisSession = ++session;
    const voice = selectVoice();
    updateControls();
    status.textContent = 'Playing introduction. Voice varies by browser and device.';
    function speak(index) {
      if (thisSession !== session || !active) return;
      if (index >= phrases.length) { active = false; utterance = null; updateControls(); status.textContent = 'Introduction complete.'; return; }
      utterance = new SpeechSynthesisUtterance(phrases[index].replace('VIT', 'V I T'));
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-US';
      utterance.rate = .96; utterance.pitch = 1; utterance.volume = 1;
      utterance.onend = () => { if (thisSession === session) { clearTimeout(watchdog); continuation = setTimeout(() => speak(index + 1), 100); } };
      utterance.onerror = event => {
        if (thisSession !== session) return;
        if (event.error === 'canceled' || event.error === 'interrupted') { cancel('Introduction stopped.'); return; }
        cancel('Voice playback is unavailable. You can read the introduction below.'); transcript.open = true;
      };
      watchdog = setTimeout(() => { if (thisSession === session) { cancel('Voice playback stalled. Try again or read the introduction below.'); transcript.open = true; } }, 24000);
      try { speechSynthesis.speak(utterance); }
      catch (_) { cancel('Voice playback is unavailable. You can read the introduction below.'); transcript.open = true; }
    }
    speak(0);
  }
  play.addEventListener('click', start);
  stop.addEventListener('click', () => cancel('Introduction stopped.'));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) cancel('Introduction stopped.'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) cancel('Introduction stopped.'); });
  addEventListener('pagehide', () => cancel());
  updateControls();
  if (!supported) { status.textContent = 'Voice playback is unavailable in this browser. The introduction is available below.'; transcript.open = true; }
})();
