/* GenAI Market — sources page: bibliography with usage counts, evidence-level counts, citation example. */
(function () {
  "use strict";
  var GM = window.GM;
  var TYPE = { report: "Report", survey: "Survey", web: "Web article" };

  function monthYear(d) {
    var m = /^(\d{4})-(\d{2})/.exec(String(d || ""));
    if (!m) return String(d || "");
    var names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return names[Number(m[2]) - 1] + " " + m[1];
  }
  function field(label, value) {
    return value ? "<div><dt>" + label + "</dt><dd>" + GM.escapeHTML(value) + "</dd></div>" : "";
  }
  function usageLine(u) {
    var parts = [];
    if (u.insights) parts.push('<a href="insights.html?source=' + u.id + '">' + u.insights + " insight" + (u.insights === 1 ? "" : "s") + "</a>");
    if (u.stats) parts.push('<a href="stats.html?source=' + u.id + '">' + u.stats + " statistic" + (u.stats === 1 ? "" : "s") + "</a>");
    if (u.terms) parts.push(u.terms + " glossary term" + (u.terms === 1 ? "" : "s"));
    if (u.vendors) parts.push('<a href="vendors.html">' + u.vendors + " vendor profile" + (u.vendors === 1 ? "" : "s") + "</a>");
    return parts.length ? parts.join(", ") : "background only";
  }

  function entry(s, u) {
    var link = s.url ? '<a href="' + GM.escapeHTML(s.url) + '" rel="noopener">' + GM.escapeHTML(s.url.replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</a>" : "";
    var authors = (s.authors || []).join(", ");
    return '<article class="card source" id="' + GM.escapeHTML(s.id) + '">' +
      '<div class="pills">' +
        '<span class="pill pill-accent">' + GM.escapeHTML(GM.shortName(s.id, s)) + "</span>" +
        '<span class="pill">' + (TYPE[s.type] || s.type) + "</span>" +
        (s.sponsor ? '<span class="pill pill-warn">Sponsored by ' + GM.escapeHTML(s.sponsor) + "</span>" : "") +
        '<a class="pill pill-id" href="#' + GM.escapeHTML(s.id) + '" title="Link to this source">' + s.id + "</a>" +
      "</div>" +
      "<h3>" + GM.escapeHTML(s.title) + "</h3>" +
      '<p class="source-line">' + GM.escapeHTML(s.publisher) + (authors && authors !== s.publisher ? " &middot; " + GM.escapeHTML(authors) : "") +
        " &middot; " + GM.escapeHTML(monthYear(s.date)) + (s.pages ? " &middot; " + s.pages + " pages" : "") +
        (s.accessed ? ' &middot; accessed ' + GM.escapeHTML(s.accessed) : "") + (link ? " &middot; " + link : "") + "</p>" +
      '<dl class="source-fields">' +
        field("Method", s.method) +
        field("Sample", s.sample) +
        field("How we use it", s.how_we_use_it) +
        field("Caveats", s.bias_note) +
        field("Licence", s.license_note) +
      "</dl>" +
      '<p class="source-usage"><strong>On this site:</strong> ' + usageLine(u) + "</p>" +
    "</article>";
  }

  function count(list, id) {
    return list.filter(function (r) { return (r.refs || []).some(function (x) { return x.source === id; }); }).length;
  }

  function render(d) {
    var sources = d.sources.sources.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var usage = {};
    sources.forEach(function (s) {
      usage[s.id] = { id: s.id, insights: count(d.insights.insights, s.id), stats: count(d.stats.stats, s.id), terms: count(d.glossary.terms, s.id), vendors: count(d.vendors.vendors, s.id) };
    });
    document.getElementById("bibliography-list").innerHTML = sources.map(function (s) { return entry(s, usage[s.id]); }).join("");
    var years = sources.map(function (s) { return String(s.date).slice(0, 4); });
    document.getElementById("bib-count").textContent = sources.length + " sources, " + Math.min.apply(null, years) + " to " + Math.max.apply(null, years);

    var ins = d.insights.insights;
    var n = function (ev) { return ins.filter(function (i) { return i.evidence === ev; }).length; };
    document.getElementById("ev-multi").textContent = n("multi-source") + " of " + ins.length + " insights";
    document.getElementById("ev-single").textContent = n("single-source") + " of " + ins.length + " insights";
    document.getElementById("ev-agent").textContent = n("agent-analysis") + " of " + ins.length + " insights";

    var base = location.href.replace(/[^/]*$/, "");
    var example = ins[0];
    document.getElementById("cite-example").textContent =
      "Sustainable IQ (" + new Date().getFullYear() + "). \"" + example.title + "\" (" + example.id + "). GenAI Market. " + base + "insights.html#" + example.id;
    document.getElementById("cite-year").textContent = new Date().getFullYear();
    document.getElementById("cite-url").textContent = base;
  }

  function openHash() {
    var id = (location.hash || "").slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains("source")) {
      Array.prototype.forEach.call(document.querySelectorAll(".source.is-target"), function (x) { x.classList.remove("is-target"); });
      el.classList.add("is-target");
    }
    el.scrollIntoView({ block: "start" });
  }

  Promise.all([GM.loadJSON("sources"), GM.loadJSON("insights"), GM.loadJSON("stats"), GM.loadJSON("glossary"), GM.loadJSON("vendors")])
    .then(function (r) {
      render({ sources: r[0], insights: r[1], stats: r[2], glossary: r[3], vendors: r[4] });
      openHash();
      window.addEventListener("hashchange", openHash);
    })
    .catch(function (e) {
      document.getElementById("bibliography-list").innerHTML = '<p class="notice">The data files could not be loaded: ' + GM.escapeHTML(e.message) + "</p>";
    });
})();
