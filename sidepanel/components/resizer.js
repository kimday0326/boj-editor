window.BOJEditor = window.BOJEditor || {};

window.BOJEditor.Resizer = (function () {
  let handle = null;
  let editorContainer = null;
  let bottomPanel = null;
  let isDragging = false;
  let startY = 0;
  let startEditorHeight = 0;
  let startBottomHeight = 0;

  const MIN_HEIGHT = 100;

  function init() {
    handle = document.getElementById('resize-handle');
    editorContainer = document.getElementById('editor-container');
    bottomPanel = document.getElementById('bottom-panel');

    if (!handle || !editorContainer || !bottomPanel) return;

    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    loadSavedRatio();
  }

  function onMouseDown(e) {
    isDragging = true;
    startY = e.clientY;
    startEditorHeight = editorContainer.getBoundingClientRect().height;
    startBottomHeight = bottomPanel.getBoundingClientRect().height;
    handle.classList.add('dragging');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!isDragging) return;

    const delta = e.clientY - startY;
    let newEditorHeight = startEditorHeight + delta;
    let newBottomHeight = startBottomHeight - delta;

    if (newEditorHeight < MIN_HEIGHT) {
      newEditorHeight = MIN_HEIGHT;
      newBottomHeight = startEditorHeight + startBottomHeight - MIN_HEIGHT;
    }

    if (newBottomHeight < MIN_HEIGHT) {
      newBottomHeight = MIN_HEIGHT;
      newEditorHeight = startEditorHeight + startBottomHeight - MIN_HEIGHT;
    }

    editorContainer.style.flex = 'none';
    editorContainer.style.height = newEditorHeight + 'px';
    bottomPanel.style.height = newBottomHeight + 'px';

    e.preventDefault();
  }

  function onMouseUp() {
    if (!isDragging) return;

    isDragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    saveRatio();
  }

  function saveRatio() {
    const totalHeight = editorContainer.getBoundingClientRect().height +
      bottomPanel.getBoundingClientRect().height;
    if (totalHeight > 0) {
      const ratio = editorContainer.getBoundingClientRect().height / totalHeight;
      chrome.storage.local.set({ 'boj-editor:resizer-ratio': ratio });
    }
  }

  async function loadSavedRatio() {
    const result = await chrome.storage.local.get('boj-editor:resizer-ratio');
    const ratio = result['boj-editor:resizer-ratio'];
    if (ratio && typeof ratio === 'number' && ratio > 0 && ratio < 1) {
      const toolbar = document.getElementById('toolbar');
      const resizeHandle = document.getElementById('resize-handle');
      const toolbarH = toolbar ? toolbar.getBoundingClientRect().height : 40;
      const handleH = resizeHandle ? resizeHandle.getBoundingClientRect().height : 5;
      const available = window.innerHeight - toolbarH - handleH;

      if (available > 200) {
        const editorH = Math.max(MIN_HEIGHT, Math.round(available * ratio));
        const bottomH = Math.max(MIN_HEIGHT, available - editorH);

        editorContainer.style.flex = 'none';
        editorContainer.style.height = editorH + 'px';
        bottomPanel.style.height = bottomH + 'px';
      }
    }
  }

  return {
    init,
  };
})();
