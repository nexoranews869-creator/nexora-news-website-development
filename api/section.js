const SUPABASE_URL =
  "https://qleoqpmxvmqcythacszw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_-rvHVSnw6yw0_Zb-jxozVw_Fma9NccJ";

const BASE = "https://www.nexoranews.uk";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1000&q=80";

const NAMES = {
  uk: "UK",
  london: "London",
  world: "World",
  business: "Business",
  technology: "Technology",
  sports: "Sports",
  video: "Video"
};

const COLUMNS =
  "id,title,slug,excerpt,category,author,image_url,published_at,created_at,is_breaking";

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

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function swap(html, pattern, text) {
  return pattern.test(html) ? html.replace(pattern, () => text) : html;
}

function fmtDate(article) {
  const d = new Date(article.published_at || article.created_at);
  return isNaN(d)
    ? ""
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function supa(query) {
  const response = await fetch(SUPABASE_URL + "/rest/v1/articles?" + query, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY
    }
  });

  if (!response.ok) {
    throw new Error("Supabase request failed");
  }

  return response.json();
}

/* The normal home page file (the address "/" has no section in it) */

async function getTemplate() {

  try {

    const response = await fetch(BASE + "/");

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    return html.includes('id="app"') ? html : null;

  } catch (error) {
    return null;
  }

}

function cardHtml(a) {

  const slug = a.slug || makeSlug(a.title);

  return `
    <a class="card" href="/news/${encodeURIComponent(slug)}">
      <div class="media">
        <img src="${esc(a.image_url || FALLBACK_IMG)}" alt="${esc(a.title)}" width="600" height="375" loading="lazy" decoding="async">
        ${a.is_breaking ? '<span class="tag-breaking">Breaking</span>' : ""}
      </div>
      <div class="card-body">
        <div class="cat">${esc(a.category)}</div>
        <h3>${esc(a.title)}</h3>
        <p class="excerpt">${esc(a.excerpt || "")}</p>
        <div class="meta">
          <span>By ${esc(a.author || "Marian")}</span>
          <time>${esc(fmtDate(a))}</time>
        </div>
      </div>
    </a>`;

}

export default async function handler(req, res) {

  let nameParam = req.query.name;
  if (Array.isArray(nameParam)) { nameParam = nameParam[0]; }

  const key = String(nameParam || "").toLowerCase().replace(/[^a-z]/g, "");
  const name = NAMES[key] || "";

  const template = await getTemplate();

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  if (!template) {
    res.status(200).send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(name || "Section")} | Nexora News</title></head>` +
      `<body><p><a href="${BASE}/">Nexora News</a></p></body></html>`
    );
    return;
  }

  /* Unknown section: the page shows "Section not found", and search engines are told not to keep it */
  if (!name) {
    const page = swap(
      template,
      /<meta name="robots" content="[^"]*">/,
      '<meta name="robots" content="noindex">'
    );
    res.status(404).send(page);
    return;
  }

  let articles = [];

  try {
    articles = await supa(
      "select=" + COLUMNS +
      "&status=eq.published" +
      "&category=ilike." + encodeURIComponent(name) +
      "&order=published_at.desc.nullslast" +
      "&limit=60"
    );
  } catch (error) {
    articles = [];
  }

  const url = BASE + "/section/" + key;
  const title = name + " News | Nexora News";
  const description = "Latest " + name + " news, analysis and updates from Nexora News.";

  let html = template;

  html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = swap(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`);
  html = swap(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`);
  html = swap(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
  html = swap(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(description)}">`);
  html = swap(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`);
  html = swap(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(title)}">`);
  html = swap(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(description)}">`);

  const schema =
    `<script type="application/ld+json">${jsonLd([
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": title,
        "description": description,
        "url": url,
        "isPartOf": { "@type": "WebSite", "name": "Nexora News", "url": BASE + "/" }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/" },
          { "@type": "ListItem", "position": 2, "name": name, "item": url }
        ]
      }
    ])}</script>\n`;

  html = html.replace("</head>", () => schema + "</head>");

  const content = `
      <section class="section">
        <div class="section-head">
          <h2>${esc(name)} news</h2>
          <a class="viewall" href="/">Back to home</a>
        </div>
        ${
          articles.length
            ? `<div class="grid">${articles.map(cardHtml).join("")}</div>`
            : `<div class="empty">No ${esc(name)} news found.</div>`
        }
      </section>`;

  html = html.replace(
    /<div id="app" aria-live="polite">[\s\S]*?<\/div>\s*<\/main>/,
    () => `<div id="app" aria-live="polite">${content}\n  </div>\n\n</main>`
  );

  res.status(200).send(html);

}