/* GenAI Market — search page: client-side search over the prebuilt index (data/search-index.json).
   Query normalisation mirrors scripts/build_search_index.py; matching is by token prefix. */
(function () {
  "use strict";
  var GM = window.GM;
  var TYPE = { insight: "Insight", stat: "Statistic", vendor: "Vendor", glossary: "Glossary", taxonomy: "Taxonomy", source: "Source" };
  var TYPE_ORDER = ["insight", "stat", "vendor", "glossary", "taxonomy", "source"];
  var STOP = ("a an and are as at be been but by can do for from has have how in into is it its more most not of on or " +
    "our than that the their there these they this to was we were what when where which who will with without " +
    "also about across after among any because before between both each into over per such then those through under up very via within").split(" ");
  var MAX_RESULTS = 60;

  var idx = null, keys = null;
  var state = { q: "", type: "" };

  function normalise(w) {
    w = w.toLowerCase().replace(/^['.+-]+|['.+-]+$/g, "");
    if (w.length > 4) {
      var sufs = ["ing", "ed", "ly", "es", "s"];
      for (var i = 0; i < sufs.length; i++) {
        var s = sufs[i];
        if (w.slice(-s.length) === s && w.length - s.length >= 3) { w = w.slice(0, -s.length); break; }
      }
    } else if (w.length > 3 && w.slice(-1) === "s") { w = w.slice(0, -1); }
    return w;
  }
  function tokens(text) {
    var out = [], m, re = /[a-z0-9][a-z0-9+.'-]*/gi;
    while ((m = re.exec(text))) {
      var t = normalise(m[0]);
      if (t.length >= 2 && STOP.indexOf(t) < 0 && out.indexOf(t) < 0) out.push(t);
    }
    return out;
  }
  // Binary search for the first key >= prefix, then walk while the prefix holds.
  function postingsForPrefix(prefix) {
    var lo = 0, hi = keys.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (keys[mid] < prefix) lo = mid + 1; else hi = mid; }
    var hits = {};
    for (var k = lo; k < keys.length && keys[k].slice(0, prefix.length) === prefix; k++) {
      var exact = keys[k] === prefix;
      idx.index[keys[k]].forEach(function (d) { hits[d] = Math.max(hits[d] || 0, exact ? 1 : 0.6); });
      if (k - lo > 400) break; // guard against very short prefixes
    }
    return hits;
  }

  function search(q) {
    var terms = tokens(q);
    if (!terms.length) return [];
    var scores = null;
    terms.forEach(function (t) {
      var hits = postingsForPrefix(t);
      var docs = Object.keys(hits);
      var idf = Math.log(1 + idx.docs.length / (docs.length + 1));
      if (scores === null) { scores = {}; docs.forEach(function (d) { scores[d] = hits[d] * idf; }); }
      else {
        var next = {};
        docs.forEach(function (d) { if (scores[d] != null) next[d] = scores[d] + hits[d] * idf; });
        scores = next; // every term must match (AND)
      }
    });
    var out = Object.keys(scores || {}).map(function (d) {
      var doc = idx.docs[d];
      var title = doc.title.toLowerCase();
      var boost = terms.reduce(function (acc, t) { return acc + (title.indexOf(t) >= 0 ? 1.5 : 0); }, 0);
      var typeBoost = doc.type === "glossary" ? 0.3 : (doc.type === "insight" ? 0.2 : 0);
      return { doc: doc, score: scores[d] + boost + typeBoost, terms: terms };
    });
    out.sort(function (a, b) { return b.score - a.score || a.doc.title.localeCompare(b.doc.title); });
    return out;
  }

  function highlight(text, terms) {
    var safe = GM.escapeHTML(text);
    if (!terms.length) return safe;
    var re = new RegExp("(" + terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")[a-z]*", "gi");
    return safe.replace(re, "<mark>$&</mark>");
  }

  function readURL() {
    var p = new URLSearchParams(location.search);
    state.q = (p.get("q") || "").trim();
    state.type = p.get("type") || "";
  }
  function writeURL() {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.type) p.set("type", state.type);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  function render() {
    writeURL();
    document.title = (state.q ? state.q + " — Search — " : "Search — ") + GM.siteName;
    var results = state.q ? search(state.q) : [];
    var counts = {};
    results.forEach(function (r) { counts[r.doc.type] = (counts[r.doc.type] || 0) + 1; });
    var shown = state.type ? results.filter(function (r) { return r.doc.type === state.type; }) : results;
    var filterEl = document.getElementById("type-filter");
    if (results.length) {
      filterEl.innerHTML = '<a class="pill' + (state.type ? "" : " pill-accent") + '" href="?q=' + encodeURIComponent(state.q) + '" data-type="">All ' + results.length + "</a>" +
        TYPE_ORDER.filter(function (t) { return counts[t]; }).map(function (t) {
          return '<a class="pill' + (state.type === t ? " pill-accent" : "") + '" href="?q=' + encodeURIComponent(state.q) + "&type=" + t + '" data-type="' + t + '">' + TYPE[t] + " " + counts[t] + "</a>";
        }).join("");
      Array.prototype.forEach.call(filterEl.querySelectorAll("a"), function (a) {
        a.addEventListener("click", function (e) { e.preventDefault(); state.type = a.getAttribute("data-type"); render(); });
      });
    } else filterEl.innerHTML = "";

    var list = shown.slice(0, MAX_RESULTS).map(function (r) {
      var d = r.doc;
      var srcs = (d.sources || []).map(function (id) { return GM.shortName(id, idx.srcById[id]); }).join(", ");
      return '<article class="card result">' +
        '<div class="pills"><span class="pill">' + TYPE[d.type] + '</span><span class="pill pill-id">' + GM.escapeHTML(d.id) + "</span></div>" +
        '<h3><a href="' + GM.escapeHTML(d.url) + '">' + highlight(d.title, r.terms) + "</a></h3>" +
        '<p class="result-snippet">' + highlight(d.snippet, r.terms) + "</p>" +
        (srcs ? '<p class="ref">' + GM.escapeHTML(srcs) + "</p>" : "") +
      "</article>";
    }).join("");
    var resultsEl = document.getElementById("results");
    var countEl = document.getElementById("count");
    if (!state.q) {
      resultsEl.innerHTML = "";
      countEl.textContent = "";
    } else if (!shown.length) {
      resultsEl.innerHTML = '<p class="placeholder">Nothing matches “' + GM.escapeHTML(state.q) + '”. Try fewer or broader words; every word must match.</p>';
      countEl.textContent = "0 results";
    } else {
      resultsEl.innerHTML = list;
      countEl.textContent = shown.length + " result" + (shown.length === 1 ? "" : "s") + (shown.length > MAX_RESULTS ? ", showing the first " + MAX_RESULTS : "");
    }
    document.getElementById("starters").innerHTML = state.q ? "" :
      '<h2>Starting points</h2><div class="pills">' + ["agent governance", "pilot to production", "token cost", "sovereign AI", "high performers", "buy versus build", "PeMa quadrant", "workforce", "real-time data", "ROI"].map(function (s) {
        return '<a class="pill" href="?q=' + encodeURIComponent(s) + '">' + GM.escapeHTML(s) + "</a>";
      }).join("") + "</div>" +
      '<p class="muted">Or browse by section: <a href="insights.html">Insights</a>, <a href="stats.html">Statistics</a>, <a href="vendors.html">Vendors</a>, <a href="glossary.html">Glossary</a>, <a href="sources.html">Sources</a>.</p>';
  }

  Promise.all([GM.loadJSON("search-index"), GM.loadJSON("sources")])
    .then(function (r) {
      idx = r[0];
      idx.srcById = {};
      r[1].sources.forEach(function (s) { idx.srcById[s.id] = s; });
      keys = Object.keys(idx.index).sort();
      readURL();
      var input = document.getElementById("q");
      input.value = state.q;
      var timer;
      input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { state.q = input.value.trim(); state.type = ""; render(); }, 120); });
      document.getElementById("search-form").addEventListener("submit", function (e) { e.preventDefault(); state.q = input.value.trim(); state.type = ""; render(); });
      window.addEventListener("popstate", function () { readURL(); input.value = state.q; render(); });
      render();
    })
    .catch(function (e) {
      document.getElementById("results").innerHTML = '<p class="notice">The search index could not be loaded: ' + GM.escapeHTML(e.message) + "</p>";
    });
})();
