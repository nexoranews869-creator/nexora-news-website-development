const SUPABASE_URL =
  "https://qleoqpmxvmqcythacszw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_-rvHVSnw6yw0_Zb-jxozVw_Fma9NccJ";

const BASE = "https://www.nexoranews.uk";
const DEFAULT_IMAGE = BASE + "/og-image.jpg";
const DEFAULT_DESC = "Read the latest news and stories from Nexora News.";

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

async function findArticle(slug) {

  const direct = await supa(
    "select=*" +
    "&status=eq.published" +
    "&slug=eq." + encodeURIComponent(slug) +
    "&limit=1"
  );

  if (direct.length) {
    return direct[0];
  }

  /* Old links were built from the title */

  const list = await supa(
    "select=id,title" +
    "&status=eq.published" +
    "&limit=500"
  );

  const match = list.find(item => {
    const t = makeSlug(item.title);
    return t && (slug === t || slug.startsWith(t + "-"));
  });

  if (!match) {
    return null;
  }

  const full = await supa(
    "select=*" +
    "&id=eq." + encodeURIComponent(match.id) +
    "&limit=1"
  );

  return full[0] || null;

}

/* The normal article page (no slug in the address, so it is the plain file) */

async function getTemplate() {

  try {

    const response = await fetch(BASE + "/article.html");

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    return html.includes('id="articleContainer"') ? html : null;

  } catch (error) {
    return null;
  }

}

/* Article body: same content the page shows, as clean HTML */

function cleanHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "$1=$2#$2");
}

function plainTextToHtml(text) {

  const out = [];
  let buf = [];

  function flush() {
    if (buf.length) {
      out.push("<p>" + esc(buf.join("\n")).replace(/\n/g, "<br>") + "</p>");
      buf = [];
    }
  }

  String(text || "").split("\n").forEach(line => {

    const t = line.trim();

    if (!t) {
      flush();
      return;
    }

    /* a link alone on its line is a video embed on the page: skip it here */
    if (/^https?:\/\/\S+$/i.test(t)) {
      flush();
      return;
    }

    buf.push(line);

  });

  flush();

  return out.join("\n");

}

function renderBody(raw) {

  const body = raw || "";

  const hasHtml =
    /<\/?(p|h[1-6]|ul|ol|li|blockquote|div|br|img|a|strong|em|b|i|span|table)\b/i
      .test(body);

  return hasHtml ? cleanHtml(body) : plainTextToHtml(body);

}

function formatDate(value) {
  const d = new Date(value);
  return isNaN(d)
    ? ""
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function jsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/* Replace the first match only, and never treat "$" in the text specially */

function swap(html, pattern, text) {
  return pattern.test(html) ? html.replace(pattern, () => text) : html;
}

function articleMarkup(article, published, author) {

  const dateText = formatDate(published);

  const heroImage = article.image_url
    ? `<img class="hero-image" src="${esc(article.image_url)}" alt="${esc(article.title)}" width="1080" height="600">`
    : "";

  return `
    <article class="article-card">
      <div class="article-head">
        <div class="tags">
          <span class="cat-chip">${esc(article.category || "News")}</span>
          ${article.is_breaking === true ? '<span class="breaking-badge">Breaking news</span>' : ""}
        </div>
        <h1 class="article-title">${esc(article.title)}</h1>
        ${article.excerpt ? `<div class="article-excerpt">${esc(article.excerpt)}</div>` : ""}
        <div class="article-meta">
          <div class="avatar" aria-hidden="true">${esc(author.trim().charAt(0).toUpperCase())}</div>
          <div>
            <strong>${esc(author)}</strong>
            ${dateText ? `<time datetime="${esc(published)}">${esc(dateText)}</time>` : ""}
          </div>
        </div>
      </div>
      ${heroImage}
      <div class="article-body">
${renderBody(article.body)}
      </div>
    </article>`;

}

/* Used only if the normal page cannot be loaded */

function minimalPage(title, description, image, url, content) {

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Nexora News">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
</head>
<body>
<p><a href="${BASE}/">Nexora News</a></p>
${content}
</body>
</html>`;

}

export default async function handler(req, res) {

  let slugParam = req.query.slug;
  if (Array.isArray(slugParam)) { slugParam = slugParam[0]; }
  const slug = String(slugParam || "");

  let article = null;
  let lookupFailed = false;

  try {
    if (slug) {
      article = await findArticle(slug);
    }
  } catch (error) {
    article = null;
    lookupFailed = true;
  }

  /* An article that really does not exist must answer 404, not 200 */
  const notFound = !article && !lookupFailed;

  const title = article
    ? article.title + " | Nexora News"
    : "Nexora News | Article";

  const description = article && article.excerpt
    ? article.excerpt
    : DEFAULT_DESC;

  const image = article && article.image_url
    ? article.image_url
    : DEFAULT_IMAGE;

  const realSlug = article
    ? (article.slug || makeSlug(article.title))
    : slug;

  const url = BASE + "/news/" + encodeURIComponent(realSlug);

  const published = article
    ? (article.published_at || article.created_at || "")
    : "";

  const modified = article
    ? (article.updated_at || published)
    : "";

  const author = article && article.author ? article.author : "Nexora News";

  const lang = article
    ? String(article.language || article.lang || "").toLowerCase()
    : "";

  const template = await getTemplate();

  let html;

  if (template && article) {

    html = template;

    html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
    html = swap(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`);
    html = swap(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`);

    html = swap(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
    html = swap(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(description)}">`);
    html = swap(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`);
    html = swap(html, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`);

    html = swap(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(title)}">`);
    html = swap(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(description)}">`);
    html = swap(html, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${esc(image)}">`);

    html = swap(
      html,
      /<script type="application\/ld\+json" id="articleSchema">[\s\S]*?<\/script>/,
      `<script type="application/ld+json" id="articleSchema">${jsonLd({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article.title,
        "description": description,
        "image": [image],
        "datePublished": published,
        "dateModified": modified,
        "author": { "@type": "Person", "name": author },
        "publisher": { "@type": "Organization", "name": "Nexora News" },
        "mainEntityOfPage": { "@type": "WebPage", "@id": url }
      })}</script>`
    );

    if (/^[a-z]{2,3}$/.test(lang)) {
      html = swap(html, /<html lang="[^"]*">/, `<html lang="${esc(lang)}">`);
    }

    /* The article itself, ready in the HTML (the page script then refreshes it) */
    html = html.replace(
      /(<main class="article-container" id="articleContainer"[^>]*>)[\s\S]*?(<\/main>)/,
      (all, open, close) => open + articleMarkup(article, published, author) + "\n" + close
    );

  } else if (template) {

    /* no such article, or the database could not be reached: plain page, script decides */
    html = template;

    if (notFound) {
      html = swap(html, /<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex">');
    }

  } else {

    html = minimalPage(
      title,
      description,
      image,
      url,
      article
        ? articleMarkup(article, published, author)
        : `<h1>${esc(title)}</h1><p>${esc(description)}</p>`
    );

  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  res.status(notFound ? 404 : 200).send(html);

}