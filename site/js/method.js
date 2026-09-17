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
    var VERDICT = { match: "match", minor: "minor fix", mismatch: "wrong", unverifiable: "unverifiable" };
    var TYPE = { insight: ["Insight", "insights.html#"], stat: ["Statistic", "stats.html#"], vendor: ["Vendor", "vendors.html#"], glossary: ["Glossary", "glossary.html#"] };
    var tot = { records: 0, match: 0, minor: 0, mismatch: 0, unverifiable: 0 };
    a.layers.forEach(function (l) { tot.records += l.checked; tot.match += l.match; tot.minor += l.minor; tot.mismatch += l.mismatch; tot.unverifiable += l.unverifiable || 0; });
    var run = a.run;
    if (run) {
      document.getElementById("eval-run").innerHTML = [
        tile(tot.records, "records checked against the pages they cite"),
        tile(run.checker_agents, "checker agents, making " + run.checker_tool_calls.toLocaleString("en-GB") + " page lookups and other tool calls"),
        tile(run.checking_minutes, "minutes of checking, roughly, in parallel batches"),
        tile(run.agents_total, "agents in all, including " + run.fixer_agents + " fix drafters and " + run.note_agents + " note writers"),
        tile(run.tokens_millions + "M", "tokens used by those agents, roughly"),
        tile(tot.records - tot.match, "records corrected, " + tot.mismatch + " of them wrong")
      ].join("");
    }
    document.getElementById("q-accuracy-method").textContent = a.method;
    document.getElementById("q-accuracy-findings").innerHTML = (a.findings || []).map(function (t) { return "<p>" + GM.escapeHTML(t) + "</p>"; }).join("");
    document.getElementById("q-accuracy").innerHTML = [
      tile(tot.records, "records checked against their cited pages"),
      tile(tot.match, "matched exactly"),
      tile(tot.minor + tot.unverifiable, "needed a minor fix"),
      tile(tot.mismatch, "were wrong, all corrected")
    ].join("");
    document.getElementById("q-accuracy-layers").innerHTML = "<table><thead><tr><th>Layer</th><th>Checked</th><th>How</th><th>Match</th><th>Minor fix</th><th>Wrong</th></tr></thead><tbody>" +
      a.layers.map(function (l) {
        var checked = l.checked === l.total ? "all " + l.total : l.checked + " of " + l.total;
        return "<tr><td>" + GM.escapeHTML(l.layer) + "</td><td>" + checked + "</td><td>" + GM.escapeHTML(l.how) + "</td><td>" + l.match + "</td><td>" + (l.minor + (l.unverifiable || 0)) + "</td><td>" + l.mismatch + "</td></tr>";
      }).join("") + "</tbody></table>";
    var rows = a.results.filter(function (r) { return r.verdict !== "match"; }).map(function (r) {
      var t = TYPE[r.type] || ["Record", "#"];
      return "<tr><td><a href=\"" + t[1] + r.id + "\">" + GM.escapeHTML(r.id) + "</a></td><td>" + t[0] + "</td>" +
        '<td><span class="pill ' + (r.verdict === "mismatch" ? "pill-warn" : "") + '">' + VERDICT[r.verdict] + "</span></td>" +
        "<td>" + GM.escapeHTML(r.note) + "</td></tr>";
    }).join("");
    document.getElementById("q-accuracy-count").textContent = "Every record that needed a correction, " + (tot.records - tot.match) + " in all. Records that matched exactly are counted in the table above but not listed.";
    document.getElementById("q-accuracy-table").innerHTML = "<table><thead><tr><th>Record</th><th>Type</th><th>Result</th><th>What was corrected</th></tr></thead><tbody>" + rows + "</tbody></table>";
    document.getElementById("q-accuracy-note").textContent = a.rounds.map(function (r) { return r.name + ": " + r.summary; }).join(" ") + " " + a.note;
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
