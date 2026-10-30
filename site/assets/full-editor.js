import { renderShopUiRulesCard } from "./editor-view.js?v=20261021-linked-navigation-v3";
import { normalizeLegacyRetailHtml } from "./convenience-minigame-layout.js?v=20261012-v1";
import { mountOnlineReaderStatus, startOnlineReaderSync, onlineReaderPage } from "./online-reader-client.js?v=20261021-v1";

const app = document.querySelector("#full-editor-app");
const mode = document.body.dataset.editorMode === "reader" ? "reader" : "edit";
const READER_LOCKED_GROUP_IDS = new Set(["story"]);
const state = {
  catalog: null,
  formal: { pages: {} },
  working: { pages: {} },
  savedDraft: { pages: {} },
  versions: [],
  currentPage: "index.html",
  currentFramePage: "index.html",
  currentTitle: "策划案总览",
  undo: [],
  editBaseline: null,
  saving: false,
  publishing: false,
  baseHtml: new Map(),
  collapsedGroups: new Set(JSON.parse(sessionStorage.getItem("full-editor-collapsed-groups") || "[]")),
  shopUi: {},
  missingShopUi: new Set(),
};

// Documents are JSON trees. Copy containers, not immutable image/HTML strings.
const clone = value => Array.isArray(value) ? value.map(clone) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clone(item)])) : value;
function equal(left,right) {
  if(left===right)return true;
  if(!left||!right||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return false;
  const keys=Object.keys(left);
  return keys.length===Object.keys(right).length&&keys.every(key=>Object.hasOwn(right,key)&&equal(left[key],right[key]));
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, {
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
      signal: options.signal || controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || "操作没有完成");
      error.issues = payload.issues || [];
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("阅读内容载入超时，请检查网络连接后刷新。");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message, tone = "success") {
  const toast = document.querySelector("#full-editor-toast");
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function showIssues(title, issues) {
  const dialog = document.querySelector("#full-issues-dialog");
  dialog.querySelector("h2").textContent = title;
  dialog.querySelector("ul").innerHTML = (issues?.length ? issues : ["操作没有完成"])
    .map((issue) => `<li>${escapeHtml(issue)}</li>`)
    .join("");
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

function allCatalogEntries() {
  return [
    state.catalog.overview,
    ...(state.catalog.standalonePages || []),
    ...state.catalog.groups.flatMap((group) => [
      { id: `category-${group.id}`, title: `${group.title} · 分类`, page: group.page },
      ...group.items,
    ]),
  ];
}

function normalizeCatalogPage(page) {
  try {
    const target = new URL(page || "index.html", location.href);
    const file = target.pathname.split("/").pop() || "index.html";
    if (file === "detail.html") {
      target.searchParams.delete("shopTab");
      target.searchParams.delete("checkpointTab");
    }
    if (file === "talent-system.html" || file === "partner-system.html") target.searchParams.delete("tab");
    return `${file}${target.search}`;
  } catch {
    return page || "index.html";
  }
}

function shopIdForPage(page = state.currentPage) {
  try {
    const target = new URL(page || "", location.href);
    if ((target.pathname.split("/").pop() || "") === "talent-system.html") return "talent-system";
    if ((target.pathname.split("/").pop() || "") === "partner-system.html") return "partner-system";
    if ((target.pathname.split("/").pop() || "") !== "detail.html") return "";
    return target.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

function activeShopUiState() {
  return state.shopUi[shopIdForPage()] || null;
}

function activeShopUiScreen(doc, uiState = activeShopUiState()) {
  return uiState?.selectedScreenId && uiState.selectedScreenId !== "main"
    ? doc.uiScreens?.find((screen) => screen.id === uiState.selectedScreenId) || doc
    : doc;
}

function activeShopUiRules(doc, uiState = activeShopUiState()) {
  return activeShopUiScreen(doc, uiState).uiRules;
}

function shopUiDirty(entry) {
  return Boolean(entry) && mode === "edit" && !equal(entry.current, entry.savedDraft);
}

function anyShopUiDirty() {
  return Object.values(state.shopUi).some((entry) => shopUiDirty(entry));
}

function allShopUiMatchFormal() {
  return Object.values(state.shopUi).every((entry) => equal(entry.current, entry.formal));
}

function findTitle(page) {
  if (page === "detail.html?id=doll-house") return "幸运抓抓系统";
  return allCatalogEntries().find((entry) => entry.page === page)?.title || "策划案页面";
}

function isReaderLockedPage(page) {
  if (mode !== "reader") return false;
  return state.catalog.groups.some((group) =>
    READER_LOCKED_GROUP_IDS.has(group.id)
      && (group.page === page || group.items.some((item) => item.page === page))
  );
}

function renderCatalog(filter = "") {
  const query = filter.trim().toLowerCase();
  const nav = document.querySelector("#full-page-nav");
  const standalonePages = (state.catalog.standalonePages || []).filter((item) =>
    item.id !== "interface-flow" && (!query || item.title.toLowerCase().includes(query))
  );
  const standaloneNav = standalonePages.map((item) => `
    <section class="full-page-group is-standalone">
      <button type="button" class="full-page-link is-category" data-page="${escapeHtml(item.page)}">
        <span>${escapeHtml(item.title)}</span><small>独立分页</small>
      </button>
    </section>`).join("");
  const overviewMatches = !query || state.catalog.overview.title.toLowerCase().includes(query);
  const overview = overviewMatches ? `
    <button type="button" class="full-page-link" data-page="${escapeHtml(state.catalog.overview.page)}">
      <span>总览</span><small>OVERVIEW</small>
    </button>` : "";
  const groups = state.catalog.groups.map((group) => {
    const afterGroup = group.id === "characters" ? standaloneNav : "";
    const groupMatches = !query || group.title.toLowerCase().includes(query);
    const items = group.items.filter((item) => groupMatches || item.title.toLowerCase().includes(query));
    if (!groupMatches && !items.length) return afterGroup;
    const readerLocked = mode === "reader" && READER_LOCKED_GROUP_IDS.has(group.id);
    if (readerLocked) {
      return `
        <section class="full-page-group is-reader-locked" data-group="${escapeHtml(group.id)}">
          <div class="full-page-group-heading">
            <button type="button" class="full-page-link is-category is-locked" disabled aria-label="${escapeHtml(group.title)}暂不开放">
              <span>${escapeHtml(group.title)}</span><small>暂不开放&nbsp; 🔒</small>
            </button>
          </div>
        </section>${afterGroup}`;
    }
    const collapsed = !query && state.collapsedGroups.has(group.id);
    return `
      <section class="full-page-group" data-group="${escapeHtml(group.id)}">
        <div class="full-page-group-heading">
          <button type="button" class="full-page-link is-category" data-page="${escapeHtml(group.page)}">
            <span>${escapeHtml(group.title)}</span><small>${items.length} 页</small>
          </button>
          <button type="button" class="full-page-group-toggle" data-group-toggle="${escapeHtml(group.id)}" aria-expanded="${!collapsed}" aria-label="${collapsed ? "展开" : "收起"}${escapeHtml(group.title)}" title="${collapsed ? "展开" : "收起"}">${collapsed ? "＋" : "−"}</button>
        </div>
        <div class="full-page-group-items"${collapsed ? " hidden" : ""}>
          ${items.map((item) => `<button type="button" class="full-page-link" data-page="${escapeHtml(item.page)}"><span>${escapeHtml(item.id === "doll-house" ? "幸运抓抓系统" : item.title)}</span></button>`).join("")}
        </div>
      </section>${afterGroup}`;
  }).join("");
  const flowNav = !query || "界面流程图".includes(query)
    ? '<section class="full-page-group is-standalone"><button type="button" class="full-page-link is-category" data-page="flow.html"><span>界面流程图</span><small>按系统查看</small></button></section>'
    : "";
  nav.innerHTML = overview + flowNav + groups || '<p class="full-page-empty">没有找到对应页面</p>';
  nav.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.page === state.currentPage);
    button.addEventListener("click", () => navigate(button.dataset.page));
  });
  nav.querySelectorAll("[data-group-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const groupId = button.dataset.groupToggle;
      if (state.collapsedGroups.has(groupId)) state.collapsedGroups.delete(groupId);
      else state.collapsedGroups.add(groupId);
      sessionStorage.setItem("full-editor-collapsed-groups", JSON.stringify([...state.collapsedGroups]));
      renderCatalog(document.querySelector("#full-page-search")?.value || "");
    });
  });
}

function isDirty() {
  return mode === "edit" && (!equal(state.working, state.savedDraft) || anyShopUiDirty());
}

function updateToolbar() {
  if (mode !== "edit") return;
  const dirty = isDirty();
  const matchesFormal = equal(state.working, state.formal) && allShopUiMatchFormal();
  const status = document.querySelector("#full-draft-status");
  status.textContent = dirty ? "有未保存修改" : matchesFormal ? "与正式版一致" : "草稿已保存";
  status.dataset.state = dirty ? "dirty" : matchesFormal ? "formal" : "saved";
  const activeUi = activeShopUiState();
  document.querySelector("#full-undo-button").disabled = state.undo.length === 0 && (!activeUi || activeUi.undo.length === 0);
  document.querySelector("#full-save-button").disabled = !dirty || state.saving || state.publishing;
  document.querySelector("#full-publish-button").disabled = state.publishing || state.saving;
}

function syncEmbeddedMotelUi() {
  const brandUi = state.shopUi["brand-pitch"];
  if (brandUi?.embedded && mode === "edit") {
    const key="[data-brand-ui-data]",page="detail.html?id=brand-pitch";
    const patches=state.working.pages[page] ||= {};
    const saved=state.savedDraft.pages[page]?.[key];
    if (!equal(brandUi.current,brandUi.savedDraft)) patches[key]=escapeHtml(JSON.stringify(brandUi.current));
    else if (saved===undefined) delete patches[key];
    else patches[key]=saved;
  }
  const ui = state.shopUi.home;
  if (!ui?.embedded || mode !== "edit") return;
  const key = "[data-motel-ui-data]";
  const saved = state.savedDraft.pages["detail.html?id=home"]?.[key];
  const patches = state.working.pages["detail.html?id=home"] ||= {};
  if (!equal(ui.current, ui.savedDraft)) patches[key] = escapeHtml(JSON.stringify(ui.current));
  else if (saved === undefined) delete patches[key];
  else patches[key] = saved;
}

function prepareEmbeddedMotelUi(frameDocument) {
  if (shopIdForPage() === "brand-pitch") {
    const marker=frameDocument.querySelector("[data-brand-ui-data]");
    if (!marker) { delete state.shopUi["brand-pitch"];return; }
    const existing=state.shopUi["brand-pitch"];
    if(existing?.embedded&&!equal(existing.current,existing.savedDraft))return;
    const current=JSON.parse(marker.textContent);
    const decode=(html,fallback)=>{try{const el=frameDocument.createElement("div");el.innerHTML=html;return JSON.parse(el.textContent);}catch{return clone(fallback);}};
    const key="[data-brand-ui-data]",page="detail.html?id=brand-pitch";
    const formal=decode(state.formal.pages[page]?.[key],{id:"brand-pitch",title:"达人秀",uiRules:[]});
    const saved=decode(state.savedDraft.pages[page]?.[key],current);
    state.shopUi["brand-pitch"]={embedded:true,formal,current,savedDraft:saved,selectedId:1,selectedScreenId:"main",expandedPopupKey:"",expandedNestedPopupKey:"",undo:[],editBaseline:null,versions:[]};
    return;
  }
  if (shopIdForPage() !== "home") return;
  const marker=frameDocument.querySelector("[data-motel-ui-data]");
  if (!marker) { delete state.shopUi.home; return; }
  // Keep unsaved structured edits across page switches; encode only at save/publish.
  const existing=state.shopUi.home;
  if(existing?.embedded&&!equal(existing.current,existing.savedDraft))return;
  const current=JSON.parse(marker.textContent);
  const decode=(html,fallback)=>{try{const el=frameDocument.createElement("div");el.innerHTML=html;return JSON.parse(el.textContent);}catch{return clone(fallback);}};
  const key="[data-motel-ui-data]",page="detail.html?id=home";
  const formal=decode(state.formal.pages[page]?.[key],current);
  const saved=decode(state.savedDraft.pages[page]?.[key],current);
  state.shopUi.home={embedded:true,formal,current,savedDraft:saved,selectedId:1,selectedScreenId:"main",expandedPopupKey:"",expandedNestedPopupKey:"",undo:[],editBaseline:null,versions:[]};
}

function pageSelector(element, root) {
  if (element.dataset.retailEditId) {
    const idSelector = `[data-retail-edit-id="${element.dataset.retailEditId}"]`;
    if (element.localName === "td") {
      const cellIndex = [...element.parentElement.children].filter(el => el.localName === "td").indexOf(element) + 1;
      return `tr:has(> ${idSelector}) > td:nth-of-type(${cellIndex})`;
    }
    return idSelector;
  }
  const parts = [];
  let cursor = element;
  while (cursor && cursor !== root) {
    let index = 1;
    let previous = cursor.previousElementSibling;
    while (previous) {
      if (previous.localName === cursor.localName) index += 1;
      previous = previous.previousElementSibling;
    }
    parts.unshift(`${cursor.localName}:nth-of-type(${index})`);
    cursor = cursor.parentElement;
  }
  return parts.join(" > ");
}

function editableCandidates(document, root) {
  const selector = [
    "main h1", "main h2", "main h3", "main h4",
    "main p", "main li", "main figcaption", "main td", "main th",
    "main .checkpoint-rule-section dt", "main .checkpoint-rule-section dd",
    "main .shop-ui-rules-card dt", "main .shop-ui-rules-card dd",
    "main .notice", "main .mapping", "main .unlock", "main .examples",
    "main .story-premise", "main .sequence-row", "main .where", "main .label",
  ].join(",");
  return [...document.querySelectorAll(selector)].filter((element) => {
    if (!root.contains(element)) return false;
    if (!element.textContent.trim() && !element.matches("td, th")) return false;
    if (element.closest("button, [role='button']")) return false;
    if (activeShopUiState() && element.closest("[data-shop-ui-rules], [data-shop-minigame-ui-rules]")) return false;
    return true;
  });
}

function rememberUndo(snapshot) {
  if (!snapshot || equal(snapshot, state.working)) return;
  state.undo.push(clone(snapshot));
  if (state.undo.length > 60) state.undo.shift();
}

function ensurePagePatches() {
  if (!state.working.pages[state.currentPage]) state.working.pages[state.currentPage] = {};
  return state.working.pages[state.currentPage];
}

function applyPagePatches(root, patches) {
  const legacyTargets = new Map([...root.querySelectorAll("[data-retail-legacy-selector]")].map(el => [el.dataset.retailLegacySelector, el]));
  const entries = Object.entries(patches || {}).sort(([a], [b]) => Number(!legacyTargets.has(a)) - Number(!legacyTargets.has(b)));
  entries.forEach(([selector, html]) => {
    try {
      const legacyElement = legacyTargets.get(selector);
      const element = legacyElement || root.querySelector(selector);
      if (element) element.innerHTML = legacyElement ? normalizeLegacyRetailHtml(element, html) : html;
    } catch {
      // Older snapshots may point at content that no longer exists; keep the page usable.
    }
  });
}

function bindFrameNavigation(frameDocument) {
  frameDocument.addEventListener("click", (event) => {
    if (event.target.closest("[contenteditable='true']")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const anchor = event.target.closest("a[href]");
    if (!anchor) return;
    const target = new URL(anchor.href, frameDocument.location.href);
    if (target.origin !== window.location.origin) return;
    if (target.pathname === frameDocument.location.pathname && target.search === frameDocument.location.search && target.hash) return;
    const framePage = `${target.pathname.split("/").pop() || "index.html"}${target.search}`;
    const page = normalizeCatalogPage(framePage);
    if (!allCatalogEntries().some((entry) => entry.page === page)) return;
    event.preventDefault();
    navigate(page, framePage);
  }, true);
}

function rememberShopUiUndo(uiState, snapshot) {
  if (!uiState || !snapshot) return;
  uiState.undo.push(clone(snapshot));
  if (uiState.undo.length > 60) uiState.undo.shift();
}

function mutateShopUi(mutator) {
  const uiState = activeShopUiState();
  if (!uiState) return;
  rememberShopUiUndo(uiState, uiState.current);
  mutator(uiState.current, uiState);
  renderInlineShopUi();
}

function readEditableText(element) {
  return element.innerText
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

async function importShopUiPopupImage(ruleId, entryIndex, file) {
  try {
    showToast("正在导入图片…");
    const result = await uploadImage(file);
    mutateShopUi((doc) => {
      const popup = activeShopUiRules(doc).find((item) => Number(item.id) === Number(ruleId))?.rules?.[entryIndex]?.popup;
      if (popup) popup.image = result.path;
    });
    showToast("图片已加入草稿，记得保存草稿");
  } catch (error) {
    showIssues("图片添加失败", [error.message]);
  }
}

async function importShopUiNestedPopupImage(ruleId, entryIndex, popupRuleIndex, file) {
  try {
    showToast("正在导入二级弹窗图片…");
    const result = await uploadImage(file);
    mutateShopUi((doc) => {
      const nestedPopup = activeShopUiRules(doc).find((item) => Number(item.id) === Number(ruleId))?.rules?.[entryIndex]?.popup?.rules?.[popupRuleIndex]?.popup;
      if (nestedPopup) nestedPopup.image = result.path;
    });
    showToast("二级弹窗图片已加入草稿，记得保存草稿");
  } catch (error) {
    showIssues("图片添加失败", [error.message]);
  }
}

function bindShopUiEditing(card, rule) {
  const uiState = activeShopUiState();
  if (!uiState) return;
  card.querySelectorAll("[data-edit-field]").forEach((element) => {
    const applyValue = () => {
      const value = readEditableText(element);
      const field = element.dataset.editField;
      const entry = rule.rules[Number(element.dataset.entryIndex)];
      const popupRule = entry?.popup?.rules?.[Number(element.dataset.popupRuleIndex)];
      const nestedPopupRule = popupRule?.popup?.rules?.[Number(element.dataset.nestedRuleIndex)];
      if (field === "screen-title") activeShopUiScreen(uiState.current, uiState).uiRulesTitle = value;
      else if (field === "screen-intro") activeShopUiScreen(uiState.current, uiState).uiRuleIntro = value;
      else if (field === "rule-title") rule.title = value;
      else if (field === "rule-summary") rule.summary = value;
      else if (field === "entry-label" && entry) entry.label = value;
      else if (field === "entry-text" && entry) entry.text = value;
      else if (field === "popup-title" && entry?.popup) entry.popup.title = value;
      else if (field === "popup-summary" && entry?.popup) entry.popup.summary = value;
      else if (field === "popup-rule-label" && popupRule) popupRule.label = value;
      else if (field === "popup-rule-text" && popupRule) popupRule.text = value;
      else if (field === "nested-popup-rule-label" && nestedPopupRule) nestedPopupRule.label = value;
      else if (field === "nested-popup-rule-text" && nestedPopupRule) nestedPopupRule.text = value;
    };
    element.addEventListener("focus", () => { uiState.editBaseline = clone(uiState.current); });
    element.addEventListener("keydown", (event) => {
      if (element.hasAttribute("data-single-line") && event.key === "Enter") { event.preventDefault(); element.blur(); }
    });
    element.addEventListener("paste", (event) => {
      event.preventDefault();
      card.ownerDocument.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    });
    element.addEventListener("input", () => {
      applyValue();
      updateToolbar();
    });
    element.addEventListener("blur", () => {
      applyValue();
      if (uiState.editBaseline && !equal(uiState.editBaseline, uiState.current)) rememberShopUiUndo(uiState, uiState.editBaseline);
      uiState.editBaseline = null;
      renderInlineShopUi();
    });
  });
  card.querySelector("[data-add-entry]")?.addEventListener("click", () => mutateShopUi((doc) => {
    activeShopUiRules(doc).find((item) => Number(item.id) === Number(rule.id)).rules.push({ label: "新规则", text: "点击这里填写规则说明。" });
  }));
  card.querySelectorAll("[data-entry-action]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.entryIndex);
    mutateShopUi((doc) => {
      const rules = activeShopUiRules(doc).find((item) => Number(item.id) === Number(rule.id)).rules;
      if (button.dataset.entryAction === "delete") rules.splice(index, 1);
      if (button.dataset.entryAction === "up" && index > 0) [rules[index - 1], rules[index]] = [rules[index], rules[index - 1]];
      if (button.dataset.entryAction === "down" && index < rules.length - 1) [rules[index + 1], rules[index]] = [rules[index], rules[index + 1]];
    });
  }));
  card.querySelectorAll("[data-popup-add]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    mutateShopUi((doc, draftState) => {
      const entry = activeShopUiRules(doc, draftState).find((item) => Number(item.id) === Number(rule.id)).rules[entryIndex];
      entry.popup = {
        id: `popup-${rule.id}-${entryIndex + 1}`,
        title: "关联弹窗",
        summary: "等待补充已确认的弹窗界面截图与正式规则。",
        image: "",
        rules: [{ label: "待确认", text: "补充弹窗界面截图后填写正式规则。" }],
      };
      draftState.expandedPopupKey = `${rule.id}:${entryIndex}`;
    });
  }));
  card.querySelectorAll("[data-popup-add-rule]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    mutateShopUi((doc) => {
      const popup = activeShopUiRules(doc).find((item) => Number(item.id) === Number(rule.id)).rules[entryIndex].popup;
      popup.rules.push({ label: "新规则", text: "点击这里填写弹窗规则说明。" });
    });
  }));
  card.querySelectorAll("[data-popup-rule-action]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    const popupRuleIndex = Number(button.dataset.popupRuleIndex);
    mutateShopUi((doc) => {
      const rules = activeShopUiRules(doc).find((item) => Number(item.id) === Number(rule.id)).rules[entryIndex].popup.rules;
      if (button.dataset.popupRuleAction === "delete") rules.splice(popupRuleIndex, 1);
      if (button.dataset.popupRuleAction === "up" && popupRuleIndex > 0) [rules[popupRuleIndex - 1], rules[popupRuleIndex]] = [rules[popupRuleIndex], rules[popupRuleIndex - 1]];
      if (button.dataset.popupRuleAction === "down" && popupRuleIndex < rules.length - 1) [rules[popupRuleIndex + 1], rules[popupRuleIndex]] = [rules[popupRuleIndex], rules[popupRuleIndex + 1]];
    });
  }));
  card.querySelectorAll("[data-nested-popup-add]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    const popupRuleIndex = Number(button.dataset.popupRuleIndex);
    mutateShopUi((doc, draftState) => {
      const popupRule = activeShopUiRules(doc, draftState).find((item) => Number(item.id) === Number(rule.id)).rules[entryIndex].popup.rules[popupRuleIndex];
      popupRule.popup = {
        id: `popup-${rule.id}-${entryIndex + 1}-${popupRuleIndex + 1}`,
        title: "关联弹窗",
        summary: "等待补充已确认的二级弹窗界面截图与正式规则。",
        image: "",
        rules: [{ label: "待确认", text: "补充二级弹窗界面截图后填写正式规则。" }],
      };
      draftState.expandedNestedPopupKey = `${rule.id}:${entryIndex}:${popupRuleIndex}`;
    });
  }));
  card.querySelectorAll("[data-nested-popup-add-rule]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    const popupRuleIndex = Number(button.dataset.popupRuleIndex);
    mutateShopUi((doc) => {
      const nestedPopup = activeShopUiRules(doc).find((item) => Number(item.id) === Number(rule.id)).rules[entryIndex].popup.rules[popupRuleIndex].popup;
      nestedPopup.rules.push({ label: "新规则", text: "点击这里填写二级弹窗规则说明。" });
    });
  }));
  card.querySelectorAll("[data-nested-popup-rule-action]").forEach((button) => button.addEventListener("click", () => {
    const entryIndex = Number(button.dataset.entryIndex);
    const popupRuleIndex = Number(button.dataset.popupRuleIndex);
    const nestedRuleIndex = Number(button.dataset.nestedRuleIndex);
    mutateShopUi((doc) => {
      const rules = activeShopUiRules(doc).find((item) => Number(item.id) === Number(rule.id)).rules[entryIndex].popup.rules[popupRuleIndex].popup.rules;
      if (button.dataset.nestedPopupRuleAction === "delete") rules.splice(nestedRuleIndex, 1);
      if (button.dataset.nestedPopupRuleAction === "up" && nestedRuleIndex > 0) [rules[nestedRuleIndex - 1], rules[nestedRuleIndex]] = [rules[nestedRuleIndex], rules[nestedRuleIndex - 1]];
      if (button.dataset.nestedPopupRuleAction === "down" && nestedRuleIndex < rules.length - 1) [rules[nestedRuleIndex + 1], rules[nestedRuleIndex]] = [rules[nestedRuleIndex], rules[nestedRuleIndex + 1]];
    });
  }));
}

function renderInlineShopUi() {
  const frameDocument = document.querySelector("#planning-frame").contentDocument;
  const isMinigameUi = Boolean(frameDocument?.querySelector('[data-shop-page-panel="minigame-ui"].is-active'));
  const card = frameDocument?.querySelector(isMinigameUi ? "[data-shop-minigame-ui-rules]" : "[data-shop-ui-rules]");
  if (!card) return;
  const uiState = activeShopUiState();
  if (shopIdForPage() === "main-town") {
    const source = uiState && (mode === "reader" ? uiState.formal : uiState.current);
    const hasRules = Boolean(source?.uiRules?.length);
    card.hidden = !hasRules;
    card.style.display = hasRules ? "" : "none";
    const legacyFlow = frameDocument.querySelector("[data-main-town-legacy-flow]");
    if (legacyFlow) {
      legacyFlow.hidden = hasRules;
      legacyFlow.style.display = hasRules ? "none" : "";
    }
    if (!hasRules) return;
  }
  if (!uiState) {
    if (shopIdForPage() === "talent-system") {
      card.innerHTML = `<h2>界面规则暂不可用</h2><p>${state.missingShopUi.has("talent-system")
        ? "人才系统的正式界面规则尚未发布，请稍后刷新。"
        : "未读取到人才系统的界面规则，请检查阅读服务后刷新。"}</p>`;
    }
    return;
  }
  const source = mode === "reader" ? uiState.formal : uiState.current;
  if (isMinigameUi) {
    const miniScreen = source.uiScreens?.find((screen) => screen.id === uiState.selectedScreenId && screen.id.startsWith("minigame-")) || source.uiScreens?.find((screen) => screen.id.startsWith("minigame-"));
    if (!miniScreen) { card.innerHTML = "<h2>小游戏界面待补充</h2><p>当前正式版尚未加入小游戏界面资料。</p>"; return; }
    if (uiState.selectedScreenId !== miniScreen.id) { uiState.selectedScreenId = miniScreen.id; uiState.selectedId = Number(miniScreen.uiRules?.[0]?.id || 1); uiState.expandedPopupKey = ""; uiState.expandedNestedPopupKey = ""; }
  } else if ((source.uiScreens?.find((screen) => screen.id === uiState.selectedScreenId)?.id || "").startsWith("minigame-")) {
    uiState.selectedScreenId = "main"; uiState.selectedId = Number(source.uiRules?.[0]?.id || 1); uiState.expandedPopupKey = ""; uiState.expandedNestedPopupKey = "";
  }
  try {
  renderShopUiRulesCard(card, source, {
    editable: mode === "edit",
    selectedId: uiState.selectedId,
    screenId: uiState.selectedScreenId,
    screenCategory: isMinigameUi ? "minigame" : "interface",
    expandedPopupKey: uiState.expandedPopupKey,
    expandedNestedPopupKey: uiState.expandedNestedPopupKey,
    onSelectScreen(id, jump = {}) {
      const nextIsMinigame = id.startsWith("minigame-");
      if (nextIsMinigame !== isMinigameUi) {
        frameDocument.querySelector(`[data-shop-page-tab="${nextIsMinigame ? "minigame-ui" : "interface"}"]`)?.click();
      }
      uiState.selectedScreenId = id;
      const rules = activeShopUiRules(source, uiState) || [];
      uiState.selectedId = Number(rules.find((rule) => Number(rule.id) === jump.ruleId)?.id || rules[0]?.id || 1);
      uiState.expandedPopupKey = jump.popupKey || "";
      uiState.expandedNestedPopupKey = jump.nestedPopupKey || "";
      renderInlineShopUi();
    },
    onSelect(id) {
      uiState.selectedId = id;
      uiState.expandedPopupKey = "";
      uiState.expandedNestedPopupKey = "";
      renderInlineShopUi();
    },
    onTogglePopup(key) {
      uiState.expandedPopupKey = uiState.expandedPopupKey === key ? "" : key;
      if (!uiState.expandedPopupKey) uiState.expandedNestedPopupKey = "";
      renderInlineShopUi();
      if (uiState.expandedPopupKey) {
        requestAnimationFrame(() => {
          const expanded = frameDocument.querySelector(`[data-popup-expansion="${CSS.escape(key)}"]`);
          expanded?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    },
    onToggleNestedPopup(key) {
      uiState.expandedNestedPopupKey = uiState.expandedNestedPopupKey === key ? "" : key;
      renderInlineShopUi();
      if (uiState.expandedNestedPopupKey) {
        requestAnimationFrame(() => {
          const expanded = frameDocument.querySelector(`[data-nested-popup-expansion="${CSS.escape(key)}"]`);
          expanded?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    },
    onPopupImageFile(entryIndex, file) {
      importShopUiPopupImage(uiState.selectedId, entryIndex, file);
    },
    onPopupImageRemove(entryIndex) {
      mutateShopUi((doc) => {
        const popup = activeShopUiRules(doc, uiState).find((item) => Number(item.id) === Number(uiState.selectedId))?.rules?.[entryIndex]?.popup;
        if (popup) popup.image = "";
      });
      showToast("图片已从草稿中移除");
    },
    onNestedPopupImageFile(entryIndex, popupRuleIndex, file) {
      importShopUiNestedPopupImage(uiState.selectedId, entryIndex, popupRuleIndex, file);
    },
    onNestedPopupImageRemove(entryIndex, popupRuleIndex) {
      mutateShopUi((doc) => {
        const nestedPopup = activeShopUiRules(doc, uiState).find((item) => Number(item.id) === Number(uiState.selectedId))?.rules?.[entryIndex]?.popup?.rules?.[popupRuleIndex]?.popup;
        if (nestedPopup) nestedPopup.image = "";
      });
      showToast("二级弹窗图片已从草稿中移除");
    },
    bindEditing: bindShopUiEditing,
  });
  } catch {
    card.innerHTML = "<h2>界面规则暂不可用</h2><p>当前页面的界面规则数据无法显示，请检查数据后刷新。</p>";
    return;
  }
  if (mode !== "edit") return;
  updateToolbar();
}

function prepareFrame() {
  const frame = document.querySelector("#planning-frame");
  const frameDocument = frame.contentDocument;
  // The flow tool owns its structured draft and explicit per-system publication.
  if (frameDocument?.querySelector("#flow-app")) {
    document.querySelector("#full-frame-status").textContent = mode === "edit" ? "流程独立保存 · 使用画布内的保存与发布按钮" : "已发布流程 · 只读";
    app.setAttribute("aria-busy", "false");
    return;
  }
  const root = frameDocument?.querySelector("#app");
  // 822规则正文由MD异步载入；等正文就绪后再绑定编辑和草稿，避免空页面先触发load。
  if (root && ["convenience-store", "gas-station", "home", "wealth-hall"].includes(new URL(frameDocument.location.href).searchParams.get("id")) && !root.children.length) {
    frameDocument.addEventListener("retail-document-ready", prepareFrame, { once: true });
    return;
  }
  if (!frameDocument || !root) {
    document.querySelector("#full-frame-status").textContent = "这个页面暂时无法载入";
    return;
  }

  // iframe 内使用“返回”时，同步整案编辑器的当前页，避免外层标题仍停在人才系统。
  const loadedUrl = new URL(frameDocument.location.href);
  const loadedFramePage = `${loadedUrl.pathname.split("/").pop() || "index.html"}${loadedUrl.search}`;
  const loadedPage = normalizeCatalogPage(loadedFramePage);
  if (loadedPage !== state.currentPage && allCatalogEntries().some((entry) => entry.page === loadedPage)) {
    state.currentPage = loadedPage;
    state.currentFramePage = loadedFramePage;
    state.currentTitle = findTitle(loadedPage);
    history.replaceState(null, "", `${mode === "reader" ? "reader.html" : "editor.html"}?page=${encodeURIComponent(loadedFramePage)}`);
    renderCatalog(document.querySelector("#full-page-search")?.value || "");
    document.querySelector("#full-current-title").textContent = state.currentTitle;
    if (mode === "edit") document.querySelector("#full-reader-link").href = onlineReaderPage(loadedFramePage);
  }

  const integratedLayoutStyle = frameDocument.createElement("style");
  integratedLayoutStyle.dataset.fullEditorLayout = "true";
  integratedLayoutStyle.textContent = `
    .shell > .sidebar { display: none !important; }
    .shell { grid-template-columns: minmax(0, 1fr) !important; justify-content: stretch !important; }
    .shell > main { width: 100% !important; max-width: none !important; }
  `;
  frameDocument.head.append(integratedLayoutStyle);

  state.baseHtml = new Map();
  const candidates = editableCandidates(frameDocument, root);
  candidates.forEach((element) => state.baseHtml.set(pageSelector(element, root), element.innerHTML));
  const registry = mode === "reader" ? state.formal : state.working;
  applyPagePatches(root, registry.pages[state.currentPage]);
  prepareEmbeddedMotelUi(frameDocument);
  bindFrameNavigation(frameDocument);
  if (["gas-station", "convenience-store", "home", "wealth-hall"].includes(loadedUrl.searchParams.get("id"))) {
    frameDocument.addEventListener("gas-shop-page-change", () => {
      const targetUrl = new URL(frameDocument.location.href);
      state.currentFramePage = `${targetUrl.pathname.split("/").pop()}${targetUrl.search}`;
      history.replaceState(null, "", `${mode === "reader" ? "reader.html" : "editor.html"}?page=${encodeURIComponent(state.currentFramePage)}`);
      const readerLink = document.querySelector("#full-reader-link");
      if (readerLink) readerLink.href = onlineReaderPage(state.currentFramePage);
      renderInlineShopUi();
    });
  }

  if (mode === "edit") {
    const editorStyle = frameDocument.createElement("style");
    editorStyle.textContent = `
      [data-full-editor-target="true"] {
        border-radius: 5px;
        outline: 0;
        transition: background .15s ease, box-shadow .15s ease;
      }
      [data-full-editor-target="true"]:hover {
        background: rgba(255, 224, 137, .22) !important;
        box-shadow: 0 0 0 3px rgba(227, 177, 61, .18);
        cursor: text;
      }
      [data-full-editor-target="true"]:focus,
      [data-full-editor-target="true"].full-editor-focus {
        background: #fffdf7 !important;
        color: #213b55 !important;
        box-shadow: 0 0 0 3px #edbd52;
      }
    `;
    frameDocument.head.append(editorStyle);
    editableCandidates(frameDocument, root).forEach((element) => {
      const selector = pageSelector(element, root);
      element.contentEditable = "true";
      element.spellcheck = true;
      element.dataset.fullEditorTarget = "true";
      element.title = "点击直接修改";
      element.addEventListener("focus", () => {
        state.editBaseline = clone(state.working);
        element.classList.add("full-editor-focus");
      });
      element.addEventListener("paste", (event) => {
        event.preventDefault();
        frameDocument.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
      });
      element.addEventListener("input", () => {
        const patches = ensurePagePatches();
        // A moved field switches to its stable ID only when the user edits it.
        if (element.dataset.retailLegacySelector) delete patches[element.dataset.retailLegacySelector];
        const base = state.baseHtml.get(selector);
        if (element.innerHTML === base) delete patches[selector];
        else patches[selector] = element.innerHTML;
        if (!Object.keys(patches).length) delete state.working.pages[state.currentPage];
        updateToolbar();
      });
      element.addEventListener("blur", () => {
        element.classList.remove("full-editor-focus");
        rememberUndo(state.editBaseline);
        state.editBaseline = null;
        updateToolbar();
      });
    });
  }

  document.querySelector("#full-frame-status").textContent = mode === "edit"
    ? "页面已载入 · 点击正文直接修改"
    : "正式阅读版";
  document.querySelector("#full-current-title").textContent = state.currentTitle;
  if (activeShopUiState()) {
    if (!frameDocument.querySelector('link[data-inline-shop-ui-style]')) {
      const stylesheet = frameDocument.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "assets/editor.css?v=20261013-main-town-hotspots";
      stylesheet.dataset.inlineShopUiStyle = "true";
      frameDocument.head.append(stylesheet);
    }
  }
  renderInlineShopUi();
  if (mode === "edit") {
    const focusSelector = new URLSearchParams(location.search).get("acceptFocus");
    if (focusSelector && focusSelector.length <= 500) {
      try {
        const target = frameDocument.querySelector(focusSelector);
        if (target && target.getClientRects().length) {
          target.scrollIntoView({ block: "center", behavior: "instant" });
          target.animate([{ outline: "3px solid #d8a938" }, { outline: "3px solid transparent" }], { duration: 2400 });
        } else {
          document.querySelector("#full-frame-status").textContent += " · 已到对应页签，请按验收台路径定位条目";
        }
      } catch { /* Invalid or outdated locator must never stop editing. */ }
    }
  }
  app.setAttribute("aria-busy", "false");
}

function navigate(page, framePage = page) {
  const flowWindow = document.querySelector("#planning-frame")?.contentWindow;
  if (flowWindow?.interfaceFlowCanLeave && !flowWindow.interfaceFlowCanLeave()) return;
  page = normalizeCatalogPage(page);
  if (!allCatalogEntries().some((entry) => entry.page === page) || isReaderLockedPage(page)) page = state.catalog.overview.page;
  if (normalizeCatalogPage(framePage) !== page) framePage = page;
  state.currentPage = page;
  state.currentFramePage = framePage;
  state.currentTitle = findTitle(page);
  const file = mode === "reader" ? "reader.html" : "editor.html";
  history.replaceState(null, "", `${file}?page=${encodeURIComponent(framePage)}`);
  renderCatalog(document.querySelector("#full-page-search")?.value || "");
  document.querySelector("#full-current-title").textContent = state.currentTitle;
  document.querySelector("#full-frame-status").textContent = "正在载入页面…";
  if (mode === "edit") {
    document.querySelector("#full-reader-link").href = onlineReaderPage(framePage);
  }
  const isFlow = page === "flow.html";
  if (mode === "edit") {
    for (const id of ["full-draft-status", "full-undo-button", "full-save-button", "full-reset-button", "full-history-button", "full-publish-button"]) {
      document.getElementById(id).hidden = isFlow;
      document.getElementById(id).style.display = isFlow ? "none" : "";
    }
    document.querySelector(".full-page-bar > p").hidden = isFlow;
  }
  document.querySelector("#planning-frame").src = isFlow ? "flow.html?mode=" + (mode === "reader" ? "reader" : "edit") : framePage;
}

function formatVersion(name) {
  const match = name.match(/(?:full-site|[a-z0-9-]+)-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-(\d{3})\.json/);
  if (!match) return name;
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
}

function renderVersions() {
  const list = document.querySelector("#full-version-list");
  const fullVersions = state.versions.length ? state.versions.map((version, index) => `
    <article><div><strong>${formatVersion(version)}</strong><span>${index === 0 ? "最近备份" : "历史备份"}</span></div>
    <button type="button" data-restore-version="${escapeHtml(version)}">恢复整份策划案</button></article>`).join("") : '<p class="full-version-empty">还没有整案历史版本。</p>';
  const shopUiVersions = Object.entries(state.shopUi).map(([id, uiState]) => {
    const versions = uiState.versions.length ? uiState.versions.map((version, index) => `
      <article><div><strong>${formatVersion(version)}</strong><span>${index === 0 ? "最近备份" : "历史备份"}</span></div>
      <button type="button" data-shop-ui-restore="${escapeHtml(version)}" data-shop-ui-id="${escapeHtml(id)}">恢复${escapeHtml(uiState.current.title)}界面规则</button></article>`).join("") : `<p class="full-version-empty">还没有${escapeHtml(uiState.current.title)}界面规则历史版本。</p>`;
    return `<section class="full-version-section"><h3>${escapeHtml(uiState.current.title)}界面规则</h3>${versions}</section>`;
  }).join("");
  list.innerHTML = `<section class="full-version-section"><h3>整份策划案</h3>${fullVersions}</section>${shopUiVersions}`;
  list.querySelectorAll("[data-restore-version]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm(`确定恢复 ${formatVersion(button.dataset.restoreVersion)} 吗？当前正式版也会先自动备份。`)) return;
      try {
        const result = await api("/api/full/restore-version", {
          method: "POST",
          body: JSON.stringify({ version: button.dataset.restoreVersion }),
        });
        state.formal = clone(result.document);
        state.working = clone(result.document);
        state.savedDraft = clone(result.document);
        state.versions = result.versions;
        state.undo = [];
        document.querySelector("#full-history-dialog").close();
        delete state.shopUi.home;
        delete state.shopUi["brand-pitch"];
        navigate(state.currentPage);
        updateToolbar();
        showToast("整份策划案已恢复到所选版本");
      } catch (error) {
        showIssues("恢复失败", error.issues?.length ? error.issues : [error.message]);
      }
    });
  });
  list.querySelectorAll("[data-shop-ui-restore]").forEach((button) => button.addEventListener("click", async () => {
    const id = button.dataset.shopUiId;
    const uiState = state.shopUi[id];
    if (!uiState || !confirm(`确定恢复 ${formatVersion(button.dataset.shopUiRestore)} 的${uiState.current.title}界面规则吗？`)) return;
    try {
      const result = await api("/api/shop-ui/restore-version", { method: "POST", body: JSON.stringify({ id, version: button.dataset.shopUiRestore }) });
      uiState.formal = clone(result.document);
      uiState.current = clone(result.document);
      uiState.savedDraft = clone(result.document);
      uiState.versions = result.versions;
      uiState.undo = [];
      document.querySelector("#full-history-dialog").close();
      renderInlineShopUi();
      updateToolbar();
      showToast(`${uiState.current.title}界面规则已恢复到所选版本`);
    } catch (error) {
      showIssues("恢复失败", error.issues?.length ? error.issues : [error.message]);
    }
  }));
}

function mountShell() {
  const editorActions = mode === "edit" ? `
    <span id="full-draft-status" class="full-editor-status">载入中</span>
    <button id="full-undo-button" type="button">撤销</button>
    <button id="full-save-button" type="button" class="is-primary">保存草稿</button>
    <button id="full-reset-button" type="button">恢复正式版</button>
    <button id="full-history-button" type="button">历史版本</button>
    <button id="full-publish-button" type="button" class="is-publish">发布整案</button>
    <a id="full-reader-link" href="${onlineReaderPage()}" target="_blank" rel="noopener">打开阅读版</a>` : `
    <span class="full-reader-badge">正式阅读版</span>`;

  app.innerHTML = `
    <header class="full-editor-toolbar">
      <div class="full-editor-brand"><span>${mode === "edit" ? "本地实验" : "只读"}</span><div><strong>《破产双胞胎》整案${mode === "edit" ? "编辑器" : "阅读版"}</strong><small>${mode === "edit" ? "原页面直接修改，原始HTML保持不动" : "这里只显示已经发布的正式内容"}</small></div></div>
      <div class="full-editor-actions">${editorActions}</div>
    </header>
    <div class="full-editor-layout">
      <aside class="full-editor-catalog">
        <div class="full-catalog-head"><p>DOCUMENT MAP</p><h2>完整策划案</h2><span>总览＋全部分类与详情页</span>${mode === "edit" ? '<p><a id="acceptance-desk-entry" href="/api/acceptance/desk" target="_blank" rel="noopener">修改与验收台 ↗</a></p>' : ''}</div>
        <label class="full-page-search"><span>查找页面</span><input id="full-page-search" type="search" placeholder="输入角色、商铺或章节" /></label>
        <nav id="full-page-nav" aria-label="完整策划案目录"></nav>
        ${mode === "edit" ? '<div class="full-catalog-extra"><a href="index.html" target="_blank" rel="noopener">打开原始副本对照</a></div>' : ""}
      </aside>
      <main class="full-editor-workspace">
        <header class="full-page-bar"><div><span id="full-frame-status">正在载入页面…</span><h1 id="full-current-title">策划案总览</h1></div>${mode === "edit" ? '<p>文字可直接点击修改；弹窗图片支持选择、拖入或粘贴。</p>' : ""}</header>
        <div class="full-frame-wrap"><iframe id="planning-frame" title="策划案页面"></iframe></div>
      </main>
    </div>
    <div id="full-editor-toast" class="full-editor-toast" role="status" aria-live="polite"></div>
    <dialog id="full-issues-dialog" class="full-editor-dialog"><h2>发布前需要处理</h2><ul></ul><form method="dialog"><button type="submit">知道了</button></form></dialog>
    <dialog id="full-history-dialog" class="full-editor-dialog full-history-dialog"><div class="full-dialog-head"><div><p>VERSION HISTORY</p><h2>历史版本</h2></div><form method="dialog"><button type="submit" aria-label="关闭">×</button></form></div><div id="full-version-list" class="full-version-list"></div></dialog>`;

  document.querySelector("#planning-frame").addEventListener("load", prepareFrame);
  if (mode === "edit") mountOnlineReaderStatus(document.querySelector(".full-page-bar > p"));
  document.querySelector("#full-page-search").addEventListener("input", (event) => renderCatalog(event.target.value));

  if (mode === "edit") {
    document.querySelector("#full-undo-button").addEventListener("click", () => {
      const activeUi = activeShopUiState();
      if (activeUi?.undo.length) {
        activeUi.current = activeUi.undo.pop();
        renderInlineShopUi();
        return;
      }
      const previous = state.undo.pop();
      if (!previous) return;
      state.working = previous;
      navigate(state.currentPage);
      updateToolbar();
    });
    document.querySelector("#full-save-button").addEventListener("click", async () => {
      if (state.saving) return;
      state.saving = true;
      updateToolbar();
      try {
        syncEmbeddedMotelUi();
        const fullNeedsSave = !equal(state.working, state.savedDraft);
        const dirtyShopEntries = Object.entries(state.shopUi).filter(([, uiState]) => !uiState.embedded && shopUiDirty(uiState));
        const submittedFull = clone(state.working);
        const submittedUi = new Map(Object.entries(state.shopUi).map(([id, ui]) => [id, clone(ui.current)]));
        const [fullResult, shopResults] = await Promise.all([
          fullNeedsSave ? api("/api/full/draft", { method: "PUT", body: JSON.stringify({ document: submittedFull }) }) : Promise.resolve(null),
          Promise.all(dirtyShopEntries.map(([id, uiState]) => api("/api/shop-ui/draft", { method: "PUT", body: JSON.stringify({ id, document: submittedUi.get(id), ...(["talent-system", "partner-system", "doll-house", "talent-market"].includes(id) ? { baseRevision: uiState.revision } : {}) }) }))),
        ]);
        if (fullResult) {
          if (equal(state.working, submittedFull)) state.working = clone(fullResult.document);
          state.savedDraft = clone(fullResult.document);
          Object.entries(state.shopUi).filter(([,ui])=>ui.embedded).forEach(([id,ui])=>{if(submittedUi.has(id))ui.savedDraft=clone(submittedUi.get(id));});
        }
        shopResults.forEach((result) => {
          const uiState = state.shopUi[result.id];
          if (equal(uiState.current, submittedUi.get(result.id))) uiState.current = clone(result.document);
          uiState.savedDraft = clone(result.document);
          if (["talent-system", "partner-system", "doll-house", "talent-market"].includes(result.id)) uiState.revision = result.revision;
        });
        // Keep the focused field and any typing made while the request was in flight.
        updateToolbar();
        showToast(isDirty() ? "本次草稿已保存；期间新增的修改请再次保存" : "整份草稿已保存，刷新后不会丢失");
      } catch (error) {
        showIssues("草稿保存失败", error.issues?.length ? error.issues : [error.message]);
      } finally {
        state.saving = false;
        updateToolbar();
      }
    });
    document.querySelector("#full-reset-button").addEventListener("click", async () => {
      if (!confirm("确定放弃所有未发布草稿，恢复到最后一次正式发布的整份策划案吗？")) return;
      try {
        const [fullResult, shopResult] = await Promise.all([
          api("/api/full/reset-draft", { method: "POST", body: "{}" }),
          api("/api/shop-ui/reset-draft", { method: "POST", body: "{}" }),
        ]);
        state.working = clone(fullResult.document);
        state.savedDraft = clone(fullResult.document);
        state.formal = clone(fullResult.document);
        Object.entries(shopResult.documents).forEach(([id, document]) => {
          const uiState = state.shopUi[id];
          uiState.current = clone(document);
          uiState.savedDraft = clone(document);
          uiState.formal = clone(document);
          uiState.undo = [];
        });
        state.undo = [];
        delete state.shopUi.home;
        delete state.shopUi["brand-pitch"];
        navigate(state.currentPage);
        updateToolbar();
        showToast("全部草稿已恢复为正式版");
      } catch (error) {
        showIssues("恢复失败", [error.message]);
      }
    });
    document.querySelector("#full-history-button").addEventListener("click", async () => {
      try {
        const [fullResult, shopResult] = await Promise.all([api("/api/full/versions"), api("/api/shop-ui/state")]);
        state.versions = fullResult.versions;
        Object.entries(shopResult.documents).forEach(([id, result]) => {
          if (state.shopUi[id]) state.shopUi[id].versions = result.versions || [];
        });
        renderVersions();
        document.querySelector("#full-history-dialog").showModal();
      } catch (error) {
        showIssues("历史版本读取失败", [error.message]);
      }
    });
    document.querySelector("#full-publish-button").addEventListener("click", async () => {
      if (state.publishing) return;
      if (!confirm("确定发布当前整份策划案吗？发布后阅读版会更新，并自动备份旧正式版。")) return;
      state.publishing = true;
      updateToolbar();
      try {
        syncEmbeddedMotelUi();
        const submittedFull = clone(state.working);
        const submittedUi = new Map(Object.entries(state.shopUi).map(([id,ui])=>[id,clone(ui.current)]));
        const batchHeaders = {"Content-Type":"application/json","X-Online-Publish-Batch":"1"};
        const [fullResult, shopResults] = await Promise.all([
          api("/api/full/publish", { method: "POST", headers: batchHeaders, body: JSON.stringify({ document: submittedFull }) }),
          Promise.all(Object.entries(state.shopUi).filter(([,ui])=>!ui.embedded).map(([id]) => api("/api/shop-ui/publish", { method: "POST", headers: batchHeaders, body: JSON.stringify({ id, document: submittedUi.get(id) }) }))),
        ]);
        const unchanged = equal(state.working, submittedFull);
        state.formal = clone(fullResult.document);
        if (unchanged) state.working = clone(fullResult.document);
        state.savedDraft = clone(fullResult.document);
        state.versions = fullResult.versions;
        Object.entries(state.shopUi).filter(([,ui])=>ui.embedded).forEach(([id,ui])=>{const sent=submittedUi.get(id);if(sent){ui.formal=clone(sent);ui.savedDraft=clone(sent);if(equal(ui.current,sent))ui.undo=[];}});
        shopResults.forEach((result) => {
          const uiState = state.shopUi[result.id];
          uiState.formal = clone(result.document);
          const uiUnchanged = equal(uiState.current, submittedUi.get(result.id));
          if (uiUnchanged) uiState.current = clone(result.document);
          uiState.savedDraft = clone(result.document);
          uiState.versions = result.versions;
          if (uiUnchanged) uiState.undo = [];
          if (result.revision) uiState.revision = result.revision;
        });
        if (unchanged) state.undo = [];
        updateToolbar();
        try { await startOnlineReaderSync(); showToast("本地已发布并备份，正在同步在线阅读版"); }
        catch (error) { showIssues("本地已发布，在线同步未启动", [error.message, "可点击“重试同步”，无需重新发布草稿。"]); }
      } catch (error) {
        showIssues("发布前需要处理", error.issues?.length ? error.issues : [error.message]);
      } finally {
        state.publishing = false;
        updateToolbar();
      }
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        document.querySelector("#full-save-button").click();
      }
    });
    window.addEventListener("beforeunload", (event) => {
      if (!isDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }
}

try {
  const [catalogResult, stateResult, shopUiResult] = await Promise.all([
    api("/api/full/catalog"),
    api(mode === "reader" ? "/api/full/formal" : "/api/full/state"),
    api(mode === "reader" ? "/api/shop-ui/formal" : "/api/shop-ui/state"),
  ]);
  state.catalog = catalogResult.catalog;
  if (mode === "reader") {
    state.formal = clone(stateResult.document);
    state.working = clone(stateResult.document);
    state.savedDraft = clone(stateResult.document);
  } else {
    state.formal = clone(stateResult.formal);
    state.working = clone(stateResult.draft);
    state.savedDraft = clone(stateResult.draft);
    state.versions = stateResult.versions;
  }
  const talentShowTitle = (mode === "reader" ? state.formal : state.working).pages["detail.html?id=brand-pitch"]?.[".page-head > h1"];
  if (talentShowTitle) {
    const entry = state.catalog.groups.flatMap(group => group.items).find(item => item.id === "brand-pitch");
    if (entry) entry.title = String(talentShowTitle).replace(/<[^>]+>/g, "");
  }
  Object.entries(shopUiResult.documents || {}).forEach(([id, result]) => {
    const formal = mode === "reader" ? result : result.formal;
    const draft = mode === "reader" ? result : result.draft;
    state.shopUi[id] = {
      formal: clone(formal),
      current: clone(draft),
      savedDraft: clone(draft),
      revision: mode === "reader" ? null : (result.revision || null),
      selectedId: Number(draft.uiRules?.[0]?.id || 1),
      selectedScreenId: "main",
      expandedPopupKey: "",
      expandedNestedPopupKey: "",
      undo: [],
      editBaseline: null,
      versions: mode === "reader" ? [] : (result.versions || []),
    };
  });
  state.missingShopUi = new Set(shopUiResult.missing || []);
  if (mode === "edit") {
    const convenienceEntry = state.catalog.groups.flatMap((group) => group.items).find((entry) => entry.id === "convenience-store");
    if (convenienceEntry && state.shopUi["convenience-store"]?.current.title) convenienceEntry.title = state.shopUi["convenience-store"].current.title;
  }
  const requestedFramePage = new URLSearchParams(location.search).get("page");
  const requestedPage = normalizeCatalogPage(requestedFramePage);
  state.currentPage = allCatalogEntries().some((entry) => entry.page === requestedPage) && !isReaderLockedPage(requestedPage)
    ? requestedPage
    : state.catalog.overview.page;
  state.currentFramePage = state.currentPage === requestedPage ? (requestedFramePage || requestedPage) : state.currentPage;
  state.currentTitle = findTitle(state.currentPage);
  mountShell();
  renderCatalog();
  updateToolbar();
  navigate(state.currentPage, state.currentFramePage);
} catch (error) {
  const readerHelp = mode === "reader"
    ? '<p class="full-reader-network-help">请检查网络连接后刷新页面。</p>'
    : "";
  app.innerHTML = `<div class="full-editor-loading is-error"><strong>${escapeHtml(error.message)}</strong>${readerHelp}</div>`;
}
