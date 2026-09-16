/* GenAI Market — glossary page: alphabetical terms, letter index, tag and text filters, cross-links, deep links. */
(function () {
  "use strict";
  var GM = window.GM;
  var TAGS = {
    architecture: "Architecture", operations: "Operations", governance: "Governance", commercial: "Commercial",
    method: "Method", market: "Market", data: "Data", talent: "Talent", cost: "Cost"
  };

  var data = null;
  var state = { tag: "", q: "" };

  function readURL() {
    var p = new URLSearchParams(location.search);
    state.tag = p.get("tag") || "";
    state.q = p.get("q") || "";
  }
  function writeURL() {
    var p = new URLSearchParams();
    if (state.tag) p.set("tag", state.tag);
    if (state.q) p.set("q", state.q);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }
  function option(value, label, selected) {
    return '<option value="' + GM.escapeHTML(value) + '"' + (selected ? " selected" : "") + ">" + GM.escapeHTML(label) + "</option>";
  }
  function tagLabel(t) { return TAGS[t] || (t.charAt(0).toUpperCase() + t.slice(1)); }

  function sortKey(t) { return t.term.replace(/^[^A-Za-z0-9]+/, "").toLowerCase(); }
  function letterOf(t) {
    var c = sortKey(t).charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : "#";
  }

  function renderFilters() {
    var counts = {};
    data.glossary.terms.forEach(function (t) { (t.tags || []).forEach(function (g) { counts[g] = (counts[g] || 0) + 1; }); });
    var tags = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    var html =
      '<label>Tag <select id="f-tag">' + option("", "All tags", !state.tag) +
        tags.map(function (g) { return option(g, tagLabel(g) + " (" + counts[g] + ")", state.tag === g); }).join("") + "</select></label>" +
      '<label class="grow">Search <input id="f-q" type="search" placeholder="Term, acronym or definition" value="' + GM.escapeHTML(state.q) + '"></label>' +
      '<button id="f-clear" type="button">Clear</button>';
    document.getElementById("filters").innerHTML = html;
    document.getElementById("f-tag").addEventListener("change", function (e) { state.tag = e.target.value; update(); });
    var timer;
    document.getElementById("f-q").addEventListener("input", function (e) { clearTimeout(timer); timer = setTimeout(function () { state.q = e.target.value.trim(); update(); }, 150); });
    document.getElementById("f-clear").addEventListener("click", function () { state = { tag: "", q: "" }; renderFilters(); update(); });
  }

  function matches(t) {
    if (state.tag && (t.tags || []).indexOf(state.tag) < 0) return false;
    if (state.q) {
      var q = state.q.toLowerCase();
      var hay = (t.term + " " + (t.expansion || "") + " " + t.definition).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  function entry(t) {
    var related = (t.related || []).map(function (id) {
      var r = data.termById[id];
      return r ? '<a class="chip" href="#' + GM.escapeHTML(id) + '">' + GM.escapeHTML(r.term) + "</a>" : "";
    }).filter(Boolean).join("");
    var used = (data.usedBy[t.id] || []).map(function (i) {
      return '<a class="chip" href="insights.html#' + i.id + '" title="' + GM.escapeHTML(i.title) + '">' + i.id + "</a>";
    }).join("");
    var tags = (t.tags || []).map(function (g) {
      return '<a class="pill" href="?tag=' + GM.escapeHTML(g) + '">' + GM.escapeHTML(tagLabel(g)) + "</a>";
    }).join("");
    return '<article class="card term" id="' + GM.escapeHTML(t.id) + '">' +
      '<div class="term-head"><h3><a href="#' + GM.escapeHTML(t.id) + '" title="Link to this term">' + GM.escapeHTML(t.term) + "</a></h3>" +
        (t.expansion ? '<span class="term-expansion muted">' + GM.escapeHTML(t.expansion) + "</span>" : "") + "</div>" +
      '<p class="term-def">' + GM.escapeHTML(t.definition) + "</p>" +
      '<div class="pills">' + tags + "</div>" +
      (related ? '<p class="related"><strong>Related:</strong> ' + related + "</p>" : "") +
      (used ? '<p class="related"><strong>Used in:</strong> ' + used + "</p>" : "") +
      '<p class="ref"><strong>Sources:</strong> ' + GM.formatRefs(t.refs, data.srcById) + "</p>" +
    "</article>";
  }

  function update() {
    writeURL();
    var all = data.glossary.terms;
    var shown = all.filter(matches).sort(function (a, b) { return sortKey(a).localeCompare(sortKey(b)); });
    var groups = {}, order = [];
    shown.forEach(function (t) { var L = letterOf(t); if (!groups[L]) { groups[L] = []; order.push(L); } groups[L].push(t); });
    var html = order.map(function (L) {
      return '<h2 class="theme-head" id="letter-' + (L === "#" ? "num" : L) + '">' + L + ' <span class="muted count">' + groups[L].length + "</span></h2>" +
        '<div class="stack">' + groups[L].map(entry).join("") + "</div>";
    }).join("");
    if (!shown.length) html = '<p class="placeholder">No terms match these filters.</p>';
    document.getElementById("results").innerHTML = html;
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    document.getElementById("letters").innerHTML = letters.map(function (L) {
      return groups[L] ? '<a href="#letter-' + L + '">' + L + "</a>" : '<span aria-hidden="true">' + L + "</span>";
    }).join("");
    var active = state.tag || state.q;
    document.getElementById("count").textContent = shown.length + " of " + all.length + " terms" + (active ? " match" : "");
  }

  function openHash() {
    var id = (location.hash || "").slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains("term")) {
      Array.prototype.forEach.call(document.querySelectorAll(".term.is-target"), function (x) { x.classList.remove("is-target"); });
      el.classList.add("is-target");
    }
    el.scrollIntoView({ block: "start" });
  }

  Promise.all([GM.loadJSON("glossary"), GM.loadJSON("sources"), GM.loadJSON("insights")])
    .then(function (r) {
      data = { glossary: r[0], sources: r[1], insights: r[2], srcById: {}, termById: {}, usedBy: {} };
      r[1].sources.forEach(function (s) { data.srcById[s.id] = s; });
      r[0].terms.forEach(function (t) { data.termById[t.id] = t; });
      r[2].insights.forEach(function (i) { (i.related_terms || []).forEach(function (id) { (data.usedBy[id] = data.usedBy[id] || []).push(i); }); });
      readURL();
      var id = (location.hash || "").slice(1);
      if (id && data.termById[id]) state = { tag: "", q: "" };
      renderFilters();
      update();
      openHash();
      window.addEventListener("hashchange", function () {
        var id = (location.hash || "").slice(1);
        if (data.termById[id] && (state.tag || state.q) && !document.getElementById(id)) { state = { tag: "", q: "" }; renderFilters(); update(); }
        openHash();
      });
    })
    .catch(function (e) {
      document.getElementById("results").innerHTML = '<p class="notice">The data files could not be loaded: ' + GM.escapeHTML(e.message) + "</p>";
    });
})();
