/* GenAI Market — shared shell: theme, header, nav, footer, data loader.
   Every page includes this script. Pages declare themselves with <body data-page="...">. */
(function () {
  "use strict";

  var SITE_NAME = "GenAI Market";
  var TAGLINE = "The state of enterprise AI, read across twelve sources";
  var REPO_URL = "https://github.com/rbndchsn/genai_market";

  var NAV = [
    { key: "home", href: "index.html", label: "Overview" },
    { key: "insights", href: "insights.html", label: "Insights" },
    { key: "vendors", href: "vendors.html", label: "Vendors" },
    { key: "stats", href: "stats.html", label: "Statistics" },
    { key: "glossary", href: "glossary.html", label: "Glossary" },
    { key: "sources", href: "sources.html", label: "Sources" },
    { key: "search", href: "search.html", label: "Search" }
  ];

  var MARK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" opacity="0.15"/><path d="M6 15.5l4-6 3 4 2.5-3L18 15.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1.5v3M12 19.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M1.5 12h3M19.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>';
  var ICON_MOON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><path d="M20.5 14.8A9 9 0 0 1 9.2 3.5a9 9 0 1 0 11.3 11.3z"/></svg>';

  /* ---------- Theme ---------- */
  function storedTheme() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }
  function storeTheme(v) {
    try { if (v) localStorage.setItem("theme", v); else localStorage.removeItem("theme"); } catch (e) { /* ignore */ }
  }
  function systemDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    return systemDark() ? "dark" : "light";
  }
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    var btn = document.querySelector(".theme-toggle");
    if (btn) {
      var dark = currentTheme() === "dark";
      btn.innerHTML = dark ? ICON_SUN : ICON_MOON;
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      btn.setAttribute("title", dark ? "Light theme" : "Dark theme");
    }
  }
  // Apply stored theme as early as possible to avoid a flash.
  applyTheme(storedTheme());

  /* ---------- Shell rendering ---------- */
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function renderHeader(page) {
    var items = NAV.map(function (n) {
      var cur = n.key === page ? ' aria-current="page"' : "";
      return '<li><a href="' + n.href + '"' + cur + ">" + n.label + "</a></li>";
    }).join("");
    var header = el(
      '<header class="site-header">' +
        '<div class="container">' +
          '<a class="brand" href="index.html">' + MARK + '<span class="brand-name">' + SITE_NAME + "</span></a>" +
          '<nav class="site-nav" aria-label="Site"><ul>' + items + "</ul></nav>" +
          (page === "search" ? "" :
            '<form class="header-search" role="search" action="search.html" method="get">' +
              '<label for="header-q" class="visually-hidden">Search the site</label>' +
              '<input id="header-q" name="q" type="search" placeholder="Search" autocomplete="off">' +
            "</form>") +
          '<button class="theme-toggle" type="button"></button>' +
        "</div>" +
      "</header>"
    );
    return header;
  }

  function renderFooter() {
    var year = new Date().getFullYear();
    return el(
      '<footer class="site-footer">' +
        '<div class="container">' +
          "<p><strong>" + SITE_NAME + "</strong> is a meta-analysis. " + TAGLINE + ". Findings are written in our own words and every statistic, insight and vendor fact carries a reference.</p>" +
          '<nav aria-label="Footer">' +
            '<a href="sources.html">Sources and method</a>' +
            '<a href="' + REPO_URL + '" rel="noopener">Repository</a>' +
          "</nav>" +
          "<p>&copy; " + year + " Sustainable IQ. No source text, charts or images are reproduced.</p>" +
        "</div>" +
      "</footer>"
    );
  }

  function mountShell() {
    var page = document.body.getAttribute("data-page") || "";
    var skip = el('<a class="skip-link" href="#main">Skip to content</a>');
    document.body.insertBefore(skip, document.body.firstChild);
    document.body.insertBefore(renderHeader(page), skip.nextSibling);
    document.body.appendChild(renderFooter());
    var btn = document.querySelector(".theme-toggle");
    btn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      storeTheme(next);
      applyTheme(next);
    });
    applyTheme(storedTheme());
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        if (!storedTheme()) applyTheme(null);
      });
    }
  }

  /* ---------- Data loader (shared by later pages) ---------- */
  var cache = {};
  function loadJSON(name) {
    if (!cache[name]) {
      cache[name] = fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("Could not load " + name + ".json (" + r.status + ")");
        return r.json();
      });
    }
    return cache[name];
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Short publisher names for citations. Full names live in sources.json and on the Sources page. */
  var SHORT = {
    "src-01": "AIM Research", "src-02": "IDC and Solace", "src-03": "McKinsey", "src-04": "Deloitte",
    "src-05": "BCG", "src-06": "MIT NANDA", "src-07": "Menlo Ventures", "src-08": "a16z",
    "src-09": "KPMG US", "src-10": "Microsoft", "src-11": "Stanford HAI", "src-12": "IDC FutureScape"
  };
  function shortName(id, s) {
    return SHORT[id] || (s ? s.publisher : id);
  }

  /* Format a ref list as "Publisher, year, p. 5, 6" with links to the Sources page. */
  function formatRefs(refs, sourcesById) {
    return (refs || []).map(function (r) {
      var s = sourcesById[r.source];
      var label = shortName(r.source, s) + (s ? ", " + String(s.date).slice(0, 4) : "");
      var pages = r.pages && r.pages.length ? ", p. " + r.pages.join(", ") : "";
      return '<a href="sources.html#' + escapeHTML(r.source) + '">' + escapeHTML(label) + "</a>" + escapeHTML(pages);
    }).join("; ");
  }

  window.GM = {
    siteName: SITE_NAME,
    nav: NAV,
    loadJSON: loadJSON,
    escapeHTML: escapeHTML,
    formatRefs: formatRefs,
    shortName: shortName,
    currentTheme: currentTheme
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountShell);
  else mountShell();
})();
