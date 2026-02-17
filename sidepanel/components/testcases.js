window.BOJEditor = window.BOJEditor || {};

window.BOJEditor.TestCases = (function () {
  let problemTestCases = [];
  let customTestCases = [];
  let problemId = null;
  let addFormVisible = false;
  let editingIndex = null;

  const container = () => document.getElementById('tab-content-testcases');

  function init(options = {}) {
    problemId = options.problemId || null;
    problemTestCases = options.testCases || [];
    customTestCases = options.customTestCases || [];
    render();
  }

  function getAllTestCases() {
    return [...problemTestCases, ...customTestCases];
  }

  function setCustomTestCases(tcs) {
    customTestCases = tcs;
    render();
  }

  function render() {
    const el = container();
    if (!el) return;

    let html = '';

    problemTestCases.forEach((tc, i) => {
      html += renderCard('Sample', i + 1, tc, false, i);
    });

    customTestCases.forEach((tc, i) => {
      const globalIdx = problemTestCases.length + i;
      html += renderCard('Custom', i + 1, tc, true, globalIdx);
    });

    if (addFormVisible) {
      html += renderAddForm();
    } else if (editingIndex === null) {
      html += '<button id="btn-add-tc">+ Add Test Case</button>';
    }

    el.innerHTML = html;
    bindEvents();
  }

  function renderCard(label, num, tc, isCustom, globalIdx) {
    const editBtn = isCustom
      ? `<button class="btn-edit-tc" data-idx="${globalIdx}" title="Edit">&#9998;</button>`
      : '';
    const deleteBtn = isCustom
      ? `<button class="btn-delete-tc" data-idx="${globalIdx}" title="Delete">&times;</button>`
      : '';

    if (editingIndex === globalIdx) {
      return renderEditForm(label, num, tc, globalIdx);
    }

    return `
      <div class="tc-card">
        <div class="tc-card-header">
          <span>${label} ${num}</span>
          <div class="tc-actions">${editBtn}${deleteBtn}</div>
        </div>
        <div class="tc-label">Input</div>
        <pre class="tc-pre">${escapeHtml(tc.input)}</pre>
        <div class="tc-label">Expected Output</div>
        <pre class="tc-pre">${escapeHtml(tc.expectedOutput)}</pre>
      </div>
    `;
  }

  function renderAddForm() {
    return `
      <div class="add-tc-form">
        <div class="tc-label">Input</div>
        <textarea class="tc-textarea" id="add-tc-input" rows="3" placeholder="Enter input..."></textarea>
        <div class="tc-label">Expected Output</div>
        <textarea class="tc-textarea" id="add-tc-output" rows="3" placeholder="Enter expected output..."></textarea>
        <div class="form-actions">
          <button class="btn-cancel-tc" id="add-tc-cancel">Cancel</button>
          <button class="btn-save-tc" id="add-tc-save">Add</button>
        </div>
      </div>
    `;
  }

  function renderEditForm(label, num, tc, globalIdx) {
    return `
      <div class="add-tc-form" data-edit-idx="${globalIdx}">
        <div class="tc-card-header">
          <span>${label} ${num} (Editing)</span>
        </div>
        <div class="tc-label">Input</div>
        <textarea class="tc-textarea" id="edit-tc-input" rows="3">${escapeHtml(tc.input)}</textarea>
        <div class="tc-label">Expected Output</div>
        <textarea class="tc-textarea" id="edit-tc-output" rows="3">${escapeHtml(tc.expectedOutput)}</textarea>
        <div class="form-actions">
          <button class="btn-cancel-tc" id="edit-tc-cancel">Cancel</button>
          <button class="btn-save-tc" id="edit-tc-save">Save</button>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    const el = container();
    if (!el) return;

    const addBtn = el.querySelector('#btn-add-tc');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addFormVisible = true;
        editingIndex = null;
        render();
        const inputEl = el.querySelector('#add-tc-input');
        if (inputEl) inputEl.focus();
      });
    }

    const addCancel = el.querySelector('#add-tc-cancel');
    if (addCancel) {
      addCancel.addEventListener('click', () => {
        addFormVisible = false;
        render();
      });
    }

    const addSave = el.querySelector('#add-tc-save');
    if (addSave) {
      addSave.addEventListener('click', async () => {
        const input = el.querySelector('#add-tc-input').value;
        const output = el.querySelector('#add-tc-output').value;
        if (!input.trim() && !output.trim()) return;

        customTestCases.push({
          input: input,
          expectedOutput: output,
          isCustom: true,
        });

        addFormVisible = false;
        await persistCustom();
        render();
      });
    }

    el.querySelectorAll('.btn-edit-tc').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingIndex = parseInt(btn.dataset.idx, 10);
        addFormVisible = false;
        render();
        const inputEl = el.querySelector('#edit-tc-input');
        if (inputEl) inputEl.focus();
      });
    });

    const editCancel = el.querySelector('#edit-tc-cancel');
    if (editCancel) {
      editCancel.addEventListener('click', () => {
        editingIndex = null;
        render();
      });
    }

    const editSave = el.querySelector('#edit-tc-save');
    if (editSave) {
      editSave.addEventListener('click', async () => {
        const input = el.querySelector('#edit-tc-input').value;
        const output = el.querySelector('#edit-tc-output').value;
        const customIdx = editingIndex - problemTestCases.length;

        if (customIdx >= 0 && customIdx < customTestCases.length) {
          customTestCases[customIdx] = {
            input: input,
            expectedOutput: output,
            isCustom: true,
          };
        }

        editingIndex = null;
        await persistCustom();
        render();
      });
    }

    el.querySelectorAll('.btn-delete-tc').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const globalIdx = parseInt(btn.dataset.idx, 10);
        const customIdx = globalIdx - problemTestCases.length;

        if (customIdx >= 0 && customIdx < customTestCases.length) {
          customTestCases.splice(customIdx, 1);
          if (editingIndex === globalIdx) editingIndex = null;
          await persistCustom();
          render();
        }
      });
    });
  }

  async function persistCustom() {
    if (problemId) {
      await window.BOJEditor.Storage.saveCustomTestCases(problemId, customTestCases);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    getAllTestCases,
    setCustomTestCases,
    render,
  };
})();
