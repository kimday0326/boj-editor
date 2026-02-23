chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;

  const url = new URL(tab.url);
  const isAcmicpc = url.hostname === 'www.acmicpc.net';

  await chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel/index.html',
    enabled: true,
  });

  if (isAcmicpc && info.status === 'complete') {
    const key = `problem_${tabId}`;
    const result = await chrome.storage.local.get(key);
    chrome.runtime.sendMessage({
      type: 'tab_activated',
      isAcmicpc: true,
      problemData: result[key] ?? null,
    }).catch(() => {});
  }
});

const SUBMIT_DEBUG_PREFIX = '[BOJ Submit Debug]';

function logSubmitDebug(label, details) {
  if (details === undefined) {
    console.log(`${SUBMIT_DEBUG_PREFIX} ${label}`);
    return;
  }
  console.log(`${SUBMIT_DEBUG_PREFIX} ${label}`, details);
}

function summarizeHtml(htmlText) {
  return String(htmlText || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function summarizeTimeline(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return [];
  }

  const base = timeline[0].t;
  return timeline.map((entry) => ({
    stage: entry.stage,
    elapsedMs: Math.max(0, entry.t - base),
    ...Object.fromEntries(
      Object.entries(entry).filter(([key]) => key !== 'stage' && key !== 't')
    ),
  }));
}

function hasStage(timeline, stage) {
  return Array.isArray(timeline) && timeline.some((entry) => entry.stage === stage);
}

function classifySubmitFailure({ message, timeline }) {
  const text = String(message || '');

  if (text.includes('Login session not detected')) {
    return {
      code: 'LOGIN_SESSION_MISSING',
      hint: 'Baekjoon login session is missing. Re-login and retry.',
    };
  }

  if (text.includes('Submit page load timed out')) {
    return {
      code: 'SUBMIT_PAGE_TIMEOUT',
      hint: 'Submit tab did not finish loading in time. Check network and retry.',
    };
  }

  if (hasStage(timeline, 'turnstile:timeout') || text.includes('Cloudflare verification timeout')) {
    return {
      code: 'TURNSTILE_TOKEN_TIMEOUT',
      hint: 'Cloudflare token was not ready. Open submit tab, solve challenge, retry.',
    };
  }

  if (hasStage(timeline, 'status:cloudflare_detected') || text.includes('Cloudflare blocked status lookup')) {
    return {
      code: 'STATUS_CLOUDFLARE_BLOCKED',
      hint: 'Cloudflare blocked status check. Open status page manually and retry later.',
    };
  }

  if (hasStage(timeline, 'submit:error_missing_problem_id') || text.includes('Problem id not found')) {
    return {
      code: 'PROBLEM_ID_MISSING',
      hint: 'Problem ID was not found in submit page context.',
    };
  }

  if (hasStage(timeline, 'turnstile:input_missing') && hasStage(timeline, 'submit:rejected_by_heuristic')) {
    return {
      code: 'TURNSTILE_INPUT_MISSING_REJECTED',
      hint: 'Turnstile input not found, then submit was rejected. Check hidden-tab challenge behavior.',
    };
  }

  if (hasStage(timeline, 'submit:rejected_by_heuristic') || text.includes('Submission was rejected by server')) {
    return {
      code: 'SUBMIT_RESPONSE_REJECTED',
      hint: 'Server response did not match success heuristics. Check POST response and redirects.',
    };
  }

  if (hasStage(timeline, 'func:exception')) {
    return {
      code: 'SUBMIT_INJECTED_EXCEPTION',
      hint: 'An exception was thrown inside the submit page context. Check timeline for details.',
    };
  }

  return {
    code: 'SUBMIT_UNKNOWN',
    hint: 'Unknown submit failure. Check [BOJ Submit Debug] timeline in service worker console.',
  };
}

function formatClassifiedError({ code, message, hint }) {
  return `[${code}] ${message}${hint ? ` (${hint})` : ''}`;
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    const isAcmicpc = tab.url ? new URL(tab.url).hostname === 'www.acmicpc.net' : false;

    const key = `problem_${tabId}`;
    const result = await chrome.storage.local.get(key);
    const data = result[key] ?? null;

    chrome.runtime.sendMessage({
      type: 'tab_activated',
      isAcmicpc,
      problemData: data,
    }).catch(() => {});
  } catch (_) {}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'open_side_panel' && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    return;
  }

  if (message.type === 'get_tab_info') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs.length) { sendResponse({ isAcmicpc: false, problemData: null }); return; }
        const tab = tabs[0];
        const isAcmicpc = tab.url ? new URL(tab.url).hostname === 'www.acmicpc.net' : false;
        const key = `problem_${tab.id}`;
        const result = await chrome.storage.local.get(key);
        sendResponse({ isAcmicpc, problemData: result[key] ?? null });
      } catch (_) {
        sendResponse({ isAcmicpc: false, problemData: null });
      }
    })();
    return true;
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
    const startedAt = Date.now();

    logSubmitDebug('openTab:start', { url, timeoutMs: TIMEOUT_MS });

    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        logSubmitDebug('openTab:create_error', { message: chrome.runtime.lastError.message });
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
        logSubmitDebug('openTab:timeout', { tabId, elapsedMs: Date.now() - startedAt });
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
          logSubmitDebug('openTab:login_redirect', {
            tabId,
            elapsedMs: Date.now() - startedAt,
            finalUrl: updatedTab.url,
          });
          reject(new Error('Login session not detected. Please log in to Baekjoon again and retry.'));
          return;
        }

        logSubmitDebug('openTab:loaded', {
          tabId,
          elapsedMs: Date.now() - startedAt,
          finalUrl: updatedTab.url || null,
        });
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
    const startedAt = Date.now();
    logSubmitDebug('fetchSubmitPage:start', { problemId });

    const tabId = await openTabAndWaitForLoad(`https://www.acmicpc.net/submit/${problemId}`);
    await injectContentScript(tabId);

    const result = await sendMessageToTab(tabId, { type: 'get_submit_page_data' });

    if (result?.error) {
      chrome.tabs.remove(tabId).catch(() => {});
      const classification = classifySubmitFailure({ message: result.error, timeline: [] });
      const classifiedMessage = formatClassifiedError({
        code: classification.code,
        message: result.error,
        hint: classification.hint,
      });
      logSubmitDebug('fetchSubmitPage:error', {
        problemId,
        tabId,
        elapsedMs: Date.now() - startedAt,
        message: result.error,
        errorCode: classification.code,
      });
      return { error: classifiedMessage, errorCode: classification.code };
    }

    logSubmitDebug('fetchSubmitPage:success', {
      problemId,
      tabId,
      elapsedMs: Date.now() - startedAt,
      languageCount: Array.isArray(result.languageOptions) ? result.languageOptions.length : 0,
    });

    return {
      languageOptions: result.languageOptions,
      _tabId: tabId,
    };
  } catch (err) {
    const classification = classifySubmitFailure({ message: err.message, timeline: [] });
    const classifiedMessage = formatClassifiedError({
      code: classification.code,
      message: err.message,
      hint: classification.hint,
    });
    logSubmitDebug('fetchSubmitPage:exception', {
      problemId,
      message: err.message,
      errorCode: classification.code,
    });
    return { error: classifiedMessage, errorCode: classification.code };
  }
}

async function handleSubmitCode({ tabId, problemId, languageId, sourceCode, codeOpen, username }) {
  try {
    const startedAt = Date.now();
    const submitId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    logSubmitDebug('submit:start', {
      submitId,
      tabId,
      problemId,
      languageId,
      sourceLength: String(sourceCode || '').length,
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: async ({ problemId, languageId, sourceCode, codeOpen, username }) => {
        const timeline = [];

        function mark(stage, details = {}) {
          timeline.push({ stage, t: Date.now(), ...details });
        }

        function summarizeHtml(htmlText) {
          return String(htmlText || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 240);
        }

        try {

          mark('script:start', {
            url: window.location.href,
            visibility: document.visibilityState,
          });

          function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
          }

          async function waitTurnstileToken(timeoutMs = 10000) {
            mark('turnstile:check_start');
            const input = document.querySelector('input[name="cf-turnstile-response"]');
            if (!input) {
              mark('turnstile:input_missing');
              return null;
            }

            mark('turnstile:input_found');
            const current = input.value?.trim();
            if (current) {
              mark('turnstile:token_ready', { length: current.length, from: 'initial' });
              return current;
            }

            const deadline = Date.now() + timeoutMs;
            let attempt = 0;
            while (Date.now() < deadline) {
              await sleep(200);
              attempt++;
              const next = document.querySelector('input[name="cf-turnstile-response"]')?.value?.trim();
              if (next) {
                mark('turnstile:token_ready', { length: next.length, from: 'poll', attempt });
                return next;
              }
            }

            mark('turnstile:timeout');
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
            mark('submit:error_missing_problem_id');
            return { error: 'Problem id not found on submit page.', debugTimeline: timeline };
          }

          const turnstileToken = await waitTurnstileToken();
          mark('turnstile:done', { hasToken: Boolean(turnstileToken) });

          const form = new URLSearchParams();
          form.set('problem_id', resolvedProblemId);
          form.set('language', String(languageId));
          form.set('code_open', codeOpen || 'close');
          form.set('source', sourceCode);
          if (turnstileToken) {
            form.set('cf-turnstile-response', turnstileToken);
          }

          const submitUrl = `https://www.acmicpc.net/submit/${resolvedProblemId}`;
          const postStartedAt = Date.now();
          mark('submit:post_start', {
            submitUrl,
            hasTurnstileToken: Boolean(turnstileToken),
            hasUsername: Boolean(username),
          });
          const response = await fetch(submitUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
            credentials: 'include',
            redirect: 'follow',
          });

          const responseText = await response.text();
          mark('submit:post_done', {
            status: response.status,
            redirected: response.redirected,
            finalUrl: response.url,
            postElapsedMs: Date.now() - postStartedAt,
            responseSnippet: summarizeHtml(responseText),
          });
          const redirectedToStatus = response.redirected && response.url.includes('/status');
          const finalUrlIsStatus = response.url.includes('/status');
          const bodyLooksLikeStatus =
            responseText.includes('status-table') || responseText.includes('채점 번호');

          if (!redirectedToStatus && !finalUrlIsStatus && !bodyLooksLikeStatus) {
            mark('submit:rejected_by_heuristic');
            return {
              error: 'Submission was rejected by server. Please retry from the submit page.',
              debugTimeline: timeline,
            };
          }

          const statusUrl = new URL('https://www.acmicpc.net/status');
          statusUrl.searchParams.set('from_mine', '1');
          statusUrl.searchParams.set('problem_id', resolvedProblemId);
          statusUrl.searchParams.set('limit', '1');
          if (username) {
            statusUrl.searchParams.set('user_id', username);
          }

          const statusStartedAt = Date.now();
          mark('status:get_start', { statusUrl: statusUrl.toString() });
          const statusResponse = await fetch(statusUrl.toString(), {
            method: 'GET',
            credentials: 'include',
          });
          const statusHtml = await statusResponse.text();
          mark('status:get_done', {
            status: statusResponse.status,
            elapsedMs: Date.now() - statusStartedAt,
            responseSnippet: summarizeHtml(statusHtml),
          });

          if (
            statusHtml.includes('cf-turnstile') ||
            statusHtml.includes('Just a moment') ||
            statusHtml.includes('Cloudflare')
          ) {
            mark('status:cloudflare_detected');
            return {
              error: 'Cloudflare blocked status lookup. Open status page manually and retry later.',
              debugTimeline: timeline,
            };
          }

          const submissionId = parseSubmissionIdFromStatus(statusHtml);
          mark('submit:success', { submissionId: submissionId || null });
          return {
            ok: true,
            submissionId,
            statusUrl: statusUrl.toString(),
            debugTimeline: timeline,
          };

        } catch (err) {
          mark('func:exception', { message: err?.message ?? String(err) });
          return {
            error: err?.message ?? String(err),
            debugTimeline: timeline,
          };
        }
      },
      args: [{ problemId, languageId, sourceCode, codeOpen: codeOpen || 'close', username }],
    });

    if (!result || result.error) {
      const baseMessage = result?.error || 'Submission failed in submit page context.';
      const timeline = summarizeTimeline(result?.debugTimeline);
      const classification = classifySubmitFailure({ message: baseMessage, timeline });
      const classifiedMessage = formatClassifiedError({
        code: classification.code,
        message: baseMessage,
        hint: classification.hint,
      });
      logSubmitDebug('submit:error', {
        submitId,
        tabId,
        elapsedMs: Date.now() - startedAt,
        message: baseMessage,
        errorCode: classification.code,
        timeline,
      });
      chrome.tabs.remove(tabId).catch(() => {});
      return { error: classifiedMessage, errorCode: classification.code };
    }

    if (result.statusUrl) {
      await chrome.tabs.update(tabId, { url: result.statusUrl, active: false });
    }

    logSubmitDebug('submit:success', {
      submitId,
      tabId,
      elapsedMs: Date.now() - startedAt,
      submissionId: result.submissionId || null,
      statusUrl: result.statusUrl || null,
      timeline: summarizeTimeline(result.debugTimeline),
    });

    return {
      ok: true,
      tabId,
      url: result.statusUrl,
      submissionId: result.submissionId || null,
    };
  } catch (err) {
    const classification = classifySubmitFailure({ message: err.message, timeline: [] });
    const classifiedMessage = formatClassifiedError({
      code: classification.code,
      message: err.message,
      hint: classification.hint,
    });
    logSubmitDebug('submit:exception', {
      tabId,
      problemId,
      languageId,
      message: err.message,
      errorCode: classification.code,
    });
    chrome.tabs.remove(tabId).catch(() => {});
    return { error: classifiedMessage, errorCode: classification.code };
  }
}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
