const SUPABASE_URL =
  "https://qleoqpmxvmqcythacszw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_-rvHVSnw6yw0_Zb-jxozVw_Fma9NccJ";

const BASE = "https://www.nexoranews.uk";
const LIMIT = 30;

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
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function imageType(url) {
  const u = String(url || "").toLowerCase().split("?")[0];
  if (u.endsWith(".png")) { return "image/png"; }
  if (u.endsWith(".webp")) { return "image/webp"; }
  if (u.endsWith(".gif")) { return "image/gif"; }
  return "image/jpeg";
}

export default async function handler(req, res) {

  try {

    const response = await fetch(
      SUPABASE_URL +
      "/rest/v1/articles" +
      "?select=title,slug,excerpt,category,author,image_url,published_at,created_at" +
      "&status=eq.published" +
      "&order=published_at.desc.nullslast" +
      "&limit=" + LIMIT,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error("Supabase request failed");
    }

    const articles = await response.json();

    const items = articles.map(article => {

      const slug = article.slug || makeSlug(article.title);

      if (!slug) { return ""; }

      const link = BASE + "/news/" + encodeURIComponent(slug);

      const d = new Date(article.published_at || article.created_at);

      const pubDate = isNaN(d)
        ? ""
        : `
      <pubDate>${d.toUTCString()}</pubDate>`;

      const category = article.category
        ? `
      <category>${xmlEscape(article.category)}</category>`
        : "";

      const author = article.author
        ? `
      <dc:creator>${xmlEscape(article.author)}</dc:creator>`
        : "";

      const image = article.image_url
        ? `
      <enclosure url="${xmlEscape(article.image_url)}" type="${imageType(article.image_url)}" length="0" />`
        : "";

      return `    <item>
      <title>${xmlEscape(article.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>${pubDate}${category}${author}
      <description>${xmlEscape(article.excerpt || "")}</description>${image}
    </item>`;

    }).filter(Boolean);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Nexora News</title>
    <link>${BASE}/</link>
    <description>Latest UK, London, world, business, technology and sports news from Nexora News.</description>
    <language>en-gb</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>`;

    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");

    res.status(200).send(xml);

  } catch (error) {

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(500).send("RSS feed generation failed");

  }

}