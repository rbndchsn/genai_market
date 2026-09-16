/* GenAI Market — overview page: hero figure, KPI tiles, top insights, sources strip. */
(function () {
  "use strict";
  var GM = window.GM;

  /* Headline numbers. Each entry names a stat id and how to present it. The value is read
     from stats.json so the tile can never drift from the recorded data. */
  var HERO = { stat: "s7-02", pick: "2025", format: function (v) { return "$" + v + "B"; },
               label: "Spent by enterprises on generative AI in 2025",
               context: "3.2 times the prior year, split almost evenly between infrastructure and applications" };

  var TILES = [
    { stat: "s3-02", pick: "2026", suffix: "%", label: "of organisations use AI in at least one function", context: "up from 78% two years earlier" },
    { stat: "s4-02", pick: "Today", suffix: "%", label: "have moved 40% or more of AI experiments into production", context: "54% expect to within six months" },
    { stat: "s3-15", suffix: "%", label: "attribute any EBIT impact to AI", context: "unchanged for two years, while 80% report personal productivity gains" },
    { stat: "s3-06", pick: "$1B+: at least scaling, 2026", suffix: "%", label: "of large enterprises are scaling AI agents", context: "22% below $1B revenue; definitions of an agent vary widely" },
    { stat: "s4-25", suffix: "%", label: "have a mature governance model for autonomous agents", context: "while 74% plan at least moderate agent use within two years" },
    { stat: "s9-10", suffix: "%", label: "of large US firms can see their AI operating costs in full", context: "one in five organisations has limited AI use on cost" },
    { stat: "s5-08", suffix: "%", label: "of CEOs say they are the main AI decision-maker", context: "double the prior year" },
    { stat: "s7-09", pick: "Purchased, 2025", suffix: "%", label: "of AI use cases are bought rather than built", context: "up from 53% in 2024" }
  ];

  var TOP_INSIGHTS = ["ins-050", "ins-054", "ins-046", "ins-053", "ins-072", "ins-065", "ins-085", "ins-094"];

  function statValue(s, pick) {
    if (s.series && s.series.length) {
      if (pick) {
        for (var i = 0; i < s.series.length; i++) if (s.series[i].label === pick) return s.series[i].value;
      }
      return s.series[0].value;
    }
    return s.value;
  }

  function refLine(refs, byId) {
    return '<p class="ref">' + GM.formatRefs(refs, byId) + "</p>";
  }

  function render(data) {
    var stats = data.stats.stats, insights = data.insights, sources = data.sources.sources, glossary = data.glossary.terms, vendors = data.vendors.vendors;
    var statById = {}, insById = {}, srcById = {};
    stats.forEach(function (s) { statById[s.id] = s; });
    insights.insights.forEach(function (i) { insById[i.id] = i; });
    sources.forEach(function (s) { srcById[s.id] = s; });

    // Hero
    var hs = statById[HERO.stat];
    if (hs) {
      var hv = statValue(hs, HERO.pick);
      document.getElementById("hero").innerHTML =
        '<p class="hero-figure">' + GM.escapeHTML(HERO.format(hv)) + "</p>" +
        '<p class="hero-label">' + GM.escapeHTML(HERO.label) + "</p>" +
        '<p class="hero-context muted">' + GM.escapeHTML(HERO.context) + "</p>" +
        refLine(hs.refs, srcById);
    }

    // KPI tiles
    document.getElementById("kpis").innerHTML = TILES.map(function (t) {
      var s = statById[t.stat];
      if (!s) return "";
      var v = statValue(s, t.pick);
      return '<article class="stat-tile">' +
        '<a class="stat-link" href="stats.html#' + t.stat + '">' +
        '<span class="stat-value">' + GM.escapeHTML(String(v)) + GM.escapeHTML(t.suffix || "") + "</span>" +
        '<span class="stat-label">' + GM.escapeHTML(t.label) + "</span>" +
        "</a>" +
        (t.context ? '<span class="stat-context muted">' + GM.escapeHTML(t.context) + "</span>" : "") +
        '<span class="ref">' + GM.formatRefs(s.refs, srcById) + "</span>" +
        "</article>";
    }).join("");

    // Counts line
    var multi = insights.insights.filter(function (i) { return i.evidence === "multi-source"; }).length;
    document.getElementById("counts").innerHTML =
      "<strong>" + sources.length + "</strong> sources &middot; <strong>" + insights.insights.length + "</strong> insights, " + multi + " supported by two or more sources &middot; " +
      "<strong>" + stats.length + "</strong> statistics &middot; <strong>" + vendors.length + "</strong> vendors &middot; <strong>" + glossary.length + "</strong> glossary terms";

    // Top insights
    var themes = insights.themes;
    document.getElementById("top-insights").innerHTML = TOP_INSIGHTS.map(function (id) {
      var i = insById[id];
      if (!i) return "";
      var ev = { "multi-source": "Multi-source", "single-source": "Single source", "agent-analysis": "Our analysis" }[i.evidence] || i.evidence;
      return '<article class="card insight-card">' +
        '<div class="pills"><span class="pill pill-accent">' + GM.escapeHTML(themes[i.theme] || i.theme) + '</span><span class="pill">' + ev + "</span></div>" +
        '<h3><a href="insights.html#' + i.id + '">' + GM.escapeHTML(i.title) + "</a></h3>" +
        "<p>" + GM.escapeHTML(i.summary) + "</p>" +
        refLine(i.refs, srcById) +
        "</article>";
    }).join("");

    // Sources strip, ordered by publication date
    var ordered = sources.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    document.getElementById("sources-strip").innerHTML = ordered.map(function (s) {
      return '<li><a href="sources.html#' + s.id + '"><span class="src-pub">' + GM.escapeHTML(s.publisher) + '</span><span class="src-title">' + GM.escapeHTML(s.title) + '</span><span class="src-date muted">' + GM.escapeHTML(s.date) + "</span></a></li>";
    }).join("");
  }

  Promise.all([GM.loadJSON("stats"), GM.loadJSON("insights"), GM.loadJSON("sources"), GM.loadJSON("glossary"), GM.loadJSON("vendors")])
    .then(function (r) { render({ stats: r[0], insights: r[1], sources: r[2], glossary: r[3], vendors: r[4] }); })
    .catch(function (e) {
      document.getElementById("hero").innerHTML = '<p class="notice">The data files could not be loaded: ' + GM.escapeHTML(e.message) + "</p>";
    });
})();
