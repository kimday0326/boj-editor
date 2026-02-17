window.BOJEditor = window.BOJEditor || {};

window.BOJEditor.Results = (function () {
  const container = () => document.getElementById('tab-content-results');

  function showLoading() {
    const el = container();
    if (!el) return;
    el.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <span>Running test cases...</span>
      </div>
    `;
  }

  function showResults(results) {
    const el = container();
    if (!el) return;

    const passCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const allPassed = passCount === totalCount;

    let html = '';

    html += `
      <div class="result-summary ${allPassed ? 'all-pass' : 'some-fail'}">
        ${allPassed ? '&#10003;' : '&#10007;'} ${passCount} / ${totalCount} passed
      </div>
    `;

    results.forEach((r, i) => {
      const statusClass = r.passed ? 'passed' : 'failed';
      const resultMessage = r.passed
        ? '\ud14c\uc2a4\ud2b8\ub97c \ud1b5\uacfc\ud558\uc600\uc2b5\ub2c8\ub2e4.'
        : '\uc2e4\ud328\ud558\uc600\uc2b5\ub2c8\ub2e4.';

      html += `<div class="result-card ${statusClass}">`;
      html += `<div class="result-card-title">\ud14c\uc2a4\ud2b8 ${i + 1}</div>`;

      html += resultRow('\uc785\ub825\uac12 \u3009', r.input, '');
      html += resultRow('\uae30\ub313\uac12 \u3009', r.expectedOutput, '');
      html += resultRow(
        '\uc2e4\ud589 \uacb0\uacfc \u3009',
        resultMessage,
        r.passed ? 'pass' : 'fail'
      );

      if (r.compileOutput && r.compileExitCode !== 0) {
        html += resultRow('\ucef4\ud30c\uc77c \uc624\ub958 \u3009', r.compileOutput, 'error');
      }

      if (r.actualOutput) {
        html += resultRow('\ucd9c\ub825 \u3009', r.actualOutput.trimEnd(), '');
      }

      if (r.stderr) {
        html += resultRow('\uc5d0\ub7ec \u3009', r.stderr.trimEnd(), 'error');
      }

      html += '</div>';
    });

    el.innerHTML = html;
  }

  function resultRow(label, value, valueClass) {
    const cls = valueClass ? ` ${valueClass}` : '';
    return `
      <div class="result-row">
        <span class="result-label">${escapeHtml(label)}</span>
        <span class="result-value${cls}">${escapeHtml(value)}</span>
      </div>
    `;
  }

  function showError(message) {
    const el = container();
    if (!el) return;
    el.innerHTML = `
      <div class="result-summary some-fail">
        &#10007; Error: ${escapeHtml(message)}
      </div>
    `;
  }

  function clear() {
    const el = container();
    if (!el) return;
    el.innerHTML = '<div style="padding:20px;color:#888;text-align:center;">Run test cases to see results here.</div>';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    showLoading,
    showResults,
    showError,
    clear,
  };
})();
