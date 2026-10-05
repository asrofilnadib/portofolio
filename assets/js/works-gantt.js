/**
 * Works Timeline — Highcharts Gantt
 * Bars = consecutive commit days; diamonds = single-day milestones.
 * Default view: last 30 days. Rows only show projects with commits in the
 * visible range, and update gradually as the user expands / pans / zooms.
 */
(function () {
  "use strict";

  var COLORS = [
    "#8750f7",
    "#58a6ff",
    "#3fb950",
    "#d29922",
    "#f778ba",
    "#39c5cf",
    "#a371f7",
    "#f85149",
    "#7ee787",
    "#79c0ff",
    "#ffa657",
    "#d2a8ff",
    "#56d4dd",
  ];

  var RANGE_STEPS = [
    { key: "30", days: 30, label: "Last 30 days" },
    { key: "90", days: 90, label: "Last 90 days" },
    { key: "180", days: 180, label: "Last 6 months" },
    { key: "365", days: 365, label: "Last 1 year" },
    { key: "all", days: null, label: "Full timeline" },
  ];

  var DAY_MS = 24 * 60 * 60 * 1000;
  var chart = null;
  var allProjects = null;
  var activePool = [];
  var currentCompany = "all";
  var currentStack = "all";
  var rangeIndex = 0;
  var lastWin = null;
  var dataBounds = null;
  var lastVisibleSig = "";
  var syncTimer = null;
  var syncingRows = false;
  var resizeObserver = null;
  var wheelBound = false;
  var rangePinned = true;
  var WRAPPER_MAP = {
    "smart-lab": "smart-lab",
    tms: "tms",
    ecafe: "ecafe",
    "ga-stock": "ga-stock",
    scada: "scada",
    logbook: "logbook",
    p2h: "p2h",
    chatbot: "chatbot",
    kapas: "kapas",
    timbangin: "timbangin",
    prayer: "prayer",
    "car-pool": "car-pool",
    "dashboard-yield": "dashboard-yield",
    "dashboard-catalog": "dashboard-catalog",
    "help-dev-kanban": "help-dev-kanban",
    "form-seasoning-2": "form-seasoning-2",
    "metal-detector": "metal-detector",
    "kms-form": "kms-form",
    "command-center": "command-center",
    psikotes: "psikotes",
    labqc: "labqc",
    "log-customer": "log",
    checksheet: "checksheet",
    "log-internal": "logqc",
    "pending-qc": "pqc",
    "testing-report": "testing-report",
    "investigation-report": "investigation-report",
    "grace-period": "gp",
    okration: "skripsi",
    kastara: "kastara",
    "sistem-pakar": "sistem_pakar",
  };

  // Mirror portfolio-item stack-* classes for timeline filtering
  var STACK_TAGS_BY_KEY = {
    "smart-lab": ["laravel"],
    tms: ["laravel"],
    ecafe: ["laravel"],
    "ga-stock": ["laravel"],
    scada: ["laravel"],
    logbook: ["laravel"],
    p2h: ["laravel"],
    chatbot: ["laravel", "ai"],
    kapas: ["laravel"],
    timbangin: ["laravel", "nodejs"],
    prayer: ["laravel", "react"],
    "car-pool": ["laravel"],
    "dashboard-yield": ["laravel"],
    "dashboard-catalog": ["laravel"],
    "help-dev-kanban": ["laravel"],
    "form-seasoning-2": ["laravel"],
    "metal-detector": ["laravel"],
    "kms-form": ["react", "firebase"],
    "command-center": ["react", "webrtc"],
    psikotes: ["laravel", "react", "ai"],
    labqc: ["laravel"],
    "log-customer": ["laravel"],
    checksheet: ["laravel"],
    "log-internal": ["laravel"],
    "pending-qc": ["laravel"],
    "testing-report": ["laravel"],
    "investigation-report": ["laravel"],
    "grace-period": ["laravel"],
    okration: ["laravel"],
    kastara: ["laravel"],
    "sistem-pakar": ["laravel", "ai"],
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function isMobile() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  function setStatus(msg, isError) {
    var el = $("#works-gantt-status");
    var host = $("#works-gantt");
    var hint = $(".works-gantt-hint");
    if (!el) return;
    if (!msg) {
      el.classList.remove("is-visible", "is-error");
      el.textContent = "";
      if (host) host.style.display = "";
      if (hint) hint.style.display = "";
      return;
    }
    el.textContent = msg;
    el.classList.add("is-visible");
    el.classList.toggle("is-error", !!isError);
    if (host) host.style.display = "none";
    if (hint) hint.style.display = "none";
  }

  function companyFromFilter(filter) {
    if (!filter || filter === "*") return "all";
    return String(filter).replace(/^\./, "").toLowerCase();
  }

  function stackFromFilter(filter) {
    if (!filter || filter === "*") return "all";
    return String(filter)
      .replace(/^\./, "")
      .replace(/^stack-/, "")
      .toLowerCase();
  }

  function projectHasStack(projectKey, stack) {
    if (!stack || stack === "all") return true;
    var tags = STACK_TAGS_BY_KEY[projectKey] || [];
    return tags.indexOf(stack) !== -1;
  }

  function parseDay(day) {
    return Date.parse(day + "T00:00:00+07:00");
  }

  function endExclusive(day) {
    return parseDay(day) + DAY_MS;
  }

  function formatRange(start, end) {
    if (start === end) return start;
    return start + " → " + end;
  }

  function startOfTodayJakarta() {
    var fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return parseDay(fmt.format(new Date()));
  }

  function segmentOverlaps(seg, min, max) {
    var s = parseDay(seg.start);
    var e = endExclusive(seg.end);
    return e > min && s < max;
  }

  function computeDataBounds(projects) {
    var min = null;
    var max = null;
    (projects || []).forEach(function (p) {
      (p.segments || []).forEach(function (seg) {
        var s = parseDay(seg.start);
        var e = endExclusive(seg.end);
        if (min === null || s < min) min = s;
        if (max === null || e > max) max = e;
      });
    });
    if (min == null) {
      var today = startOfTodayJakarta();
      return { min: today - 30 * DAY_MS, max: today + DAY_MS };
    }
    return { min: min - DAY_MS, max: max + DAY_MS };
  }

  function getRangeWindow(bounds) {
    var step = RANGE_STEPS[rangeIndex] || RANGE_STEPS[0];
    var todayMax = startOfTodayJakarta() + DAY_MS;
    var min;
    var max;

    if (step.days == null) {
      min = bounds.min;
      max = bounds.max;
    } else {
      min = todayMax - step.days * DAY_MS;
      max = todayMax;
      if (min < bounds.min) min = bounds.min;
      if (max > bounds.max) max = bounds.max;
      if (min >= max) {
        min = bounds.min;
        max = bounds.max;
      }
    }

    return {
      min: min,
      max: max,
      label: step.label,
      key: step.key,
      days: step.days,
    };
  }

  function filterProjects(company, stack) {
    var list = allProjects || [];
    var companyKey = company || currentCompany || "all";
    var stackKey = stack || currentStack || "all";
    if (companyKey && companyKey !== "all") {
      list = list.filter(function (p) {
        return String(p.company || "").toLowerCase() === companyKey;
      });
    }
    if (stackKey && stackKey !== "all") {
      list = list.filter(function (p) {
        return projectHasStack(p.key, stackKey);
      });
    }
    return list;
  }

  /** Projects that have at least one commit segment inside [min, max]. */
  function projectsInRange(projects, min, max) {
    return (projects || [])
      .map(function (p) {
        var segs = (p.segments || []).filter(function (seg) {
          return segmentOverlaps(seg, min, max);
        });
        return {
          key: p.key,
          title: p.title,
          company: p.company,
          segments: segs,
        };
      })
      .filter(function (p) {
        return p.segments.length > 0;
      });
  }

  function colorForProject(projectKey) {
    var idx = 0;
    for (var i = 0; i < activePool.length; i += 1) {
      if (activePool[i].key === projectKey) {
        idx = i;
        break;
      }
    }
    return COLORS[idx % COLORS.length];
  }

  function buildSeries(projects) {
    var categories = projects.map(function (p) {
      return p.title;
    });
    var data = [];

    projects.forEach(function (project, y) {
      var color = colorForProject(project.key);
      (project.segments || []).forEach(function (seg) {
        var point = {
          name: project.title,
          y: y,
          projectKey: project.key,
          company: project.company,
          color: color,
          commits: seg.commits,
          startLabel: seg.start,
          endLabel: seg.end,
          start: parseDay(seg.start),
          end: endExclusive(seg.end),
          milestone: !!seg.milestone,
        };
        if (seg.milestone) {
          point.marker = {
            symbol: "diamond",
            radius: isMobile() ? 6 : 7,
            lineWidth: 0,
            fillColor: color,
          };
        }
        data.push(point);
      });
    });

    return { categories: categories, data: data };
  }

  /** Flattened overview points so the navigator keeps the full history. */
  function buildOverviewData(projects) {
    var data = [];
    (projects || []).forEach(function (project) {
      var color = colorForProject(project.key);
      (project.segments || []).forEach(function (seg) {
        data.push({
          name: project.title,
          y: 0,
          projectKey: project.key,
          color: color,
          start: parseDay(seg.start),
          end: endExclusive(seg.end),
          milestone: !!seg.milestone,
          marker: seg.milestone
            ? { symbol: "diamond", radius: 3, lineWidth: 0, fillColor: color }
            : undefined,
        });
      });
    });
    return data;
  }

  function visibleSignature(projects) {
    return projects
      .map(function (p) {
        return p.key;
      })
      .join("|");
  }

  function syncRangeUi(win) {
    lastWin = win;
    rangePinned = true;
    var label = $("#works-range-label");
    if (label) label.textContent = win.label;

    document.querySelectorAll(".works-range-pill").forEach(function (btn) {
      var key = btn.getAttribute("data-range-days");
      btn.classList.toggle("is-active", key === win.key);
    });

    var shrink = document.querySelector('.works-range-step[data-range-step="-1"]');
    var expand = document.querySelector('.works-range-step[data-range-step="1"]');
    if (shrink) shrink.disabled = rangeIndex <= 0;
    if (expand) expand.disabled = rangeIndex >= RANGE_STEPS.length - 1;
  }

  function clearRangePillSelection(min, max) {
    rangePinned = false;
    document.querySelectorAll(".works-range-pill").forEach(function (btn) {
      btn.classList.remove("is-active");
    });
    var label = $("#works-range-label");
    if (label && min != null && max != null) {
      var days = Math.max(1, Math.round((max - min) / DAY_MS));
      label.textContent = "Custom · ~" + days + " days";
    }
  }

  function isUserDrivenExtremes(e) {
    if (!e) return false;
    if (e.trigger === "range-pill") return false;
    // Browser event present ⇒ scrub / drag / zoom from UI
    if (e.DOMEvent) return true;
    var t = e.trigger;
    return (
      t === "zoom" ||
      t === "pan" ||
      t === "navigator" ||
      t === "scrollbar" ||
      t === "mousewheel" ||
      t === "user-view"
    );
  }

  function applyViewExtremes(animate) {
    if (!chart || !lastWin) return;
    chart.xAxis[0].setExtremes(lastWin.min, lastWin.max, true, animate !== false, {
      trigger: "range-pill",
    });
  }

  function zoomAt(axis, center, factor) {
    if (!axis || !dataBounds) return;
    var ex = axis.getExtremes();
    var span = ex.max - ex.min;
    var nextSpan = Math.max(3 * DAY_MS, Math.min(dataBounds.max - dataBounds.min, span * factor));
    var ratio = span ? (center - ex.min) / span : 0.5;
    var nextMin = center - nextSpan * ratio;
    var nextMax = nextMin + nextSpan;
    if (nextMin < dataBounds.min) {
      nextMin = dataBounds.min;
      nextMax = nextMin + nextSpan;
    }
    if (nextMax > dataBounds.max) {
      nextMax = dataBounds.max;
      nextMin = nextMax - nextSpan;
      if (nextMin < dataBounds.min) nextMin = dataBounds.min;
    }
    axis.setExtremes(nextMin, nextMax, true, false, { trigger: "user-view" });
  }

  function onChartWheel(e) {
    if (!chart) return;
    var axis = chart.xAxis[0];
    if (!axis) return;
    e.preventDefault();
    var factor = e.deltaY > 0 ? 1.25 : 0.8;
    var rect = chart.container ? chart.container.getBoundingClientRect() : null;
    var center;
    if (rect && typeof axis.toValue === "function") {
      var x = e.clientX - rect.left - (chart.plotLeft || 0);
      center = axis.toValue(x);
    } else {
      var ex = axis.getExtremes();
      center = (ex.min + ex.max) / 2;
    }
    zoomAt(axis, center, factor);
  }

  function bindWheelZoom(host) {
    if (!host || wheelBound) return;
    host.addEventListener("wheel", onChartWheel, { passive: false });
    wheelBound = true;
  }

  function chartHeight(rowCount) {
    var row = isMobile() ? 30 : 36;
    var chrome = isMobile() ? 120 : 150;
    var minH = isMobile() ? 300 : 360;
    var maxH = Math.min(window.innerHeight * 0.72, isMobile() ? 560 : 720);
    return Math.max(minH, Math.min(maxH, chrome + Math.max(rowCount, 1) * row));
  }

  /**
   * Gradually show/hide project rows based on the visible x-range.
   */
  function syncVisibleRows(min, max) {
    if (!chart || !activePool.length) return;

    var visible = projectsInRange(activePool, min, max);
    var sig = visibleSignature(visible) + "@" + Math.round(min) + ":" + Math.round(max);

    if (!visible.length) {
      lastVisibleSig = sig;
      setStatus("No commits in this view. Expand the range or scrub the navigator.");
      return;
    }

    if (sig === lastVisibleSig) return;
    lastVisibleSig = sig;

    setStatus("");
    var built = buildSeries(visible);
    var nextHeight = chartHeight(visible.length);
    var series = chart.get("visible-activity") || chart.series[0];

    syncingRows = true;
    try {
      chart.yAxis[0].setCategories(built.categories, false);
      if (series) series.setData(built.data, false, false, false);
      if (Math.abs((chart.chartHeight || 0) - nextHeight) > 8) {
        chart.setSize(undefined, nextHeight, false);
      }
      chart.redraw(false);
    } finally {
      syncingRows = false;
    }
  }

  function scheduleSyncFromExtremes(min, max) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      syncVisibleRows(min, max);
    }, 80);
  }

  function renderChart(company) {
    if (!window.Highcharts || typeof window.Highcharts.ganttChart !== "function") {
      setStatus("Highcharts Gantt failed to load.", true);
      return;
    }

    activePool = filterProjects(company, currentStack).filter(function (p) {
      return p.segments && p.segments.length;
    });

    if (!activePool.length) {
      setStatus("No commit activity found for this filter yet.");
      if (chart) {
        chart.destroy();
        chart = null;
      }
      return;
    }

    dataBounds = computeDataBounds(activePool);
    var win = getRangeWindow(dataBounds);
    syncRangeUi(win);

    var visible = projectsInRange(activePool, win.min, win.max);
    if (!visible.length) {
      setStatus("No activity in " + win.label.toLowerCase() + ". Expand the range to see older commits.");
      if (chart) {
        chart.destroy();
        chart = null;
      }
      return;
    }

    setStatus("");
    var built = buildSeries(visible);
    var overview = buildOverviewData(activePool);
    var mobile = isMobile();
    var height = chartHeight(visible.length);
    var host = $("#works-gantt");
    lastVisibleSig = visibleSignature(visible) + "@" + Math.round(win.min) + ":" + Math.round(win.max);

    if (chart) {
      chart.destroy();
      chart = null;
    }

    chart = Highcharts.ganttChart("works-gantt", {
      chart: {
        backgroundColor: "transparent",
        height: height,
        style: { fontFamily: "Sora, sans-serif" },
        spacing: mobile ? [8, 8, 8, 8] : [10, 12, 12, 10],
        panning: {
          enabled: true,
          type: "x",
        },
        panKey: "shift",
        zooming: {
          type: "x",
          pinchType: "x",
          singleTouch: false,
          resetButton: {
            position: { align: "right", x: -8, y: 8 },
            theme: {
              fill: "rgba(18, 16, 26, 0.92)",
              stroke: "rgba(135, 80, 247, 0.55)",
              r: 8,
              style: {
                color: "#e6edf3",
                fontFamily: "Sora, sans-serif",
                fontSize: "11px",
                fontWeight: "600",
              },
              states: {
                hover: {
                  fill: "rgba(135, 80, 247, 0.28)",
                  style: { color: "#fff" },
                },
              },
            },
          },
        },
        events: {
          load: function () {
            // Set the preset window, then ensure rows match that window.
            this.xAxis[0].setExtremes(win.min, win.max, true, false);
            syncVisibleRows(win.min, win.max);
          },
        },
      },
      title: { text: null },
      credits: { enabled: false },
      exporting: { enabled: false },
      rangeSelector: { enabled: false },
      legend: { enabled: false },
      navigator: {
        enabled: true,
        adaptToUpdatedData: false,
        height: mobile ? 28 : 36,
        maskFill: "rgba(135, 80, 247, 0.18)",
        outlineColor: "rgba(135, 80, 247, 0.35)",
        outlineWidth: 1,
        handles: {
          backgroundColor: "#8750f7",
          borderColor: "#b794f6",
          width: mobile ? 8 : 10,
          height: mobile ? 16 : 20,
        },
        series: {
          type: "gantt",
          color: "rgba(135, 80, 247, 0.55)",
          fillOpacity: 0.25,
          lineWidth: 0,
        },
        xAxis: {
          min: dataBounds.min,
          max: dataBounds.max,
          labels: {
            style: { color: "#8b949e", fontSize: "10px" },
          },
          gridLineColor: "#30363d",
        },
      },
      scrollbar: {
        enabled: true,
        liveRedraw: true,
        height: mobile ? 8 : 10,
        barBackgroundColor: "rgba(135, 80, 247, 0.45)",
        barBorderRadius: 6,
        barBorderWidth: 0,
        buttonBackgroundColor: "rgba(255,255,255,0.06)",
        buttonBorderWidth: 0,
        buttonArrowColor: "#c9d1d9",
        rifleColor: "#e6edf3",
        trackBackgroundColor: "rgba(255,255,255,0.04)",
        trackBorderWidth: 0,
        trackBorderRadius: 6,
      },
      tooltip: {
        backgroundColor: "rgba(18, 16, 26, 0.96)",
        borderColor: "rgba(135, 80, 247, 0.45)",
        borderRadius: 10,
        shadow: false,
        outside: true,
        stickOnContact: true,
        style: { color: "#e6edf3", fontSize: mobile ? "11px" : "12px" },
        formatter: function () {
          if (this.series && this.series.options && this.series.options.id === "overview-activity") {
            return false;
          }
          var p = this.point;
          var kind = p.milestone ? "Single day" : "Consecutive days";
          return (
            "<b>" +
            p.name +
            "</b><br/>" +
            kind +
            "<br/>" +
            formatRange(p.startLabel, p.endLabel) +
            "<br/>" +
            p.commits +
            " commit" +
            (p.commits === 1 ? "" : "s") +
            "<br/><span style=\"color:#8b949e\">Click to open project</span>"
          );
        },
      },
      xAxis: [
        {
          // floor/ceiling keep navigator panning within full history,
          // without forcing the initial view to "All".
          floor: dataBounds.min,
          ceiling: dataBounds.max,
          currentDateIndicator: {
            color: "rgba(135, 80, 247, 0.55)",
            width: 1,
            dashStyle: "Dash",
            label: {
              format: "Today",
              style: { color: "#b794f6", fontSize: "10px" },
            },
          },
          minPadding: 0.02,
          maxPadding: 0.02,
          grid: { borderColor: "#30363d", enabled: true },
          labels: { style: { color: "#8b949e", fontSize: mobile ? "10px" : "11px" } },
          lineColor: "#30363d",
          tickColor: "#30363d",
          events: {
            afterSetExtremes: function (e) {
              if (syncingRows) return;
              if (e.min == null || e.max == null) return;
              if (isUserDrivenExtremes(e)) {
                clearRangePillSelection(e.min, e.max);
              }
              scheduleSyncFromExtremes(e.min, e.max);
            },
          },
        },
        {
          labels: {
            style: {
              color: "#c9d1d9",
              fontSize: mobile ? "11px" : "12px",
              fontWeight: "600",
            },
          },
          grid: { borderColor: "#30363d" },
          lineColor: "#30363d",
        },
      ],
      yAxis: {
        type: "category",
        categories: built.categories,
        uniqueNames: true,
        staticScale: mobile ? 30 : 36,
        labels: {
          align: "right",
          style: {
            color: "#e6edf3",
            fontSize: mobile ? "10px" : "12px",
            fontWeight: "600",
            textOverflow: "ellipsis",
            width: mobile ? 88 : 140,
          },
        },
        grid: {
          borderColor: "#30363d",
          enabled: true,
        },
      },
      plotOptions: {
        series: {
          animation: mobile ? false : { duration: 350 },
          borderRadius: 6,
          borderColor: "transparent",
          dataLabels: { enabled: false },
          cursor: "pointer",
          states: {
            hover: {
              brightness: 0.12,
              halo: { size: 6, opacity: 0.25 },
            },
            inactive: { opacity: 0.35 },
          },
          point: {
            events: {
              click: function () {
                if (this.series && this.series.options.id === "overview-activity") return;
                focusProject(this.projectKey);
              },
            },
          },
        },
        gantt: {
          borderRadius: 6,
        },
      },
      responsive: {
        rules: [
          {
            condition: { maxWidth: 640 },
            chartOptions: {
              chart: { spacing: [6, 4, 8, 4] },
              navigator: { height: 26 },
              scrollbar: { height: 8 },
              yAxis: {
                staticScale: 28,
                labels: { style: { fontSize: "10px", width: 78 } },
              },
            },
          },
        ],
      },
      series: [
        {
          id: "visible-activity",
          name: "Activity",
          data: built.data,
          borderRadius: 6,
          turboThreshold: 0,
          showInNavigator: false,
        },
        {
          id: "overview-activity",
          name: "Overview",
          data: overview,
          borderRadius: 4,
          turboThreshold: 0,
          visible: false,
          showInLegend: false,
          enableMouseTracking: false,
          showInNavigator: true,
        },
      ],
    });

    bindWheelZoom(host);
    observeHost(host);
  }

  function observeHost(host) {
    if (!host || typeof ResizeObserver === "undefined") return;
    if (resizeObserver) resizeObserver.disconnect();
    var timer = null;
    resizeObserver = new ResizeObserver(function () {
      if (!chart) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!chart) return;
        chart.reflow();
      }, 120);
    });
    resizeObserver.observe(host);
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
  }

  function focusProject(projectKey) {
    if (!projectKey) return;
    var wrap = WRAPPER_MAP[projectKey] || projectKey;
    var btn = document.querySelector('[data-mfp-src="#portfolio-wrapper-' + cssEscape(wrap) + '"]');
    if (!btn) return;
    var card = btn.closest(".portfolio-item");
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("works-gantt-flash");
    setTimeout(function () {
      card.classList.remove("works-gantt-flash");
    }, 1200);
  }

  function setRangeByKey(key) {
    var idx = RANGE_STEPS.findIndex(function (s) {
      return s.key === String(key);
    });
    if (idx < 0) return;
    rangeIndex = idx;
    if (!allProjects) return;
    if (chart && dataBounds) {
      var win = getRangeWindow(dataBounds);
      syncRangeUi(win);
      applyViewExtremes(true);
      // afterSetExtremes will sync rows; also sync immediately for snappy UI
      scheduleSyncFromExtremes(win.min, win.max);
      return;
    }
    renderChart(currentCompany);
  }

  function stepRange(delta) {
    var next = rangeIndex + delta;
    if (next < 0 || next >= RANGE_STEPS.length) return;
    setRangeByKey(RANGE_STEPS[next].key);
  }

  async function loadActivity() {
    setStatus("Loading timeline…");
    try {
      var res = await fetch("/api/activity?company=all");
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to load activity");
      allProjects = data.projects || [];
      renderChart(currentCompany);
    } catch (err) {
      console.warn(err);
      setStatus(String(err.message || err), true);
    }
  }

  function applyCompany(company) {
    currentCompany = company || "all";
    if (!allProjects) return;
    renderChart(currentCompany);
  }

  function applyStack(stack) {
    currentStack = stack || "all";
    if (!allProjects) return;
    renderChart(currentCompany);
  }

  function bindFilters() {
    document.querySelectorAll(".filter-button-group button[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyCompany(companyFromFilter(btn.getAttribute("data-filter")));
      });
    });
    document.querySelectorAll(".stack-filter-button-group button[data-stack-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyStack(stackFromFilter(btn.getAttribute("data-stack-filter")));
      });
    });
  }

  function bindRangeControls() {
    document.querySelectorAll(".works-range-pill").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setRangeByKey(btn.getAttribute("data-range-days"));
      });
    });
    document.querySelectorAll(".works-range-step").forEach(function (btn) {
      btn.addEventListener("click", function () {
        stepRange(Number(btn.getAttribute("data-range-step") || 0));
      });
    });
    var reset = $("#works-range-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        if (!lastWin) return;
        // Restore last pill preset (not the scrubbed custom window)
        syncRangeUi(lastWin);
        applyViewExtremes(true);
        scheduleSyncFromExtremes(lastWin.min, lastWin.max);
      });
    }
  }

  function bindViewport() {
    var timer = null;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!allProjects || !chart) return;
        renderChart(currentCompany);
      }, 220);
    });
  }

  function boot() {
    if (!$("#works-gantt")) return;
    bindFilters();
    bindRangeControls();
    bindViewport();
    loadActivity();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
