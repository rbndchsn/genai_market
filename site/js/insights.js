/* GenAI Market — insights page: filters, grouped cards, expandable detail, deep links. */
(function () {
  "use strict";
  var GM = window.GM;
  var EVIDENCE = { "multi-source": "Multi-source", "single-source": "Single source", "agent-analysis": "Our analysis" };
  var KIND = { finding: "Finding", observation: "Observation", recommendation: "Recommendation" };

  var state = { theme: "", evidence: "", source: "", q: "" };
  var data = null;

  function readURL() {
    var p = new URLSearchParams(location.search);
    state.theme = p.get("theme") || "";
    state.evidence = p.get("evidence") || "";
    state.source = p.get("source") || "";
    state.q = p.get("q") || "";
  }
  function writeURL() {
    var p = new URLSearchParams();
    if (state.theme) p.set("theme", state.theme);
    if (state.evidence) p.set("evidence", state.evidence);
    if (state.source) p.set("source", state.source);
    if (state.q) p.set("q", state.q);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  function option(value, label, selected) {
    return '<option value="' + GM.escapeHTML(value) + '"' + (selected ? " selected" : "") + ">" + GM.escapeHTML(label) + "</option>";
  }

  function renderFilters() {
    var themes = data.insights.themes;
    var srcs = data.sources.sources.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var html =
      '<label>Theme <select id="f-theme">' + option("", "All themes", !state.theme) +
        Object.keys(themes).map(function (k) { return option(k, themes[k], state.theme === k); }).join("") + "</select></label>" +
      '<label>Evidence <select id="f-evidence">' + option("", "All levels", !state.evidence) +
        Object.keys(EVIDENCE).map(function (k) { return option(k, EVIDENCE[k], state.evidence === k); }).join("") + "</select></label>" +
      '<label>Source <select id="f-source">' + option("", "All sources", !state.source) +
        srcs.map(function (s) { return option(s.id, GM.shortName(s.id, s) + " (" + String(s.date).slice(0, 4) + ")", state.source === s.id); }).join("") + "</select></label>" +
      '<label class="grow">Search <input id="f-q" type="search" placeholder="Title or summary" value="' + GM.escapeHTML(state.q) + '"></label>' +
      '<button id="f-clear" type="button">Clear</button>';
    document.getElementById("filters").innerHTML = html;
    document.getElementById("f-theme").addEventListener("change", function (e) { state.theme = e.target.value; update(); });
    document.getElementById("f-evidence").addEventListener("change", function (e) { state.evidence = e.target.value; update(); });
    document.getElementById("f-source").addEventListener("change", function (e) { state.source = e.target.value; update(); });
    var t;
    document.getElementById("f-q").addEventListener("input", function (e) { clearTimeout(t); t = setTimeout(function () { state.q = e.target.value.trim(); update(); }, 150); });
    document.getElementById("f-clear").addEventListener("click", function () { state = { theme: "", evidence: "", source: "", q: "" }; renderFilters(); update(); });
  }

  function matches(i) {
    if (state.theme && i.theme !== state.theme) return false;
    if (state.evidence && i.evidence !== state.evidence) return false;
    if (state.source && !i.refs.some(function (r) { return r.source === state.source; })) return false;
    if (state.q) {
      var q = state.q.toLowerCase();
      if ((i.title + " " + i.summary + " " + i.detail).toLowerCase().indexOf(q) < 0) return false;
    }
    return true;
  }

  function chips(ids, byId, page, labelKey) {
    var items = ids.map(function (id) { var r = byId[id]; return r ? '<a class="chip" href="' + page + '#' + GM.escapeHTML(id) + '">' + GM.escapeHTML(r[labelKey]) + "</a>" : ""; }).filter(Boolean);
    return items.length ? items.join("") : "";
  }

  function card(i, ctx) {
    var themes = data.insights.themes;
    var stats = chips(i.related_stats || [], ctx.statById, "stats.html", "label");
    var terms = chips(i.related_terms || [], ctx.termById, "glossary.html", "term");
    var vendors = chips(i.related_vendors || [], ctx.vendorById, "vendors.html", "name");
    return '<article class="card insight" id="' + i.id + '">' +
      '<div class="pills">' +
        '<a class="pill pill-accent" href="?theme=' + i.theme + '">' + GM.escapeHTML(themes[i.theme] || i.theme) + "</a>" +
        '<span class="pill">' + (EVIDENCE[i.evidence] || i.evidence) + "</span>" +
        '<span class="pill">' + (KIND[i.kind] || i.kind) + "</span>" +
        '<a class="pill pill-id" href="#' + i.id + '" title="Link to this insight">' + i.id + "</a>" +
      "</div>" +
      "<h3>" + GM.escapeHTML(i.title) + "</h3>" +
      '<p class="insight-summary">' + GM.escapeHTML(i.summary) + "</p>" +
      "<details>" +
        "<summary>Detail and references</summary>" +
        '<div class="insight-detail">' +
          "<p>" + GM.escapeHTML(i.detail) + "</p>" +
          '<p class="ref"><strong>Sources:</strong> ' + GM.formatRefs(i.refs, ctx.srcById) + "</p>" +
          (stats ? '<p class="related"><strong>Statistics:</strong> ' + stats + "</p>" : "") +
          (terms ? '<p class="related"><strong>Terms:</strong> ' + terms + "</p>" : "") +
          (vendors ? '<p class="related"><strong>Vendors:</strong> ' + vendors + "</p>" : "") +
        "</div>" +
      "</details>" +
    "</article>";
  }

  function update() {
    writeURL();
    var themes = data.insights.themes;
    var all = data.insights.insights;
    var shown = all.filter(matches);
    var ctx = data.ctx;
    var groupByTheme = !state.theme;
    var html = "";
    if (groupByTheme) {
      Object.keys(themes).forEach(function (k) {
        var items = shown.filter(function (i) { return i.theme === k; });
        if (!items.length) return;
        html += '<h2 class="theme-head" id="theme-' + k + '">' + GM.escapeHTML(themes[k]) + ' <span class="muted count">' + items.length + "</span></h2>";
        html += '<div class="stack">' + items.map(function (i) { return card(i, ctx); }).join("") + "</div>";
      });
    } else {
      html = '<div class="stack">' + shown.map(function (i) { return card(i, ctx); }).join("") + "</div>";
    }
    if (!shown.length) html = '<p class="placeholder">No insights match these filters.</p>';
    document.getElementById("results").innerHTML = html;
    var active = state.theme || state.evidence || state.source || state.q;
    document.getElementById("count").textContent = shown.length + " of " + all.length + " insights" + (active ? " match" : "");
  }

  function openHash() {
    var id = (location.hash || "").slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var d = el.querySelector("details");
    if (d) d.open = true;
    el.classList.add("is-target");
    el.scrollIntoView({ block: "start" });
  }

  Promise.all([GM.loadJSON("insights"), GM.loadJSON("sources"), GM.loadJSON("stats"), GM.loadJSON("glossary"), GM.loadJSON("vendors")])
    .then(function (r) {
      data = { insights: r[0], sources: r[1] };
      var ctx = { srcById: {}, statById: {}, termById: {}, vendorById: {} };
      r[1].sources.forEach(function (s) { ctx.srcById[s.id] = s; });
      r[2].stats.forEach(function (s) { ctx.statById[s.id] = s; });
      r[3].terms.forEach(function (t) { ctx.termById[t.id] = t; });
      r[4].vendors.forEach(function (v) { ctx.vendorById[v.id] = v; });
      data.ctx = ctx;
      readURL();
      // A hash deep link should show the card even if filters would hide it.
      var id = (location.hash || "").slice(1);
      if (id && id.indexOf("ins-") === 0) state = { theme: "", evidence: "", source: "", q: "" };
      renderFilters();
      update();
      openHash();
      window.addEventListener("hashchange", openHash);
    })
    .catch(function (e) {
      document.getElementById("results").innerHTML = '<p class="notice">The data files could not be loaded: ' + GM.escapeHTML(e.message) + "</p>";
    });
})();
