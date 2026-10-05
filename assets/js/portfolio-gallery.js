/**
 * PAS portfolio media gallery extras (flowchart / youtube / ppt)
 * Flowcharts: static local SVG + svg-pan-zoom (custom zoom controls).
 * Owl Carousel stays owned by main.js — this only hydrates media then refreshes.
 */
(function ($) {
  "use strict";

  var panZoomByHost = new WeakMap();
  var panZoomList = [];
  var hydrating = false;
  var hydratedModal = false;
  var lightboxEl = null;
  var lightboxPz = null;
  var lightboxSourceHost = null;

  function youtubeId(url) {
    if (!url) return "";
    var m =
      String(url).match(/[?&]v=([^&]+)/) ||
      String(url).match(/youtu\.be\/([^?&]+)/) ||
      String(url).match(/youtube\.com\/embed\/([^?&]+)/);
    return m ? m[1] : "";
  }

  function destroyPanZooms() {
    panZoomList.forEach(function (pz) {
      try {
        pz.destroy();
      } catch (_) {}
    });
    panZoomList = [];
    panZoomByHost = new WeakMap();
    document.querySelectorAll(".flowchart-host").forEach(function (host) {
      try {
        delete host._flowchartPz;
      } catch (_) {}
    });
    hydratedModal = false;
  }

  function getPanZoom(host) {
    if (!host) return null;
    return host._flowchartPz || panZoomByHost.get(host) || null;
  }

  function setPanZoom(host, pz) {
    if (!host) return;
    if (!pz) {
      try {
        delete host._flowchartPz;
      } catch (_) {
        host._flowchartPz = null;
      }
      return;
    }
    host._flowchartPz = pz;
    panZoomByHost.set(host, pz);
  }

  function unwrapPanZoomSvg(svg) {
    if (!svg) return;
    var vp = null;
    for (var i = 0; i < svg.children.length; i += 1) {
      var child = svg.children[i];
      if (child.classList && child.classList.contains("svg-pan-zoom_viewport")) {
        vp = child;
        break;
      }
    }
    if (!vp) return;
    while (vp.firstChild) svg.insertBefore(vp.firstChild, vp);
    vp.remove();
    var legacy = svg.querySelector("#svg-pan-zoom-controls");
    if (legacy) legacy.remove();
  }

  function getFlowchartCaption(host) {
    if (!host) return "Flowchart";
    var modal = host.closest(".tj-modal-box, .white-popup, .mfp-content, .popup-content");
    var title =
      (modal &&
        modal.querySelector(
          ".modal_title, .portfolio_info_text .title, .portfolio_title, h2.title, h3.portfolio-title"
        )) ||
      null;
    if (title && title.textContent.trim()) return title.textContent.trim();
    var item = host.closest(".gallery_item");
    var cap = item && item.querySelector(".gallery_caption");
    if (cap && cap.textContent.trim()) return cap.textContent.trim();
    return "Flowchart";
  }

  function getSvgCache(host) {
    if (!host) return "";
    if (host.dataset.svgCache) return host.dataset.svgCache;
    var svg = host.querySelector("svg");
    if (!svg) return "";
    var clone = svg.cloneNode(true);
    unwrapPanZoomSvg(clone);
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.removeAttribute("id");
    clone.removeAttribute("style");
    return clone.outerHTML;
  }

  function destroyLightboxPz() {
    if (lightboxPz) {
      try {
        lightboxPz.destroy();
      } catch (_) {}
      lightboxPz = null;
    }
  }

  function closeFlowchartLightbox() {
    if (!lightboxEl || !lightboxEl.classList.contains("is-open")) return;
    lightboxEl.classList.remove("is-open");
    lightboxEl.setAttribute("aria-hidden", "true");
    destroyLightboxPz();
    var host = lightboxEl.querySelector(".flowchart-lightbox__host");
    if (host) host.innerHTML = "";
    if (lightboxSourceHost) {
      delete lightboxSourceHost.dataset.lightboxOpen;
      lightboxSourceHost = null;
    }
    document.documentElement.classList.remove("flowchart-lightbox-open");
    document.removeEventListener("keydown", onLightboxKeydown);
  }

  function onLightboxKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeFlowchartLightbox();
    }
  }

  function wireLightboxZoom(controls, getPz) {
    if (!controls || controls.dataset.wired === "1") return;
    controls.dataset.wired = "1";
    controls.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var btn = e.target.closest("[data-zoom]");
      if (!btn) return;
      var pz = getPz();
      if (!pz) return;
      try {
        var action = btn.getAttribute("data-zoom");
        if (action === "in") pz.zoomIn();
        else if (action === "out") pz.zoomOut();
        else if (action === "reset") {
          pz.fit();
          pz.center();
        }
      } catch (err) {
        console.warn("lightbox zoom failed", err);
      }
    });
  }

  function ensureLightbox() {
    if (lightboxEl) return lightboxEl;
    var el = document.createElement("div");
    el.className = "flowchart-lightbox";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="flowchart-lightbox__top">' +
      '<div class="flowchart-lightbox__counter">1 / 1</div>' +
      '<div class="flowchart-lightbox__actions">' +
      '<button type="button" class="flowchart-lightbox__btn" data-flb="close" title="Close" aria-label="Close">' +
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M24 10.2L21.8 8 16 13.8 10.2 8 8 10.2 13.8 16 8 21.8 10.2 24 16 18.2 21.8 24 24 21.8 18.2 16z"/></svg>' +
      "</button>" +
      "</div></div>" +
      '<div class="flowchart-lightbox__stage">' +
      '<div class="flowchart-lightbox__host" tabindex="-1"></div>' +
      '<div class="flowchart-lightbox__zoom">' +
      '<button type="button" class="flowchart-zoom-btn" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>' +
      '<button type="button" class="flowchart-zoom-btn" data-zoom="reset" title="Reset view" aria-label="Reset view">Reset</button>' +
      '<button type="button" class="flowchart-zoom-btn" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>' +
      "</div></div>" +
      '<div class="flowchart-lightbox__caption"></div>';
    document.body.appendChild(el);

    el.addEventListener("click", function (e) {
      if (e.target === el || e.target.classList.contains("flowchart-lightbox__stage")) {
        closeFlowchartLightbox();
      }
    });
    el.querySelector('[data-flb="close"]').addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeFlowchartLightbox();
    });
    wireLightboxZoom(el.querySelector(".flowchart-lightbox__zoom"), function () {
      return lightboxPz;
    });

    lightboxEl = el;
    return el;
  }

  function openFlowchartLightbox(sourceHost) {
    if (!sourceHost || !window.svgPanZoom) return;
    var svgHtml = getSvgCache(sourceHost);
    if (!svgHtml) return;

    var el = ensureLightbox();
    destroyLightboxPz();

    var host = el.querySelector(".flowchart-lightbox__host");
    var caption = el.querySelector(".flowchart-lightbox__caption");
    caption.textContent = getFlowchartCaption(sourceHost);
    host.innerHTML = svgHtml;

    var svg = host.querySelector("svg");
    if (!svg) return;
    unwrapPanZoomSvg(svg);
    prepareFlowchartSvg(svg);

    lightboxSourceHost = sourceHost;
    sourceHost.dataset.lightboxOpen = "1";
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("flowchart-lightbox-open");
    document.addEventListener("keydown", onLightboxKeydown);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try {
          lightboxPz = window.svgPanZoom(svg, {
            zoomEnabled: true,
            controlIconsEnabled: false,
            fit: true,
            center: true,
            minZoom: 0.1,
            maxZoom: 20,
            zoomScaleSensitivity: 0.4,
            mouseWheelZoomEnabled: true,
            dblClickZoomEnabled: true,
            preventMouseEventsDefault: true,
          });
        } catch (err) {
          console.warn("lightbox panzoom failed", err);
        }
      });
    });
  }

  function applyZoomAction(host, action) {
    var pz = getPanZoom(host);
    if (!pz || !pz.getZoom) {
      pz = ensurePanZoom(host, true);
    }
    if (!pz) return;
    try {
      if (action === "in") pz.zoomIn();
      else if (action === "out") pz.zoomOut();
      else if (action === "reset") {
        pz.fit();
        pz.center();
      } else if (action === "expand") {
        openFlowchartLightbox(host);
      }
    } catch (err) {
      console.warn("flowchart zoom failed", err);
      try {
        pz.destroy();
      } catch (_) {}
      setPanZoom(host, null);
      host._flowchartPz = null;
      ensurePanZoom(host, true);
    }
  }

  function ensureControls(host) {
    if (!host) return;
    var existing = host.querySelector(".flowchart-zoom-controls");
    if (existing) {
      if (!existing.querySelector('[data-zoom="expand"]')) {
        var expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "flowchart-zoom-btn";
        expandBtn.setAttribute("data-zoom", "expand");
        expandBtn.title = "Fullscreen";
        expandBtn.setAttribute("aria-label", "Fullscreen");
        expandBtn.textContent = "⛶";
        existing.insertBefore(expandBtn, existing.firstChild);
      }
      return;
    }

    var controls = document.createElement("div");
    controls.className = "flowchart-zoom-controls";
    controls.innerHTML =
      '<button type="button" class="flowchart-zoom-btn" data-zoom="expand" title="Fullscreen" aria-label="Fullscreen">⛶</button>' +
      '<button type="button" class="flowchart-zoom-btn" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>' +
      '<button type="button" class="flowchart-zoom-btn" data-zoom="reset" title="Reset view" aria-label="Reset view">Reset</button>' +
      '<button type="button" class="flowchart-zoom-btn" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>';
    host.appendChild(controls);

    ["mousedown", "touchstart", "pointerdown"].forEach(function (evt) {
      controls.addEventListener(
        evt,
        function (e) {
          e.stopPropagation();
        },
        { passive: true }
      );
    });
  }

  function wireHostOpenGesture(host) {
    // Kept for call-sites; gestures are delegated in boot()
    if (host) host.dataset.openGesture = "1";
  }

  /**
   * @param {HTMLElement} host
   * @param {boolean} doFit
   */
  function ensurePanZoom(host, doFit) {
    if (!host || !window.svgPanZoom) return null;
    var existing = getPanZoom(host);
    if (existing && typeof existing.zoomIn === "function") return existing;

    var svg = host.querySelector("svg");
    if (!svg) return null;
    if (host.clientWidth < 40 || host.clientHeight < 40) return null;

    try {
      // Owl may clone an already-wrapped SVG — unwrap before re-init
      unwrapPanZoomSvg(svg);

      var shouldFit = doFit !== false;
      var pz = window.svgPanZoom(svg, {
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: shouldFit,
        center: shouldFit,
        minZoom: 0.15,
        maxZoom: 16,
        zoomScaleSensitivity: 0.4,
        mouseWheelZoomEnabled: true,
        dblClickZoomEnabled: false,
        preventMouseEventsDefault: true,
      });
      setPanZoom(host, pz);
      panZoomList.push(pz);
      ensureControls(host);
      wireHostOpenGesture(host);
      return pz;
    } catch (err) {
      console.warn("svgPanZoom init failed", err);
      return null;
    }
  }

  function blockOwlOnHost(host) {
    if (!host || host.dataset.owlBlocked) return;
    host.dataset.owlBlocked = "1";
    ["mousedown", "touchstart", "pointerdown", "wheel"].forEach(function (evt) {
      host.addEventListener(
        evt,
        function (e) {
          e.stopPropagation();
        },
        { passive: false }
      );
    });
  }

  function extractSvgMarkup(text) {
    var raw = String(text || "").trim();
    if (!raw) return "";
    var start = raw.indexOf("<svg");
    var end = raw.lastIndexOf("</svg>");
    if (start === -1 || end === -1) return "";
    return raw.slice(start, end + 6);
  }

  function prepareFlowchartSvg(svg) {
    if (!svg) return;
    var oldId = svg.getAttribute("id") || "my-svg";
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.removeAttribute("id");
    svg.classList.add("flowchart-diagram");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.maxWidth = "100%";
    svg.style.maxHeight = "100%";

    // Mermaid scopes CSS to #my-svg — keep rules alive after id removal
    var style = svg.querySelector("style");
    if (style && style.textContent) {
      var esc = oldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var css = style.textContent
        .replace(new RegExp("#" + esc + "(?![\\w-])", "g"), "svg.flowchart-diagram")
        .replace(/#my-svg(?![\\w-])/g, "svg.flowchart-diagram");
      css = css
        .replace(/fill:#1f2020/gi, "fill:#3a4556")
        .replace(/stroke:#ccc/gi, "stroke:#d4b5ff")
        .replace(/fill:#ccc/gi, "fill:#ffffff")
        .replace(/color:#ccc/gi, "color:#ffffff")
        .replace(/stroke:lightgrey/gi, "stroke:#e6edf3")
        .replace(/fill:lightgrey/gi, "fill:#e6edf3")
        .replace(/stroke-width:1px/gi, "stroke-width:2.25px");
      style.textContent = css;
    }

    // Bump inline dark-theme paints so contrast holds even if CSS fails
    svg.querySelectorAll("circle.proc").forEach(function (el) {
      el.setAttribute("fill", "#3a4556");
      el.setAttribute("stroke", "#e6e6e6");
      el.setAttribute("stroke-width", "1.8");
    });
    svg.querySelectorAll("rect.ent").forEach(function (el) {
      el.setAttribute("fill", "#2c3340");
      el.setAttribute("stroke", "#e6e6e6");
      el.setAttribute("stroke-width", "1.6");
    });
    svg
      .querySelectorAll(".node rect, .node circle, .node ellipse, .node polygon, .node path")
      .forEach(function (el) {
        var fill = (el.getAttribute("fill") || "").toLowerCase();
        if (
          !fill ||
          fill === "#1f2020" ||
          fill === "#2a3140" ||
          fill === "#000" ||
          fill === "#000000"
        ) {
          el.setAttribute("fill", "#3a4556");
        }
        var stroke = (el.getAttribute("stroke") || "").toLowerCase();
        if (
          !stroke ||
          stroke === "#ccc" ||
          stroke === "#cccccc" ||
          stroke === "#b794f6" ||
          stroke === "lightgrey" ||
          stroke === "lightgray"
        ) {
          el.setAttribute("stroke", "#d4b5ff");
        }
        el.setAttribute("stroke-width", "2.25");
      });

    svg.querySelectorAll(".edgePath .path, .flowchart-link, path.path").forEach(function (el) {
      var stroke = (el.getAttribute("stroke") || "").toLowerCase();
      if (
        !stroke ||
        stroke === "#ccc" ||
        stroke === "lightgrey" ||
        stroke === "lightgray" ||
        stroke === "#c9d1d9" ||
        stroke === "#999" ||
        stroke === "#666"
      ) {
        el.setAttribute("stroke", "#e6edf3");
      }
      el.setAttribute("stroke-width", "2.25");
    });

    svg.querySelectorAll("marker path, .marker").forEach(function (el) {
      if (el.getAttribute("fill") && el.getAttribute("fill") !== "none") {
        el.setAttribute("fill", "#e6edf3");
      }
      if (el.getAttribute("stroke") && el.getAttribute("stroke") !== "none") {
        el.setAttribute("stroke", "#e6edf3");
      }
    });

    // Edge labels (Ya / Tidak) often inherit near-invisible colors
    svg.querySelectorAll(".edgeLabel rect").forEach(function (el) {
      el.setAttribute("fill", "#4b5568");
      el.setAttribute("opacity", "0.98");
    });
    svg.querySelectorAll(".edgeLabel span, .edgeLabel p, .edgeLabel div").forEach(function (el) {
      el.style.color = "#f8fafc";
      el.style.backgroundColor = "#4b5568";
    });
    svg.querySelectorAll(".label foreignObject div, .label foreignObject span, .nodeLabel").forEach(function (el) {
      el.style.color = "#ffffff";
    });
  }

  function applySvgToHost(host, svgHtml) {
    if (!host) return;

    // Cloned Owl node: has SVG viewport wrap but no live instance → reinject clean SVG
    var svgExisting = host.querySelector("svg");
    var hasViewport =
      svgExisting && svgExisting.querySelector(".svg-pan-zoom_viewport");
    var hasLive = !!getPanZoom(host);
    if (host.dataset.rendered === "1" && svgExisting && hasLive) {
      ensureControls(host);
      return;
    }
    if (host.dataset.rendered === "1" && svgExisting && hasViewport && !hasLive) {
      if (host.dataset.svgCache) svgHtml = host.dataset.svgCache;
    } else if (host.dataset.rendered === "1" && svgExisting && !hasViewport && !hasLive) {
      ensureControls(host);
      ensurePanZoom(host, true);
      return;
    }

    if (svgHtml) host.dataset.svgCache = svgHtml;
    host.innerHTML = svgHtml || host.dataset.svgCache || "";
    // restore controls after innerHTML wipe
    var svg = host.querySelector("svg");
    if (!svg) {
      host.innerHTML = '<div class="flowchart-error">Invalid SVG flowchart</div>';
      return;
    }
    prepareFlowchartSvg(svg);
    host.dataset.rendered = "1";
    host.title = "Double-click for fullscreen";
    delete host._flowchartPz;
    blockOwlOnHost(host);
    ensureControls(host);
    wireHostOpenGesture(host);
    ensurePanZoom(host, true);
  }

  async function renderFlowchartSlide($item) {
    var $gallery = $item.closest(".portfolio_gallery");
    var src = $item.attr("data-flowchart-src");
    var host = $item.find(".flowchart-host")[0];
    if (!host || !src) return;
    if (host.dataset.rendered === "1" && host.querySelector("svg")) {
      ensureControls(host);
      ensurePanZoom(host, !getPanZoom(host));
      return;
    }

    host.innerHTML = '<div class="flowchart-loading">Loading flowchart…</div>';

    if (!/\.svg(\?|#|$)/i.test(src)) {
      host.innerHTML =
        '<div class="flowchart-error">Flowchart must be a local .svg file<br><small>' +
        src +
        "</small></div>";
      return;
    }

    if (!window.svgPanZoom) {
      host.innerHTML =
        '<div class="flowchart-error">svg-pan-zoom failed to load</div>';
      return;
    }

    try {
      var res = await fetch(src, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status + " fetching " + src);
      var text = await res.text();
      var svgHtml = extractSvgMarkup(text);
      if (!svgHtml) throw new Error("No <svg> found in " + src);

      var selector =
        '.gallery_item[data-type="flowchart"][data-flowchart-src="' +
        src.replace(/"/g, '\\"') +
        '"] .flowchart-host';
      var targets = $gallery.length ? $gallery.find(selector) : $(host);
      targets.each(function () {
        applySvgToHost(this, svgHtml);
      });
    } catch (err) {
      console.warn("flowchart render failed", src, err);
      host.innerHTML =
        '<div class="flowchart-error">Failed to load flowchart<br><small>' +
        String(err.message || err) +
        "</small></div>";
    }
  }

  function renderYoutubeSlide($item) {
    var host = $item.find(".youtube-host")[0];
    if (!host) {
      host = document.createElement("div");
      host.className = "youtube-host";
      $item.prepend(host);
    }
    if (host.dataset.rendered === "1") return;
    var url = $item.attr("data-youtube") || "";
    var id = youtubeId(url);
    if (!id) {
      host.innerHTML = '<div class="flowchart-error">Invalid YouTube URL</div>';
      return;
    }
    host.innerHTML =
      '<iframe src="https://www.youtube.com/embed/' +
      id +
      '" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
    host.dataset.rendered = "1";
  }

  function renderPptSlide($item) {
    var host = $item.find(".ppt-host")[0];
    if (!host) {
      host = document.createElement("div");
      host.className = "ppt-host";
      $item.prepend(host);
    }
    if (host.dataset.rendered === "1") return;
    var url = $item.attr("data-ppt") || "#";
    host.innerHTML =
      '<a href="' +
      url +
      '" target="_blank" rel="noopener noreferrer">Open presentation <i class="fal fa-arrow-right"></i></a>';
    host.dataset.rendered = "1";
  }

  async function hydrateGallery($gallery) {
    var tasks = [];
    var seenSrc = {};

    $gallery.find('.gallery_item[data-type="flowchart"]').each(function () {
      var $item = $(this);
      var src = $item.attr("data-flowchart-src") || "";
      if (src && seenSrc[src]) return;
      if (src) seenSrc[src] = true;
      tasks.push(renderFlowchartSlide($item));
    });

    $gallery.find('.gallery_item[data-type="youtube"]').each(function () {
      renderYoutubeSlide($(this));
    });
    $gallery.find('.gallery_item[data-type="ppt"]').each(function () {
      renderPptSlide($(this));
    });

    await Promise.all(tasks);
  }

  function refreshOwlLayout($gallery) {
    if (!$gallery || !$gallery.length) return;
    $gallery.each(function () {
      var $g = $(this);
      if ($g.hasClass("owl-loaded")) {
        $g.trigger("refresh.owl.carousel");
      } else if ($.fn.owlCarousel) {
        $g.owlCarousel({
          items: 2,
          loop: true,
          lazyLoad: true,
          center: true,
          autoplay: false,
          smartSpeed: 800,
          margin: 30,
          nav: false,
          dots: true,
          mouseDrag: true,
          touchDrag: true,
          pullDrag: true,
          responsive: {
            0: { items: 1, margin: 0 },
            768: { items: 2, margin: 20 },
            992: { items: 2, margin: 30 },
          },
        });
      }
    });
  }

  function softResizeActivePanZooms($scope) {
    var root = $scope && $scope.length ? $scope[0] : document;
    var actives = root.querySelectorAll(".mfp-content .owl-item.active .flowchart-host");
    if (!actives.length) {
      actives = root.querySelectorAll(".mfp-content .flowchart-host");
    }
    actives.forEach(function (host) {
      if (!host.querySelector("svg")) return;
      var pz = getPanZoom(host);
      if (!pz) {
        // Cloned slide: rebuild a clean panzoom once
        ensurePanZoom(host, true);
        return;
      }
      try {
        pz.resize();
        pz.fit();
        pz.center();
      } catch (_) {
        setPanZoom(host, null);
        ensurePanZoom(host, true);
      }
    });
  }

  function hostsNeedHydrate($galleries) {
    var need = false;
    $galleries.find(".flowchart-host").each(function () {
      if (this.dataset.rendered !== "1" || !this.querySelector("svg")) need = true;
    });
    return need;
  }

  async function onModalOpen() {
    if (hydrating) return;

    var $content = $(".mfp-content");
    if (!$content.length) return;

    var $galleries = $content.find(".portfolio_gallery.owl-carousel");
    if (!$galleries.length) return;

    if (hydratedModal && !hostsNeedHydrate($galleries)) {
      softResizeActivePanZooms($content);
      return;
    }

    hydrating = true;
    try {
      if (hostsNeedHydrate($galleries)) {
        $galleries.find(".flowchart-host").each(function () {
          if (this.dataset.rendered === "1" && this.querySelector("svg")) return;
          delete this.dataset.rendered;
          this.innerHTML = '<div class="flowchart-loading">Loading flowchart…</div>';
        });

        await hydrateGallery($galleries);
        // Refresh Owl ONCE before panzoom is relied on by the user
        refreshOwlLayout($galleries);

        setTimeout(function () {
          hydrateGallery($galleries).then(function () {
            softResizeActivePanZooms($content);
            hydratedModal = true;
          });
        }, 250);
      } else {
        softResizeActivePanZooms($content);
        hydratedModal = true;
      }
    } catch (e) {
      console.warn("gallery hydrate failed", e);
      hydratedModal = true;
    } finally {
      hydrating = false;
    }
  }

  function boot() {
    if (!window.jQuery) return;

    var hydrateTimer = null;
    function scheduleHydrate() {
      clearTimeout(hydrateTimer);
      hydrateTimer = setTimeout(onModalOpen, 180);
    }

    // Delegated: works for Owl clones too
    $(document).on("click.portfolioGalleryFs", ".flowchart-zoom-controls [data-zoom]", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var btn = e.currentTarget;
      var host = btn.closest(".flowchart-host");
      if (!host || host.closest(".flowchart-lightbox")) return;
      applyZoomAction(host, btn.getAttribute("data-zoom"));
    });

    $(document).on("dblclick.portfolioGalleryFs", ".flowchart-host", function (e) {
      if (e.target.closest(".flowchart-zoom-controls")) return;
      if (e.target.closest(".flowchart-lightbox")) return;
      var host = e.currentTarget;
      if (!host.querySelector("svg")) return;
      e.preventDefault();
      e.stopPropagation();
      openFlowchartLightbox(host);
    });

    $(document).on("mfpOpen.portfolioGallery", function () {
      hydratedModal = false;
      scheduleHydrate();
    });

    $(document).on("click.portfolioGallery", ".modal-popup", function () {
      hydratedModal = false;
      scheduleHydrate();
    });

    $(document).on("mfpClose.portfolioGallery", function () {
      closeFlowchartLightbox();
      destroyPanZooms();
    });

    $(document).on("translated.owl.carousel.portfolioGallery", ".portfolio_gallery", function () {
      var $g = $(this);
      if (!$g.closest(".mfp-content").length) return;
      // New active slide: init panzoom if needed, resize only
      softResizeActivePanZooms($g);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.jQuery);
