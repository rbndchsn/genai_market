/* GenAI Market — "How it was built" page: the scale tiles are read from the data files at load time. */
(function () {
  "use strict";
  var GM = window.GM;

  function tile(value, label) {
    return '<article class="stat-tile"><span class="stat-value">' + GM.escapeHTML(String(value)) + "</span>" +
      '<span class="stat-label">' + GM.escapeHTML(label) + "</span></article>";
  }

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
