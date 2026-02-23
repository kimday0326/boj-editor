window.BOJEditor = window.BOJEditor || {};

window.BOJEditor.Stopwatch = (function () {
  let startTime = null;
  let elapsed = 0;
  let timerInterval = null;
  let isRunning = false;
  let isEnabled = true;

  let displayEl = null;
  let toggleBtnEl = null;

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateDisplay() {
    if (!displayEl) return;
    const current = isRunning ? elapsed + (Date.now() - startTime) : elapsed;
    displayEl.textContent = formatTime(current);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    startTime = Date.now();
    timerInterval = setInterval(updateDisplay, 1000);
    updateDisplay();
    if (toggleBtnEl) {
      toggleBtnEl.title = '일시정지';
      toggleBtnEl.classList.add('running');
      const pauseIcon = document.getElementById('stopwatch-icon-pause');
      const playIcon = document.getElementById('stopwatch-icon-play');
      if (pauseIcon) pauseIcon.style.display = '';
      if (playIcon) playIcon.style.display = 'none';
    }
  }

  function pause() {
    if (!isRunning) return;
    isRunning = false;
    elapsed += Date.now() - startTime;
    clearInterval(timerInterval);
    timerInterval = null;
    updateDisplay();
    if (toggleBtnEl) {
      toggleBtnEl.title = '재개';
      toggleBtnEl.classList.remove('running');
      const pauseIcon = document.getElementById('stopwatch-icon-pause');
      const playIcon = document.getElementById('stopwatch-icon-play');
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (playIcon) playIcon.style.display = '';
    }
  }

  function reset() {
    pause();
    elapsed = 0;
    updateDisplay();
  }

  function toggle() {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }

  function setEnabled(enabled) {
    isEnabled = enabled;
    const wrapperEl = document.getElementById('stopwatch-wrapper');
    if (!wrapperEl) return;

    if (enabled) {
      wrapperEl.classList.remove('hidden');
      start();
    } else {
      wrapperEl.classList.add('hidden');
      pause();
    }
  }

  function init(options = {}) {
    isEnabled = options.stopwatchEnabled !== false;

    displayEl = document.getElementById('stopwatch-display');
    toggleBtnEl = document.getElementById('btn-stopwatch-toggle');
    const resetBtnEl = document.getElementById('btn-stopwatch-reset');
    const wrapperEl = document.getElementById('stopwatch-wrapper');

    if (!displayEl || !toggleBtnEl || !wrapperEl) return;

    if (!isEnabled) {
      wrapperEl.classList.add('hidden');
    }

    toggleBtnEl.addEventListener('click', toggle);

    if (resetBtnEl) {
      resetBtnEl.addEventListener('click', reset);
    }

    updateDisplay();

    if (isEnabled) {
      start();
    }
  }

  return {
    init,
    start,
    pause,
    reset,
    toggle,
    setEnabled,
  };
})();
