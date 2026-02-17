/**
 * Programmatically injected into https://www.acmicpc.net/submit/{problemId}
 * via chrome.scripting.executeScript (not manifest-declared).
 * Messages: get_submit_page_data
 */
(function () {
  if (window.__bojSubmitInjected) return;
  window.__bojSubmitInjected = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'get_submit_page_data') {
      sendResponse(getSubmitPageData());
      return;
    }

  });

  function getSubmitPageData() {
    if (window.location.pathname.includes('/login')) {
      return { error: 'Login session not detected. Please log in to Baekjoon again and retry.' };
    }

    const languageOptions = [];
    const langSelect = document.querySelector('select[name="language"]');
    if (langSelect) {
      for (const option of langSelect.options) {
        const id = option.value?.trim();
        const name = option.textContent?.trim();
        if (id && name) {
          languageOptions.push({ id, name });
        }
      }
    }

    return { languageOptions };
  }

})();
