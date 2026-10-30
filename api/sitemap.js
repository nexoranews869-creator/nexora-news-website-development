const SUPABASE_URL =
  "https://qleoqpmxvmqcythacszw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_-rvHVSnw6yw0_Zb-jxozVw_Fma9NccJ";

const BASE = "https://www.nexoranews.uk";
const BATCH_SIZE = 1000;

function makeSlug(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/ɗ/g, "d")
    .replace(/ƙ/g, "k")
    .replace(/ɓ/g, "b")
    .replace(/ƴ/g, "y")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function articleUrl(slug) {
  return BASE + "/news/" + encodeURIComponent(slug);
}

async function getPublishedArticles() {
  const articles = [];

  for (let offset = 0; ; offset += BATCH_SIZE) {
    const url = new URL(
      SUPABASE_URL + "/rest/v1/articles"
    );

    url.searchParams.set(
      "select",
      "title,slug,image_url,published_at,created_at"
    );

    url.searchParams.set("status", "eq.published");
    url.searchParams.set(
      "order",
      "published_at.desc.nullslast,created_at.desc"
    );

    const response = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        Range: `${offset}-${offset + BATCH_SIZE - 1}`,
        "Range-Unit": "items"
      }
    });

    if (!response.ok) {
      throw new Error(
        "Supabase request failed: " + response.status
      );
    }

    const batch = await response.json();

    articles.push(...batch);

    if (batch.length < BATCH_SIZE) {
      break;
    }
  }

  return articles;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      return res.status(405).send("Method Not Allowed");
    }

    const articles = await getPublishedArticles();

    const urls = [];
    const addedUrls = new Set();

    function addUrl(path, lastmod = "", imageUrl = "") {
      const fullUrl = BASE + path;

      if (addedUrls.has(fullUrl)) {
        return;
      }

      addedUrls.add(fullUrl);

      const lastmodTag = lastmod
        ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>`
        : "";

      const imageTag = imageUrl
        ? `
    <image:image>
      <image:loc>${xmlEscape(imageUrl)}</image:loc>
    </image:image>`
        : "";

      urls.push(`  <url>
    <loc>${xmlEscape(fullUrl)}</loc>${lastmodTag}${imageTag}
  </url>`);
    }

    // Homepage
    addUrl("/");

    // Main website pages
    [
      "about.html",
      "editorial.html",
      "contact.html",
      "privacy.html"
    ].forEach(page => {
      addUrl("/" + page);
    });

    // News categories
    [
      "uk",
      "london",
      "world",
      "business",
      "technology",
      "sports",
      "video"
    ].forEach(category => {
      addUrl("/section/" + category);
    });

    // Published articles
    articles.forEach(article => {
      const slug =
        String(article.slug || "").trim() ||
        makeSlug(article.title);

      if (!slug) {
        return;
      }

      const dateValue =
        article.published_at || article.created_at;

      const date = dateValue
        ? new Date(dateValue)
        : null;

      const lastmod =
        date && !isNaN(date.getTime())
          ? date.toISOString()
          : "";

      addUrl(
        "/news/" + encodeURIComponent(slug),
        lastmod,
        article.image_url || ""
      );
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;

    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=3600"
    );

    res.setHeader("X-Robots-Tag", "noindex");

    if (req.method === "HEAD") {
      return res.status(200).end();
    }

    return res.status(200).send(xml);

  } catch (error) {
    console.error("Sitemap error:", error);

    res.setHeader(
      "Content-Type",
      "text/plain; charset=utf-8"
    );

    return res.status(500).send(
      "Unable to generate sitemap."
    );
  }
}