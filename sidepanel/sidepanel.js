window.BOJEditor = window.BOJEditor || {};

(async function main() {
  const { Storage, Languages, Piston, Baekjoon, Editor, Toolbar, TestCases, Results, Resizer, Stopwatch } =
    window.BOJEditor;

  const appEl = document.getElementById('app');
  const placeholderEl = document.getElementById('placeholder');

  let problemData = null;
  let currentLanguage = 'Python 3';
  let autoSaveTimer = null;
  let editorInitialized = false;
  const AUTO_SAVE_DELAY = 1000;

  const settings = await Storage.loadSettings();
  currentLanguage = settings.defaultLanguage || 'Python 3';

  const tabInfo = await chrome.runtime.sendMessage({ type: 'get_tab_info' });

  if (tabInfo?.isAcmicpc) {
    showApp();
    await initEditor(tabInfo.problemData);
  } else {
    showPlaceholder();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'tab_activated') {
      if (message.isAcmicpc) {
        showApp();
        if (!editorInitialized) {
          initEditor(message.problemData);
        } else if (message.problemData) {
          const newData = message.problemData;
          if (!problemData || newData.problemId !== problemData.problemId) {
            problemData = newData;
            onProblemChanged();
          }
        }
      } else {
        showPlaceholder();
      }
    }
  });

  chrome.storage.onChanged.addListener(async (changes) => {
    if (!editorInitialized) return;

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) return;

    const activeKey = `problem_${tabs[0].id}`;
    if (changes[activeKey]?.newValue) {
      const newData = changes[activeKey].newValue;
      if (!problemData || newData.problemId !== problemData.problemId) {
        problemData = newData;
        onProblemChanged();
      }
    }
  });

  function showApp() {
    placeholderEl.classList.add('hidden');
    appEl.classList.remove('hidden');
  }

  function showPlaceholder() {
    appEl.classList.add('hidden');
    placeholderEl.classList.remove('hidden');
  }

  async function initEditor(initialProblemData) {
    if (editorInitialized) return;
    editorInitialized = true;

    problemData = initialProblemData || await getProblemData();

    Toolbar.init({
      defaultLanguage: currentLanguage,
      fontSize: settings.fontSize,
      autocomplete: settings.autocomplete,
      runTimeout: settings.runTimeout,
      theme: settings.theme,
    });

    Stopwatch.init({
      stopwatchEnabled: settings.stopwatchEnabled,
    });

    if (problemData) {
      Toolbar.setProblemInfo(problemData.problemId, problemData.problemTitle);
    }

    const editorContainer = document.getElementById('editor-container');
    const savedCode = problemData
      ? await Storage.loadCode(problemData.problemId, currentLanguage)
      : null;

    await Editor.init(editorContainer, {
      value: savedCode ?? Languages.getTemplate(currentLanguage),
      language: Languages.getMonacoLanguage(currentLanguage),
      fontSize: settings.fontSize,
      autocomplete: settings.autocomplete,
      theme: settings.theme === 'light' ? 'vs' : 'vs-dark',
    });

    const customTcs = problemData
      ? await Storage.loadCustomTestCases(problemData.problemId)
      : [];

    TestCases.init({
      problemId: problemData?.problemId || null,
      testCases: problemData?.testCases || [],
      customTestCases: customTcs,
    });

    Results.clear();
    Resizer.init();

    Toolbar.onLanguageChange(async (langName) => {
      const prevLang = currentLanguage;
      currentLanguage = langName;

      Editor.setLanguage(Languages.getMonacoLanguage(langName));

      if (problemData) {
        await Storage.saveCode(problemData.problemId, prevLang, Editor.getCode());
        const code = await Storage.loadCode(problemData.problemId, langName);
        Editor.setCode(code ?? Languages.getTemplate(langName));
      } else {
        Editor.setCode(Languages.getTemplate(langName));
      }
    });

    Editor.onContentChange(() => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(async () => {
        if (problemData) {
          await Storage.saveCode(problemData.problemId, currentLanguage, Editor.getCode());
        }
      }, AUTO_SAVE_DELAY);
    });

    Toolbar.onRun(async () => {
      await runTestCases();
    });

    Toolbar.onSubmit(async () => {
      await submitCode();
    });

    Editor.addAction({
      id: 'boj-run-testcases',
      label: 'Run Test Cases',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      ],
      run: async () => {
        await runTestCases();
      },
    });
  }

  async function runTestCases() {
    const allTcs = TestCases.getAllTestCases();
    if (allTcs.length === 0) {
      Results.showError('No test cases available.');
      Toolbar.switchToTab('results');
      return;
    }

    const pistonConfig = Languages.getPistonConfig(currentLanguage);
    if (!pistonConfig) {
      Results.showError(`Language "${currentLanguage}" is not supported for execution.`);
      Toolbar.switchToTab('results');
      return;
    }

    Toolbar.setRunning(true);
    Toolbar.switchToTab('results');
    Results.showLoading();

    try {
      const currentSettings = await Storage.loadSettings();
      const results = await Piston.runTestCases({
        language: pistonConfig.language,
        version: pistonConfig.version,
        sourceCode: Editor.getCode(),
        testCases: allTcs,
        runTimeout: currentSettings.runTimeout || 5000,
      });
      Results.showResults(results);
    } catch (err) {
      Results.showError(err.message);
    } finally {
      Toolbar.setRunning(false);
    }
  }

  async function submitCode() {
    if (!problemData?.problemId) {
      alert('No problem loaded. Please navigate to a Baekjoon problem page.');
      return;
    }

    const sourceCode = Editor.getCode();
    if (!sourceCode.trim()) {
      alert('Code is empty.');
      return;
    }

    Toolbar.setSubmitting(true);
    let submitTabId = null;

    try {
      const { languageOptions, _tabId } = await Baekjoon.fetchSubmitPageData(
        problemData.problemId
      );
      submitTabId = _tabId;

      const languageId = Baekjoon.findBaekjoonLanguageId(languageOptions, currentLanguage);
      if (!languageId) {
        Baekjoon.closeTab(submitTabId);
        alert(
          `Could not find Baekjoon language ID for "${currentLanguage}". ` +
          `Available: ${languageOptions.map((o) => o.name).join(', ')}`
        );
        return;
      }

      const result = await Baekjoon.submitCode({
        tabId: submitTabId,
        problemId: problemData.problemId,
        languageId,
        sourceCode,
        username: problemData.username,
      });

      if (result?.tabId) {
        Baekjoon.activateTab(result.tabId);
      }
    } catch (err) {
      if (submitTabId) {
        Baekjoon.closeTab(submitTabId);
      }
      alert('Submit failed: ' + err.message);
    } finally {
      Toolbar.setSubmitting(false);
    }
  }

  async function onProblemChanged() {
    Toolbar.setProblemInfo(problemData.problemId, problemData.problemTitle);

    const code = await Storage.loadCode(problemData.problemId, currentLanguage);
    Editor.setCode(code ?? Languages.getTemplate(currentLanguage));

    const customTcs = await Storage.loadCustomTestCases(problemData.problemId);
    TestCases.init({
      problemId: problemData.problemId,
      testCases: problemData.testCases || [],
      customTestCases: customTcs,
    });

    Results.clear();
  }

  async function getProblemData() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) return null;

    const tabId = tabs[0].id;
    const key = `problem_${tabId}`;
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  }
})();
