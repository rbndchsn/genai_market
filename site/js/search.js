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


  /* ---------- Tag sphere (starting points) ----------
     Curated queries from data/search-tags.json on a slowly tumbling globe. Points live on a unit
     sphere; each frame they rotate a little about a tilted axis and are projected with perspective,
     so front tags are large, bright and spread outward while back tags are small, faint and pulled
     toward the centre. Rim tags sit at the circle's edge. Each tag is a button that runs the search.
     The pointer steers the spin, hovering or focusing a tag eases it to a stop, and reduced-motion
     users get a still layout. */
  var sphere = null;

  function buildSphere(container, tagList) {
    var items = [];
    tagList.forEach(function (q) {
      var n = search(q).length;
      if (n >= 3) items.push({ q: q, n: n });
    });
    if (!items.length) return null;
    var narrow = container.clientWidth < 560;
    var limit = narrow ? 26 : 60;
    if (items.length > limit) {
      var keep = items.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, limit);
      items = items.filter(function (it) { return keep.indexOf(it) >= 0; }); // original order, strongest first
    }
    var maxLog = Math.log(1 + Math.max.apply(null, items.map(function (t) { return t.n; })));
    var N = items.length, golden = Math.PI * (3 - Math.sqrt(5));
    var fontBase = narrow ? 9 : 10, fontRange = narrow ? 7 : 10;
    items.forEach(function (it, i) {
      var y = N > 1 ? 1 - (i / (N - 1)) * 2 : 0, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = i * golden;
      it.x = Math.cos(phi) * r; it.y = y; it.z = Math.sin(phi) * r;
      it.w = 0.9 + 0.35 * (Math.log(1 + it.n) / maxLog);
      var b = document.createElement("button");
      b.type = "button"; b.className = "tag"; b.textContent = it.q;
      b.title = it.q + " (" + it.n + " record" + (it.n === 1 ? "" : "s") + ")";
      b.setAttribute("data-q", it.q);
      it.el = b; container.appendChild(b);
    });

    // Rim tags (depth 0.5) are the ones that reach the edge; front tags sit near the centre.
    var margin = 24;
    items.forEach(function (it) {
      it.el.style.fontSize = ((fontBase + fontRange * 0.5) * it.w).toFixed(1) + "px";
      margin = Math.max(margin, it.el.offsetWidth * 0.5 + 4);
    });

    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var W = 0, H = 0, R = 0, cx = 0, cy = 0;
    var BASE_Y = 0.0032, BASE_X = 0.0009;                  // idle tumble: mostly around Y, a little around X
    var velX = BASE_X, velY = BASE_Y, tgtX = BASE_X, tgtY = BASE_Y;
    var speed = 1, tgtSpeed = 1, raf = 0, stopped = false;

    function measure() {
      W = container.clientWidth; H = container.clientHeight;
      cx = W / 2; cy = H / 2;
      // A circle. With the perspective factor below, no point projects further than 1.03 R from the centre.
      R = Math.max(50, Math.min((W / 2 - margin) / 1.03, (H / 2 - fontBase - fontRange) / 1.03));
    }
    function rotate(ax, ay) {
      var cX = Math.cos(ax), sX = Math.sin(ax), cY = Math.cos(ay), sY = Math.sin(ay);
      items.forEach(function (it) {
        var y1 = it.y * cX - it.z * sX, z1 = it.y * sX + it.z * cX;      // around X
        var x2 = it.x * cY + z1 * sY, z2 = -it.x * sY + z1 * cY;         // around Y
        it.y = y1; it.x = x2; it.z = z2;
      });
    }
    function draw() {
      items.forEach(function (it) {
        var depth = (it.z + 1) / 2;                       // 0 = back, 1 = front
        var p = 1 + 0.25 * it.z;                          // perspective: front spreads out, back pulls in
        var size = (fontBase + fontRange * depth) * it.w;
        var x = cx + it.x * R * p, y = cy + it.y * R * p;
        it.el.style.transform = "translate(-50%, -50%) translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
        it.el.style.fontSize = (Math.round(size * 2) / 2).toFixed(1) + "px";
        it.el.style.opacity = (0.18 + 0.82 * depth).toFixed(2);
        it.el.style.zIndex = Math.round(depth * 100);
      });
    }
    function frame() {
      if (stopped) return;
      speed += (tgtSpeed - speed) * 0.08;               // eases to a stop on hover instead of snapping
      velX += (tgtX - velX) * 0.05; velY += (tgtY - velY) * 0.05;
      if (speed > 0.002) rotate(velX * speed, velY * speed);
      draw();
      raf = requestAnimationFrame(frame);
    }

    measure();
    rotate(-0.45, 0.8); // initial tilt so the first frame already shows depth
    draw();
    if (!reduced) {
      container.addEventListener("pointermove", function (e) {
        var rect = container.getBoundingClientRect();
        var dx = (e.clientX - rect.left - cx) / (W / 2), dy = (e.clientY - rect.top - cy) / (H / 2);
        dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
        tgtY = BASE_Y + dx * 0.014;                      // pointer right: spin faster to the right
        tgtX = BASE_X - dy * 0.010;                      // pointer up: tumble upward
      });
      container.addEventListener("pointerleave", function () { tgtY = BASE_Y; tgtX = BASE_X; });
      container.addEventListener("mouseover", function (e) { if (e.target.classList.contains("tag")) tgtSpeed = 0; });
      container.addEventListener("mouseout", function (e) { if (e.target.classList.contains("tag")) tgtSpeed = 1; });
      container.addEventListener("focusin", function () { tgtSpeed = 0; });
      container.addEventListener("focusout", function () { tgtSpeed = 1; });
      window.addEventListener("resize", measure);
      raf = requestAnimationFrame(frame);
    }
    container.addEventListener("click", function (e) {
      var q = e.target.getAttribute && e.target.getAttribute("data-q");
      if (!q) return;
      var input = document.getElementById("q");
      input.value = q; state.q = q; state.type = "";
      render();
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
    return { stop: function () { stopped = true; if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", measure); } };
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
    if (sphere) { sphere.stop(); sphere = null; }
    var starters = document.getElementById("starters");
    if (state.q) { starters.innerHTML = ""; }
    else {
      starters.innerHTML = '<h2>Starting points</h2>' +
        '<p class="muted">Each tag is a ready-made search. Larger tags reach more records; move the pointer to turn the sphere, or use Tab to walk through the tags.</p>' +
        '<div id="tag-sphere" class="tag-sphere" aria-label="Topic tags; each opens a search"></div>' +
        '<p class="muted">Or browse by section: <a href="insights.html">Insights</a>, <a href="stats.html">Statistics</a>, <a href="vendors.html">Vendors</a>, <a href="glossary.html">Glossary</a>, <a href="sources.html">Sources</a>.</p>';
      sphere = buildSphere(document.getElementById("tag-sphere"), idx.tags || []);
    }
  }

  Promise.all([GM.loadJSON("search-index"), GM.loadJSON("sources"), GM.loadJSON("search-tags")])
    .then(function (r) {
      idx = r[0];
      idx.tags = r[2].tags;
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
