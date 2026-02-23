window.BOJEditor = window.BOJEditor || {};

window.BOJEditor.Toolbar = (function () {
  const callbacks = {
    onLanguageChange: null,
    onRun: null,
    onSubmit: null,
  };

  let currentFontSize = 16;
  let currentTheme = 'dark';

  function updateFontSizeDisplay() {
    const el = document.getElementById('font-size-display');
    if (el) el.textContent = currentFontSize;
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    if (window.BOJEditor.Editor) {
      window.BOJEditor.Editor.setTheme(theme === 'light' ? 'vs' : 'vs-dark');
    }
  }

  function init(options = {}) {
    const { Languages } = window.BOJEditor;
    const names = Languages.getLanguageNames();

    const langSelect = document.getElementById('language-select');
    langSelect.innerHTML = '';
    names.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      langSelect.appendChild(opt);
    });

    if (options.defaultLanguage) {
      langSelect.value = options.defaultLanguage;
    }

    langSelect.addEventListener('change', () => {
      if (callbacks.onLanguageChange) callbacks.onLanguageChange(langSelect.value);
    });

    currentFontSize = options.fontSize || 16;
    updateFontSizeDisplay();

    document.getElementById('font-decrease').addEventListener('click', () => {
      if (currentFontSize > 8) {
        currentFontSize -= 1;
        window.BOJEditor.Editor.setFontSize(currentFontSize);
        updateFontSizeDisplay();
        window.BOJEditor.Storage.saveSettings({ fontSize: currentFontSize });
      }
    });

    document.getElementById('font-increase').addEventListener('click', () => {
      if (currentFontSize < 30) {
        currentFontSize += 1;
        window.BOJEditor.Editor.setFontSize(currentFontSize);
        updateFontSizeDisplay();
        window.BOJEditor.Storage.saveSettings({ fontSize: currentFontSize });
      }
    });

    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      window.BOJEditor.Storage.saveSettings({ theme: newTheme });
    });

    applyTheme(options.theme || 'dark');

    const acToggle = document.getElementById('setting-autocomplete');
    if (acToggle) {
      acToggle.checked = options.autocomplete !== false;
      acToggle.addEventListener('change', () => {
        window.BOJEditor.Editor.toggleAutocomplete(acToggle.checked);
        window.BOJEditor.Storage.saveSettings({ autocomplete: acToggle.checked });
      });
    }

    document.getElementById('btn-run').addEventListener('click', () => {
      if (callbacks.onRun) callbacks.onRun();
    });

    document.getElementById('btn-submit').addEventListener('click', () => {
      if (callbacks.onSubmit) callbacks.onSubmit();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.remove('hidden');
    });

    document.getElementById('settings-close').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.add('hidden');
    });

    document.getElementById('settings-save').addEventListener('click', async () => {
      const swToggleEl = document.getElementById('setting-stopwatch');
      const settings = {
        defaultLanguage: document.getElementById('setting-default-lang').value,
        runTimeout: parseInt(document.getElementById('setting-timeout').value, 10) || 5000,
        fontSize: currentFontSize,
        autocomplete: acToggle ? acToggle.checked : options.autocomplete !== false,
        theme: currentTheme,
        stopwatchEnabled: swToggleEl ? swToggleEl.checked : true,
      };
      await window.BOJEditor.Storage.saveSettings(settings);
      if (window.BOJEditor.Stopwatch) {
        window.BOJEditor.Stopwatch.setEnabled(settings.stopwatchEnabled);
      }
      document.getElementById('settings-modal').classList.add('hidden');
    });
    const settingLangSelect = document.getElementById('setting-default-lang');
    settingLangSelect.innerHTML = '';
    names.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      settingLangSelect.appendChild(opt);
    });

    if (options.defaultLanguage) {
      settingLangSelect.value = options.defaultLanguage;
    }
    if (options.runTimeout) {
      document.getElementById('setting-timeout').value = options.runTimeout;
    }

    const swToggle = document.getElementById('setting-stopwatch');
    if (swToggle) {
      swToggle.checked = options.stopwatchEnabled !== false;
    }

    initTabs();
  }

  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-content-' + btn.dataset.tab).classList.add('active');
      });
    });
  }

  function setProblemInfo(problemId, title) {
    const el = document.getElementById('problem-info');
    el.textContent = problemId ? '#' + problemId + ' ' + title : '';
    el.title = el.textContent;
  }

  function getSelectedLanguage() {
    return document.getElementById('language-select').value;
  }

  function setSelectedLanguage(name) {
    document.getElementById('language-select').value = name;
  }

  function setRunning(running) {
    const btn = document.getElementById('btn-run');
    btn.disabled = running;
    btn.textContent = running ? 'Running...' : 'Run';
  }

  function setSubmitting(submitting) {
    const btn = document.getElementById('btn-submit');
    btn.disabled = submitting;
    btn.textContent = submitting ? 'Submitting...' : 'Submit';
  }

  function switchToTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    const btn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
    if (btn) btn.classList.add('active');
    const content = document.getElementById('tab-content-' + tabName);
    if (content) content.classList.add('active');
  }

  function onLanguageChange(cb) { callbacks.onLanguageChange = cb; }
  function onRun(cb) { callbacks.onRun = cb; }
  function onSubmit(cb) { callbacks.onSubmit = cb; }

  return {
    init,
    applyTheme,
    setProblemInfo,
    getSelectedLanguage,
    setSelectedLanguage,
    setRunning,
    setSubmitting,
    switchToTab,
    onLanguageChange,
    onRun,
    onSubmit,
  };
})();
