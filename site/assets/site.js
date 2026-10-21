import { GROUPS, getGroupModules } from "./data.js?v=20260923-7";

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderTopbar(actions = "") {
  return `
    <header class="topbar">
      <a class="brand" href="index.html">
        <strong>《破产双胞胎》包装策划案</strong>
        <span>1993 · 美国复古小镇</span>
      </a>
      <div class="top-actions">
        ${actions || `
          <a class="button optional" href="index.html#module-entry">模块入口</a>
          <button class="button" type="button" onclick="window.print()">打印</button>`}
      </div>
    </header>`;
}

export function renderSidebar(activeGroup = "overview") {
  const links = Object.entries(GROUPS)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id, group]) => {
      const count = getGroupModules(id).length;
      const active = activeGroup === id ? "active" : "";
      const talentLink = id === "characters"
        ? `<a class="${activeGroup === "talent-system" ? "active" : ""}" href="talent-system.html"><span>人才系统</span><span class="count">01</span></a>`
        : "";
      const partnerLink = id === "characters" ? `<a class="${activeGroup === "partner-system" ? "active" : ""}" href="partner-system.html"><span>伙伴系统</span><span class="count">02</span></a>` : "";
      return `<a class="${active}" href="category.html?group=${id}"><span>${escapeHtml(group.title)}</span><span class="count">${count}</span></a>${talentLink}${location.port === "18767" ? partnerLink : ""}`;
    })
    .join("");
  return `
    <aside class="sidebar">
      <div class="side-head"><small>Document Map</small><strong>策划案目录</strong></div>
      <nav class="side-nav" aria-label="策划案目录">
        <a class="${activeGroup === "overview" ? "active" : ""}" href="index.html"><span>总览</span><span class="count">01</span></a>
        ${links}
      </nav>
      <p class="side-note">分类页负责汇总，详情页负责单个系统。后续图片和修改只进入对应模块。</p>
    </aside>`;
}

export function groupCount(groupId) {
  return getGroupModules(groupId).length;
}

export function renderEntryCards() {
  return Object.entries(GROUPS)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id, group]) => `
      <a class="entry-card" href="category.html?group=${id}" style="--accent:${group.color}">
        <div class="entry-top">
          <span class="kicker">${escapeHtml(group.kicker)}</span>
          <span class="entry-count">${groupCount(id)} 个${group.singlePage ? "模块" : "分页"}</span>
        </div>
        <h3>${escapeHtml(group.title)}</h3>
        <p>${escapeHtml(group.summary)}</p>
        <div class="examples">${escapeHtml(group.examples)}</div>
        <span class="go" aria-hidden="true">→</span>
      </a>`)
    .join("");
}

export function renderModuleCards(groupId) {
  return getGroupModules(groupId)
    .map((item, index) => `
      <a class="module-card" href="detail.html?id=${item.detailId || item.id}" aria-label="查看${escapeHtml(item.title)}详情">
        <div class="module-top">
          <span class="module-no">${String(index + 1).padStart(2, "0")}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <div class="mapping">《赘婿》对标：${escapeHtml(item.original)}</div>
      </a>`)
    .join("");
}

export function pageShell({ activeGroup, content, topActions = "" }) {
  return `${renderTopbar(topActions)}<div class="shell">${renderSidebar(activeGroup)}<main>${content}</main></div>`;
}

export function mount(html) {
  document.getElementById("app").innerHTML = html;
  initImageLightbox();
  initCarousels();
  initTownInterfaceFlows();
  initScenePreviews();
}

function initTownInterfaceFlows() {
  document.querySelectorAll("[data-town-interface-flow]").forEach((flow) => {
    const screens = [...flow.querySelectorAll("[data-town-flow-screen]")];
    const copies = [...flow.querySelectorAll("[data-town-flow-copy]")];
    const controls = [...flow.querySelectorAll("[data-town-flow-target]")];
    const stepButtons = [...flow.querySelectorAll(".town-interface-flow-heading [data-town-flow-target]")];
    const hint = flow.querySelector("[data-town-flow-hint]");
    if (!screens.length || !copies.length) return;

    const show = (id) => {
      if (!screens.some((screen) => screen.dataset.townFlowScreen === id)) return;
      screens.forEach((screen) => {
        const active = screen.dataset.townFlowScreen === id;
        screen.classList.toggle("is-active", active);
        screen.setAttribute("aria-hidden", String(!active));
        if (active && hint) hint.textContent = screen.dataset.townFlowHintText || "";
      });
      copies.forEach((copy) => {
        const active = copy.dataset.townFlowCopy === id;
        copy.classList.toggle("is-active", active);
        copy.setAttribute("aria-hidden", String(!active));
      });
      stepButtons.forEach((button) => {
        const active = button.dataset.townFlowTarget === id;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    };

    controls.forEach((control) => control.addEventListener("click", () => show(control.dataset.townFlowTarget)));
    show(screens[0].dataset.townFlowScreen);
  });
}

function initImageLightbox() {
  const main = document.querySelector("main");
  if (!main) return;

  let lightbox = document.querySelector(".image-lightbox");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.className = "image-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "图片大图预览");
    lightbox.innerHTML = `
      <button class="image-lightbox-close" type="button" aria-label="关闭图片预览">×</button>
      <div class="image-lightbox-stage">
        <img alt="" />
        <p></p>
      </div>`;
    document.body.append(lightbox);
  }

  const preview = lightbox.querySelector("img");
  const caption = lightbox.querySelector("p");
  const closeButton = lightbox.querySelector(".image-lightbox-close");
  let returnFocus = null;

  const close = () => {
    if (!lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    preview.removeAttribute("src");
    returnFocus?.focus();
  };

  const open = (source) => {
    returnFocus = source;
    preview.src = source.currentSrc || source.src;
    preview.alt = source.alt || "大图预览";
    const figureCaption = source.closest("figure")?.querySelector("figcaption")?.textContent?.trim();
    caption.textContent = figureCaption || source.alt || "";
    caption.hidden = !caption.textContent;
    lightbox.classList.add("is-open");
    document.body.classList.add("lightbox-open");
    closeButton.focus();
  };

  const enablePreview = (image) => {
    if (!(image instanceof HTMLImageElement) || image.hasAttribute("data-no-preview") || image.dataset.previewReady === "true") return;
    image.dataset.previewReady = "true";
    image.classList.add("is-zoomable");
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `${image.alt || "图片"}，点击放大`);
    image.addEventListener("click", () => open(image));
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(image);
      }
    });
  };

  main.querySelectorAll("img:not([data-no-preview])").forEach(enablePreview);

  const imageObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches("img:not([data-no-preview])")) enablePreview(node);
        node.querySelectorAll?.("img:not([data-no-preview])").forEach(enablePreview);
      });
    });
  });
  imageObserver.observe(main, { childList: true, subtree: true });

  closeButton.onclick = close;
  lightbox.onclick = (event) => {
    if (event.target === lightbox) close();
  };
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function initCarousels() {
  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".reference-carousel-track");
    const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
    const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
    const previous = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");
    const current = carousel.parentElement.querySelector("[data-carousel-current]");
    let activeIndex = 0;
    let touchStartX = 0;

    if (!slides.length) return;

    const show = (requestedIndex) => {
      activeIndex = (requestedIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${activeIndex * 100}%)`;
      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.setAttribute("aria-hidden", String(!isActive));
        slide.querySelectorAll("img, a").forEach((focusable) => {
          focusable.tabIndex = isActive ? 0 : -1;
        });
      });
      dots.forEach((dot, index) => dot.setAttribute("aria-current", String(index === activeIndex)));
      if (current) current.textContent = String(activeIndex + 1);
    };

    previous.addEventListener("click", () => show(activeIndex - 1));
    next.addEventListener("click", () => show(activeIndex + 1));
    dots.forEach((dot, index) => dot.addEventListener("click", () => show(index)));
    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") show(activeIndex - 1);
      if (event.key === "ArrowRight") show(activeIndex + 1);
    });
    carousel.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener("touchend", (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) > 45) show(activeIndex + (distance < 0 ? 1 : -1));
    }, { passive: true });
    show(0);
  });
}

function initScenePreviews() {
  document.querySelectorAll("[data-scene-preview]").forEach((preview) => {
    const stage = preview.querySelector("[data-scene-preview-stage]");
    const image = preview.querySelector("[data-scene-preview-image]");
    const resetButton = preview.querySelector("[data-scene-preview-reset]");
    const status = preview.querySelector("[data-scene-preview-status]");
    const hint = preview.querySelector("[data-scene-preview-hint]");
    const toast = preview.querySelector("[data-scene-toast]");
    const sceneTabs = [...preview.querySelectorAll("[data-scene-tab]")];
    const hotspotLayers = [...preview.querySelectorAll("[data-scene-hotspot-layer]")];
    const hotspots = [...preview.querySelectorAll("[data-scene-hotspot]")];
    if (!stage || !image || !resetButton) return;

    let scale = 1;
    let x = 0;
    let y = 0;
    let baseWidth = 0;
    let baseHeight = 0;
    let pointerId = null;
    let startPointerX = 0;
    let startPointerY = 0;
    let startX = 0;
    let startY = 0;
    let moved = false;
    let isSwitching = false;
    let currentSceneLabel = sceneTabs[0]?.dataset.sceneLabel || "场景";
    let currentSceneId = sceneTabs[0]?.dataset.sceneId || "scene";
    let currentOverviewSource = sceneTabs[0]?.dataset.sceneSrc || image.getAttribute("src");
    let currentOverviewAlt = sceneTabs[0]?.dataset.sceneAlt || image.alt;
    let detailOpen = false;
    let currentDetailLabel = "";
    let pressedHotspot = null;
    let toastTimer = null;

    sceneTabs.forEach((tab) => {
      const preload = new Image();
      preload.src = tab.dataset.sceneSrc;
    });
    hotspots.forEach((hotspot) => {
      if (!hotspot.dataset.hotspotSrc) return;
      const preload = new Image();
      preload.src = hotspot.dataset.hotspotSrc;
    });

    const bounds = () => ({ width: preview.clientWidth, height: preview.clientHeight });
    const clamp = () => {
      const viewport = bounds();
      const scaledWidth = baseWidth * scale;
      const scaledHeight = baseHeight * scale;
      x = scaledWidth <= viewport.width ? (viewport.width - scaledWidth) / 2 : Math.min(0, Math.max(viewport.width - scaledWidth, x));
      y = scaledHeight <= viewport.height ? (viewport.height - scaledHeight) / 2 : Math.min(0, Math.max(viewport.height - scaledHeight, y));
      if (scale === 1) y = 0;
    };

    const render = () => {
      clamp();
      const transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      image.style.transform = transform;
      hotspotLayers.forEach((layer) => {
        layer.style.width = `${baseWidth}px`;
        layer.style.height = `${baseHeight}px`;
        layer.style.transform = transform;
        layer.hidden = detailOpen || layer.dataset.sceneId !== currentSceneId;
      });
      preview.classList.toggle("is-zoomed", scale > 1);
      preview.classList.toggle("is-detail-open", detailOpen);
      if (status && !isSwitching) {
        status.textContent = detailOpen ? `${currentDetailLabel}近景` : `${currentSceneLabel}${scale > 1 ? "近景" : "总览"}`;
      }
    };

    const measureAndReset = () => {
      image.style.transform = "none";
      scale = 1;
      baseWidth = image.offsetWidth;
      baseHeight = image.offsetHeight;
      x = (preview.clientWidth - baseWidth) / 2;
      y = 0;
      render();
    };

    const zoomAt = (clientX, clientY) => {
      if (detailOpen || scale > 1 || !baseWidth) return;
      const rect = preview.getBoundingClientRect();
      const pointX = clientX - rect.left;
      const pointY = clientY - rect.top;
      const contentX = (pointX - x) / scale;
      const contentY = (pointY - y) / scale;
      scale = 1.85;
      x = pointX - contentX * scale;
      y = pointY - contentY * scale;
      hint?.classList.add("is-hidden");
      render();
    };

    const resetView = (focus = true) => {
      scale = 1;
      x = (preview.clientWidth - baseWidth) / 2;
      y = 0;
      render();
      if (focus) preview.focus({ preventScroll: true });
    };

    const transitionToImage = ({ source, alt, label, sceneId = currentSceneId, tab = null, isDetail = false }) => {
      if (isSwitching) return;
      const nextSource = source;
      const nextAlt = alt || label;
      const nextLabel = label || "场景";
      if (!nextSource) return;

      isSwitching = true;
      scale = 1;
      preview.classList.remove("is-zoomed", "is-dragging");
      preview.classList.add("is-scene-switching");
      hint?.classList.add("is-hidden");
      if (status) status.textContent = isDetail ? `正在进入${nextLabel}` : `正在前往${nextLabel}`;

      window.setTimeout(() => {
        detailOpen = isDetail;
        currentDetailLabel = isDetail ? nextLabel : "";
        if (!isDetail) {
          currentSceneLabel = nextLabel;
          currentSceneId = sceneId;
          currentOverviewSource = nextSource;
          currentOverviewAlt = nextAlt;
        }
        image.src = nextSource;
        image.alt = nextAlt;
        if (tab) {
          sceneTabs.forEach((sceneTab) => {
            const isActive = sceneTab === tab;
            sceneTab.classList.toggle("is-active", isActive);
            sceneTab.setAttribute("aria-pressed", String(isActive));
          });
        }

        const reveal = () => {
          measureAndReset();
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              isSwitching = false;
              preview.classList.remove("is-scene-switching");
              render();
            });
          });
        };

        if (image.complete && image.naturalWidth) reveal();
        else image.addEventListener("load", reveal, { once: true });
      }, 190);
    };

    const switchScene = (tab) => {
      if (isSwitching || (!detailOpen && tab.classList.contains("is-active"))) return;
      transitionToImage({
        source: tab.dataset.sceneSrc,
        alt: tab.dataset.sceneAlt || tab.dataset.sceneLabel,
        label: tab.dataset.sceneLabel || "场景",
        sceneId: tab.dataset.sceneId || "scene",
        tab,
      });
    };

    const showLockedTip = () => {
      if (!toast) return;
      window.clearTimeout(toastTimer);
      toast.textContent = "该区域尚未解锁";
      toast.classList.add("is-visible");
      toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
    };

    const activateHotspot = (hotspot) => {
      if (isSwitching) return;
      if (hotspot.hasAttribute("data-hotspot-locked")) {
        showLockedTip();
        return;
      }
      transitionToImage({
        source: hotspot.dataset.hotspotSrc,
        alt: hotspot.dataset.hotspotAlt || hotspot.dataset.hotspotLabel,
        label: hotspot.dataset.hotspotLabel || "房间",
        isDetail: true,
      });
    };

    const reset = () => {
      if (detailOpen) {
        transitionToImage({
          source: currentOverviewSource,
          alt: currentOverviewAlt,
          label: currentSceneLabel,
          sceneId: currentSceneId,
        });
      } else {
        resetView();
      }
    };

    image.addEventListener("load", () => {
      if (!isSwitching) measureAndReset();
    });
    if (image.complete) measureAndReset();
    window.addEventListener("resize", measureAndReset);
    sceneTabs.forEach((tab) => tab.addEventListener("click", () => switchScene(tab)));
    hotspots.forEach((hotspot) => hotspot.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activateHotspot(hotspot);
    }));

    preview.addEventListener("pointerdown", (event) => {
      if (isSwitching || event.target.closest("[data-scene-tab], [data-scene-preview-reset], [data-home-back]")) return;
      pointerId = event.pointerId;
      pressedHotspot = event.target.closest("[data-scene-hotspot]");
      startPointerX = event.clientX;
      startPointerY = event.clientY;
      startX = x;
      startY = y;
      moved = false;
      preview.classList.add("is-dragging");
      preview.setPointerCapture(pointerId);
    });

    preview.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startPointerX;
      const dy = event.clientY - startPointerY;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      x = startX + dx;
      y = scale > 1 ? startY + dy : 0;
      hint?.classList.add("is-hidden");
      render();
    });

    const endPointer = (event) => {
      if (event.pointerId !== pointerId) return;
      preview.classList.remove("is-dragging");
      if (preview.hasPointerCapture(pointerId)) preview.releasePointerCapture(pointerId);
      pointerId = null;
      if (!moved && event.type !== "pointercancel") {
        if (pressedHotspot) activateHotspot(pressedHotspot);
        else zoomAt(event.clientX, event.clientY);
      }
      pressedHotspot = null;
    };
    preview.addEventListener("pointerup", endPointer);
    preview.addEventListener("pointercancel", endPointer);

    preview.addEventListener("keydown", (event) => {
      if (event.target.closest("button") || isSwitching) return;
      const step = event.shiftKey ? 90 : 42;
      if (event.key === "ArrowLeft") x += step;
      else if (event.key === "ArrowRight") x -= step;
      else if (event.key === "ArrowUp" && scale > 1) y += step;
      else if (event.key === "ArrowDown" && scale > 1) y -= step;
      else if ((event.key === "Enter" || event.key === " ") && scale === 1) {
        const rect = preview.getBoundingClientRect();
        zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else if (event.key === "Escape" && (detailOpen || scale > 1)) {
        reset();
      } else return;
      event.preventDefault();
      render();
    });

    resetButton.addEventListener("click", reset);
  });
}
