chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;

  const url = new URL(tab.url);
  const isAcmicpc = url.hostname === 'www.acmicpc.net';

  await chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel/index.html',
    enabled: isAcmicpc,
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const key = `problem_${tabId}`;
  const result = await chrome.storage.local.get(key);
  const data = result[key] ?? null;

  chrome.runtime.sendMessage({ type: 'tab_problem_data', data }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'open_side_panel' && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    return;
  }

  if (message.type === 'set_problem_data' && sender.tab?.id) {
    chrome.storage.local.set({
      [`problem_${sender.tab.id}`]: message.data,
    });
    return;
  }

  if (message.type === 'open_tab') {
    chrome.tabs.create({ url: message.url });
    return;
  }

  if (message.type === 'close_tab') {
    chrome.tabs.remove(message.tabId).catch(() => {});
    return;
  }

  if (message.type === 'activate_tab') {
    chrome.tabs.update(message.tabId, { active: true }).catch(() => {});
    return;
  }

  if (message.type === 'fetch_submit_page') {
    handleFetchSubmitPage(message.problemId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'submit_code') {
    handleSubmitCode(message.data)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

function openTabAndWaitForLoad(url) {
  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 15000;

    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const tabId = tab.id;
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.remove(tabId).catch(() => {});
        reject(new Error('Submit page load timed out.'));
      }, TIMEOUT_MS);

      function listener(updatedTabId, changeInfo, updatedTab) {
        if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);

        if (updatedTab.url?.includes('/login')) {
          chrome.tabs.remove(tabId).catch(() => {});
          reject(new Error('Login session not detected. Please log in to Baekjoon again and retry.'));
          return;
        }

        resolve(tabId);
      }

      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/submit.js'],
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function handleFetchSubmitPage(problemId) {
  try {
    const tabId = await openTabAndWaitForLoad(`https://www.acmicpc.net/submit/${problemId}`);
    await injectContentScript(tabId);

    const result = await sendMessageToTab(tabId, { type: 'get_submit_page_data' });

    if (result?.error) {
      chrome.tabs.remove(tabId).catch(() => {});
      return { error: result.error };
    }

    return {
      languageOptions: result.languageOptions,
      _tabId: tabId,
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function handleSubmitCode({ tabId, problemId, languageId, sourceCode, codeOpen, username }) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: async ({ problemId, languageId, sourceCode, codeOpen, username }) => {
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        async function waitTurnstileToken() {
          const input = document.querySelector('input[name="cf-turnstile-response"]');
          if (!input) return null;
          const current = input.value?.trim();
          if (current) return current;

          const maxAttempts = 50;
          for (let i = 0; i < maxAttempts; i++) {
            await sleep(200);
            const next = document.querySelector('input[name="cf-turnstile-response"]')?.value?.trim();
            if (next) return next;
          }

          throw new Error('Cloudflare verification timeout. Please refresh the submit page and retry.');
        }

        function parseSubmissionIdFromStatus(htmlText) {
          const doc = new DOMParser().parseFromString(htmlText, 'text/html');
          const row = doc.querySelector('#status-table tbody tr');
          if (!row?.id) return null;
          const match = row.id.match(/^solution-(\d+)$/);
          return match ? match[1] : null;
        }

        const resolvedProblemId =
          String(problemId || '').trim() || (window.location.pathname.match(/\/submit\/(\d+)/)?.[1] ?? '');
        if (!resolvedProblemId) {
          return { error: 'Problem id not found on submit page.' };
        }

        const turnstileToken = await waitTurnstileToken();

        const form = new URLSearchParams();
        form.set('problem_id', resolvedProblemId);
        form.set('language', String(languageId));
        form.set('code_open', codeOpen || 'close');
        form.set('source', sourceCode);
        if (turnstileToken) {
          form.set('cf-turnstile-response', turnstileToken);
        }

        const submitUrl = `https://www.acmicpc.net/submit/${resolvedProblemId}`;
        const response = await fetch(submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
          credentials: 'include',
          redirect: 'follow',
        });

        const responseText = await response.text();
        const redirectedToStatus = response.redirected && response.url.includes('/status');
        const finalUrlIsStatus = response.url.includes('/status');
        const bodyLooksLikeStatus =
          responseText.includes('status-table') || responseText.includes('채점 번호');

        if (!redirectedToStatus && !finalUrlIsStatus && !bodyLooksLikeStatus) {
          return { error: 'Submission was rejected by server. Please retry from the submit page.' };
        }

        const statusUrl = new URL('https://www.acmicpc.net/status');
        statusUrl.searchParams.set('from_mine', '1');
        statusUrl.searchParams.set('problem_id', resolvedProblemId);
        statusUrl.searchParams.set('limit', '1');
        if (username) {
          statusUrl.searchParams.set('user_id', username);
        }

        const statusResponse = await fetch(statusUrl.toString(), {
          method: 'GET',
          credentials: 'include',
        });
        const statusHtml = await statusResponse.text();

        if (
          statusHtml.includes('cf-turnstile') ||
          statusHtml.includes('Just a moment') ||
          statusHtml.includes('Cloudflare')
        ) {
          return {
            error: 'Cloudflare blocked status lookup. Open status page manually and retry later.',
          };
        }

        const submissionId = parseSubmissionIdFromStatus(statusHtml);
        return {
          ok: true,
          submissionId,
          statusUrl: statusUrl.toString(),
        };
      },
      args: [{ problemId, languageId, sourceCode, codeOpen: codeOpen || 'close', username }],
    });

    if (!result || result.error) {
      chrome.tabs.remove(tabId).catch(() => {});
      return { error: result?.error || 'Submission failed in submit page context.' };
    }

    if (result.statusUrl) {
      await chrome.tabs.update(tabId, { url: result.statusUrl, active: false });
    }

    return {
      ok: true,
      tabId,
      url: result.statusUrl,
      submissionId: result.submissionId || null,
    };
  } catch (err) {
    chrome.tabs.remove(tabId).catch(() => {});
    return { error: err.message };
  }
}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
