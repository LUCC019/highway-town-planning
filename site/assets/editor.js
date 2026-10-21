import { renderCarWash } from "./editor-view.js";

const app = document.querySelector("#editor-app");
const state = {
  current: null,
  formal: null,
  savedDraft: null,
  selectedId: 1,
  expandedPopupKey: "",
  expandedNestedPopupKey: "",
  undo: [],
  editBaseline: null,
  versions: [],
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

async function api(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "操作没有完成");
    error.issues = payload.issues || [];
    throw error;
  }
  return payload;
}

function showToast(message, tone = "success") {
  const toast = document.querySelector("#editor-toast");
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function showIssues(title, issues) {
  const dialog = document.querySelector("#issues-dialog");
  dialog.querySelector("h2").textContent = title;
  dialog.querySelector("ul").innerHTML = issues.map((issue) => `<li>${String(issue).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</li>`).join("");
  dialog.showModal();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择"));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file) {
  if (!file?.type?.match(/^image\/(png|jpeg|webp)$/)) throw new Error("请选择 PNG、JPG 或 WebP 图片");
  if (file.size > 20 * 1024 * 1024) throw new Error("单张图片不能超过 20MB");
  return api("/api/upload-image", {
    method: "POST",
    body: JSON.stringify({ name: file.name, dataUrl: await fileToDataUrl(file) }),
  });
}

async function importPopupImage(entryIndex, file) {
  try {
    showToast("正在导入图片…");
    const result = await uploadImage(file);
    mutate(() => {
      const popup = selectedRule()?.rules?.[entryIndex]?.popup;
      if (popup) popup.image = result.path;
    });
    showToast("图片已加入草稿，记得保存草稿");
  } catch (error) {
    showIssues("图片添加失败", [error.message]);
  }
}

async function importNestedPopupImage(entryIndex, popupRuleIndex, file) {
  try {
    showToast("正在导入二级弹窗图片…");
    const result = await uploadImage(file);
    mutate(() => {
      const nestedPopup = selectedRule()?.rules?.[entryIndex]?.popup?.rules?.[popupRuleIndex]?.popup;
      if (nestedPopup) nestedPopup.image = result.path;
    });
    showToast("二级弹窗图片已加入草稿，记得保存草稿");
  } catch (error) {
    showIssues("图片添加失败", [error.message]);
  }
}

function isDirty() {
  return !equal(state.current, state.savedDraft);
}

function updateToolbar() {
  const dirty = isDirty();
  const status = document.querySelector("#draft-status");
  status.textContent = dirty ? "有未保存修改" : equal(state.current, state.formal) ? "与正式版一致" : "草稿已保存";
  status.dataset.state = dirty ? "dirty" : equal(state.current, state.formal) ? "formal" : "saved";
  document.querySelector("#undo-button").disabled = state.undo.length === 0;
  document.querySelector("#save-button").disabled = !dirty;
}

function pushUndo(snapshot) {
  if (!snapshot || equal(snapshot, state.current)) return;
  state.undo.push(clone(snapshot));
  if (state.undo.length > 50) state.undo.shift();
}

function selectedRule() {
  return state.current.uiRules.find((rule) => Number(rule.id) === Number(state.selectedId)) || state.current.uiRules[0];
}

function mutate(mutator, rerender = true) {
  const before = clone(state.current);
  mutator();
  pushUndo(before);
  if (rerender) renderDocument();
  updateToolbar();
}

function readEditableText(element) {
  return element.innerText
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function applyTextEdit(element) {
  const value = readEditableText(element);
  const field = element.dataset.editField;
  const rule = selectedRule();
  const entryIndex = Number(element.dataset.entryIndex);
  const entry = rule.rules[entryIndex];
  const popupRule = entry?.popup?.rules?.[Number(element.dataset.popupRuleIndex)];
  const nestedPopupRule = popupRule?.popup?.rules?.[Number(element.dataset.nestedRuleIndex)];
  if (field === "title") state.current.title = value;
  if (field === "summary") state.current.summary = value;
  if (field === "rule-title") rule.title = value;
  if (field === "rule-summary") rule.summary = value;
  if (field === "entry-label" && entry) entry.label = value;
  if (field === "entry-text" && entry) entry.text = value;
  if (field === "popup-title" && entry?.popup) entry.popup.title = value;
  if (field === "popup-summary" && entry?.popup) entry.popup.summary = value;
  if (field === "popup-rule-label" && popupRule) popupRule.label = value;
  if (field === "popup-rule-text" && popupRule) popupRule.text = value;
  if (field === "nested-popup-rule-label" && nestedPopupRule) nestedPopupRule.label = value;
  if (field === "nested-popup-rule-text" && nestedPopupRule) nestedPopupRule.text = value;
}

function bindEditing(root) {
  root.querySelectorAll("[data-edit-field]").forEach((element) => {
    element.addEventListener("focus", () => {
      state.editBaseline = clone(state.current);
    });
    element.addEventListener("input", () => {
      applyTextEdit(element);
      updateToolbar();
    });
    element.addEventListener("blur", () => {
      applyTextEdit(element);
      pushUndo(state.editBaseline);
      state.editBaseline = null;
      updateToolbar();
    });
    element.addEventListener("keydown", (event) => {
      if (element.hasAttribute("data-single-line") && event.key === "Enter") {
        event.preventDefault();
        element.blur();
      }
    });
  });

  root.querySelectorAll("[data-entry-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.entryAction;
      const index = Number(button.dataset.entryIndex);
      mutate(() => {
        const entries = selectedRule().rules;
        if (action === "delete") entries.splice(index, 1);
        if (action === "up" && index > 0) [entries[index - 1], entries[index]] = [entries[index], entries[index - 1]];
        if (action === "down" && index < entries.length - 1) [entries[index + 1], entries[index]] = [entries[index], entries[index + 1]];
      });
    });
  });

  root.querySelector("[data-add-entry]")?.addEventListener("click", () => {
    mutate(() => selectedRule().rules.push({ label: "新规则", text: "点击这里填写规则正文。" }));
  });
  root.querySelectorAll("[data-popup-add]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    mutate(() => {
      selectedRule().rules[entryIndex].popup = {
        id: `popup-${selectedRule().id}-${entryIndex + 1}`,
        title: "关联弹窗",
        summary: "等待补充已确认的弹窗界面截图与正式规则。",
        image: "",
        rules: [{ label: "待确认", text: "补充弹窗界面截图后填写正式规则。" }],
      };
      state.expandedPopupKey = `${selectedRule().id}:${entryIndex}`;
    });
  }));
  root.querySelectorAll("[data-popup-add-rule]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    mutate(() => selectedRule().rules[entryIndex].popup.rules.push({ label: "新规则", text: "点击这里填写弹窗规则说明。" }));
  }));
  root.querySelectorAll("[data-popup-rule-action]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    const popupRuleIndex = Number(button.dataset.popupRuleIndex);
    mutate(() => {
      const rules = selectedRule().rules[entryIndex].popup.rules;
      if (button.dataset.popupRuleAction === "delete") rules.splice(popupRuleIndex, 1);
      if (button.dataset.popupRuleAction === "up" && popupRuleIndex > 0) [rules[popupRuleIndex - 1], rules[popupRuleIndex]] = [rules[popupRuleIndex], rules[popupRuleIndex - 1]];
      if (button.dataset.popupRuleAction === "down" && popupRuleIndex < rules.length - 1) [rules[popupRuleIndex + 1], rules[popupRuleIndex]] = [rules[popupRuleIndex], rules[popupRuleIndex + 1]];
    });
  }));
  root.querySelectorAll("[data-nested-popup-add]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    const popupRuleIndex = Number(button.dataset.popupRuleIndex);
    mutate(() => {
      selectedRule().rules[entryIndex].popup.rules[popupRuleIndex].popup = {
        id: `popup-${selectedRule().id}-${entryIndex + 1}-${popupRuleIndex + 1}`,
        title: "关联弹窗",
        summary: "等待补充已确认的二级弹窗界面截图与正式规则。",
        image: "",
        rules: [{ label: "待确认", text: "补充二级弹窗界面截图后填写正式规则。" }],
      };
      state.expandedNestedPopupKey = `${selectedRule().id}:${entryIndex}:${popupRuleIndex}`;
    });
  }));
  root.querySelectorAll("[data-nested-popup-add-rule]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    const popupRuleIndex = Number(button.dataset.popupRuleIndex);
    mutate(() => selectedRule().rules[entryIndex].popup.rules[popupRuleIndex].popup.rules.push({ label: "新规则", text: "点击这里填写二级弹窗规则说明。" }));
  }));
  root.querySelectorAll("[data-nested-popup-rule-action]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    const popupRuleIndex = Number(button.dataset.popupRuleIndex);
    const nestedRuleIndex = Number(button.dataset.nestedRuleIndex);
    mutate(() => {
      const rules = selectedRule().rules[entryIndex].popup.rules[popupRuleIndex].popup.rules;
      if (button.dataset.nestedPopupRuleAction === "delete") rules.splice(nestedRuleIndex, 1);
      if (button.dataset.nestedPopupRuleAction === "up" && nestedRuleIndex > 0) [rules[nestedRuleIndex - 1], rules[nestedRuleIndex]] = [rules[nestedRuleIndex], rules[nestedRuleIndex - 1]];
      if (button.dataset.nestedPopupRuleAction === "down" && nestedRuleIndex < rules.length - 1) [rules[nestedRuleIndex + 1], rules[nestedRuleIndex]] = [rules[nestedRuleIndex], rules[nestedRuleIndex + 1]];
    });
  }));
}

function renderDocument() {
  renderCarWash(document.querySelector("#editor-document"), state.current, {
    editable: true,
    selectedId: state.selectedId,
    expandedPopupKey: state.expandedPopupKey,
    expandedNestedPopupKey: state.expandedNestedPopupKey,
    onSelect: (id) => {
      state.selectedId = id;
      state.expandedPopupKey = "";
      state.expandedNestedPopupKey = "";
      renderDocument();
    },
    onTogglePopup: (key) => {
      state.expandedPopupKey = state.expandedPopupKey === key ? "" : key;
      if (!state.expandedPopupKey) state.expandedNestedPopupKey = "";
      renderDocument();
      if (state.expandedPopupKey) {
        requestAnimationFrame(() => document.querySelector(`[data-popup-expansion="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
      }
    },
    onToggleNestedPopup: (key) => {
      state.expandedNestedPopupKey = state.expandedNestedPopupKey === key ? "" : key;
      renderDocument();
      if (state.expandedNestedPopupKey) {
        requestAnimationFrame(() => document.querySelector(`[data-nested-popup-expansion="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
      }
    },
    onPopupImageFile: importPopupImage,
    onPopupImageRemove: (entryIndex) => {
      mutate(() => {
        const popup = selectedRule()?.rules?.[entryIndex]?.popup;
        if (popup) popup.image = "";
      });
      showToast("图片已从草稿中移除");
    },
    onNestedPopupImageFile: importNestedPopupImage,
    onNestedPopupImageRemove: (entryIndex, popupRuleIndex) => {
      mutate(() => {
        const nestedPopup = selectedRule()?.rules?.[entryIndex]?.popup?.rules?.[popupRuleIndex]?.popup;
        if (nestedPopup) nestedPopup.image = "";
      });
      showToast("二级弹窗图片已从草稿中移除");
    },
    bindEditing,
  });
  updateToolbar();
}

function formatVersion(name) {
  const match = name.match(/car-wash-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-(\d{3})\.json/);
  if (!match) return name;
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
}

function renderVersions() {
  const list = document.querySelector("#version-list");
  if (!state.versions.length) {
    list.innerHTML = '<p class="editor-empty">还没有历史版本。首次发布后会自动留下发布前的正式版。</p>';
    return;
  }
  list.innerHTML = state.versions.map((version, index) => `
    <article>
      <div><strong>${formatVersion(version)}</strong><span>${index === 0 ? "最近备份" : "历史备份"}</span></div>
      <button type="button" data-restore-version="${version}">恢复为正式版</button>
    </article>`).join("");
  list.querySelectorAll("[data-restore-version]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm(`确定恢复 ${formatVersion(button.dataset.restoreVersion)} 吗？当前正式版也会先自动备份。`)) return;
      try {
        const result = await api("/api/restore-version", {
          method: "POST",
          body: JSON.stringify({ version: button.dataset.restoreVersion }),
        });
        state.current = clone(result.document);
        state.formal = clone(result.document);
        state.savedDraft = clone(result.document);
        state.versions = result.versions;
        state.undo = [];
        state.selectedId = state.current.uiRules[0]?.id || 1;
        document.querySelector("#history-dialog").close();
        renderDocument();
        showToast("历史版本已恢复，并成为新的正式版");
      } catch (error) {
        showIssues("恢复失败", error.issues?.length ? error.issues : [error.message]);
      }
    });
  });
}

function mountShell() {
  app.innerHTML = `
    <header class="editor-toolbar">
      <div class="editor-toolbar-brand">
        <span>本地实验</span>
        <div><strong>洗车行策划编辑器</strong><small>直接点击页面文字修改</small></div>
      </div>
      <div class="editor-toolbar-actions">
        <span id="draft-status" class="editor-status">载入中</span>
        <button id="undo-button" type="button">撤销</button>
        <button id="save-button" type="button" class="is-primary">保存草稿</button>
        <button id="reset-button" type="button">恢复正式版</button>
        <button id="history-button" type="button">历史版本</button>
        <button id="publish-button" type="button" class="is-publish">发布正式版</button>
        <a href="reader.html" target="_blank" rel="noopener">打开阅读版</a>
      </div>
    </header>
    <main class="editor-main">
      <div class="editor-note"><b>编辑提示</b><span>先点击左侧①—⑫，再直接修改右侧文字。保存草稿不会影响阅读版；只有发布后阅读版才更新。</span></div>
      <div id="editor-document"></div>
    </main>
    <div id="editor-toast" class="editor-toast" role="status" aria-live="polite"></div>
    <dialog id="issues-dialog" class="editor-dialog">
      <h2>发布前需要处理</h2>
      <ul></ul>
      <form method="dialog"><button type="submit">知道了</button></form>
    </dialog>
    <dialog id="history-dialog" class="editor-dialog editor-history-dialog">
      <div class="editor-dialog-head"><div><p>VERSION HISTORY</p><h2>历史版本</h2></div><form method="dialog"><button type="submit" aria-label="关闭">×</button></form></div>
      <div id="version-list" class="editor-version-list"></div>
    </dialog>`;

  document.querySelector("#undo-button").addEventListener("click", () => {
    const previous = state.undo.pop();
    if (!previous) return;
    state.current = previous;
    if (!state.current.uiRules.some((rule) => Number(rule.id) === Number(state.selectedId))) {
      state.selectedId = state.current.uiRules[0]?.id || 1;
    }
    renderDocument();
  });

  document.querySelector("#save-button").addEventListener("click", async () => {
    try {
      const result = await api("/api/draft", { method: "PUT", body: JSON.stringify({ document: state.current }) });
      state.current = clone(result.document);
      state.savedDraft = clone(result.document);
      renderDocument();
      showToast("草稿已保存，刷新后不会丢失");
    } catch (error) {
      showIssues("草稿保存失败", error.issues?.length ? error.issues : [error.message]);
    }
  });

  document.querySelector("#reset-button").addEventListener("click", async () => {
    if (!confirm("确定放弃当前草稿，恢复到最后一次正式发布的内容吗？")) return;
    try {
      const result = await api("/api/reset-draft", { method: "POST", body: "{}" });
      state.current = clone(result.document);
      state.savedDraft = clone(result.document);
      state.formal = clone(result.document);
      state.undo = [];
      state.selectedId = state.current.uiRules[0]?.id || 1;
      renderDocument();
      showToast("草稿已恢复为正式版");
    } catch (error) {
      showIssues("恢复失败", [error.message]);
    }
  });

  document.querySelector("#history-button").addEventListener("click", async () => {
    try {
      const result = await api("/api/versions");
      state.versions = result.versions;
      renderVersions();
      document.querySelector("#history-dialog").showModal();
    } catch (error) {
      showIssues("历史版本读取失败", [error.message]);
    }
  });

  document.querySelector("#publish-button").addEventListener("click", async () => {
    if (!confirm("确定发布当前内容吗？发布后实验阅读版会更新，并自动保留旧正式版。")) return;
    try {
      const result = await api("/api/publish", { method: "POST", body: JSON.stringify({ document: state.current }) });
      state.current = clone(result.document);
      state.formal = clone(result.document);
      state.savedDraft = clone(result.document);
      state.versions = result.versions;
      state.undo = [];
      renderDocument();
      showToast("发布成功，旧正式版已自动备份");
    } catch (error) {
      showIssues("发布前需要处理", error.issues?.length ? error.issues : [error.message]);
    }
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      document.querySelector("#save-button").click();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

try {
  const initial = await api("/api/state");
  state.current = clone(initial.draft);
  state.savedDraft = clone(initial.draft);
  state.formal = clone(initial.formal);
  state.versions = initial.versions;
  state.selectedId = state.current.uiRules[0]?.id || 1;
  mountShell();
  renderDocument();
  app.setAttribute("aria-busy", "false");
} catch (error) {
  app.innerHTML = `<div class="editor-error">编辑器没有正常打开：${error.message}</div>`;
}
