function safeSendMessage(message) {
  if (!chrome.runtime?.id) {
    console.warn('[BOJ Editor] Extension context invalidated. Please reload the page.');
    return false;
  }
  try {
    chrome.runtime.sendMessage(message);
    return true;
  } catch (e) {
    if (e.message?.includes('Extension context invalidated')) {
      console.warn('[BOJ Editor] Extension context invalidated. Please reload the page.');
      return false;
    }
    throw e;
  }
}

function extractProblemData() {
  const problemId = window.location.pathname.split('/').pop();
  const problemTitle = document.querySelector('#problem_title')?.textContent?.trim() ?? '';

  const testCases = [];
  let i = 1;
  while (true) {
    const inputEl = document.querySelector(`#sample-input-${i}`);
    const outputEl = document.querySelector(`#sample-output-${i}`);
    if (!inputEl || !outputEl) break;
    testCases.push({
      input: inputEl.textContent.trim(),
      expectedOutput: outputEl.textContent.trim(),
      isCustom: false,
    });
    i++;
  }

  const username = document.querySelector('a.username')?.textContent?.trim() ?? null;

  return { problemId, problemTitle, testCases, username };
}

function injectCodeButton() {
  if (document.getElementById('boj-editor-btn')) return;

  const buttonContainer = document.querySelector('.btn-group.pull-right.problem-button');
  const header = document.querySelector('.page-header h1');

  const target = buttonContainer || header;
  if (!target) return;

  const btn = document.createElement('button');
  btn.id = 'boj-editor-btn';
  btn.className = 'btn btn-default';
  btn.type = 'button';
  btn.innerHTML = '<i class="fa fa-code"></i> Code';

  btn.addEventListener('click', () => {
    const data = extractProblemData();

    if (!safeSendMessage({ type: 'set_problem_data', data })) {
      alert('확장 프로그램이 업데이트되었습니다. 페이지를 새로고침해 주세요.');
      return;
    }
    safeSendMessage({ type: 'open_side_panel' });
  });

  if (buttonContainer) {
    buttonContainer.appendChild(btn);
  } else {
    const wrapper = document.createElement('div');
    wrapper.className = 'btn-group pull-right problem-button';
    wrapper.appendChild(btn);
    header.appendChild(wrapper);
  }
}

function sendProblemDataOnLoad() {
  const data = extractProblemData();
  safeSendMessage({ type: 'set_problem_data', data });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectCodeButton();
    sendProblemDataOnLoad();
  });
} else {
  injectCodeButton();
  sendProblemDataOnLoad();
}
