/* GenAI Market — "How it was built" page: the scale tiles are read from the data files at load time. */
(function () {
  "use strict";
  var GM = window.GM;

  function tile(value, label) {
    return '<article class="stat-tile"><span class="stat-value">' + GM.escapeHTML(String(value)) + "</span>" +
      '<span class="stat-label">' + GM.escapeHTML(label) + "</span></article>";
  }

  /* Validation and evaluation section: read from data/quality.json. */
  GM.loadJSON("quality").then(function (q) {
    var v = q.validation, o = q.originality, a = q.accuracy;
    document.getElementById("q-validation").innerHTML = [
      tile(v.pages, "pages rendered and checked"),
      tile(v.links_checked.toLocaleString("en-GB"), "internal links and anchors resolved"),
      tile(v.console_errors, "console errors"),
      tile(v.data_errors, "data validation errors, " + v.data_warnings + " warnings")
    ].join("");
    document.getElementById("q-validation").insertAdjacentHTML("afterend", '<p class="muted">Last run ' + GM.escapeHTML(v.last_run) + ".</p>");
    document.getElementById("q-originality").innerHTML = [
      tile(o.records_scanned.toLocaleString("en-GB"), "records scanned"),
      tile(o.licensed_hits_before, "hits against the licensed report before rewriting"),
      tile(o.licensed_hits_after, "hits against the licensed report after"),
      tile(o.public_hits_remaining, "remaining hits against public sources, reviewed")
    ].join("");
    document.getElementById("q-originality").insertAdjacentHTML("afterend", '<p class="muted">Last run ' + GM.escapeHTML(o.last_run) + ". " + GM.escapeHTML(o.note) + "</p>");
    var counts = { match: 0, minor: 0, mismatch: 0, unverifiable: 0 }, fixed = 0;
    a.results.forEach(function (r) { counts[r.verdict] = (counts[r.verdict] || 0) + 1; if (r.fixed) fixed++; });
    document.getElementById("q-accuracy-method").textContent = a.method;
    document.getElementById("q-accuracy-findings").innerHTML = (a.findings || []).map(function (t) { return "<p>" + GM.escapeHTML(t) + "</p>"; }).join("");
    document.getElementById("q-accuracy").innerHTML = [
      tile(a.results.length, "records sampled at random (" + a.sample.stats + " statistics, " + a.sample.insights + " insights)"),
      tile(counts.match, "matched the cited page exactly"),
      tile(counts.minor + counts.mismatch, "needed a correction (" + counts.minor + " minor, " + counts.mismatch + " wrong)"),
      tile(fixed, "corrected in the data before publishing")
    ].join("");
    var rows = a.results.map(function (r) {
      var href = (r.type === "stat" ? "stats.html#" : "insights.html#") + r.id;
      return "<tr><td><a href=\"" + href + "\">" + GM.escapeHTML(r.id) + "</a></td><td>" + GM.escapeHTML(r.type === "stat" ? "Statistic" : "Insight") + "</td>" +
        '<td><span class="pill ' + (r.verdict === "match" ? "pill-ok" : r.verdict === "unverifiable" ? "" : "pill-warn") + '">' + GM.escapeHTML(r.verdict) + "</span></td>" +
        "<td>" + GM.escapeHTML(r.pages_checked.join(", ")) + "</td><td>" + GM.escapeHTML(r.note) + (r.fixed ? " Corrected." : "") + "</td></tr>";
    }).join("");
    document.getElementById("q-accuracy-table").innerHTML = "<table><thead><tr><th>Record</th><th>Type</th><th>Verdict</th><th>Pages checked</th><th>What was found</th></tr></thead><tbody>" + rows + "</tbody></table>";
    document.getElementById("q-accuracy-note").textContent = "Evaluated " + a.date + " by the agent against the page renders and source text, seed " + a.seed + " so the sample can be redrawn. " + a.note;
  }).catch(function (e) {
    document.getElementById("q-accuracy").innerHTML = '<p class="notice">The quality file could not be loaded: ' + GM.escapeHTML(e.message) + "</p>";
  });

  Promise.all(["sources", "insights", "stats", "glossary", "vendors", "chunks"].map(GM.loadJSON))
    .then(function (d) {
      var sources = d[0].sources, insights = d[1].insights, stats = d[2].stats, terms = d[3].terms, vendors = d[4].vendors, chunks = d[5].chunks;
      var multi = insights.filter(function (i) { return i.evidence === "multi-source"; }).length;
      var tiles = [
        [sources.length, "sources read and synthesised"],
        [insights.length, "insights, " + multi + " backed by two or more sources"],
        [stats.length, "statistics, each with a page or URL"],
        [terms.length, "glossary terms"],
        [vendors.length, "vendor profiles"],
        [chunks.length, "search units built from the files above"]
      ];
      document.getElementById("method-kpis").innerHTML = tiles.map(function (t) { return tile(t[0], t[1]); }).join("");
    })
    .catch(function (e) {
      document.getElementById("method-kpis").innerHTML = '<p class="notice">The data files could not be loaded: ' + GM.escapeHTML(e.message) + "</p>";
    });
})();
