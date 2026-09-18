/* GenAI Market — vendors page: filters, PeMa quadrant (SVG), sortable table, profile drawer, deep links. */
(function () {
  "use strict";
  var GM = window.GM;

  var COLUMNS = [
    { key: "name", label: "Vendor", type: "text" },
    { key: "quadrant", label: "Quadrant", type: "text" },
    { key: "pe_score", label: "Pe score", type: "num", title: "Penetration index, 0 to 1" },
    { key: "pe_rank", label: "Pe rank", type: "num" },
    { key: "ma_score", label: "Ma score", type: "num", title: "Maturity index, 0 to 1" },
    { key: "ma_rank", label: "Ma rank", type: "num" },
    { key: "country", label: "HQ", type: "text" },
    { key: "founded", label: "Founded", type: "num" },
    { key: "industries", label: "Industries", type: "list" }
  ];
  var QUAD_ORDER = ["leaders", "seasoned", "growth", "challengers"];

  var data = null;
  var state = { quadrant: "", country: "", category: "", q: "", sort: "pe_rank", dir: "asc" };
  var opener = null;
  var resizeTimer = null;

  /* ---------- URL state ---------- */
  function readURL() {
    var p = new URLSearchParams(location.search);
    state.quadrant = p.get("quadrant") || "";
    state.country = p.get("country") || "";
    state.category = p.get("category") || "";
    state.q = p.get("q") || "";
    var sort = p.get("sort");
    if (sort && COLUMNS.some(function (c) { return c.key === sort; })) state.sort = sort;
    state.dir = p.get("dir") === "desc" ? "desc" : (p.get("dir") === "asc" ? "asc" : defaultDir(state.sort));
  }
  function writeURL() {
    var p = new URLSearchParams();
    if (state.quadrant) p.set("quadrant", state.quadrant);
    if (state.country) p.set("country", state.country);
    if (state.category) p.set("category", state.category);
    if (state.q) p.set("q", state.q);
    if (state.sort !== "pe_rank" || state.dir !== "asc") { p.set("sort", state.sort); p.set("dir", state.dir); }
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }
  function defaultDir(key) {
    return (key === "pe_score" || key === "ma_score") ? "desc" : "asc";
  }

  /* ---------- Helpers ---------- */
  function option(value, label, selected) {
    return '<option value="' + GM.escapeHTML(value) + '"' + (selected ? " selected" : "") + ">" + GM.escapeHTML(label) + "</option>";
  }
  function fmtScore(v) { return Number(v).toFixed(2); }
  function quadLabel(id) { var q = data.vendors.meta.quadrants[id]; return q ? q.label : id; }
  function countryOf(v) { return v.hq && v.hq.country ? v.hq.country : ""; }
  function hqOf(v) {
    if (!v.hq) return "";
    return v.hq.city && v.hq.city !== v.hq.country ? v.hq.city + ", " + v.hq.country : v.hq.country;
  }
  function refLine(refs) { return GM.formatRefs(refs, data.srcById); }

  function matches(v) {
    if (state.quadrant && v.quadrant !== state.quadrant) return false;
    if (state.country && countryOf(v) !== state.country) return false;
    if (state.category && (v.service_categories || []).indexOf(state.category) < 0) return false;
    if (state.q) {
      var q = state.q.toLowerCase();
      var hay = [v.name, v.focus, hqOf(v), (v.industries || []).join(" "), (v.markets || []).join(" "),
        (v.platforms || []).map(function (p) { return p.name + " " + p.what; }).join(" "),
        (v.partners || []).join(" "), (v.differentiators || []).join(" ")].join(" ").toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  function filtersActive() { return !!(state.quadrant || state.country || state.category || state.q); }

  function sortValue(v, key) {
    if (key === "country") return countryOf(v);
    if (key === "quadrant") return QUAD_ORDER.indexOf(v.quadrant);
    if (key === "industries") return (v.industries || []).length;
    return v[key];
  }
  function sorted(list) {
    var col = COLUMNS.filter(function (c) { return c.key === state.sort; })[0] || COLUMNS[3];
    var dir = state.dir === "desc" ? -1 : 1;
    return list.slice().sort(function (a, b) {
      var x = sortValue(a, col.key), y = sortValue(b, col.key);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      var r = (col.type === "text" && col.key !== "quadrant") ? String(x).localeCompare(String(y)) : (x - y);
      if (r === 0) r = a.pe_rank - b.pe_rank;
      return r * dir;
    });
  }

  /* ---------- Method card ---------- */
  function renderMethod() {
    var m = data.vendors.meta;
    var src = data.srcById[m.source];
    var edition = m.edition ? " (" + GM.escapeHTML(m.edition) + " edition)" : "";
    var html =
      "<p><strong>Where the scores come from.</strong> " + GM.escapeHTML(GM.shortName(m.source, src)) + edition +
      " scored each participating vendor on two normalised indices and placed them in four quadrants. " + GM.escapeHTML(m.note || "") + "</p>" +
      '<dl class="axes">' +
        "<div><dt>Pe</dt><dd>" + GM.escapeHTML(m.axes.pe) + "</dd></div>" +
        "<div><dt>Ma</dt><dd>" + GM.escapeHTML(m.axes.ma) + "</dd></div>" +
      "</dl>" +
      '<p class="ref">' + refLine(m.refs) + ' &middot; Score bars: <a href="stats.html#s1-09">penetration</a>, <a href="stats.html#s1-10">maturity</a></p>';
    document.getElementById("method").innerHTML = html;
  }

  /* ---------- Filters ---------- */
  function renderFilters() {
    var vendors = data.vendors.vendors;
    var countries = {};
    vendors.forEach(function (v) { var c = countryOf(v); if (c) countries[c] = (countries[c] || 0) + 1; });
    var countryKeys = Object.keys(countries).sort(function (a, b) { return countries[b] - countries[a] || a.localeCompare(b); });
    var cats = data.taxonomy.service_categories || [];
    var html =
      '<label>Quadrant <select id="f-quadrant">' + option("", "All quadrants", !state.quadrant) +
        QUAD_ORDER.map(function (k) { return option(k, quadLabel(k), state.quadrant === k); }).join("") + "</select></label>" +
      '<label>Headquarters <select id="f-country">' + option("", "All countries", !state.country) +
        countryKeys.map(function (c) { return option(c, c + " (" + countries[c] + ")", state.country === c); }).join("") + "</select></label>" +
      '<label>Service category <select id="f-category">' + option("", "All categories", !state.category) +
        cats.map(function (c) { return option(c.id, c.name, state.category === c.id); }).join("") + "</select></label>" +
      '<label class="grow">Search <input id="f-q" type="search" placeholder="Name, focus, platform, industry, partner" value="' + GM.escapeHTML(state.q) + '"></label>' +
      '<button id="f-clear" type="button">Clear</button>';
    document.getElementById("filters").innerHTML = html;
    document.getElementById("f-quadrant").addEventListener("change", function (e) { state.quadrant = e.target.value; update(); });
    document.getElementById("f-country").addEventListener("change", function (e) { state.country = e.target.value; update(); });
    document.getElementById("f-category").addEventListener("change", function (e) { state.category = e.target.value; update(); });
    var t;
    document.getElementById("f-q").addEventListener("input", function (e) { clearTimeout(t); t = setTimeout(function () { state.q = e.target.value.trim(); update(); }, 150); });
    document.getElementById("f-clear").addEventListener("click", function () {
      state.quadrant = ""; state.country = ""; state.category = ""; state.q = "";
      renderFilters(); update();
    });
  }

  /* ---------- Quadrant chart ---------- */
  function svgEl(tag, attrs) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function textWidth(s, size) { return s.length * size * 0.56 + 6; }

  function renderQuadrant(shown) {
    var wrap = document.getElementById("quadrant");
    var width = Math.max(300, Math.floor(wrap.clientWidth || 640));
    var narrow = width < 560;
    var height = narrow ? Math.round(width * 1.05) : Math.min(560, Math.round(width * 0.78));
    var m = { top: 30, right: narrow ? 20 : 36, bottom: 52, left: narrow ? 44 : 56 };
    var pw = width - m.left - m.right, ph = height - m.top - m.bottom;
    var thr = data.vendors.meta.quadrant_threshold || 0.5;
    var sx = function (v) { return m.left + v * pw; };
    var sy = function (v) { return m.top + (1 - v) * ph; };
    var fontSize = narrow ? 11 : 12;
    var shownIds = {};
    shown.forEach(function (v) { shownIds[v.id] = true; });

    wrap.innerHTML = "";
    var svg = svgEl("svg", { width: width, height: height, viewBox: "0 0 " + width + " " + height, role: "img", class: "quadrant" });
    var title = svgEl("title");
    title.textContent = "PeMa quadrant: penetration index on the horizontal axis, maturity index on the vertical axis, one point per vendor. The same values are in the table below.";
    svg.appendChild(title);

    // Quadrant backgrounds and labels
    var quads = data.vendors.meta.quadrants;
    QUAD_ORDER.forEach(function (id) {
      var q = quads[id];
      if (!q) return;
      var x0 = q.pe === "high" ? sx(thr) : sx(0), x1 = q.pe === "high" ? sx(1) : sx(thr);
      var y0 = q.ma === "high" ? sy(1) : sy(thr), y1 = q.ma === "high" ? sy(thr) : sy(0);
      var active = !state.quadrant || state.quadrant === id;
      svg.appendChild(svgEl("rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, class: "quad-bg quad-bg-" + id + (active ? "" : " is-off") }));
      var count = shown.filter(function (v) { return v.quadrant === id; }).length;
      // High-maturity captions sit above the frame so they never collide with top-scoring points.
      var lab = svgEl("text", { x: q.pe === "high" ? x1 - 4 : x0 + 4, y: q.ma === "high" ? y0 - 8 : y1 - 8,
        "text-anchor": q.pe === "high" ? "end" : "start", class: "quad-label" + (narrow ? " is-small" : "") });
      lab.textContent = q.label + (filtersActive() ? " (" + count + ")" : "");
      svg.appendChild(lab);
    });

    // Grid and axes
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
      var major = Math.abs(t - thr) < 1e-9;
      svg.appendChild(svgEl("line", { x1: sx(t), x2: sx(t), y1: sy(0), y2: sy(1), class: major ? "quad-threshold" : "viz-grid" }));
      svg.appendChild(svgEl("line", { x1: sx(0), x2: sx(1), y1: sy(t), y2: sy(t), class: major ? "quad-threshold" : "viz-grid" }));
      var tx = svgEl("text", { x: sx(t), y: sy(0) + 16, "text-anchor": "middle", class: "viz-tick" }); tx.textContent = t.toFixed(2); svg.appendChild(tx);
      var ty = svgEl("text", { x: sx(0) - 8, y: sy(t) + 4, "text-anchor": "end", class: "viz-tick" }); ty.textContent = t.toFixed(2); svg.appendChild(ty);
    });
    svg.appendChild(svgEl("rect", { x: sx(0), y: sy(1), width: pw, height: ph, class: "viz-frame" }));
    var xl = svgEl("text", { x: sx(0.5), y: height - 12, "text-anchor": "middle", class: "viz-axis-label" });
    xl.textContent = "Penetration index (Pe)"; svg.appendChild(xl);
    var yl = svgEl("text", { x: 14, y: sy(0.5), "text-anchor": "middle", transform: "rotate(-90 14 " + sy(0.5) + ")", class: "viz-axis-label" });
    yl.textContent = "Maturity index (Ma)"; svg.appendChild(yl);

    // Every shown vendor gets a direct label; the collision pass below places them.
    var labelSet = {};
    // On narrow screens there is no room for labels unless a filter has cut the set down; the table carries names.
    var labelCandidates = shown;
    if (narrow && shown.length > 6) labelCandidates = [];
    labelCandidates.forEach(function (v) { labelSet[v.id] = true; });

    // Points: de-emphasised first so emphasised ones paint on top.
    var all = data.vendors.vendors.slice().sort(function (a, b) { return (shownIds[a.id] ? 1 : 0) - (shownIds[b.id] ? 1 : 0); });
    var tooltip = document.createElement("div");
    tooltip.className = "viz-tooltip"; tooltip.hidden = true; tooltip.setAttribute("role", "status");
    all.forEach(function (v) {
      var on = !!shownIds[v.id];
      var g = svgEl("g", { class: "quad-point" + (on ? "" : " is-off"), "data-id": v.id });
      if (on) { g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); }
      var label = svgEl("title"); label.textContent = v.name + ": Pe " + fmtScore(v.pe_score) + ", Ma " + fmtScore(v.ma_score) + ", " + quadLabel(v.quadrant); g.appendChild(label);
      g.appendChild(svgEl("circle", { cx: sx(v.pe_score), cy: sy(v.ma_score), r: 14, class: "quad-hit" }));
      g.appendChild(svgEl("circle", { cx: sx(v.pe_score), cy: sy(v.ma_score), r: 5.5, class: "quad-dot" }));
      if (on) {
        var show = function () {
          tooltip.textContent = "";
          var b = document.createElement("strong"); b.textContent = v.name; tooltip.appendChild(b);
          var l1 = document.createElement("div"); l1.textContent = "Pe " + fmtScore(v.pe_score) + " (rank " + v.pe_rank + ")"; tooltip.appendChild(l1);
          var l2 = document.createElement("div"); l2.textContent = "Ma " + fmtScore(v.ma_score) + " (rank " + v.ma_rank + ")"; tooltip.appendChild(l2);
          var l3 = document.createElement("div"); l3.className = "muted"; l3.textContent = quadLabel(v.quadrant) + " · " + hqOf(v); tooltip.appendChild(l3);
          tooltip.hidden = false;
          var px = sx(v.pe_score), py = sy(v.ma_score);
          var left = px + 14, top = py - 10;
          if (left + 200 > width) left = px - 214;
          if (left < 0) left = 4;
          if (top + 90 > height) top = height - 90;
          tooltip.style.left = left + "px"; tooltip.style.top = Math.max(0, top) + "px";
          g.classList.add("is-hover");
        };
        var hide = function () { tooltip.hidden = true; g.classList.remove("is-hover"); };
        g.addEventListener("pointerenter", show);
        g.addEventListener("pointerleave", hide);
        g.addEventListener("focus", show);
        g.addEventListener("blur", hide);
        g.addEventListener("click", function () { openDrawer(v.id, g); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer(v.id, g); } });
      }
      svg.appendChild(g);
    });

    // Direct labels with a collision pass (alternate sides, then nudge vertically, leader line if moved).
    var labels = shown.filter(function (v) { return labelSet[v.id]; }).map(function (v) {
      var px = sx(v.pe_score), py = sy(v.ma_score);
      var w = textWidth(v.name, fontSize), h = fontSize + 4;
      var right = px + 9 + w <= width - 4;
      return { v: v, px: px, py: py, w: w, h: h, x: right ? px + 9 : px - 9, y: py, anchor: right ? "start" : "end" };
    }).sort(function (a, b) { return a.y - b.y; });
    function box(l) { return { x0: l.anchor === "start" ? l.x : l.x - l.w, x1: l.anchor === "start" ? l.x + l.w : l.x, y0: l.y - l.h / 2, y1: l.y + l.h / 2 }; }
    function overlaps(a, b) { var A = box(a), B = box(b); return A.x0 < B.x1 && B.x0 < A.x1 && A.y0 < B.y1 && B.y0 < A.y1; }
    var placed = [];
    labels.forEach(function (l) {
      var conflict = function () { return placed.some(function (p) { return overlaps(l, p); }); };
      if (conflict()) {
        var alt = l.anchor === "start" ? "end" : "start";
        var altX = alt === "start" ? l.px + 9 : l.px - 9;
        var fits = alt === "start" ? altX + l.w <= width - 4 : altX - l.w >= 0;
        var saveA = l.anchor, saveX = l.x;
        if (fits) { l.anchor = alt; l.x = altX; }
        if (!fits || conflict()) {
          l.anchor = saveA; l.x = saveX;
          var guard = 0;
          while (conflict() && guard++ < 40) l.y += l.h;
          if (l.y > height - m.bottom - 2) { l.y = l.py; guard = 0; while (conflict() && guard++ < 40) l.y -= l.h; }
        }
      }
      placed.push(l);
    });
    placed.forEach(function (l) {
      if (Math.abs(l.y - l.py) > 2) {
        svg.appendChild(svgEl("line", { x1: l.px + (l.anchor === "start" ? 6 : -6), y1: l.py, x2: l.anchor === "start" ? l.x - 2 : l.x + 2, y2: l.y, class: "quad-leader" }));
      }
      var t = svgEl("text", { x: l.x, y: l.y + fontSize * 0.35, "text-anchor": l.anchor, class: "quad-name", "font-size": fontSize });
      t.textContent = l.v.name;
      svg.appendChild(t);
    });

    wrap.appendChild(svg);
    wrap.appendChild(tooltip);

    // Legend line with counts per quadrant, each a filter link.
    var legend = QUAD_ORDER.map(function (id) {
      var n = data.vendors.vendors.filter(function (v) { return v.quadrant === id; }).length;
      var p = new URLSearchParams(location.search); p.set("quadrant", id);
      var cls = "pill pill-quad pill-quad-" + id + (state.quadrant === id ? " is-active" : "");
      return '<a class="' + cls + '" href="?' + p.toString() + '" data-quadrant="' + id + '">' + GM.escapeHTML(quadLabel(id)) + " " + n + "</a>";
    }).join(" ");
    var meanings = QUAD_ORDER.map(function (id) { var q = quads[id]; return "<strong>" + GM.escapeHTML(q.label) + ":</strong> " + GM.escapeHTML(q.meaning); }).join(" ");
    document.getElementById("quad-legend").innerHTML = '<span class="pills">' + legend + "</span>" + '<span class="quad-meanings">' + meanings + "</span>";
    Array.prototype.forEach.call(document.querySelectorAll("#quad-legend a[data-quadrant]"), function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var id = a.getAttribute("data-quadrant");
        state.quadrant = state.quadrant === id ? "" : id;
        document.getElementById("f-quadrant").value = state.quadrant;
        update();
      });
    });
    document.getElementById("quad-ref").innerHTML = "One point per vendor, positioned by its published scores; quadrant boundary at " + thr + " on each axis. " + refLine(data.vendors.meta.refs);
  }

  /* ---------- Table ---------- */
  function renderHead() {
    var html = "<tr>" + COLUMNS.map(function (c) {
      var active = state.sort === c.key;
      var aria = active ? (state.dir === "asc" ? "ascending" : "descending") : "none";
      var arrow = active ? (state.dir === "asc" ? " ▲" : " ▼") : "";
      return '<th scope="col" aria-sort="' + aria + '"' + (c.type === "num" ? ' class="num"' : "") + '>' +
        '<button type="button" class="sort-btn' + (active ? " is-active" : "") + '" data-key="' + c.key + '"' + (c.title ? ' title="' + GM.escapeHTML(c.title) + '"' : "") + ">" +
        GM.escapeHTML(c.label) + '<span class="sort-arrow" aria-hidden="true">' + arrow + "</span></button></th>";
    }).join("") + "</tr>";
    var thead = document.getElementById("vthead");
    thead.innerHTML = html;
    Array.prototype.forEach.call(thead.querySelectorAll(".sort-btn"), function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-key");
        if (state.sort === key) state.dir = state.dir === "asc" ? "desc" : "asc";
        else { state.sort = key; state.dir = defaultDir(key); }
        update();
      });
    });
  }

  function renderRows(shown) {
    var rows = sorted(shown).map(function (v) {
      return '<tr id="' + GM.escapeHTML(v.id) + '" data-id="' + GM.escapeHTML(v.id) + '">' +
        '<th scope="row"><button type="button" class="link-btn vendor-open" data-id="' + GM.escapeHTML(v.id) + '">' + GM.escapeHTML(v.name) + "</button></th>" +
        '<td><span class="pill pill-quad pill-quad-' + v.quadrant + '">' + GM.escapeHTML(quadLabel(v.quadrant)) + "</span></td>" +
        '<td class="num">' + fmtScore(v.pe_score) + "</td>" +
        '<td class="num">' + v.pe_rank + "</td>" +
        '<td class="num">' + fmtScore(v.ma_score) + "</td>" +
        '<td class="num">' + v.ma_rank + "</td>" +
        "<td>" + GM.escapeHTML(hqOf(v)) + "</td>" +
        '<td class="num">' + (v.founded ? v.founded : "") + "</td>" +
        '<td class="cell-list">' + GM.escapeHTML((v.industries || []).join(", ")) + "</td>" +
      "</tr>";
    }).join("");
    if (!rows) rows = '<tr><td colspan="' + COLUMNS.length + '" class="placeholder">No vendors match these filters.</td></tr>';
    var tbody = document.getElementById("vtbody");
    tbody.innerHTML = rows;
    Array.prototype.forEach.call(tbody.querySelectorAll(".vendor-open"), function (b) {
      b.addEventListener("click", function () { openDrawer(b.getAttribute("data-id"), b); });
    });
  }

  /* ---------- Drawer ---------- */
  function openDrawer(id, from) {
    var v = data.vendorById[id];
    if (!v) return;
    opener = from || document.activeElement;
    var dlg = document.getElementById("drawer");
    var cats = (data.taxonomy.service_categories || []).filter(function (c) { return (v.service_categories || []).indexOf(c.id) >= 0; });
    var related = data.insights.insights.filter(function (i) { return (i.related_vendors || []).indexOf(v.id) >= 0; });
    var list = function (items) { return items && items.length ? "<ul>" + items.map(function (s) { return "<li>" + GM.escapeHTML(s) + "</li>"; }).join("") + "</ul>" : '<p class="muted">Not disclosed.</p>'; };
    var html =
      '<div class="drawer-head">' +
        '<div class="pills">' +
          '<a class="pill pill-quad pill-quad-' + v.quadrant + '" href="?quadrant=' + v.quadrant + '" data-quadrant="' + v.quadrant + '">' + GM.escapeHTML(quadLabel(v.quadrant)) + "</a>" +
          '<span class="pill">Pe ' + fmtScore(v.pe_score) + " (rank " + v.pe_rank + ")</span>" +
          '<span class="pill">Ma ' + fmtScore(v.ma_score) + " (rank " + v.ma_rank + ")</span>" +
        "</div>" +
        '<button type="button" class="drawer-close" aria-label="Close profile">&times;</button>' +
      "</div>" +
      '<h2 id="drawer-title">' + GM.escapeHTML(v.name) + "</h2>" +
      '<p class="muted">' + GM.escapeHTML(hqOf(v)) + (v.founded ? " &middot; founded " + v.founded : "") + "</p>" +
      "<p>" + GM.escapeHTML(v.focus) + "</p>" +
      "<h3>Named platforms and accelerators</h3>" +
      ((v.platforms || []).length ? '<dl class="platforms">' + v.platforms.map(function (p) { return "<div><dt>" + GM.escapeHTML(p.name) + "</dt><dd>" + GM.escapeHTML(p.what) + "</dd></div>"; }).join("") + "</dl>" : '<p class="muted">None named.</p>') +
      "<h3>What sets it apart</h3>" + list(v.differentiators) +
      "<h3>Claimed results <span class=\"pill pill-warn\">vendor-claimed, unaudited</span></h3>" +
      ((v.claimed_metrics || []).length ?
        '<div class="table-wrap"><table class="compact"><thead><tr><th scope="col">Metric</th><th scope="col">Claim</th></tr></thead><tbody>' +
        v.claimed_metrics.map(function (c) { return "<tr><td>" + GM.escapeHTML(c.metric) + "</td><td>" + GM.escapeHTML(c.value) + "</td></tr>"; }).join("") +
        "</tbody></table></div>" : '<p class="muted">No performance figures disclosed.</p>') +
      "<h3>Industries and markets</h3>" +
      '<p class="related"><strong>Industries:</strong> ' + GM.escapeHTML((v.industries || []).join(", ") || "not disclosed") + "</p>" +
      '<p class="related"><strong>Markets:</strong> ' + GM.escapeHTML((v.markets || []).join(", ") || "not disclosed") + "</p>" +
      "<h3>Service categories</h3>" +
      (cats.length ? '<p class="related">' + cats.map(function (c) { var p = new URLSearchParams(); p.set("category", c.id); return '<a class="chip" href="?' + p.toString() + '">' + GM.escapeHTML(c.name) + "</a>"; }).join("") + "</p>" : '<p class="muted">Not mapped.</p>') +
      "<h3>Partners</h3>" + list(v.partners) +
      (related.length ? "<h3>Related insights</h3><ul>" + related.map(function (i) { return '<li><a href="insights.html#' + i.id + '">' + GM.escapeHTML(i.title) + "</a></li>"; }).join("") + "</ul>" : "") +
      '<p class="ref"><strong>Source:</strong> ' + refLine(v.refs) + ". Descriptions are our own words; platform names and figures are as the vendor reported them.</p>" +
      '<p class="ref"><a href="#' + GM.escapeHTML(v.id) + '">Link to this profile</a></p>';
    dlg.innerHTML = html;
    dlg.querySelector(".drawer-close").addEventListener("click", function () { dlg.close(); });
    Array.prototype.forEach.call(dlg.querySelectorAll("a[href^='?']"), function (a) {
      a.addEventListener("click", function () { dlg.close(); });
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    if (!dlg.open) {
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    }
    history.replaceState(null, "", location.pathname + location.search + "#" + v.id);
    dlg.querySelector(".drawer-close").focus();
    Array.prototype.forEach.call(document.querySelectorAll("#vtbody tr.is-target"), function (r) { r.classList.remove("is-target"); });
    var row = document.getElementById(v.id);
    if (row) row.classList.add("is-target");
  }

  function onDrawerClose() {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    opener = null;
  }

  /* ---------- Update and boot ---------- */
  function update() {
    writeURL();
    var all = data.vendors.vendors;
    var shown = all.filter(matches);
    renderQuadrant(shown);
    renderHead();
    renderRows(shown);
    document.getElementById("count").textContent = shown.length + " of " + all.length + " vendors" + (filtersActive() ? " match" : "");
  }

  function openHash(scroll) {
    var id = (location.hash || "").slice(1);
    if (!id || !data.vendorById[id]) return;
    var row = document.getElementById(id);
    if (row && scroll) row.scrollIntoView({ block: "center" });
    openDrawer(id, row ? row.querySelector(".vendor-open") : null);
  }

  Promise.all([GM.loadJSON("vendors"), GM.loadJSON("sources"), GM.loadJSON("taxonomy"), GM.loadJSON("insights")])
    .then(function (r) {
      data = { vendors: r[0], sources: r[1], taxonomy: r[2], insights: r[3], srcById: {}, vendorById: {} };
      r[1].sources.forEach(function (s) { data.srcById[s.id] = s; });
      r[0].vendors.forEach(function (v) { data.vendorById[v.id] = v; });
      readURL();
      var id = (location.hash || "").slice(1);
      if (id && data.vendorById[id]) { state.quadrant = ""; state.country = ""; state.category = ""; state.q = ""; }
      renderMethod();
      renderFilters();
      update();
      document.getElementById("drawer").addEventListener("close", onDrawerClose);
      openHash(true);
      window.addEventListener("hashchange", function () { openHash(true); });
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { renderQuadrant(data.vendors.vendors.filter(matches)); }, 120);
      });
    })
    .catch(function (e) {
      document.getElementById("quadrant").innerHTML = '<p class="notice">The data files could not be loaded: ' + GM.escapeHTML(e.message) + "</p>";
    });
})();
