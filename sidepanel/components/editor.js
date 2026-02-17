window.BOJEditor = window.BOJEditor || {};

window.BOJEditor.Editor = (function () {
  let editor = null;
  let autocompleteEnabled = true;

  function init(container, options = {}) {
    return new Promise((resolve) => {
      const baseUrl = chrome.runtime.getURL('lib/monaco/vs/');

      window.MonacoEnvironment = {
        getWorkerUrl: function () {
          return chrome.runtime.getURL('lib/monaco/monaco-worker.js');
        },
      };

      require.config({
        paths: { vs: baseUrl },
        'vs/nls': { availableLanguages: { '*': '' } },
      });

      require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(container, {
          value: options.value || '',
          language: options.language || 'python',
          theme: options.theme || 'vs-dark',
          fontSize: options.fontSize || 16,
          fontFamily: "'Source Code Pro', Consolas, 'Courier New', monospace",
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          roundedSelection: true,
          bracketPairColorization: { enabled: true },
          quickSuggestions: { other: true, comments: false, strings: false },
          suggestOnTriggerCharacters: true,
          tabCompletion: 'on',
          wordBasedSuggestions: 'allDocuments',
          padding: { top: 8 },
        });

        autocompleteEnabled = options.autocomplete !== false;
        if (!autocompleteEnabled) {
          toggleAutocomplete(false);
        }

        resolve(editor);
      });
    });
  }

  function getCode() {
    return editor ? editor.getValue() : '';
  }

  function setCode(code) {
    if (editor) editor.setValue(code);
  }

  function setLanguage(monacoLangId) {
    if (editor) {
      monaco.editor.setModelLanguage(editor.getModel(), monacoLangId);
    }
  }

  function setFontSize(size) {
    if (editor) editor.updateOptions({ fontSize: size });
  }

  function toggleAutocomplete(enabled) {
    autocompleteEnabled = enabled;
    if (!editor) return;
    editor.updateOptions({
      quickSuggestions: enabled ? { other: true, comments: false, strings: false } : false,
      suggestOnTriggerCharacters: enabled,
      tabCompletion: enabled ? 'on' : 'off',
      wordBasedSuggestions: enabled ? 'allDocuments' : 'off',
    });
  }

  function onContentChange(callback) {
    if (editor) editor.onDidChangeModelContent(callback);
  }

  function addAction(actionDescriptor) {
    if (editor) editor.addAction(actionDescriptor);
  }

  function getEditor() {
    return editor;
  }

  function setTheme(monacoTheme) {
    if (editor) monaco.editor.setTheme(monacoTheme);
  }

  return {
    init,
    getCode,
    setCode,
    setLanguage,
    setFontSize,
    setTheme,
    toggleAutocomplete,
    onContentChange,
    addAction,
    getEditor,
  };
})();
