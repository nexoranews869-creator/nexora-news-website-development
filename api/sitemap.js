/* Dynamic sitemap for Nexora News.
   Lives at /api/sitemap and is served as /sitemap.xml (see vercel.json).
   It reads the published articles from Supabase every time the cache expires,
   so new articles appear in the sitemap without any manual work. */

const SITE = "https://nexora-news-website-development-9ve.vercel.app";

const SUPABASE_URL = "https://qleoqpmxvmqcythacszw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-rvHVSnw6yw0_Zb-jxozVw_Fma9NccJ";

const CATEGORIES = ["UK", "London", "World", "Business", "Technology", "Sports", "Video"];

const STATIC_PAGES = [
  "/",
  ...CATEGORIES.map(c => "/?category=" + c),
  "/about.html",
  "/contact.html",
  "/privacy.html",
  "/search.html"
];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* Same fallback the website uses when an article has no slug */
function makeSlug(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isoDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

async function getArticles() {
  const url =
    SUPABASE_URL +
    "/rest/v1/articles" +
    "?select=title,slug,published_at,created_at" +
    "&status=eq.published" +
    "&order=published_at.desc.nullslast" +
    "&limit=1000";

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY
    }
  });

  if (!response.ok) {
    throw new Error("Supabase responded with " + response.status);
  }

  return response.json();
}

function urlEntry(loc, lastmod) {
  return (
    "  <url>\n" +
    "    <loc>" + xmlEscape(loc) + "</loc>\n" +
    (lastmod ? "    <lastmod>" + lastmod + "</lastmod>\n" : "") +
    "  </url>\n"
  );
}

module.exports = async function handler(req, res) {
  let articles = [];

  try {
    articles = await getArticles();
  } catch (error) {
    /* If the database cannot be reached, still return a valid sitemap
       with the fixed pages instead of an error. */
    console.error("Sitemap: could not load articles:", error);
  }

  let xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  STATIC_PAGES.forEach(path => {
    xml += urlEntry(SITE + path);
  });

  const seen = new Set();

  (articles || []).forEach(article => {
    const slug = article.slug || makeSlug(article.title);

    if (!slug || seen.has(slug)) {
      return;
    }

    seen.add(slug);

    xml += urlEntry(
      SITE + "/article.html?slug=" + encodeURIComponent(slug),
      isoDate(article.published_at || article.created_at)
    );
  });

  xml += "</urlset>\n";

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
};