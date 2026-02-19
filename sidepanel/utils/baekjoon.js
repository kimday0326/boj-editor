window.BOJEditor = window.BOJEditor || {};

async function fetchSubmitPageData(problemId) {
  const result = await chrome.runtime.sendMessage({
    type: 'fetch_submit_page',
    problemId,
  });

  if (!result) {
    throw new Error('No response from background. Please reload the extension.');
  }
  if (result.error) {
    throw new Error(result.error);
  }

  return {
    languageOptions: result.languageOptions,
    _tabId: result._tabId,
  };
}

async function submitCode({ tabId, problemId, languageId, sourceCode, codeOpen = 'close', username }) {
  const result = await chrome.runtime.sendMessage({
    type: 'submit_code',
    data: { tabId, problemId, languageId, sourceCode, codeOpen, username },
  });

  if (!result) {
    throw new Error('No response from background. Please reload the extension.');
  }
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

function openStatusPage(problemId, username) {
  const url = `https://www.acmicpc.net/status?from_mine=1&problem_id=${problemId}&user_id=${username}`;
  chrome.runtime.sendMessage({ type: 'open_tab', url });
}

function activateTab(tabId) {
  chrome.runtime.sendMessage({ type: 'activate_tab', tabId });
}

function closeTab(tabId) {
  chrome.runtime.sendMessage({ type: 'close_tab', tabId });
}

function findBaekjoonLanguageId(languageOptions, displayName) {
  const nameMap = {
    'Python 3': 'Python 3',
    'PyPy3': 'PyPy3',
    'C++17': 'C++17',
    'C99': 'C99',
    'Java 11': 'Java 11',
    'Ruby': 'Ruby',
    'Kotlin (JVM)': 'Kotlin (JVM)',
    'Swift': 'Swift',
    'C#': 'C#',
    'Node.js': 'node.js',
    'Go': 'Go',
    'D': 'D',
    'Rust 2018': 'Rust 2018',
  };

  const bojName = nameMap[displayName] ?? displayName;
  const match = languageOptions.find(
    (opt) => opt.name === bojName || opt.name.includes(bojName)
  );
  return match?.id ?? null;
}

window.BOJEditor.Baekjoon = {
  fetchSubmitPageData,
  submitCode,
  openStatusPage,
  activateTab,
  closeTab,
  findBaekjoonLanguageId,
};
