function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function editableAttributes(editable, field, extra = "") {
  if (!editable) return "";
  return ` contenteditable="true" spellcheck="true" data-edit-field="${field}" ${extra}`;
}

// 人才参考图由用户提供，原图没有印好的区域编号；仅为该页叠加对应规则的可点标号。
const TALENT_POPUP_POINTS = {
  "skill-description": [[49, 68], [53, 76]],
  promotion: [[49, 46], [50, 70], [53, 75]],
  "promotion-success": [[50, 34], [50, 62]],
  "training-talent": [[48, 25], [50, 62], [50, 83], [65, 43]],
  "training-skill": [[50, 60], [50, 31], [40, 43]],
  "star-success": [[50, 42], [50, 70]],
  story: [[51, 59], [50, 82], [86, 19]],
  bond: [[50, 43], [65, 48], [88, 24]],
  attributes: [[50, 26], [50, 59], [50, 85]],
  "clothing-halo": [[50, 40], [50, 53], [82, 32]],
};
const TALENT_ANNOTATED_POPUP_ORIGINALS = {
  story: "assets/talent-reference/13.jpeg",
  "training-skill": "assets/talent-reference/10.jpeg",
};

const PROTAGONIST_POPUP_POINTS = {
  "identity-condition-detail": [[50, 40], [50, 60], [50, 69], [80, 29]],
  "identity-upgrade-result": [[50, 33], [50, 47], [50, 64], [50, 95]],
  "identity-privilege-preview": [[50, 44], [50, 60], [93, 80]],
  "identity-plot-review-reference": [[50, 20], [50, 65]],
  "identity-ranks": [[51, 17], [58, 38], [55, 57], [93, 49]],
  "identity-reward": [[28, 55], [35, 61], [53, 54]],
  rename: [[51, 45], [48, 55], [51, 59], [91, 30]],
  "dress-avatar": [[51, 18], [49, 51], [44, 31], [34, 91], [61, 91], [83, 91], [91, 8]],
  "dress-title": [[50, 18], [50, 49], [49, 80]],
  "dress-chat-title": [[50, 18], [50, 48], [49, 80]],
  "dress-mini": [[50, 28], [50, 61], [50, 83]],
};

export function renderCarWash(root, document, options = {}) {
  root.innerHTML = `
    <section class="editor-document-head">
      <div>
        <p class="eyebrow">CAR WASH · UI RULES</p>
        <h1${editableAttributes(Boolean(options.editable), "title", "data-single-line")}>${escapeHtml(document.title)}</h1>
        <p class="editor-document-summary"${editableAttributes(Boolean(options.editable), "summary")}>${escapeHtml(document.summary)}</p>
      </div>
      <span class="editor-experiment-badge">独立实验版</span>
    </section>
    <article class="detail-card shop-ui-rules-card editor-rules-card" data-shop-ui-rules></article>`;
  renderShopUiRulesCard(root.querySelector("[data-shop-ui-rules]"), document, options);
}

export function renderShopUiRulesCard(root, document, options = {}) {
  const editable = Boolean(options.editable);
  const talentPopupMarkers = (popup, nested = false) => {
    if (!popup?.image) return "";
    if (popup.hotspots?.length) {
      return `<div class="editor-popup-hotspot-layer" aria-label="弹窗区域标号">${popup.hotspots.slice(0, popup.rules?.length || 0).map((point, index) => `<button type="button" class="shop-ui-hotspot" style="--hotspot-x:${Number(point.x)}%;--hotspot-y:${Number(point.y)}%" data-${nested ? "nested-" : ""}popup-rule-jump="${index}" aria-label="查看弹窗第 ${index + 1} 条规则">${index + 1}</button>`).join("")}</div>`;
    }
    // 策划已上传自带标号的弹窗图时，不再叠加旧参考图上的可点编号。
    const originalImage = TALENT_ANNOTATED_POPUP_ORIGINALS[popup.id];
    if (document.id === "talent-system" && originalImage && popup.image !== originalImage) return "";
    const points = (document.id === "talent-system" ? TALENT_POPUP_POINTS : document.id === "protagonists" ? PROTAGONIST_POPUP_POINTS : {})[popup.id] || [];
    return `<div class="editor-popup-hotspot-layer" aria-label="弹窗区域标号">${points.slice(0, popup.rules?.length || 0).map(([x, y], index) => `<button type="button" class="shop-ui-hotspot" style="--hotspot-x:${x}%;--hotspot-y:${y}%" data-${nested ? "nested-" : ""}popup-rule-jump="${index}" aria-label="查看弹窗第 ${index + 1} 条规则">${index + 1}</button>`).join("")}</div>`;
  };
  const screens = [{ ...document, id: "main", uiScreenTitle: document.id === "protagonists" ? "主角主页" : document.id === "doll-house" ? "主界面" : document.title }, ...(document.id === "protagonists" ? (document.uiScreens || []).filter((screen) => ["identity-upgrade", "identity-route"].includes(screen.id)) : (document.uiScreens || []))];
  const visibleScreens = options.screenCategory === "minigame"
    ? screens.filter((item) => item.id.startsWith("minigame-"))
    : screens.filter((item) => !item.id.startsWith("minigame-"));
  const screen = visibleScreens.find((item) => item.id === options.screenId) || visibleScreens[0];
  if (!screen) { root.innerHTML = "<h2>小游戏界面待补充</h2><p>当前正式版尚未加入小游戏界面资料。</p>"; return; }
  // 专长、光环只保留右侧的 01 规则入口，参考图上不叠加可点标号。
  const hideTalentImageMarkers = document.id === "talent-system" && screen.uiRuleImageHasLabels && ["specialty", "halo"].includes(screen.id);
  const selectedId = Number(options.selectedId ?? screen.uiRules[0]?.id);
  const selectedRule = screen.uiRules.find((rule) => Number(rule.id) === selectedId) || screen.uiRules[0];
  if (!selectedRule) {
    root.innerHTML = '<div class="editor-error">当前没有可编辑的编号规则。</div>';
    return;
  }

  const expandedPopupKey = String(options.expandedPopupKey || "");
  const expandedNestedPopupKey = String(options.expandedNestedPopupKey || "");
  const renderRuleLink = (link) => {
    const href = String(link?.href || "");
    const jump = /^#ui-screen-([a-zA-Z0-9-]+)(?:\?(.*))?$/.exec(href);
    if (jump && screens.some((item) => item.id === jump[1])) {
      const params = new URLSearchParams(jump[2] || "");
      return `<button type="button" class="button shop-ui-reference-link" data-ui-screen-jump="${escapeHtml(jump[1])}" data-ui-rule-jump="${escapeHtml(params.get("rule") || "")}" data-ui-popup-jump="${escapeHtml(params.get("popup") || "")}" data-ui-nested-jump="${escapeHtml(params.get("nested") || "")}">${escapeHtml(link.label || "查看关联界面")} <span aria-hidden="true">→</span></button>`;
    }
    if (!/^(?:(?:talent-system\.html|detail\.html)\?|https:\/\/)/.test(href)) return "";
    return `<a class="shop-ui-reference-link" href="${escapeHtml(href)}"${/^https:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(link.label || "查看关联界面")} <span aria-hidden="true">→</span></a>`;
  };
  const ruleEntries = selectedRule.rules.map((entry, entryIndex) => {
    const popupKey = `${selectedRule.id}:${entryIndex}`;
    const popup = entry.popup && typeof entry.popup === "object" ? entry.popup : null;
    const popupExpanded = Boolean(popup) && expandedPopupKey === popupKey;
    const popupRules = popup?.rules?.map((popupRule, popupRuleIndex) => {
      const nestedPopupKey = `${popupKey}:${popupRuleIndex}`;
      const nestedPopup = popupRule.popup && typeof popupRule.popup === "object" ? popupRule.popup : null;
      const nestedPopupExpanded = Boolean(nestedPopup) && expandedNestedPopupKey === nestedPopupKey;
      const nestedIsTab = nestedPopup?.kind === "tab" || ["dress-title", "dress-chat-title", "dress-mini"].includes(nestedPopup?.id);
      const nestedRules = nestedPopup?.rules?.map((nestedRule, nestedRuleIndex) => `
        <article class="editor-popup-rule" data-nested-popup-rule="${nestedRuleIndex}">
          <div>
            ${["talent-system", "protagonists", "doll-house"].includes(document.id) ? `<span class="editor-popup-rule-number">${String(nestedRuleIndex + 1).padStart(2, "0")}</span>` : ""}<strong${editableAttributes(editable, "nested-popup-rule-label", `data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" data-nested-rule-index="${nestedRuleIndex}" data-single-line`)}>${escapeHtml(nestedRule.label)}</strong>
            <p${editableAttributes(editable, "nested-popup-rule-text", `data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" data-nested-rule-index="${nestedRuleIndex}"`)}>${escapeHtml(nestedRule.text)}</p>
            ${renderRuleLink(nestedRule.link)}
          </div>
          ${editable ? `
            <div class="editor-popup-rule-actions" aria-label="调整二级弹窗规则">
              <button type="button" data-nested-popup-rule-action="up" data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" data-nested-rule-index="${nestedRuleIndex}" aria-label="上移" ${nestedRuleIndex === 0 ? "disabled" : ""}>↑</button>
              <button type="button" data-nested-popup-rule-action="down" data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" data-nested-rule-index="${nestedRuleIndex}" aria-label="下移" ${nestedRuleIndex === nestedPopup.rules.length - 1 ? "disabled" : ""}>↓</button>
              <button type="button" class="is-danger" data-nested-popup-rule-action="delete" data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" data-nested-rule-index="${nestedRuleIndex}">删除</button>
            </div>` : ""}
        </article>`).join("") || "";
      return `
      <article class="editor-popup-rule" data-popup-rule="${popupRuleIndex}">
        <div class="editor-popup-rule-copy">
          <div class="editor-popup-rule-title-row">
            ${["talent-system", "protagonists", "main-town", "checkpoints", "doll-house"].includes(document.id) || popup.hotspots?.length ? `<span class="editor-popup-rule-number">${String(popupRuleIndex + 1).padStart(2, "0")}</span>` : ""}<strong${editableAttributes(editable, "popup-rule-label", `data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" data-single-line`)}>${escapeHtml(popupRule.label)}</strong>
            ${nestedPopup ? `<button type="button" class="editor-popup-toggle${nestedPopupExpanded ? " is-active" : ""}" data-nested-popup-toggle="${escapeHtml(nestedPopupKey)}" aria-expanded="${nestedPopupExpanded}">${escapeHtml(nestedPopup.title || "关联弹窗")}<span aria-hidden="true">${nestedPopupExpanded ? "收起" : "展开"}</span></button>` : ""}
            ${editable && !nestedPopup ? `<button type="button" class="editor-popup-add" data-nested-popup-add data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}">＋ 关联弹窗</button>` : ""}
          </div>
          <p${editableAttributes(editable, "popup-rule-text", `data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}"`)}>${escapeHtml(popupRule.text)}</p>
          ${renderRuleLink(popupRule.link)}
        </div>
        ${editable ? `
          <div class="editor-popup-rule-actions" aria-label="调整弹窗规则">
            <button type="button" data-popup-rule-action="up" data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" aria-label="上移" ${popupRuleIndex === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-popup-rule-action="down" data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" aria-label="下移" ${popupRuleIndex === popup.rules.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" class="is-danger" data-popup-rule-action="delete" data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}">删除</button>
          </div>` : ""}
        ${nestedPopup && nestedPopupExpanded ? `
          <section class="editor-popup-expansion is-nested" data-nested-popup-expansion="${escapeHtml(nestedPopupKey)}">
            <div class="editor-popup-collapse-row"><button type="button" data-nested-popup-toggle="${escapeHtml(nestedPopupKey)}">收起</button></div>
            <div class="editor-popup-expansion-layout">
              <figure class="editor-popup-figure${nestedPopup.image ? "" : " is-empty"}" ${editable ? `data-nested-popup-image-drop="${entryIndex}:${popupRuleIndex}" tabindex="0" title="点击后可粘贴截图，也可拖入图片"` : ""}>
                <div class="editor-popup-image-preview">
                  ${nestedPopup.image
                  ? `<img src="${escapeHtml(nestedPopup.image)}" alt="${escapeHtml(nestedPopup.title)}界面" />`
                    : `<div class="editor-popup-image-placeholder"><strong>等待补充${nestedIsTab ? "分页" : "二级弹窗"}截图</strong><span>选择、拖入或粘贴图片后，将按实际比例展示</span></div>`}
                  ${talentPopupMarkers(nestedPopup, true)}
                </div>
                ${editable ? `
                  <div class="editor-popup-image-toolbar">
                    <button type="button" data-nested-popup-image-pick data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}">${nestedPopup.image ? "更换图片" : "添加图片"}</button>
                    ${nestedPopup.image ? `<button type="button" class="is-danger" data-nested-popup-image-remove data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}">移除图片</button>` : ""}
                    <span>也可拖入图片，或点击此区域后粘贴截图</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" data-nested-popup-image-input data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}" hidden />
                  </div>` : ""}
              </figure>
              <div class="editor-popup-rules">
                <div class="editor-popup-rules-head"><strong>${nestedIsTab ? "关联分页规则" : "二级弹窗界面规则"}</strong><span>${nestedPopup.rules?.length || 0} 条</span></div>
                ${nestedRules || '<p class="editor-popup-empty">尚未填写二级弹窗规则。</p>'}
                ${editable ? `<button type="button" class="editor-popup-add-rule" data-nested-popup-add-rule data-entry-index="${entryIndex}" data-popup-rule-index="${popupRuleIndex}">＋ 新增一条二级弹窗规则</button>` : ""}
              </div>
            </div>
          </section>` : ""}
      </article>`;
    }).join("") || "";

    return `
    <article class="editor-rule-entry" data-rule-entry="${entryIndex}">
      <div class="editor-rule-entry-copy">
        <div class="editor-rule-entry-title-row">
          <strong${editableAttributes(editable, "entry-label", `data-entry-index="${entryIndex}" data-single-line`)}>${escapeHtml(entry.label)}</strong>
          ${popup ? `<button type="button" class="editor-popup-toggle${popupExpanded ? " is-active" : ""}" data-popup-toggle="${escapeHtml(popupKey)}" aria-expanded="${popupExpanded}">${escapeHtml(popup.title || "关联弹窗")}<span aria-hidden="true">${popupExpanded ? "收起" : "展开"}</span></button>` : ""}
          ${editable && !popup ? `<button type="button" class="editor-popup-add" data-popup-add data-entry-index="${entryIndex}">＋ 关联弹窗</button>` : ""}
        </div>
        <p${editableAttributes(editable, "entry-text", `data-entry-index="${entryIndex}"`)}>${escapeHtml(entry.text)}</p>
        ${renderRuleLink(entry.link)}
      </div>
      ${editable ? `
        <div class="editor-rule-entry-actions" aria-label="调整这条规则">
          <button type="button" data-entry-action="up" data-entry-index="${entryIndex}" aria-label="上移" ${entryIndex === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-entry-action="down" data-entry-index="${entryIndex}" aria-label="下移" ${entryIndex === selectedRule.rules.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="is-danger" data-entry-action="delete" data-entry-index="${entryIndex}">删除</button>
        </div>` : ""}
      ${popup && popupExpanded ? `
        <section class="editor-popup-expansion" data-popup-expansion="${escapeHtml(popupKey)}">
          <div class="editor-popup-collapse-row"><button type="button" data-popup-toggle="${escapeHtml(popupKey)}">收起</button></div>
          <div class="editor-popup-expansion-layout">
            <figure class="editor-popup-figure${popup.image ? "" : " is-empty"}" ${editable ? `data-popup-image-drop="${entryIndex}" tabindex="0" title="点击后可粘贴截图，也可拖入图片"` : ""}>
              <div class="editor-popup-image-preview">
                ${popup.image
                  ? `<img src="${escapeHtml(popup.image)}" alt="${escapeHtml(popup.title)}界面" />`
                  : `<div class="editor-popup-image-placeholder"><strong>等待补充界面截图</strong><span>选择、拖入或粘贴图片后，将按实际比例展示</span></div>`}
                ${talentPopupMarkers(popup)}
              </div>
              ${editable ? `
                <div class="editor-popup-image-toolbar">
                  <button type="button" data-popup-image-pick data-entry-index="${entryIndex}">${popup.image ? "更换图片" : "添加图片"}</button>
                  ${popup.image ? `<button type="button" class="is-danger" data-popup-image-remove data-entry-index="${entryIndex}">移除图片</button>` : ""}
                  <span>也可拖入图片，或点击此区域后粘贴截图</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" data-popup-image-input data-entry-index="${entryIndex}" hidden />
                </div>` : ""}
            </figure>
            <div class="editor-popup-rules">
              <div class="editor-popup-rules-head"><strong>弹窗界面规则</strong><span>${popup.rules?.length || 0} 条</span></div>
              ${popupRules || '<p class="editor-popup-empty">尚未填写弹窗规则。</p>'}
              ${editable ? `<button type="button" class="editor-popup-add-rule" data-popup-add-rule data-entry-index="${entryIndex}">＋ 新增一条弹窗规则</button>` : ""}
            </div>
          </div>
        </section>` : ""}
    </article>`;
  }).join("");

  const referenceDocument = screen.uiRuleReference ? screen : (screen.id.startsWith("minigame-") ? screen : document);
  const reference = referenceDocument.uiRuleReference ? `
    <section class="shop-ui-reference">
      <p class="eyebrow">COMMON UI RULES</p>
      <h3>${escapeHtml(referenceDocument.uiRuleReference.title || "通用界面规则")}</h3>
      <p>${escapeHtml(referenceDocument.uiRuleReference.text || "")}</p>
      <a class="button shop-ui-reference-link" href="${escapeHtml(referenceDocument.uiRuleReference.href || "detail.html?id=car-wash&shopTab=interface")}"${/^https:\/\//.test(referenceDocument.uiRuleReference.href || "") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(referenceDocument.uiRuleReference.label || "查看通用界面规则")} <span aria-hidden="true">→</span></a>
    </section>` : "";
  const headingCopy = screen.uiRuleIntro
    ? screen.uiRuleIntro
    : editable
      ? "点击左图编号切换规则；点击右侧文字即可直接修改。"
      : "点击左侧概念图中的编号，查看对应区域的显示、状态与交互规则。";

  root.innerHTML = `
      ${visibleScreens.length > 1 ? `<nav class="shop-ui-rule-index" aria-label="界面分页">${visibleScreens.map((item) => `<button type="button" class="${item.id === screen.id ? "is-active" : ""}" data-ui-screen="${escapeHtml(item.id)}" aria-pressed="${item.id === screen.id}">${escapeHtml(item.uiScreenTitle || item.uiRulesTitle || item.title)}</button>`).join("")}</nav>` : ""}
      <div class="shop-ui-rules-heading">
        <div><p class="eyebrow">UI RULES</p><h2${editableAttributes(editable, "screen-title", "data-single-line")}>${escapeHtml(screen.uiRulesTitle || "经营主界面｜界面规则")}</h2></div>
        <p${editableAttributes(editable, "screen-intro")}>${escapeHtml(headingCopy)}</p>
      </div>
      <div class="shop-ui-rules-layout">
        <figure class="shop-ui-rules-figure">
          <img src="${escapeHtml(screen.uiRuleImage)}" alt="${escapeHtml(screen.title)}界面区域标注图" />
          <div class="shop-ui-hotspot-layer${screen.uiRuleImageHasLabels ? " is-labels-only" : ""}" aria-label="界面区域标注">
            ${hideTalentImageMarkers ? "" : screen.uiRules.filter((rule) => !(screen.id === "checkpoints" && Number(rule.id) === 12)).map((rule) => `<button type="button" class="shop-ui-hotspot${Number(rule.id) === Number(selectedRule.id) ? " is-active" : ""}" style="--hotspot-x:${Number(rule.x) || 50}%;--hotspot-y:${Number(rule.y) || 50}%" data-rule-select="${escapeHtml(rule.id)}" aria-label="${escapeHtml(rule.id)} ${escapeHtml(rule.title)}" aria-pressed="${Number(rule.id) === Number(selectedRule.id)}">${escapeHtml(rule.id)}</button>`).join("")}
          </div>
        </figure>
        <aside class="shop-ui-rule-panel editor-rule-panel" aria-live="polite">
          ${reference}
          <nav class="shop-ui-rule-index" aria-label="界面规则编号">
            ${screen.uiRules.map((rule) => `<button type="button" class="${Number(rule.id) === Number(selectedRule.id) ? "is-active" : ""}" data-rule-select="${escapeHtml(rule.id)}" aria-pressed="${Number(rule.id) === Number(selectedRule.id)}">${String(rule.id).padStart(2, "0")}</button>`).join("")}
          </nav>
          <section class="shop-ui-rule-copy is-active editor-rule-copy">
            <header>
              <span>${String(selectedRule.id).padStart(2, "0")}</span>
              <div>
                <h3${editableAttributes(editable, "rule-title", "data-single-line")}>${escapeHtml(selectedRule.title)}</h3>
                <p${editableAttributes(editable, "rule-summary")}>${escapeHtml(selectedRule.summary)}</p>
              </div>
            </header>
            <div class="editor-rule-entry-list">${ruleEntries}</div>
            ${editable ? '<button type="button" class="editor-add-rule" data-add-entry>＋ 新增一条规则</button>' : ""}
          </section>
        </aside>
      </div>`;

  root.querySelectorAll("[data-rule-select]").forEach((button) => {
    button.addEventListener("click", () => options.onSelect?.(Number(button.dataset.ruleSelect)));
  });
  root.querySelectorAll("[data-ui-screen]").forEach((button) => {
    button.addEventListener("click", () => options.onSelectScreen?.(String(button.dataset.uiScreen)));
  });
  root.querySelectorAll("[data-ui-screen-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      options.onSelectScreen?.(String(button.dataset.uiScreenJump), {
        ruleId: Number(button.dataset.uiRuleJump) || undefined,
        popupKey: button.dataset.uiPopupJump || "",
        nestedPopupKey: button.dataset.uiNestedJump || "",
      });
      requestAnimationFrame(() => {
        const target = root.querySelector("[data-nested-popup-expansion]") || root.querySelector("[data-popup-expansion]") || root.querySelector(".editor-rule-copy");
        target?.scrollIntoView({ block: "nearest" });
      });
    });
  });
  root.querySelectorAll("[data-popup-toggle]").forEach((button) => {
    button.addEventListener("click", () => options.onTogglePopup?.(String(button.dataset.popupToggle)));
  });
  root.querySelectorAll("[data-nested-popup-toggle]").forEach((button) => {
    button.addEventListener("click", () => options.onToggleNestedPopup?.(String(button.dataset.nestedPopupToggle)));
  });
  root.querySelectorAll("[data-popup-rule-jump], [data-nested-popup-rule-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const nested = button.hasAttribute("data-nested-popup-rule-jump");
      const index = Number(button.dataset[nested ? "nestedPopupRuleJump" : "popupRuleJump"]);
      const expansion = button.closest(nested ? "[data-nested-popup-expansion]" : "[data-popup-expansion]");
      const target = expansion?.querySelector(nested ? `[data-nested-popup-rule="${index}"]` : `[data-popup-rule="${index}"]`);
      target?.scrollIntoView({ block: "nearest" });
      target?.classList.add("is-marker-target");
      setTimeout(() => target?.classList.remove("is-marker-target"), 1200);
    });
  });
  if (editable) {
    const sendImage = (entryIndex, file) => {
      if (file?.type?.startsWith("image/")) options.onPopupImageFile?.(Number(entryIndex), file);
    };
    root.querySelectorAll("[data-popup-image-pick]").forEach((button) => {
      button.addEventListener("click", () => root.querySelector(`[data-popup-image-input][data-entry-index="${button.dataset.entryIndex}"]`)?.click());
    });
    root.querySelectorAll("[data-popup-image-input]").forEach((input) => {
      input.addEventListener("change", () => {
        sendImage(input.dataset.entryIndex, input.files?.[0]);
        input.value = "";
      });
    });
    root.querySelectorAll("[data-popup-image-remove]").forEach((button) => {
      button.addEventListener("click", () => options.onPopupImageRemove?.(Number(button.dataset.entryIndex)));
    });
    root.querySelectorAll("[data-popup-image-drop]").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("is-dragging");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("is-dragging"));
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("is-dragging");
        sendImage(zone.dataset.popupImageDrop, [...(event.dataTransfer?.files || [])].find((file) => file.type.startsWith("image/")));
      });
      zone.addEventListener("paste", (event) => {
        const file = [...(event.clipboardData?.items || [])]
          .find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
        if (!file) return;
        event.preventDefault();
        sendImage(zone.dataset.popupImageDrop, file);
      });
    });
    const sendNestedImage = (entryIndex, popupRuleIndex, file) => {
      if (file?.type?.startsWith("image/")) options.onNestedPopupImageFile?.(Number(entryIndex), Number(popupRuleIndex), file);
    };
    root.querySelectorAll("[data-nested-popup-image-pick]").forEach((button) => {
      button.addEventListener("click", () => root.querySelector(`[data-nested-popup-image-input][data-entry-index="${button.dataset.entryIndex}"][data-popup-rule-index="${button.dataset.popupRuleIndex}"]`)?.click());
    });
    root.querySelectorAll("[data-nested-popup-image-input]").forEach((input) => {
      input.addEventListener("change", () => {
        sendNestedImage(input.dataset.entryIndex, input.dataset.popupRuleIndex, input.files?.[0]);
        input.value = "";
      });
    });
    root.querySelectorAll("[data-nested-popup-image-remove]").forEach((button) => {
      button.addEventListener("click", () => options.onNestedPopupImageRemove?.(Number(button.dataset.entryIndex), Number(button.dataset.popupRuleIndex)));
    });
    root.querySelectorAll("[data-nested-popup-image-drop]").forEach((zone) => {
      const [entryIndex, popupRuleIndex] = String(zone.dataset.nestedPopupImageDrop).split(":");
      zone.addEventListener("dragover", (event) => { event.preventDefault(); zone.classList.add("is-dragging"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("is-dragging"));
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("is-dragging");
        sendNestedImage(entryIndex, popupRuleIndex, [...(event.dataTransfer?.files || [])].find((file) => file.type.startsWith("image/")));
      });
      zone.addEventListener("paste", (event) => {
        const file = [...(event.clipboardData?.items || [])].find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
        if (!file) return;
        event.preventDefault();
        sendNestedImage(entryIndex, popupRuleIndex, file);
      });
    });
  }
  if (editable) options.bindEditing?.(root, selectedRule);
}

export const renderCarWashRulesCard = renderShopUiRulesCard;
