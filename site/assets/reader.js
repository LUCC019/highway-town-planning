import { renderCarWash } from "./editor-view.js";

const app = document.querySelector("#reader-app");

try {
  const response = await fetch("/api/formal", { cache: "no-store" });
  if (!response.ok) throw new Error("正式阅读版暂时无法打开");
  const { document: planningDocument } = await response.json();
  app.innerHTML = `
    <header class="reader-topbar">
      <div><strong>《破产双胞胎》策划案</strong><span>洗车行规则 · 实验阅读版</span></div>
      <a href="editor.html">返回编辑器</a>
    </header>
    <main class="editor-main"><div id="reader-document"></div></main>`;
  const readerRoot = document.querySelector("#reader-document");
  let selectedId = planningDocument.uiRules[0]?.id || 1;
  let expandedPopupKey = "";
  let expandedNestedPopupKey = "";
  const renderReader = () => {
    renderCarWash(readerRoot, planningDocument, {
      editable: false,
      selectedId,
      expandedPopupKey,
      expandedNestedPopupKey,
      onSelect: (id) => {
        selectedId = id;
        expandedPopupKey = "";
        expandedNestedPopupKey = "";
        renderReader();
      },
      onTogglePopup: (key) => {
        expandedPopupKey = expandedPopupKey === key ? "" : key;
        if (!expandedPopupKey) expandedNestedPopupKey = "";
        renderReader();
        if (expandedPopupKey) {
          requestAnimationFrame(() => document.querySelector(`[data-popup-expansion="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
        }
      },
      onToggleNestedPopup: (key) => {
        expandedNestedPopupKey = expandedNestedPopupKey === key ? "" : key;
        renderReader();
        if (expandedNestedPopupKey) {
          requestAnimationFrame(() => document.querySelector(`[data-nested-popup-expansion="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
        }
      },
    });
  };
  renderReader();
  app.setAttribute("aria-busy", "false");
} catch (error) {
  app.innerHTML = `<div class="editor-error">${error.message}</div>`;
}
