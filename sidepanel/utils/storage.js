window.BOJEditor = window.BOJEditor || {};

const STORAGE_PREFIX = 'boj-editor';

function codeKey(problemId, language) {
  return `${STORAGE_PREFIX}:code:${problemId}:${language}`;
}

function testCaseKey(problemId) {
  return `${STORAGE_PREFIX}:testcases:${problemId}`;
}

function settingsKey() {
  return `${STORAGE_PREFIX}:settings`;
}

async function saveCode(problemId, language, code) {
  const key = codeKey(problemId, language);
  await chrome.storage.local.set({ [key]: code });
}

async function loadCode(problemId, language) {
  const key = codeKey(problemId, language);
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

async function saveCustomTestCases(problemId, testCases) {
  const key = testCaseKey(problemId);
  await chrome.storage.local.set({ [key]: testCases });
}

async function loadCustomTestCases(problemId) {
  const key = testCaseKey(problemId);
  const result = await chrome.storage.local.get(key);
  return result[key] ?? [];
}

const DEFAULT_SETTINGS = {
  apiKey: '',
  autocomplete: true,
  fontSize: 16,
  defaultLanguage: 'Python 3',
  runTimeout: 5000,
  theme: 'light',
};

async function saveSettings(settings) {
  const key = settingsKey();
  const existing = await loadSettings();
  const merged = { ...existing, ...settings };
  await chrome.storage.local.set({ [key]: merged });
}

async function loadSettings() {
  const key = settingsKey();
  const result = await chrome.storage.local.get(key);
  return { ...DEFAULT_SETTINGS, ...(result[key] ?? {}) };
}

window.BOJEditor.Storage = {
  saveCode,
  loadCode,
  saveCustomTestCases,
  loadCustomTestCases,
  saveSettings,
  loadSettings,
};
